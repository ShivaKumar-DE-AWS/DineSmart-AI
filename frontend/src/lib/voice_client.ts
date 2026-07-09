// Voice Client to manage STT streaming, TTS playback, and WebSocket connection.

export class VoiceClient {
  private ws: WebSocket | null = null;
  private recognition: any = null;
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

  public resumeContext() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  private initAudioContext() {
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

  private playAudio(arrayBuffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audioContext) return resolve();
      try {
        // Use callback version for broader browser compatibility (Safari)
        this.audioContext.decodeAudioData(
          arrayBuffer,
          (audioBuffer) => {
            if (!this.audioContext) return resolve();
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.onended = () => resolve();
            source.start(0);
          },
          (error) => {
            console.error("[VoiceClient] Audio decoding failed:", error);
            resolve();
          }
        );
      } catch (e) {
        console.error("[VoiceClient] Error playing audio:", e);
        resolve();
      }
    });
  }

  public async startRecording() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[VoiceClient] Cannot start recording, WS not open.");
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error("[VoiceClient] Speech Recognition API not supported in this browser.");
        import("sonner").then(({ toast }) => toast.error("Speech Recognition is not supported in your browser."));
        return;
      }
      
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      // 'en-IN' is excellent for capturing Indian English, and often successfully transcribes Hindi words in English script.
      this.recognition.lang = "en-IN"; 

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("[VoiceClient] Transcribed locally:", transcript);
        if (transcript && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "USER_TEXT", text: transcript }));
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error("[VoiceClient] Speech recognition error:", event.error);
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        console.log("[VoiceClient] Recording stopped automatically.");
      };

      this.recognition.start();
      this.isRecording = true;
      console.log("[VoiceClient] Web Speech Recognition started...");
    } catch (err) {
      console.error("[VoiceClient] Microphone access denied or STT error:", err);
    }
  }

  public stopRecording() {
    if (this.recognition && this.isRecording) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isRecording = false;
      console.log("[VoiceClient] Web Speech Recognition stopped manually.");
    }
  }

  public sendManualEvent(eventName: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "EVENT", event: eventName }));
    }
  }

  public async speakText(text: string) {
    if (!text) return;
    try {
      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      if (backendUrl && !backendUrl.startsWith("http") && !backendUrl.startsWith("/")) {
        backendUrl = "https://" + backendUrl;
      }
      const baseHost = backendUrl ? backendUrl.replace(/\/$/, "") : "";
      
      if (this.onTranscript) this.onTranscript(text);
      
      const response = await fetch(`${baseHost}/api/tts?text=${encodeURIComponent(text)}`);
      if (!response.ok) throw new Error("TTS request failed");
      
      const arrayBuffer = await response.arrayBuffer();
      await this.playAudio(arrayBuffer);
    } catch (e) {
      console.error("[VoiceClient] Audio play failed:", e);
    }
  }

  public disconnect() {
    this.stopRecording();
    if (this.ws) {
      this.ws.close();
    }
  }
}
