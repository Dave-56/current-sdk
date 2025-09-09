// Frame sampling at 1 FPS
export class FrameSampler {
  private intervalId: number | null = null;
  private fps: number;
  private callback: ((frame: string) => void) | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(fps: number = 1) {
    this.fps = fps;
  }
  
  start(callback: (frame: string) => void, video: HTMLVideoElement): void {
    this.callback = callback;
    this.video = video;
    
    // Create canvas for frame capture
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    if (!this.ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Set canvas size to match video
    this.canvas.width = video.videoWidth || 640;
    this.canvas.height = video.videoHeight || 480;
    
    // Start sampling at specified FPS
    const intervalMs = 1000 / this.fps;
    this.intervalId = window.setInterval(() => {
      this.captureFrame();
    }, intervalMs);
  }
  
  private captureFrame(): void {
    if (!this.video || !this.canvas || !this.ctx || !this.callback) {
      console.log('[SAMPLER] Missing components for frame capture');
      return;
    }
    
    // Ensure video is ready
    if (this.video.readyState < 2) {
      console.log('[SAMPLER] Video not ready, state:', this.video.readyState);
      return;
    }
    
    // Check video dimensions
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
      console.log('[SAMPLER] Video has no dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
      return;
    }
    
    // Draw current video frame to canvas
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    
    // Convert to base64 data URL with PNG for better quality
    const frameData = this.canvas.toDataURL('image/png');
    console.log('[SAMPLER] Captured frame, size:', frameData.length, 'bytes');
    this.callback(frameData);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.callback = null;
    this.video = null;
    
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    
    this.ctx = null;
  }
}
