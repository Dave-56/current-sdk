import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIService, AIResponse } from './ai-service';
import { PromptManager } from '../prompts';

export class GoogleAIService implements AIService {
  private model: any;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for Google AI service');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }

  async analyzeVideoStream(videoData: string, mode: string, customSchema?: any): Promise<AIResponse> {
    try {
      const prompt = PromptManager.getPrompt(mode, customSchema);
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: videoData,
            mimeType: "image/jpeg"
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Get the schema to use for parsing
      const schema = customSchema || this.getDefaultSchemaForMode(mode);
      return this.parseResponse(text, schema);
    } catch (error: any) {
      console.error('Google AI analysis error:', error);
      
      // Handle specific quota exceeded error
      if (error.status === 429) {
        console.warn('[GOOGLE_AI] Rate limit exceeded, skipping this request');
        return {
          action: 'wait',
          confidence: 0.1,
          text: 'Rate limit exceeded - please wait',
          timestamp: Date.now()
        };
      }
      
      return this.getFallbackResponse();
    }
  }


  private parseResponse(text: string, schema?: any): AIResponse {
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith('```json') && jsonText.endsWith('```')) {
        jsonText = jsonText.slice(7, -3).trim();
      } else if (jsonText.startsWith('```') && jsonText.endsWith('```')) {
        jsonText = jsonText.slice(3, -3).trim();
      }
      
      const jsonResponse = JSON.parse(jsonText);
      
      // Debug: Log what the AI actually returned
      console.log('[GOOGLE_AI] Raw AI response:', jsonResponse);
      console.log('[GOOGLE_AI] Schema being used:', schema ? 'custom' : 'default');
      
      if (!schema) {
        // Fallback to basic structure if no schema provided
        return {
          action: jsonResponse.action || 'wait',
          confidence: jsonResponse.confidence || 0.3,
          text: jsonResponse.text || 'AI response'
        };
      }
      
      // Use schema to guide parsing - flexible but structured
      return this.parseWithSchema(jsonResponse, schema);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', text);
      return this.getFallbackResponse();
    }
  }

  private parseWithSchema(data: any, schema: any): AIResponse {
    const result: any = {};
    
    // Handle required fields first
    if (schema.required) {
      for (const field of schema.required) {
        result[field] = this.extractFieldValue(data, field, schema.properties?.[field]);
      }
    }
    
    // Handle optional fields from schema - only if they exist in the data
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (!result.hasOwnProperty(field) && data.hasOwnProperty(field)) {
          result[field] = this.extractFieldValue(data, field, fieldSchema as any);
        }
      }
    }
    
    return result;
  }

  private extractFieldValue(data: any, field: string, fieldSchema: any): any {
    const value = data[field];
    
    if (value === null || value === undefined) {
      return this.getDefaultValue(field, fieldSchema);
    }
    
    // Handle nested objects
    if (fieldSchema?.type === 'object' && fieldSchema?.properties) {
      const nestedResult: any = {};
      for (const [nestedField, nestedSchema] of Object.entries(fieldSchema.properties)) {
        // Only include nested fields that exist in the data
        if (value.hasOwnProperty(nestedField)) {
          nestedResult[nestedField] = this.extractFieldValue(value, nestedField, nestedSchema as any);
        }
      }
      return nestedResult;
    }
    
    // Handle primitive types
    if (fieldSchema?.type === 'string') {
      return String(value);
    }
    if (fieldSchema?.type === 'number') {
      const num = Number(value);
      return isNaN(num) ? this.getDefaultValue(field, fieldSchema) : num;
    }
    
    return value;
  }

  private getDefaultValue(_field: string, fieldSchema: any): any {
    if (fieldSchema?.default !== undefined) {
      return fieldSchema.default;
    }
    
    // Generic defaults based on field type
    if (fieldSchema?.type === 'number') return 0;
    if (fieldSchema?.type === 'string') return '';
    if (fieldSchema?.type === 'boolean') return false;
    
    return null;
  }

  private getDefaultSchemaForMode(mode: string): any {
    // Reuse PromptManager's schema selection logic
    return PromptManager.getSchemaForMode(mode);
  }

  private getFallbackResponse(): AIResponse {
    return {
      action: "wait",
      confidence: 0.1,
      text: "AI analysis failed"
    };
  }
}

