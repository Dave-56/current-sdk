// WebSocket client for communication with gateway
export class Transport {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private messageCallback: ((data: any) => void) | null = null;

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
  }
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          console.log('[TRANSPORT] WebSocket connected');
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (this.messageCallback) {
              this.messageCallback(data);
            }
          } catch (error) {
            console.error('[TRANSPORT] Failed to parse message:', error);
          }
        };
        
        this.ws.onclose = () => {
          console.log('[TRANSPORT] WebSocket closed');
          this.ws = null;
        };
        
        this.ws.onerror = (error) => {
          console.error('[TRANSPORT] WebSocket error:', error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  send(frame: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ frame }));
    } else {
      console.warn('[TRANSPORT] WebSocket not connected, cannot send frame');
    }
  }
  
  onMessage(callback: (data: any) => void): void {
    this.messageCallback = callback;
  }
  
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
