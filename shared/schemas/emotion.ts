// Shared facial expression/emotion detection schema
export const EMOTION_INSTRUCTION_SCHEMA = {
  type: 'object',
  properties: {
    emotion: {
      type: 'string',
      enum: ['happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted', 'neutral'],
      description: 'The primary emotion detected in the facial expression'
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score between 0 and 1'
    },
    text: {
      type: 'string',
      description: 'Human-readable description of the detected emotion for TTS'
    },
    context: {
      type: 'object',
      properties: {
        intensity: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Intensity level of the detected emotion'
        },
        note: {
          type: 'string',
          description: 'Brief observation about the facial expression'
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
  required: ['emotion', 'confidence', 'text'],
  additionalProperties: false
};
