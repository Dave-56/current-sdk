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
    emoji: {
      type: 'string',
      description: 'Emoji representation of the detected emotion for visual feedback'
    },
    intensity: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description: 'Intensity level of the detected emotion for emoji scaling'
    },
    context: {
      type: 'object',
      properties: {
        note: {
          type: 'string',
          description: 'Brief observation about the facial expression'
        },
        emojiSize: {
          type: 'string',
          enum: ['small', 'medium', 'large'],
          description: 'Recommended emoji size based on confidence and intensity'
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
  required: ['emotion', 'confidence', 'text', 'emoji', 'intensity'],
  additionalProperties: false
};

// Emotion to emoji mapping for consistent visual feedback
export const EMOTION_EMOJI_MAP = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  fearful: '😨',
  disgusted: '🤢',
  neutral: '😐'
} as const;

// Intensity scaling for emoji size
export const INTENSITY_SCALE = {
  low: 'small',
  medium: 'medium', 
  high: 'large'
} as const;
