// Current SDK Demo - Feature Showcase
import { Current } from '@current/sdk';

const video = document.getElementById('video') as HTMLVideoElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLDivElement;
const instruction = document.getElementById('instruction') as HTMLDivElement;
const instructionText = document.getElementById('instructionText') as HTMLSpanElement;
const jsonOutput = document.getElementById('jsonOutput') as HTMLDivElement;
const jsonText = document.getElementById('jsonText') as HTMLPreElement;
const liveBadge = document.getElementById('liveBadge') as HTMLDivElement;

let session: any = null;

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

// Start cooking assistant
startBtn.addEventListener('click', async () => {
  try {
    updateStatus('Starting...', 'connecting');
    
    session = await Current.start({
      provider: 'gemini',
      mode: 'cooking',
      fps: 1,
      tts: true
    });
    
    // Set the video element to display the camera stream
    session.setVideoElement(video);
    
    // Set up event listeners
    session.on('instruction', (msg: any) => {
      showInstruction(msg.text, msg.json);
      console.log('🤖 AI Instruction:', msg);
    });
    
    session.on('state', (state: string) => {
      console.log('📊 State:', state);
      if (state === 'running') {
        updateStatus('Cooking Assistant Active', 'running');
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
      console.log('📈 Metrics:', metric);
      console.log(`FPS: ${metric.fps.toFixed(1)}, Latency: ${metric.latencyMs}ms`);
    });
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
  } catch (error) {
    console.error('❌ Failed to start:', error);
    updateStatus(`Failed to start: ${error}`, 'stopped');
  }
});

// Stop cooking assistant
stopBtn.addEventListener('click', () => {
  if (session) {
    session.stop();
    session = null;
  }
  
  updateStatus('Stopped', 'stopped');
  hideInstruction();
  liveBadge.style.display = 'none';
  
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// Initialize
updateStatus('Ready to start', 'stopped');
