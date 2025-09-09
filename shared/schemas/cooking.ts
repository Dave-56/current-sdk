// Shared cooking instruction schema
export const COOKING_INSTRUCTION_SCHEMA = {
  type: 'object',
  properties: {
    cue: {
      type: 'string',
      enum: ['stir_now', 'flip_pancake', 'wait', 'reduce_heat', 'add_ingredient'],
      description: 'The cooking instruction to follow'
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score between 0 and 1'
    },
    text: {
      type: 'string',
      description: 'Human-readable cooking instruction for TTS'
    },
    context: {
      type: 'object',
      properties: {
        ingredient: {
          type: 'string',
          description: 'Ingredient name to focus on'
        },
        technique: {
          type: 'string',
          description: 'Cooking technique being used'
        },
        note: {
          type: 'string',
          description: 'Brief cooking tip or note'
        }
      },
      additionalProperties: false
    },
    priority: {
      type: 'string',
      enum: ['high', 'normal'],
      default: 'normal',
      description: 'Priority level for TTS handling (high = interrupts, normal = waits)'
    }
  },
  required: ['cue', 'confidence', 'text'],
  additionalProperties: false
};
