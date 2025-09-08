// Camera capture and preview
export class CameraCapture {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;

  async start(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      // Create video element for frame capture
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.autoplay = true;
      this.video.muted = true;
      this.video.style.display = 'none';
      document.body.appendChild(this.video);
      
      return this.stream;
    } catch (error) {
      throw new Error(`Camera access failed: ${error}`);
    }
  }
  
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.video) {
      this.video.srcObject = null;
      this.video.remove();
      this.video = null;
    }
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  // Set the camera stream on an external video element (for UI display)
  setVideoElement(videoElement: HTMLVideoElement): void {
    if (this.stream && videoElement) {
      videoElement.srcObject = this.stream;
    }
  }
}
