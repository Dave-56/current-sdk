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
    
    // Set canvas size to match video - wait for video to be ready
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
    } else {
      // Fallback dimensions
      this.canvas.width = 640;
      this.canvas.height = 480;
      console.warn('[SAMPLER] Using fallback canvas dimensions, video not ready');
    }
    
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
    
    // Ensure video is ready and has data
    if (this.video.readyState < 3) {
      return;
    }
    
    // Check if video is actually playing
    if (this.video.paused || this.video.ended) {
      return;
    }
    
    // Additional check: ensure video has current time (not stuck at 0)
    if (this.video.currentTime === 0 && this.video.duration > 0) {
      return;
    }
    
    // Check video dimensions
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
      return;
    }
    
    // Update canvas size to match video if needed
    if (this.canvas.width !== this.video.videoWidth || this.canvas.height !== this.video.videoHeight) {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
    }
    
    // Clear canvas first
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw current video frame to canvas
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    
    // Convert to base64 data URL with JPEG for Google AI compatibility
    const frameData = this.canvas.toDataURL('image/jpeg', 0.8);
    
    
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
