// Current SDK - Main entry point
export class Current {
  static async start(config: CurrentConfig): Promise<CurrentSession> {
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

export interface CurrentSession {
  on(event: 'instruction', callback: (msg: InstructionMessage) => void): void;
  on(event: 'state', callback: (state: SessionState) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: 'metric', callback: (metric: Metric) => void): void;
  stop(): void;
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
