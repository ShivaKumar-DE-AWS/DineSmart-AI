// Voice Client to manage STT streaming, TTS playback, and WebSocket connection.

export class VoiceClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording = false;

  constructor(
    private readonly restaurantId: string,
    private readonly deviceId: string,
    private readonly onTranscript?: (text: string) => void,
    private readonly onAction?: (actionData: any) => void
  ) {}

  public async connect() {
    return new Promise<void>((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws/voice-agent/${this.restaurantId}?device_id=${this.deviceId}`;
      
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
        } else if (event.data instanceof ArrayBuffer) {
          // Binary audio payload (TTS from backend)
          await this.playAudio(event.data);
        }
      };

      this.ws.onerror = (err) => {
        console.error("[VoiceClient] WebSocket error:", err);
        reject(err);
      };

      this.ws.onclose = () => {
        console.log("[VoiceClient] Disconnected.");
        this.stopRecording();
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

  private async playAudio(arrayBuffer: ArrayBuffer) {
    if (!this.audioContext) return;
    try {
      // Decode the mp3/audio buffer sent by TTS
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (e) {
      console.error("[VoiceClient] Error playing audio:", e);
    }
  }

  public async startRecording() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[VoiceClient] Cannot start recording, WS not open.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
          // Send raw audio blobs to backend (FastAPI will read as bytes)
          this.ws.send(e.data);
        }
      };

      // Slice audio into 500ms chunks to stream
      this.mediaRecorder.start(500);
      this.isRecording = true;
      console.log("[VoiceClient] Recording started...");
    } catch (err) {
      console.error("[VoiceClient] Microphone access denied:", err);
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      this.isRecording = false;
      console.log("[VoiceClient] Recording stopped.");
    }
  }

  public sendManualEvent(eventName: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "EVENT", event: eventName }));
    }
  }

  public disconnect() {
    this.stopRecording();
    if (this.ws) {
      this.ws.close();
    }
  }
}
