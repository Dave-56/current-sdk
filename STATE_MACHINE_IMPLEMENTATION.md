# State Machine Implementation Plan

> **Goal**: Add intelligent state management to Current SDK with pre-built state machines (emotion, cooking) that are simple but extensible for custom visual agents.

## 🎯 **Phase 1: Core State Machine (Start Small)**

### **1.1 Basic State Machine Interface**

```typescript
// packages/sdk/src/state-machine.ts
export interface StateMachine {
  processInstruction(aiResponse: any): EnhancedResponse;
  getCurrentState(): string;
  reset(): void;
}

export interface EnhancedResponse {
  // Original AI response
  json: any;
  text: string;
  timestamp: number;
  
  // State context (automatically added)
  state: string;
  context: StateContext;
}

export interface StateContext {
  duration: number;        // How long in current state
  count: number;          // How many times this instruction repeated
  isNew: boolean;         // Is this a new instruction?
  metadata: any;          // Mode-specific data
}
```

### **1.2 Simple Base State Machine**

```typescript
// packages/sdk/src/state-machine.ts
export abstract class BaseStateMachine implements StateMachine {
  protected currentState: string = 'idle';
  protected stateStartTime: number = Date.now();
  protected instructionCount: number = 0;
  protected lastInstruction: string = '';
  
  abstract processInstruction(aiResponse: any): EnhancedResponse;
  
  getCurrentState(): string {
    return this.currentState;
  }
  
  reset(): void {
    this.currentState = 'idle';
    this.stateStartTime = Date.now();
    this.instructionCount = 0;
    this.lastInstruction = '';
  }
  
  protected transitionTo(newState: string): void {
    this.currentState = newState;
    this.stateStartTime = Date.now();
    this.instructionCount = 0;
  }
  
  protected addBasicContext(aiResponse: any): StateContext {
    const now = Date.now();
    const isNew = aiResponse.text !== this.lastInstruction;
    
    if (isNew) {
      this.instructionCount = 1;
    } else {
      this.instructionCount++;
    }
    
    this.lastInstruction = aiResponse.text;
    
    return {
      duration: now - this.stateStartTime,
      count: this.instructionCount,
      isNew: isNew,
      metadata: {}
    };
  }
}
```

## 🚀 **Phase 2: Pre-built State Machines (Simple)**

### **2.1 Cooking State Machine**

```typescript
// packages/sdk/src/state-machines/cooking.ts
export class CookingStateMachine extends BaseStateMachine {
  private states = {
    IDLE: 'idle',
    PREPARING: 'preparing',
    COOKING: 'cooking',
    WAITING: 'waiting'
  };
  
  processInstruction(aiResponse: any): EnhancedResponse {
    const { cue, confidence } = aiResponse;
    
    // Simple state transitions
    if (cue === 'add_ingredient' && this.currentState === this.states.IDLE) {
      this.transitionTo(this.states.PREPARING);
    }
    
    if (cue === 'stir_now' && this.currentState === this.states.PREPARING) {
      this.transitionTo(this.states.COOKING);
    }
    
    if (cue === 'wait' && this.currentState === this.states.COOKING) {
      this.transitionTo(this.states.WAITING);
    }
    
    // Add basic context
    const context = this.addBasicContext(aiResponse);
    
    // Add cooking-specific metadata
    context.metadata = {
      cookingTime: this.currentState === this.states.COOKING ? 
        Date.now() - this.stateStartTime : 0,
      lastAction: cue
    };
    
    return {
      ...aiResponse,
      state: this.currentState,
      context
    };
  }
}
```

### **2.2 Emotion State Machine**

```typescript
// packages/sdk/src/state-machines/emotion.ts
export class EmotionStateMachine extends BaseStateMachine {
  private states = {
    NEUTRAL: 'neutral',
    HAPPY: 'happy',
    SAD: 'sad',
    SUSTAINED_HAPPY: 'sustained_happy',
    SUSTAINED_SAD: 'sustained_sad'
  };
  
  processInstruction(aiResponse: any): EnhancedResponse {
    const { emotion, confidence } = aiResponse;
    
    // Simple emotion transitions
    if (emotion === 'happy' && confidence > 0.8) {
      if (this.currentState === this.states.NEUTRAL) {
        this.transitionTo(this.states.HAPPY);
      } else if (this.currentState === this.states.HAPPY) {
        const happyDuration = Date.now() - this.stateStartTime;
        if (happyDuration > 10000) { // 10 seconds
          this.transitionTo(this.states.SUSTAINED_HAPPY);
        }
      }
    }
    
    if (emotion === 'sad' && confidence > 0.8) {
      if (this.currentState === this.states.NEUTRAL) {
        this.transitionTo(this.states.SAD);
      } else if (this.currentState === this.states.SAD) {
        const sadDuration = Date.now() - this.stateStartTime;
        if (sadDuration > 10000) { // 10 seconds
          this.transitionTo(this.states.SUSTAINED_SAD);
        }
      }
    }
    
    if (emotion === 'neutral' && this.currentState !== this.states.NEUTRAL) {
      this.transitionTo(this.states.NEUTRAL);
    }
    
    // Add basic context
    const context = this.addBasicContext(aiResponse);
    
    // Add emotion-specific metadata
    context.metadata = {
      emotion: emotion,
      confidence: confidence,
      trend: this.calculateTrend(),
      intensity: this.calculateIntensity()
    };
    
    return {
      ...aiResponse,
      state: this.currentState,
      context
    };
  }
  
  private calculateTrend(): string {
    // Simple trend calculation
    if (this.currentState.includes('happy')) return 'positive';
    if (this.currentState.includes('sad')) return 'negative';
    return 'neutral';
  }
  
  private calculateIntensity(): string {
    // Simple intensity calculation based on duration
    const duration = Date.now() - this.stateStartTime;
    if (duration > 30000) return 'high';  // 30+ seconds
    if (duration > 10000) return 'medium'; // 10-30 seconds
    return 'low'; // < 10 seconds
  }
}
```

