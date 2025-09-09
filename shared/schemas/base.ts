// Base schema definitions and utilities
import Ajv from 'ajv';

// Default schema blueprint - shows developers how to build custom schemas
export const DEFAULT_INSTRUCTION_SCHEMA = {
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
};

export class SchemaValidator {
  private ajv: Ajv;
  private validate: any;
  private errors: string[] = [];

  constructor(schema: any) {
    this.ajv = new Ajv({ allErrors: true });
    this.validate = this.ajv.compile(schema);
  }
  
  validateData(data: any): boolean {
    this.errors = [];
    const isValid = this.validate(data);
    
    if (!isValid) {
      this.errors = this.validate.errors?.map((error: any) => 
        `${error.instancePath || 'root'}: ${error.message}`
      ) || ['Unknown validation error'];
    }
    
    return isValid;
  }
  
  getErrors(): string[] {
    return [...this.errors];
  }
}
