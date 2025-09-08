// Metrics calculation and tracking for Current SDK
export class MetricsTracker {
  private frameCount = 0;
  private startTime = 0;
  private frameSentTimes: Map<number, number> = new Map();
  private frameId = 0;

  start(): void {
    this.startTime = Date.now();
    this.frameCount = 0;
    this.frameSentTimes.clear();
    this.frameId = 0;
  }

  recordFrameSent(): number {
    const frameId = ++this.frameId;
    const sentTime = Date.now();
    this.frameSentTimes.set(frameId, sentTime);
    this.frameCount++;
    return frameId;
  }

  recordResponseReceived(frameId: number): number {
    const receivedTime = Date.now();
    const sentTime = this.frameSentTimes.get(frameId);
    
    if (sentTime) {
      const latency = receivedTime - sentTime;
      this.frameSentTimes.delete(frameId);
      return latency;
    }
    
    return 0;
  }

  getFPS(): number {
    if (this.startTime === 0) return 0;
    const elapsed = Date.now() - this.startTime;
    return (this.frameCount / elapsed) * 1000;
  }

  getAverageLatency(): number {
    const latencies = Array.from(this.frameSentTimes.values());
    if (latencies.length === 0) return 0;
    
    const now = Date.now();
    const recentLatencies = latencies
      .filter(sentTime => now - sentTime < 10000) // Only last 10 seconds
      .map(sentTime => now - sentTime);
    
    if (recentLatencies.length === 0) return 0;
    
    return recentLatencies.reduce((sum, latency) => sum + latency, 0) / recentLatencies.length;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  stop(): void {
    this.startTime = 0;
    this.frameCount = 0;
    this.frameSentTimes.clear();
    this.frameId = 0;
  }
}

export interface Metric {
  fps: number;
  latencyMs: number;
  timestamp: number;
}
