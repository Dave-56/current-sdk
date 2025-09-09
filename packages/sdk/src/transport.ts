// WebSocket client for communication with gateway
export class Transport {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private messageCallback: ((data: any) => void) | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isManualClose: boolean = false;

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
  }
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          console.log('[TRANSPORT] WebSocket connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            // Handle pong frames (binary)
            if (event.data instanceof ArrayBuffer) {
              return; // Ignore pong frames
            }
            
            const data = JSON.parse(event.data);
            if (this.messageCallback) {
              this.messageCallback(data);
            }
          } catch (error) {
            console.error('[TRANSPORT] Failed to parse message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('[TRANSPORT] WebSocket closed', event.code, event.reason, 'wasClean:', event.wasClean);
          this.stopHeartbeat();
          this.ws = null;
          
          // Attempt to reconnect if not manually closed
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };
        
        // Note: pong frames are handled automatically by the WebSocket implementation
        
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
    this.isManualClose = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(`[TRANSPORT] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[TRANSPORT] Reconnection failed:', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[TRANSPORT] Max reconnection attempts reached');
        }
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }
}
