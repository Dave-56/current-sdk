// Current Gateway - API server
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { AIServiceFactory } from './services/ai-service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Check for --emit-metrics flag
const emitMetrics = process.argv.includes('--emit-metrics');

// Simple MVP: Single AI service instance
let aiService: any;
let currentMode: string;
let currentSchema: any;

app.use(cors());
app.use(express.json());

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});

// WebSocket server on same port as HTTP server
const wss = new WebSocketServer({ server, path: '/v1/stream' });

// Create session endpoint
app.post('/v1/session', (req, res) => {
  const { provider, apiKey, mode, schema } = req.body;
  
  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Provider and API key are required' });
  }
  
  const sessionId = `session_${Date.now()}`;
  const wsUrl = `ws://localhost:${PORT}/v1/stream?sessionId=${sessionId}`;
  
  try {
    // Create/update AI service (MVP: single instance)
    aiService = AIServiceFactory.create(provider, apiKey);
    currentMode = mode;
    
    // Use custom schema if provided, otherwise use default for mode
    currentSchema = schema || null;
    
    console.log(`AI service updated: provider=${provider}, mode=${currentMode}, customSchema=${!!schema}`);
    res.json({ sessionId, wsUrl });
  } catch (error) {
    console.error('Failed to create AI service:', error);
    res.status(500).json({ error: 'Failed to initialize AI service' });
  }
});

wss.on('connection', (ws) => {
  if (emitMetrics) {
    console.log('Client connected to WebSocket');
  }
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      let frameData;
      let frameId;
      let imageData;
      
      try {
        frameData = JSON.parse(message.frame);
        const innerFrameData = JSON.parse(frameData.frame);
        frameId = innerFrameData.frameId;
        imageData = innerFrameData.data;
      } catch (parseError) {
        console.error('Failed to parse frame data:', parseError);
        return;
      }
      
      // Only analyze every 4th frame to avoid rate limiting
      if (frameId && parseInt(frameId) % 4 === 0) {
        if (!aiService) {
          console.error('No AI service available');
          return;
        }
        
        if (!imageData || imageData.trim() === '') {
          return;
        }
        
        try {
          const aiResponse = await aiService.analyzeVideoStream(imageData, currentMode, currentSchema);
          
          const response = {
            ...aiResponse,
            timestamp: Date.now(),
            frameId: frameId.toString()
          };
          
          ws.send(JSON.stringify(response));
        } catch (aiError) {
          console.error('AI analysis failed:', aiError);
          
          // Generate appropriate fallback based on mode
          let fallbackResponse;
          if (currentMode === 'emotion') {
            fallbackResponse = {
              emotion: "neutral",
              confidence: 0.1,
              text: "Unable to detect emotion",
              timestamp: Date.now(),
              frameId: frameId.toString()
            };
          } else if (currentMode === 'cooking') {
            fallbackResponse = {
              cue: "wait",
              confidence: 0.1,
              text: "Unable to provide cooking instruction",
              timestamp: Date.now(),
              frameId: frameId.toString()
            };
          } else {
            fallbackResponse = {
              action: "wait",
              confidence: 0.1,
              text: "Analysis failed",
              timestamp: Date.now(),
              frameId: frameId.toString()
            };
          }
          
          ws.send(JSON.stringify(fallbackResponse));
        }
      } else {
        if (emitMetrics) {
          console.log('Skipping frame:', frameId);
        }
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    if (emitMetrics) {
      console.log('Client disconnected from WebSocket');
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});