## 🔧 **Phase 3: Integration (Minimal Changes)**

### **3.1 State Machine Factory**

```typescript
// packages/sdk/src/state-machine-factory.ts
import { CookingStateMachine } from './state-machines/cooking';
import { EmotionStateMachine } from './state-machines/emotion';

export class StateMachineFactory {
  static create(mode: string): StateMachine | null {
    switch (mode) {
      case 'cooking':
        return new CookingStateMachine();
      case 'emotion':
        return new EmotionStateMachine();
      case 'custom':
        return null; // Let developer provide their own
      default:
        return null; // No state machine for this mode
    }
  }
}
```

### **3.2 Update CurrentSession (Minimal Changes)**

```typescript
// packages/sdk/src/index.ts - Add to existing CurrentSession class
import { StateMachineFactory } from './state-machine-factory';

export class CurrentSession {
  // ... existing properties ...
  private stateMachine: StateMachine | null = null;
  
  setup(camera: CameraCapture, config: CurrentConfig): void {
    // ... existing setup code ...
    
    // Add state machine if enabled
    if (config.stateManagement) {
      if (config.customStateMachine) {
        // Use developer's custom state machine
        this.stateMachine = config.customStateMachine;
      } else {
        // Use pre-built state machine
        this.stateMachine = StateMachineFactory.create(config.mode);
      }
    }
  }
  
  private handleInstruction(data: any): void {
    let enhancedData = data;
    
    // Enhance with state context if state machine is enabled
    if (this.stateMachine) {
      enhancedData = this.stateMachine.processInstruction(data);
    }
    
    const instruction: InstructionMessage = {
      json: enhancedData,
      text: this.formatInstruction(enhancedData),
      timestamp: Date.now()
    };
    
    this.emit('instruction', instruction);
  }
}
```

### **3.3 Update CurrentConfig Interface**

```typescript
// packages/sdk/src/index.ts - Add to existing CurrentConfig interface
export interface CurrentConfig {
  // ... existing properties ...
  stateManagement?: boolean;  // Enable state management
  customStateMachine?: StateMachine;  // Developer can provide their own
}
```

## 🎯 **Phase 4: Developer Experience (Simple)**

### **4.1 Usage Examples**

#### **Pre-built Modes (Simple)**
```javascript
// Emotion detection - zero complexity
const emotionSession = await Current.start({
  provider: 'gemini',
  mode: 'emotion',
  apiKey: 'your-key',
  stateManagement: true  // Just enable it!
});

emotionSession.on('instruction', (msg) => {
  console.log(msg.text);        // "You've been consistently happy for 15 seconds!"
  console.log(msg.state);       // "sustained_happy"
  console.log(msg.context);     // { duration: 15000, count: 3, isNew: false, metadata: {...} }
});

// Cooking assistant - zero complexity
const cookingSession = await Current.start({
  provider: 'gemini',
  mode: 'cooking',
  apiKey: 'your-key',
  stateManagement: true  // Just enable it!
});

cookingSession.on('instruction', (msg) => {
  console.log(msg.text);        // "You've been stirring for 30 seconds, check if done"
  console.log(msg.state);       // "cooking"
  console.log(msg.context);     // { duration: 30000, count: 3, isNew: false, metadata: {...} }
});
```

#### **Custom Visual Agents (Extensible)**
```javascript
// Golf coach - developer builds their own state machine
class GolfStateMachine extends BaseStateMachine {
  private states = {
    IDLE: 'idle',
    ADDRESSING: 'addressing',
    SWINGING: 'swinging',
    FOLLOW_THROUGH: 'follow_through'
  };
  
  processInstruction(aiResponse) {
    const { action, club, form_quality } = aiResponse;
    
    // Golf-specific state transitions
    if (action === 'address_ball' && this.currentState === this.states.IDLE) {
      this.transitionTo(this.states.ADDRESSING);
    }
    
    if (action === 'start_swing' && this.currentState === this.states.ADDRESSING) {
      this.transitionTo(this.states.SWINGING);
    }
    
    // Add golf-specific context
    const context = this.addBasicContext(aiResponse);
    context.metadata = {
      club: club,
      form_quality: form_quality,
      swing_phase: this.currentState
    };
    
    return { ...aiResponse, state: this.currentState, context };
  }
}

// Use custom state machine
const golfSession = await Current.start({
  provider: 'gemini',
  mode: 'custom',
  apiKey: 'your-key',
  stateManagement: true,
  customStateMachine: new GolfStateMachine()
});

golfSession.on('instruction', (msg) => {
  console.log(msg.text);        // "Keep your head down during the swing"
  console.log(msg.state);       // "swinging"
  console.log(msg.context);     // { club: "driver", form_quality: "good", swing_phase: "swinging" }
});
```

