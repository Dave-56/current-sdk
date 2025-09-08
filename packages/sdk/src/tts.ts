// Text-to-speech using Web Speech API
export class TTS {
  private enabled: boolean = true;
  private speechSynthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    console.log('[TTS] Initialized with Web Speech API');
  }
  
  speak(text: string, priority: 'high' | 'normal' = 'normal'): void {
    if (!this.enabled) {
      console.log('[TTS] TTS disabled, skipping speech');
      return;
    }

    // High priority always interrupts, normal priority only interrupts if not speaking
    if (priority === 'high' || !this.isSpeaking()) {
      this.stop();
    } else {
      console.log('[TTS] Normal priority instruction skipped - already speaking');
      return;
    }

    try {
      this.currentUtterance = new SpeechSynthesisUtterance(text);
      
      // Configure speech settings
      this.currentUtterance.rate = 0.9;  // Slightly slower for clarity
      this.currentUtterance.pitch = 1.0;
      this.currentUtterance.volume = 0.8;

      // Set voice if available
      const voices = this.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Female')
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      
      if (preferredVoice) {
        this.currentUtterance.voice = preferredVoice;
      }

      // Speak
      this.speechSynthesis.speak(this.currentUtterance);
      console.log(`[TTS] Speaking (${priority} priority):`, text);
      
    } catch (error) {
      console.error('[TTS] Error speaking text:', error);
    }
  }
  
  stop(): void {
    if (this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
      console.log('[TTS] Speech stopped');
    }
    this.currentUtterance = null;
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
    console.log('[TTS] TTS enabled:', enabled);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isSpeaking(): boolean {
    return this.speechSynthesis.speaking;
  }
}
