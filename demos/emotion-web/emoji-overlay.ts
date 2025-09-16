// Emoji overlay for real-time emotion reflection
export class EmojiOverlay {
  private overlay: HTMLDivElement | null = null;
  private currentEmoji: string = '😐';
  private isVisible: boolean = false;

  constructor() {
    this.createOverlay();
  }

  private createOverlay(): void {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 120px;
      height: 120px;
      background: rgba(255, 255, 255, 0.9);
      border: 3px solid #007bff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    `;
    
    // Add emoji display
    this.overlay.textContent = this.currentEmoji;
    
    // Initially hidden
    this.overlay.style.display = 'none';
    
    document.body.appendChild(this.overlay);
    console.log('[EMOJI_OVERLAY] Created emoji overlay');
  }

  updateEmotion(emoji: string, size: string = 'medium', confidence: number = 0.5): void {
    if (!this.overlay) return;

    this.currentEmoji = emoji;
    
    // Update emoji display
    this.overlay.textContent = emoji;
    
    // Update size based on intensity
    const sizeMap = {
      small: '32px',
      medium: '48px', 
      large: '64px'
    };
    
    this.overlay.style.fontSize = sizeMap[size as keyof typeof sizeMap] || '48px';
    
    // Add pulse animation for high confidence
    if (confidence > 0.8) {
      this.overlay.style.animation = 'emoji-pulse 0.5s ease-in-out';
      setTimeout(() => {
        if (this.overlay) {
          this.overlay.style.animation = '';
        }
      }, 500);
    }
    
    // Show overlay if not already visible
    if (!this.isVisible) {
      this.show();
    }
    
    console.log(`[EMOJI_OVERLAY] Updated to ${emoji} (${size}, confidence: ${confidence.toFixed(2)})`);
  }

  show(): void {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.isVisible = true;
      console.log('[EMOJI_OVERLAY] Overlay shown');
    }
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.isVisible = false;
      console.log('[EMOJI_OVERLAY] Overlay hidden');
    }
  }

  setPosition(x: number, y: number): void {
    if (this.overlay) {
      this.overlay.style.left = `${x}px`;
      this.overlay.style.top = `${y}px`;
      this.overlay.style.right = 'auto';
    }
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.isVisible = false;
      console.log('[EMOJI_OVERLAY] Overlay destroyed');
    }
  }

  get visible(): boolean {
    return this.isVisible;
  }

  // Add CSS animation for pulse effect
  static addStyles(): void {
    if (document.getElementById('emoji-overlay-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'emoji-overlay-styles';
    style.textContent = `
      @keyframes emoji-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      .emoji-overlay-container {
        font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
      }
    `;
    
    document.head.appendChild(style);
  }
}
