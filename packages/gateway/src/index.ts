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
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received frame data, sending dummy response');
      
      // Echo dummy JSON response with frameId for latency tracking
      const dummyResponse = {
        cue: 'stir_now',
        confidence: 0.8,
        timestamp: Date.now(),
        frameId: message.frameId // Include frameId for latency calculation
      };
      
      ws.send(JSON.stringify(dummyResponse));
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
