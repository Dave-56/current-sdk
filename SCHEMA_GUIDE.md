# Schema Building Guide

## Default Schema Blueprint

The `DEFAULT_INSTRUCTION_SCHEMA` shows you exactly how to build custom schemas:

```javascript
{
  type: 'object',
  properties: {
    // REQUIRED: Main action field (rename for your use case)
    action: {
      type: 'string',
      enum: ['do_this', 'do_that', 'wait'], // Replace with your specific actions
      description: 'The main action to perform (REQUIRED)'
    },
    // REQUIRED: Confidence score
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score between 0 and 1 (REQUIRED)'
    },
    // OPTIONAL: Context object - put all domain-specific info here
    context: {
      type: 'object',
      properties: {
        // Add your domain-specific fields here
        // Examples: ingredient (cooking), club (golf), equipment (fitness)
        field1: {
          type: 'string',
          description: 'Your first context field'
        },
        field2: {
          type: 'string',
          description: 'Your second context field'
        }
      },
      additionalProperties: false
    },
    // OPTIONAL: Priority for TTS handling
    priority: {
      type: 'string',
      enum: ['high', 'normal'],
      default: 'normal',
      description: 'Priority level for TTS handling (high = interrupts, normal = waits)'
    }
  },
  required: ['action', 'confidence'],
  additionalProperties: false
}
```

## Building Your Custom Schema

### 1. **Required Fields** (must include):
- **`action`** - Your main instruction field (rename as needed, use enums for specific values)
- **`confidence`** - Always 0.0 to 1.0

### 2. **Optional Fields** (add as needed):
- **`context`** - Nested object containing all domain-specific information
- **`priority`** - TTS handling priority (high/normal)

### 3. **Context Object** (put domain-specific fields here):
- Add any fields specific to your use case inside the `context` object
- Examples: `ingredient`, `club`, `equipment`, `technique`, `note`
- Keep related information grouped together

## Examples

### Cooking Assistant
```javascript
{
  type: 'object',
  properties: {
    cue: { 
      type: 'string', 
      enum: ['stir_now', 'flip_pancake', 'wait', 'reduce_heat', 'add_ingredient'] 
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    context: {
      type: 'object',
      properties: {
        ingredient: { type: 'string' },
        technique: { type: 'string' },
        note: { type: 'string' }
      }
    },
    priority: { type: 'string', enum: ['high', 'normal'], default: 'normal' }
  },
  required: ['cue', 'confidence']
}
```

### Fitness Tracking
```javascript
{
  type: 'object',
  properties: {
    exercise: { 
      type: 'string', 
      enum: ['pushup', 'squat', 'plank', 'rest'] 
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    context: {
      type: 'object',
      properties: {
        form_quality: { type: 'string', enum: ['good', 'needs_improvement'] },
        reps: { type: 'number' },
        tip: { type: 'string' }
      }
    },
    priority: { type: 'string', enum: ['high', 'normal'], default: 'normal' }
  },
  required: ['exercise', 'confidence']
}
```

## Key Rules

1. **Always include `confidence`** - Required for all schemas
2. **Rename `action`** - Use a descriptive name for your main field (e.g., `cue`, `exercise`, `alert`)
3. **Use enums** - For specific values, use `enum` instead of free text
4. **Group context fields** - Put all domain-specific info inside the `context` object
5. **Keep it simple** - Don't overcomplicate it
6. **Use priority wisely** - `high` for urgent/safety issues, `normal` for routine instructions
