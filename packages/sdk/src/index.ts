// Current SDK - Main entry point
import { CameraCapture } from './camera';
import { FrameSampler } from './sampler';
import { Transport } from './transport';
import { MetricsTracker, Metric } from './metrics';
import { SchemaValidator, COOKING_INSTRUCTION_SCHEMA, EMOTION_INSTRUCTION_SCHEMA, DEFAULT_INSTRUCTION_SCHEMA } from '../../../shared/schemas/index.js';
import { TTS } from './tts';

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
  mode: 'cooking' | 'emotion';
  apiKey: string;  // Required API key for the provider
  schema?: any;  // Optional custom schema
  fps?: number;
  tts?: boolean;
  emitMetrics?: boolean;  // Optional flag to show metrics and throttling logs
}

export class CurrentSession {
  private eventListeners: Map<string, Function[]> = new Map();
  private camera: CameraCapture | null = null;
  private sampler: FrameSampler | null = null;
  private transport: Transport | null = null;
  private config: CurrentConfig | null = null;
  private isRunning = false;
  private metrics: MetricsTracker = new MetricsTracker();
  private schemaValidator!: SchemaValidator;
  private tts: TTS | null = null;
  private lastSpokenInstruction: string | null = null;
  private lastLLMRequest: number = 0;
  private minRequestInterval: number = 1000; // 1 second between requests for better emotion detection
  private responseTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private responseTTL: number = 10000; // 10 seconds cleanup
  private emitMetrics: boolean = false;

  setup(camera: CameraCapture, config: CurrentConfig): void {
    this.camera = camera;
    this.config = config;
    this.emitMetrics = config.emitMetrics || false;
    
    // Create schema validator - use custom schema if provided, otherwise use default
    const schema = config.schema || this.getDefaultSchema(config.mode);
    this.schemaValidator = new SchemaValidator(schema);
    
    // Create TTS if enabled
    if (config.tts) {
      this.tts = new TTS();
    }
    
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

  // Method to toggle TTS on/off
  setTTSEnabled(enabled: boolean): void {
    if (this.tts) {
      this.tts.setEnabled(enabled);
    }
  }

  // Method to check if TTS is enabled
  isTTSEnabled(): boolean {
    return this.tts ? this.tts.isEnabled() : false;
  }

  // Method to check if TTS is currently speaking
  isTTSSpeaking(): boolean {
    return this.tts ? this.tts.isSpeaking() : false;
  }

  // Method to set request throttling interval
  setRequestThrottle(intervalMs: number): void {
    this.minRequestInterval = intervalMs;
    console.log(`[CURRENT] Request throttle set to ${intervalMs}ms`);
  }

  // Method to set response cleanup TTL
  setResponseTTL(ttlMs: number): void {
    this.responseTTL = ttlMs;
    console.log(`[CURRENT] Response TTL set to ${ttlMs}ms`);
  }


  private async connectToGateway(): Promise<void> {
    try {
      this.emit('state', 'connecting');
      
      // Create session with gateway
      const response = await fetch('http://localhost:3001/v1/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: this.config?.mode || 'emotion',
          provider: this.config?.provider || 'gemini',
          apiKey: this.config?.apiKey,
          schema: this.config?.schema
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Session creation failed: ${response.status} ${errorData.error || response.statusText}`);
      }
      
      const { wsUrl } = await response.json();
      console.log('[CURRENT] Session created successfully, WebSocket URL:', wsUrl);
      
      // Create WebSocket transport
      this.transport = new Transport(wsUrl);
      await this.transport.connect();
      
      // Set up message handling
      this.transport.onMessage((data) => {
        // Handle pong responses
        if (data.type === 'pong') {
          console.log('[CURRENT] Received pong from server');
          return;
        }
        this.handleInstruction(data);
      });
      
    // Start frame sampling with a delay to ensure session and video are ready
    setTimeout(() => {
      this.startSampling();
    }, 2000); // Increased delay to ensure session is established
      
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
        // Check if enough time has passed since last request
        const now = Date.now();
        if (now - this.lastLLMRequest < this.minRequestInterval) {
          if (this.emitMetrics) {
            console.log('[CURRENT] Request throttled - too soon since last request');
          }
          return;
        }
        
        // Record when frame is sent
        const frameId = this.metrics.recordFrameSent();
        this.lastLLMRequest = now;
        
        // Extract base64 data from data URL
        const base64Data = frameData.includes(',') ? frameData.split(',')[1] : frameData;
        
        // Send frame with ID for tracking
        this.transport.send(JSON.stringify({ 
          frame: JSON.stringify({ 
            frameId: frameId, 
            data: base64Data 
          }) 
        }));
        
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
      if (this.emitMetrics) {
        console.log(`[CURRENT] Response latency: ${latency}ms`);
      }
      
      // Clear any existing timeout for this frameId
      if (this.responseTimeouts.has(data.frameId)) {
        clearTimeout(this.responseTimeouts.get(data.frameId)!);
      }
      
      // Set cleanup timeout for this response
      const timeout = setTimeout(() => {
        this.responseTimeouts.delete(data.frameId);
        console.log(`[CURRENT] Cleaned up response for frameId: ${data.frameId}`);
      }, this.responseTTL);
      
      this.responseTimeouts.set(data.frameId, timeout);
    }
    
    // Validate JSON against schema (if schema is provided) - but exclude SDK fields
    if (this.schemaValidator) {
      // Remove SDK fields before validation to avoid false positives
      const { timestamp, frameId, ...schemaData } = data;
      if (!this.schemaValidator.validateData(schemaData)) {
        const errors = this.schemaValidator.getErrors();
        console.warn('[CURRENT] Schema validation warnings (but accepting response):', errors);
        // Don't reject - just warn and continue
      }
    }
    
    console.log('[CURRENT] Valid JSON received:', data);
    
    // Convert JSON response to instruction message
    const instruction: InstructionMessage = {
      json: data,
      text: this.formatInstruction(data),
      timestamp: Date.now()
    };
    
    // Speak the instruction if TTS is enabled and instruction has changed
    if (this.tts && instruction.text !== this.lastSpokenInstruction) {
      const priority = data.priority || 'normal';
      this.tts.speak(instruction.text, priority);
      this.lastSpokenInstruction = instruction.text;
    }
    
    this.emit('instruction', instruction);
  }

  private getDefaultSchema(mode: string): any {
    // Return default schema based on mode
    if (mode === 'cooking') {
      return COOKING_INSTRUCTION_SCHEMA;
    }
    if (mode === 'emotion') {
      return EMOTION_INSTRUCTION_SCHEMA;
    }
    // For other modes, return default schema
    return DEFAULT_INSTRUCTION_SCHEMA;
  }

  private formatInstruction(data: any): string {
    // Use AI-provided text if available, otherwise fallback to generic
    if (data.text) {
      return data.text;
    }
    
    // Fallback for backward compatibility
    return `AI Response: ${JSON.stringify(data)}`;
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
    
    // Stop TTS
    if (this.tts) {
      this.tts.stop();
    }
    
    // Reset last spoken instruction
    this.lastSpokenInstruction = null;
    
    // Clear all response timeouts
    this.responseTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.responseTimeouts.clear();
    
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
