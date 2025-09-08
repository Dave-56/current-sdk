// WebSocket client for communication with gateway
export class Transport {
  constructor(wsUrl: string) {
    // TODO: Implement in Day 1
  }
  
  connect(): Promise<void> {
    // TODO: Implement in Day 1
    throw new Error('Not implemented yet');
  }
  
  send(frame: string): void {
    // TODO: Implement in Day 1
  }
  
  onMessage(callback: (data: any) => void): void {
    // TODO: Implement in Day 1
  }
  
  close(): void {
    // TODO: Implement in Day 1
  }
}
