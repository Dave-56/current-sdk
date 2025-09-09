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
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 12000; // 12 seconds between requests to stay within quota

app.use(cors());
app.use(express.json());

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});

// WebSocket server on same port as HTTP server
const wss = new WebSocketServer({ 
  server, 
  path: '/v1/stream',
  // Configure timeouts to prevent premature disconnections
  perMessageDeflate: false,
  maxPayload: 16 * 1024 * 1024 // 16MB max payload
});

// Create session endpoint
app.post('/v1/session', (req, res) => {
  const { provider, apiKey, mode, schema } = req.body;
  
  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Provider and API key are required' });
  }
  
  const sessionId = `session_${Date.now()}`;
  const wsUrl = `ws://localhost:${PORT}/v1/stream?sessionId=${sessionId}`;
  
  try {
    console.log(`Creating session: provider=${provider}, mode=${mode}, apiKey length=${apiKey?.length || 0}`);
    
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
  
  // Check if AI service is available
  if (!aiService) {
    console.warn('WebSocket connected but no AI service available yet');
  }
  
  // Set up keepalive for this connection
  const keepAliveInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(keepAliveInterval);
    }
  }, 30000); // Send ping every 30 seconds
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle ping messages
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }
      
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
      
      // Only analyze every 2nd frame to avoid rate limiting (better for emotion detection)
      if (frameId && parseInt(frameId) % 2 === 0) {
        if (!aiService) {
          console.error('No AI service available - session may not be created yet');
          // Send a fallback response to keep the connection alive
          const fallbackResponse = {
            emotion: "neutral",
            confidence: 0.1,
            text: "AI service not ready",
            timestamp: Date.now(),
            frameId: frameId.toString()
          };
          ws.send(JSON.stringify(fallbackResponse));
          return;
        }
        
        if (!imageData || imageData.trim() === '') {
          return;
        }
        
        try {
          // Rate limiting: Check if enough time has passed since last request
          const now = Date.now();
          const timeSinceLastRequest = now - lastRequestTime;
          
          if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            console.log(`[RATE_LIMIT] Skipping request - only ${timeSinceLastRequest}ms since last request (need ${MIN_REQUEST_INTERVAL}ms)`);
            
            // Send a rate-limited response
            const rateLimitResponse = {
              action: 'wait',
              confidence: 0.1,
              text: 'Rate limited - please wait',
              timestamp: now,
              frameId: frameId.toString()
            };
            ws.send(JSON.stringify(rateLimitResponse));
            return;
          }
          
          lastRequestTime = now;
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
  
  ws.on('close', (code, reason) => {
    clearInterval(keepAliveInterval);
    console.log('Client disconnected from WebSocket', code, reason.toString());
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(keepAliveInterval);
  });
});
