// Prompt Manager
import { COOKING_INSTRUCTION_SCHEMA, EMOTION_INSTRUCTION_SCHEMA } from '../../../../shared/schemas/index.js';

export class PromptManager {
  static getSchemaForMode(mode: string): any {
    switch (mode) {
      case 'cooking':
        return COOKING_INSTRUCTION_SCHEMA;
      case 'emotion':
        return EMOTION_INSTRUCTION_SCHEMA;
      default:
        return null;
    }
  }

  static getPrompt(mode: string, customSchema?: any): string {
    // Get schema - use custom if provided, otherwise use default for mode
    const schema = customSchema || this.getSchemaForMode(mode);
    
    if (!schema) {
      return `Analyze this video stream and respond with a JSON object containing your analysis.`;
    }
    
    // Generate prompt with schema (ALWAYS dynamic)
    return this.generateCustomPrompt(schema, mode);
  }
  
  private static generateCustomPrompt(schema: any, mode: string): string {
    const schemaString = JSON.stringify(schema, null, 2);
    
    return `You are a realtime ${mode} assistant. Analyze this video stream and respond with ONLY a JSON object that follows this exact schema:

${schemaString}

Rules:
- Use short, actionable cues for the next 2-5 seconds
- If uncertain, return a response with low confidence
- Only respond with valid JSON, no other text
- Base confidence on how clear the action is
- Consider the temporal context of the video stream
- The 'text' field should contain a natural, conversational description for TTS (e.g., "You look happy!" or "Stir the eggs now")`;
  }
}
