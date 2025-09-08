// Current SDK - Main entry point
export class Current {
  static async start(config: CurrentConfig): Promise<CurrentSession> {
    console.log('[CURRENT] Starting Current SDK with config:', {
      provider: config.provider,
      mode: config.mode,
      fps: config.fps,
      tts: config.tts
    });
    
    // TODO: Implement in Day 1
    throw new Error('Not implemented yet');
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
    this.eventListeners.clear();
  }
  
  // TODO: Implement emit method when we add real functionality
  // emit() would fire events to all registered listeners (instruction, state, error, metric)
}

export interface InstructionMessage {
  json: any;
  text: string;
  timestamp: number;
}

export type SessionState = 'connecting' | 'running' | 'speaking' | 'stopped';

export interface Metric {
  fps: number;
  latencyMs: number;
}
