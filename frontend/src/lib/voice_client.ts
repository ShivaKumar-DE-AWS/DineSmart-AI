// Voice Client to manage STT streaming, TTS playback, and WebSocket connection.

export class VoiceClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private isRecording = false;
  public onClose?: () => void;

  constructor(
    private readonly restaurantId: string,
    private readonly deviceId: string,
    private readonly onTranscript?: (text: string) => void,
    private readonly onAction?: (actionData: any) => void
  ) {}

  public async connect() {
    return new Promise<void>((resolve, reject) => {
      // We must connect directly to the backend to bypass Next.js rewrites, as Vercel/Next.js edge doesn't proxy WebSockets.
      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      if (backendUrl && !backendUrl.startsWith("http") && !backendUrl.startsWith("/")) {
        backendUrl = "https://" + backendUrl;
      }
      const baseHost = backendUrl ? backendUrl.replace(/^https?:\/\//, "") : window.location.host;
      const protocol = (backendUrl && backendUrl.startsWith("https")) || window.location.protocol === "https:" ? "wss:" : "ws:";
      
      const wsUrl = `${protocol}//${baseHost}/api/ws/voice-agent/${this.restaurantId}?device_id=${this.deviceId}`;
      
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = "arraybuffer"; // Important for receiving TTS bytes

      this.ws.onopen = () => {
        console.log("[VoiceClient] Connected to AI Voice Waiter.");
        this.initAudioContext();
        const language = typeof navigator !== "undefined" && navigator.language ? navigator.language : "auto";
        this.ws?.send(JSON.stringify({ type: "init", language }));
        resolve();
      };

      this.ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          // JSON payload (Text caption or Action command)
          try {
            const data = JSON.parse(event.data);
            if (data.type === "TEXT" && this.onTranscript) {
              this.onTranscript(data.content);
            } else if (data.type === "ACTION" && this.onAction) {
              // The backend tool triggered an action (e.g., ADD to cart)
              this.onAction(data);
            }
          } catch (e) {
            console.error("[VoiceClient] Failed to parse JSON:", e);
          }
        } else if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
          // Binary audio payload (TTS from backend)
          const arrayBuffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
          await this.playAudio(arrayBuffer);
        }
      };

      this.ws.onerror = (err) => {
        console.error("[VoiceClient] WebSocket error:", err);
        reject(err);
      };

      this.ws.onclose = () => {
        console.log("[VoiceClient] Disconnected.");
        this.stopRecording();
        if (this.onClose) this.onClose();
      };
    });
  }

  public initAudioContext() {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(console.error);
      }
    } catch (e) {
      console.error("[VoiceClient] Failed to init AudioContext:", e);
    }
  }

  public resumeContext() {
    this.initAudioContext();
  }

  private playAudio(arrayBuffer: ArrayBuffer): Promise<boolean> {
    return new Promise((resolve) => {
      this.initAudioContext();
      if (!this.audioContext || this.audioContext.state !== "running") return resolve(false);
      try {
        // Use callback version for broader browser compatibility (Safari)
        this.audioContext.decodeAudioData(
          arrayBuffer,
          (audioBuffer) => {
            if (!this.audioContext) return resolve(false);
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.onended = () => resolve(true);
            source.start(0);
          },
          (error) => {
            console.error("[VoiceClient] Audio decoding failed:", error);
            resolve(false);
          }
        );
      } catch (e) {
        console.error("[VoiceClient] Error playing audio:", e);
        resolve(false);
      }
    });
  }

  public async startRecording() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[VoiceClient] Cannot start recording, WS not open.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        if (this.ws?.readyState === WebSocket.OPEN) {
          // Send audio blob directly as binary
          this.ws.send(audioBlob);
        }
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
        this.isRecording = false;
        console.log("[VoiceClient] MediaRecorder stopped and audio sent.");
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      console.log("[VoiceClient] MediaRecorder started...");
    } catch (err) {
      console.error("[VoiceClient] Microphone access denied or MediaRecorder error:", err);
      import("sonner").then(({ toast }) => toast.error("Microphone access denied. Please allow microphone access."));
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  public sendManualEvent(eventName: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "EVENT", event: eventName }));
    }
  }

  public syncUiState(state: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "ui_state", state }));
    }
  }

  public async speakText(text: string) {
    if (!text) return;
    try {
      const response = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
      if (!response.ok) throw new Error("TTS request failed");
      
      const arrayBuffer = await response.arrayBuffer();
      const played = await this.playAudio(arrayBuffer);
      if (!played) this.speakWithBrowser(text);
    } catch (e) {
      console.error("[VoiceClient] Audio play failed:", e);
      this.speakWithBrowser(text);
    }
  }

  private speakWithBrowser(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = navigator.language || "en-IN";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("[VoiceClient] Browser speech fallback failed:", e);
    }
  }

  public disconnect() {
    this.stopRecording();
    if (this.ws) {
      this.ws.close();
    }
  }
}
