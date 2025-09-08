// Cooking Assistant Demo
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
    
    // TODO: Replace with real Current.start() when implemented
    session = await Current.start({
      provider: 'gemini',
      mode: 'cooking',
      fps: 1,
      tts: true
    });
    
    // Set up video stream
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    
    // Set up event listeners
    session.on('instruction', (msg: any) => {
      showInstruction(msg.text, msg.json);
      console.log('Instruction:', msg);
    });
    
    session.on('state', (state: string) => {
      console.log('State changed:', state);
      if (state === 'running') {
        updateStatus('Cooking Assistant Active', 'running');
        liveBadge.style.display = 'block';
      }
    });
    
    session.on('error', (error: Error) => {
      console.error('Error:', error);
      updateStatus(`Error: ${error.message}`, 'stopped');
    });
    
    session.on('metric', (metric: any) => {
      console.log('Metrics:', metric);
    });
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
  } catch (error) {
    console.error('Failed to start:', error);
    updateStatus(`Failed to start: ${error}`, 'stopped');
  }
});

// Stop cooking assistant
stopBtn.addEventListener('click', () => {
  if (session) {
    session.stop();
    session = null;
  }
  
  // Stop video stream
  if (video.srcObject) {
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
  
  updateStatus('Stopped', 'stopped');
  hideInstruction();
  liveBadge.style.display = 'none';
  
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// Initialize
updateStatus('Ready to start', 'stopped');
