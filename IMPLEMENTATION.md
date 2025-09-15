# Multimodal SDK Implementation Plan

> **Goal**: Ship the most minimal SDK that proves "video in → JSON + speech out" in 3 days.

## 🎯 MVP Scope (Keep It Simple)

**What we ARE building:**
- Camera → Frame → Gemini Live → JSON + TTS
- Two demo apps (emotion assistant, tennis coach)
- Basic TypeScript SDK
- NPM package

**What we're NOT building yet:**
- Complex error handling
- Multiple LLM providers
- Advanced frame processing
- Custom UI components
- Mobile support


## 📅 3-Day Sprint Plan (Minimal, High-Confidence)

### Day 1 — Loop & Demo Skeleton

**Goals**
- Capture camera, sample 1 FPS, send over WS, receive dummy echo
- Hard-code JSON response (no real LLM yet) to prove event flow

**Tasks**
- **SDK**: `Current.start()/stop()`, `on("instruction"|"error"|"state")`
- **Camera + sampler** (1 FPS), background worker
- **Gateway**: `/v1/session`, `/v1/stream` (WS) that echoes a canned JSON `{cue:"stir_now",confidence:0.8}`
- **Demo page**: Start/Stop buttons, video preview, console logs

**Acceptance**
- Click Start → see instruction events every ~1s with canned JSON
- Stop cleanly closes WS, no console errors

### Day 2 — Real Model + JSON Validation (+ Optional TTS)

**Goals**
- Swap echo for real provider (Gemini Live or OpenAI Realtime)
- Validate JSON against schema, surface msg.text
- (Optional) speech with Web Speech API for speed

**Tasks**
- **Gateway**: forward frames to provider, stream responses back
- **SDK**: AJV schema validate; map JSON → msg.text templates
- **TTS**: use browser Speech Synthesis (no vendor dependency for MVP)
- **Basic metrics** to console: fps, latencyMs, errors

**Acceptance**
- Moving objects in camera → model emits plausible JSON cues
- Invalid JSON is retried or dropped with error event
- Optional TTS speaks cues; can be muted

### Day 3 — Polish, Edge Cases, and Pitch Flow

**Goals**
- Stable start/stop, graceful errors, clean demo script
- One-pager README (this doc) + gif/screen recording

**Tasks**
- Add state events (connecting, running, stopped)
- Timeouts/backoff if provider is slow; drop frames (don't backlog)
- Demo UI: toast with msg.text, a small "Live" badge
- Record 30–60s demo video; finalize README; deploy demo (Vercel/Netlify)
- Add mode presets: "tennis" & "basketball" (same schema, different cue words)

**Acceptance**
- Live demo runs for 2–3 minutes without freeze
- Clear logs: fps ~1, end-to-end latency within demo tolerance (sub-2.5s)
- README + link to hosted demo + repo builds clean

## 🧪 Test Checklist (MVP)

- [ ] Start → instruction within 2–3s
- [ ] Stop → no lingering mic/cam indicators, WS closed
- [ ] No explosion on denied camera permission (emit error)
- [ ] JSON always validates or is dropped with an error log
- [ ] TTS can be toggled; barge-in optional for later

## 🚀 Stretch (post-MVP, if time allows)

- [ ] Privacy toggle: `privacy: "frames" | "keypoints"` (keypoints later)
- [ ] React Native wrapper (share same event API)
- [ ] Metrics endpoint on gateway to count sessions/fps (for investor slide)

## 🚀 Success Criteria

By end of Day 3, we should have:

- [ ] Working SDK that captures camera → processes frames → returns JSON
- [ ] TTS integration working
- [ ] One polished demo app
- [ ] NPM package ready to publish
- [ ] Basic documentation

## 🛠️ Technical Decisions

### Why These Choices?

1. **Gemini Live over OpenAI**: Simpler API, better multimodal support
2. **Deepgram TTS**: Easiest integration, good quality
3. **Canvas for frame sampling**: Built-in, no external dependencies
4. **Vite for building**: Fast, simple, good TypeScript support
5. **1 FPS sampling**: Good balance of responsiveness vs API costs
