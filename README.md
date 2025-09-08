# Current SDK

> **The Twilio for video+LLM** - Turn any camera stream into structured JSON + speech in 3 lines of code.

## 🎯 Vision

Make "see what I see, tell me what to do next" as simple as sending a text message. We're building the infrastructure layer that makes real-time multimodal apps as easy as text chat.

## 🚀 MVP Goal

**Ship the most minimal SDK that proves the core value prop**: `video in → JSON + speech out`

### What We're Building

No WebRTC/WebSocket/TTS/JSON plumbing—batteries-included.

## ✨ What you get (MVP)

- **SDK (Web)**: `start()`, `stop()`, `on("instruction")`, `on("error")`, `on("state")`
- **Structured JSON** back from the model (schema-validated)
- **Optional TTS** (speak instructions)
- **Basic observability** (console logs: fps, latency, errors)
- **Demo app**: "AI Cooking Assistant" (camera on → JSON cue → spoken guidance)

## 🚀 Quickstart (dev UX)

```javascript
import { Current } from "@current/sdk";

// 1) Start session
const session = await Current.start({
  provider: "gemini",   // or "openai"
  mode: "cooking",      // prompt preset
  fps: 1,
  tts: true,            // optional speech out
});

// 2) React to instructions
session.on("instruction", (msg) => {
  // Machine-usable JSON
  console.log(msg.json);  // e.g., { cue: "stir_now", confidence: 0.87 }
  // Human-friendly text
  ui.show(msg.text);      // "Stir your eggs now"
});

// 3) Stop when done
session.stop();
```

**That's it.** Current handles camera permission, frame sampling, background send, JSON parsing, and (optionally) TTS.

## 📡 Event Catalog (MVP)

- **`instruction`** → `{ json, text, timestamp }`
- **`state`** → `"connecting" | "running" | "speaking" | "stopped"`
- **`error`** → `{ code, message }`
- **`metric`** (optional dev flag) → `{ fps, latencyMs }` (console only for MVP)

## 📋 JSON Schema (MVP "cooking" preset)

```json
{
  "type": "object",
  "required": ["cue", "confidence"],
  "properties": {
    "cue": {
      "type": "string",
      "enum": ["stir_now", "flip_pancake", "wait", "reduce_heat", "add_ingredient"]
    },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "ingredient": { "type": "string" },
    "note": { "type": "string" }
  },
  "additionalProperties": false
}
```

## 🏗️ Minimal Architecture (MVP)

```
[App UI]  ← events  ┌───────────────────────────────────────────┐
   │                 │           Current SDK (Web)              │
   │ start/stop      │ - Camera permission + preview            │
   ├───────────────▶ │ - Frame sampler (1 FPS)                  │
   │                 │ - Background worker: send/receive        │
   │  instruction ◀─ │ - JSON schema validate + text render     │
   │  state/error ◀─ │ - Optional TTS playback                  │
   │                 └───────────────┬──────────────────────────┘
   │                                 │ WS/WebRTC (one stream)
   ▼                                 ▼
                         Current Gateway (API) — thin proxy
                         - Auth / session broker
                         - Routes to Gemini Live / OpenAI Realtime
                         - Returns model messages
```

**MVP observability** = console logs from SDK. (Gateway stores nothing yet.)

## 📁 File Layout (MVP)

```
current/
├─ packages/
│  ├─ sdk/                  # Web SDK
│  │  ├─ src/
│  │  │  ├─ index.ts        # Current.start / events
│  │  │  ├─ camera.ts       # getUserMedia + preview
│  │  │  ├─ sampler.ts      # 1 FPS
│  │  │  ├─ transport.ts    # WS client
│  │  │  ├─ schema.ts       # AJV validator
│  │  │  └─ tts.ts          # optional (simple Web Speech or provider)
│  │  └─ package.json
│  └─ gateway/              # Minimal Node/Express or Fastify
│     ├─ src/index.ts       # /v1/session (create), /v1/stream (WS)
│     └─ package.json
└─ demos/
   └─ cooking-web/
      ├─ index.html
      ├─ main.ts
      └─ vite.config.ts
```

## 🔌 Gateway API (MVP)

- **POST** `/v1/session` → `{ sessionId, wsUrl }`
- **WS** `/v1/stream?sessionId=...` (binary/text)

Client sends sampled frames (JPEG/WebP) or (later) keypoints

Gateway forwards to provider (Gemini Live / OpenAI Realtime)

Gateway streams back model messages → SDK parses to instruction

**Auth for MVP**: simple bearer token env var on gateway + client. No user accounts.

## 🤖 Model Prompt (MVP "cooking")

**System:**
"You are a realtime cooking assistant. You ONLY reply with strict JSON per this schema: … (paste the JSON schema). Use short cues that are actionable for the next 2–5 seconds. Do not add fields. If uncertain, return { "cue": "wait", "confidence": X }."

**User (streamed context):**
- "Mode: cooking"
- "User is cooking eggs on a stovetop."
- "Frame: <image>" (sent each second)

## 🎬 Demo Script (Investor-friendly)

1. Show 10 lines of app code (Quickstart)
2. Click "Start": camera turns on
3. Move pan / flip pancake → console shows JSON + UI shows spoken instruction
4. "Same SDK powers fitness/tutoring/safety. Camera in → JSON out."

## 🤝 Contributing

We're building this in public! Check out our [implementation plan](./IMPLEMENTATION.md) and join the conversation.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Ready to build the future of multimodal apps?** 🚀

[Get Started](#getting-started) • [View Examples](./examples/) • [Join Discord](https://discord.gg/multimodal-sdk)
