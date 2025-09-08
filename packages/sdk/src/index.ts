// Current SDK - Main entry point
import { CameraCapture } from './camera';
import { FrameSampler } from './sampler';
import { Transport } from './transport';
import { MetricsTracker, Metric } from './metrics';

export class Current {
  static async start(config: CurrentConfig): Promise<CurrentSession> {
    console.log('[CURRENT] Starting Current SDK with config:', {
      provider: config.provider,
      mode: config.mode,
      fps: config.fps,
      tts: config.tts
    });
    
    const session = new CurrentSession();
    
    try {
      // Start camera
      const camera = new CameraCapture();
      await camera.start();
      
      // Create session and set up components
      session.setup(camera, config);
      
      return session;
    } catch (error) {
      // Emit error through the session
      const errorEvent = new Error(`Failed to start SDK: ${error}`);
      console.error('[CURRENT] Start error:', errorEvent);
      throw errorEvent;
    }
  }
}

export interface CurrentConfig {
  provider: 'gemini' | 'openai';
  mode: 'cooking' | 'fitness';
  fps?: number;
  tts?: boolean;
}

export class CurrentSession {
  private eventListeners: Map<string, Function[]> = new Map();
  private camera: CameraCapture | null = null;
  private sampler: FrameSampler | null = null;
  private transport: Transport | null = null;
  private config: CurrentConfig | null = null;
  private isRunning = false;
  private metrics: MetricsTracker = new MetricsTracker();

  setup(camera: CameraCapture, config: CurrentConfig): void {
    this.camera = camera;
    this.config = config;
    
    // Create frame sampler
    this.sampler = new FrameSampler(config.fps || 1);
    
    // Create transport and connect to gateway
    this.connectToGateway();
  }

  // Method to set video element for UI display
  setVideoElement(videoElement: HTMLVideoElement): void {
    if (this.camera) {
      this.camera.setVideoElement(videoElement);
    }
  }

  private async connectToGateway(): Promise<void> {
    try {
      this.emit('state', 'connecting');
      
      // Create session with gateway
      const response = await fetch('http://localhost:3001/v1/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: this.config?.mode || 'cooking' })
      });
      
      const { wsUrl } = await response.json();
      
      // Create WebSocket transport
      this.transport = new Transport(wsUrl);
      await this.transport.connect();
      
      // Set up message handling
      this.transport.onMessage((data) => {
        this.handleInstruction(data);
      });
      
      // Start frame sampling
      this.startSampling();
      
      this.emit('state', 'running');
      this.isRunning = true;
      
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  private startSampling(): void {
    if (!this.camera || !this.sampler || !this.transport) {
      return;
    }

    const video = this.camera.getVideoElement();
    if (!video) {
      this.emit('error', new Error('Video element not available'));
      return;
    }

    // Start metrics tracking
    this.metrics.start();

    this.sampler.start((frameData) => {
      if (this.transport && this.isRunning) {
        // Record when frame is sent
        const frameId = this.metrics.recordFrameSent();
        
        // Send frame with ID for tracking
        this.transport.send(JSON.stringify({ frame: frameData, frameId }));
        
        // Emit metrics every 10 frames
        if (this.metrics.getFrameCount() > 0 && this.metrics.getFrameCount() % 10 === 0) {
          const metric: Metric = {
            fps: this.metrics.getFPS(),
            latencyMs: this.metrics.getAverageLatency(),
            timestamp: Date.now()
          };
          this.emit('metric', metric);
        }
      }
    }, video);
  }

  private handleInstruction(data: any): void {
    // Record response received for latency calculation
    if (data.frameId) {
      const latency = this.metrics.recordResponseReceived(data.frameId);
      console.log(`[CURRENT] Response latency: ${latency}ms`);
    }
    
    // Convert JSON response to instruction message
    const instruction: InstructionMessage = {
      json: data,
      text: this.formatInstruction(data),
      timestamp: Date.now()
    };
    
    this.emit('instruction', instruction);
  }

  private formatInstruction(data: any): string {
    // Simple text formatting based on the JSON response
    if (data.cue) {
      return `Cooking instruction: ${data.cue.replace(/_/g, ' ')} (confidence: ${Math.round(data.confidence * 100)}%)`;
    }
    return JSON.stringify(data);
  }

  // Emit method - fires events to all registered listeners (instruction, state, error, metric)
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[CURRENT] Error in event listener for ${event}:`, error);
      }
    });
  }
  
  on(event: 'instruction', callback: (msg: InstructionMessage) => void): void;
  on(event: 'state', callback: (state: SessionState) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: 'metric', callback: (metric: Metric) => void): void;
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
    console.log(`[CURRENT] Added listener for event: ${event}`);
  }
  
  stop(): void {
    console.log('[CURRENT] Stopping session');
    
    this.isRunning = false;
    
    // Stop metrics tracking
    this.metrics.stop();
    
    if (this.sampler) {
      this.sampler.stop();
    }
    
    if (this.transport) {
      this.transport.close();
    }
    
    if (this.camera) {
      this.camera.stop();
    }
    
    this.emit('state', 'stopped');
    this.eventListeners.clear();
  }
}

export interface InstructionMessage {
  json: any;
  text: string;
  timestamp: number;
}

export type SessionState = 'connecting' | 'running' | 'speaking' | 'stopped';