### **4.2 Enhanced Response Object**

```typescript
// What developers get automatically
interface EnhancedInstructionMessage {
  json: any;           // Original AI response
  text: string;        // Human-readable text
  timestamp: number;   // When received
  
  // NEW: State context (automatically added)
  state: string;       // Current state: "cooking", "happy", etc.
  context: {           // State context
    duration: number;  // How long in current state
    count: number;     // How many times repeated
    isNew: boolean;    // Is this new instruction?
    metadata: any;     // Mode-specific data
  };
}
```

## 🚀 **Phase 5: Extensibility (Future)**

### **5.1 Community State Machine Registry (Future)**

```typescript
// For community-contributed state machines
StateMachineFactory.register('golf', GolfStateMachine);
StateMachineFactory.register('manufacturing', ManufacturingStateMachine);
StateMachineFactory.register('healthcare', HealthcareStateMachine);

// Usage
const session = await Current.start({
  mode: 'golf',  // Now available as pre-built mode
  stateManagement: true
});
```

### **5.2 Advanced Custom State Machines (Future)**

```typescript
// For advanced developers who want complex behavior
class AdvancedGolfStateMachine extends BaseStateMachine {
  private swingCount = 0;
  private lastSwingTime = 0;
  
  processInstruction(aiResponse: any): EnhancedResponse {
    // Complex golf logic with swing counting, timing, etc.
    const context = this.addBasicContext(aiResponse);
    
    // Add advanced metadata
    context.metadata = {
      swing_count: this.swingCount,
      time_since_last_swing: Date.now() - this.lastSwingTime,
      average_swing_interval: this.calculateAverageSwingInterval()
    };
    
    return {
      ...aiResponse,
      state: this.currentState,
      context
    };
  }
}
```

## 📋 **Implementation Checklist**

### **Phase 1: Core (Week 1)**
- [ ] Create `BaseStateMachine` abstract class
- [ ] Create `StateMachine` interface
- [ ] Add basic state tracking (duration, count, isNew)

### **Phase 2: Pre-built (Week 2)**
- [ ] Implement `CookingStateMachine` (preparation → cooking → waiting → finished)
- [ ] Implement `EmotionStateMachine` (neutral → happy/sad → sustained → transition)
- [ ] Create `StateMachineFactory` (cooking, emotion, custom modes)

### **Phase 3: Integration (Week 3)**
- [ ] Update `CurrentSession` to use state machines (pre-built + custom)
- [ ] Add `stateManagement` and `customStateMachine` config options
- [ ] Test with existing demos (emotion, cooking)

### **Phase 4: Polish (Week 4)**
- [ ] Update documentation
- [ ] Add examples
- [ ] Test edge cases

## 🎯 **Success Metrics**

**Before (Current SDK):**
```javascript
// Raw AI responses
{ text: "You look happy", json: { emotion: "happy", confidence: 0.87 } }
{ text: "Stir now", json: { cue: "stir_now" } }
```

**After (With State Management):**
```javascript
// Intelligent responses with context
{ 
  text: "You've been consistently happy for 15 seconds!", 
  json: { emotion: "happy", confidence: 0.87 },
  state: "sustained_happy",
  context: { 
    duration: 15000, 
    count: 3, 
    isNew: false,
    metadata: { trend: "positive", intensity: "medium" }
  }
}

{ 
  text: "You've been stirring for 30 seconds, check if done", 
  json: { cue: "stir_now" },
  state: "cooking",
  context: { 
    duration: 30000, 
    count: 3, 
    isNew: false,
    metadata: { cookingTime: 30000, lastAction: "stir" }
  }
}
```

## 🚀 **Next Steps**

1. **Start with Phase 1** - Build the core state machine interface
2. **Add two pre-built state machines** (emotion and cooking)
3. **Add custom state machine support** for extensibility
4. **Test with existing demos** to ensure it works
5. **Iterate and improve** based on real usage

**Keep it simple for common cases, extensible for custom cases!** 🎯

## 🎯 **Key Principles**

- ✅ **Simple for common use cases** (emotion, cooking) - zero configuration
- ✅ **Extensible for custom use cases** (golf, manufacturing) - full control
- ✅ **Same simple API** - just add `stateManagement: true` or `customStateMachine`
- ✅ **Pre-built intelligence** - works out of the box
- ✅ **Custom intelligence** - developers can build their own
