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

// Create session endpoint
app.post('/v1/session', (req, res) => {
  // TODO: Implement in Day 1
  const sessionId = `session_${Date.now()}`;
  const wsUrl = `ws://localhost:${PORT}/v1/stream?sessionId=${sessionId}`;
  
  res.json({ sessionId, wsUrl });
});

// WebSocket server
const wss = new WebSocketServer({ port: 3002 });

wss.on('connection', (ws, req) => {
  // TODO: Implement in Day 1
  console.log('Client connected');
  
  ws.on('message', (_data) => {
    // TODO: Echo dummy JSON in Day 1
    const dummyResponse = {
      cue: 'stir_now',
      confidence: 0.8,
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(dummyResponse));
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
  console.log(`WebSocket server running on port 3002`);
});
