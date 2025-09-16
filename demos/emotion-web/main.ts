// Current SDK Demo - Emotion Detection Showcase
import { Current } from '@current/sdk';
import { EmojiOverlay } from './emoji-overlay';

const video = document.getElementById('video') as HTMLVideoElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const ttsToggleBtn = document.getElementById('ttsToggleBtn') as HTMLButtonElement;
const emojiToggleBtn = document.getElementById('emojiToggleBtn') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLDivElement;
const instruction = document.getElementById('instruction') as HTMLDivElement;
const instructionText = document.getElementById('instructionText') as HTMLSpanElement;
const jsonOutput = document.getElementById('jsonOutput') as HTMLDivElement;
const jsonText = document.getElementById('jsonText') as HTMLPreElement;
const liveBadge = document.getElementById('liveBadge') as HTMLDivElement;

let session: any = null;
let emojiOverlay: EmojiOverlay | null = null;
const SHOW_METRICS = false; // Set to true to see metrics logs


// Update UI state
function updateStatus(newStatus: string, className: string) {
  status.textContent = newStatus;
  status.className = `status ${className}`;
}

function showInstruction(text: string, json: any) {
  instructionText.textContent = text;
  instruction.style.display = 'block';
  
  jsonText.textContent = JSON.stringify(json, null, 2);
  jsonOutput.style.display = 'block';
}

function hideInstruction() {
  instruction.style.display = 'none';
  jsonOutput.style.display = 'none';
}

// Start emotion detection
startBtn.addEventListener('click', async () => {
  try {
    updateStatus('Starting...', 'connecting');
    
    session = await Current.start({
      provider: 'gemini',
      mode: 'emotion',
      apiKey: (import.meta as any).env.VITE_GOOGLE_AI_API_KEY || 'your_google_ai_api_key_here',
      fps: 0.5, // 0.5 FPS (every 2 seconds) for faster testing
      tts: true,
      emitMetrics: false // Set to true to see metrics and throttling logs
    });
    
    // Create emoji overlay
    EmojiOverlay.addStyles();
    emojiOverlay = new EmojiOverlay();
    
    // Set the video element to display the camera stream
    session.setVideoElement(video);
    
    
    // Set up event listeners
    session.on('instruction', (msg: any) => {
      showInstruction(msg.text, msg.json);
      
      // Update emoji overlay with the response data
      if (emojiOverlay && msg.json.emotion && msg.json.emoji && msg.json.confidence) {
        const emojiSize = msg.json.context?.emojiSize || 'medium';
        emojiOverlay.updateEmotion(msg.json.emoji, emojiSize, msg.json.confidence);
      }
      
      console.log('😊 Emotion Detected:', msg);
    });
    
    session.on('state', (state: string) => {
      console.log('📊 State:', state);
      if (state === 'running') {
        updateStatus('Emotion Detection Active', 'running');
        liveBadge.style.display = 'block';
      }
    });
    
    session.on('error', (error: Error) => {
      console.error('❌ Error:', error);
      
      // Handle validation errors differently
      if (error.message.includes('Invalid JSON schema')) {
        updateStatus('AI response invalid - retrying...', 'connecting');
        console.warn('🔄 Validation failed, retrying...');
      } else {
        updateStatus(`Error: ${error.message}`, 'stopped');
      }
    });
    
    session.on('metric', (metric: any) => {
      if (SHOW_METRICS) {
        console.log('📈 Metrics:', metric);
        console.log(`FPS: ${metric.fps.toFixed(1)}, Latency: ${metric.latencyMs}ms`);
      }
    });
    
    session.on('throttle', (throttle: any) => {
      if (SHOW_METRICS) {
        console.log('🚦 Throttled:', throttle.message);
      }
    });
    
    startBtn.disabled = true;
    startBtn.style.display = 'none';
    stopBtn.disabled = false;
    stopBtn.style.display = 'inline-block';
    ttsToggleBtn.disabled = false;
    ttsToggleBtn.style.display = 'inline-block';
    emojiToggleBtn.disabled = false;
    emojiToggleBtn.style.display = 'inline-block';
    
  } catch (error) {
    console.error('❌ Failed to start:', error);
    updateStatus(`Failed to start: ${error}`, 'stopped');
  }
});

// Stop emotion detection
stopBtn.addEventListener('click', () => {
  if (session) {
    session.stop();
    session = null;
  }
  
  // Destroy emoji overlay
  if (emojiOverlay) {
    emojiOverlay.destroy();
    emojiOverlay = null;
  }
  
  updateStatus('Stopped', 'stopped');
  hideInstruction();
  liveBadge.style.display = 'none';
  
  startBtn.disabled = false;
  startBtn.style.display = 'inline-block';
  stopBtn.disabled = true;
  stopBtn.style.display = 'none';
  ttsToggleBtn.disabled = true;
  ttsToggleBtn.style.display = 'none';
  emojiToggleBtn.disabled = true;
  emojiToggleBtn.style.display = 'none';
});

// Toggle TTS
ttsToggleBtn.addEventListener('click', () => {
  if (session) {
    const isEnabled = session.isTTSEnabled();
    session.setTTSEnabled(!isEnabled);
    
    // Update button appearance
    if (!isEnabled) {
      ttsToggleBtn.textContent = '🔊 TTS On';
      ttsToggleBtn.classList.remove('muted');
    } else {
      ttsToggleBtn.textContent = '🔇 TTS Off';
      ttsToggleBtn.classList.add('muted');
    }
    
    console.log('🔊 TTS toggled:', !isEnabled);
  }
});

// Toggle emoji overlay
emojiToggleBtn.addEventListener('click', () => {
  if (emojiOverlay) {
    const isVisible = emojiOverlay.visible;
    
    if (isVisible) {
      emojiOverlay.hide();
      emojiToggleBtn.textContent = '😊 Emoji On';
      emojiToggleBtn.classList.remove('muted');
    } else {
      emojiOverlay.show();
      emojiToggleBtn.textContent = '😐 Emoji Off';
      emojiToggleBtn.classList.add('muted');
    }
    
    console.log('😊 Emoji overlay toggled:', !isVisible);
  }
});

// Initialize
updateStatus('Ready to start', 'stopped');
