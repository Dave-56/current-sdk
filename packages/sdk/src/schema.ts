// JSON schema validation
import Ajv from 'ajv';

// Default schema for cooking mode
export const COOKING_INSTRUCTION_SCHEMA = {
  type: 'object',
  properties: {
    cue: {
      type: 'string',
      minLength: 1,
      description: 'The cooking instruction cue'
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score between 0 and 1'
    },
    timestamp: {
      type: 'number',
      description: 'Unix timestamp when instruction was generated'
    },
    frameId: {
      type: 'string',
      description: 'Optional frame ID for tracking'
    }
  },
  required: ['cue', 'confidence'],
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
