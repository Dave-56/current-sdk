// Current Gateway - API server
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});

// WebSocket server on same port as HTTP server
const wss = new WebSocketServer({ server, path: '/v1/stream' });

// Create session endpoint
app.post('/v1/session', (_req, res) => {
  const sessionId = `session_${Date.now()}`;
  const wsUrl = `ws://localhost:${PORT}/v1/stream?sessionId=${sessionId}`;
  
  res.json({ sessionId, wsUrl });
});

wss.on('connection', (ws, _req) => {
  console.log('Client connected to WebSocket');
  
  // Different cooking instructions to test TTS interruption
  const cookingInstructions = [
    { cue: 'stir_now', confidence: 0.8, priority: 'normal' },
    { cue: 'add_salt', confidence: 0.9, priority: 'normal' },
    { cue: 'reduce_heat', confidence: 0.7, priority: 'normal' },
    { cue: 'check_temperature', confidence: 0.85, priority: 'normal' },
    { cue: 'add_garlic', confidence: 0.75, priority: 'normal' },
    { cue: 'EMERGENCY_STOP', confidence: 0.95, priority: 'high' }, // High priority for testing
    { cue: 'remove_from_heat', confidence: 0.9, priority: 'normal' }
  ];
  
  // Test sequence for interruption: normal -> high priority cooking instructions
  const interruptionTestSequence = [
    { cue: 'slowly stir the mixture for about two minutes until it becomes smooth and creamy', confidence: 0.8, priority: 'normal' },
    { cue: 'EMERGENCY_STOP', confidence: 0.95, priority: 'high' }
  ];
  
  let instructionIndex = 0;
  let interruptionTestIndex = 0;
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Parse the nested frame data to get frameId
      const frameData = JSON.parse(message.frame);
      const frameId = frameData.frameId;
      
      console.log('FrameId:', frameId, 'Type:', typeof frameId);
      
      // Only send instruction every 4th message (2 seconds at 2 FPS)
      if (frameId && parseInt(frameId) % 4 === 0) {
        let currentInstruction;
        
        // Special interruption test sequence
        if (frameId === 4 || frameId === 8) {
          currentInstruction = interruptionTestSequence[interruptionTestIndex % interruptionTestSequence.length];
          interruptionTestIndex++;
          console.log('Sending interruption test instruction:', currentInstruction.cue);
        } else {
          currentInstruction = cookingInstructions[instructionIndex % cookingInstructions.length];
          instructionIndex++;
          console.log('Sending regular instruction:', currentInstruction.cue);
        }
        
        const dummyResponse = {
          cue: currentInstruction.cue,
          confidence: currentInstruction.confidence,
          priority: currentInstruction.priority,
          timestamp: Date.now(),
          frameId: frameId.toString()
        };
        
        ws.send(JSON.stringify(dummyResponse));
      } else {
        console.log('Skipping frame:', frameId, 'Modulo result:', frameId ? parseInt(frameId) % 8 : 'no frameId');
      }
      // Don't send any response for other frames - this prevents schema validation errors
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});
