import { GoogleAIService } from './google-ai';

// AI Service Interface
export interface AIService {
  analyzeVideoStream(imageData: string, mode: string, customSchema?: any): Promise<AIResponse>;
}

export interface AIResponse {
  [key: string]: any; // Flexible to match any schema structure
}

// Service Factory
export class AIServiceFactory {
  static create(provider: string, apiKey: string): AIService {
    switch (provider) {
      case 'google':
      case 'gemini':
        return new GoogleAIService(apiKey);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}
