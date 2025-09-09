# Shared Schemas

This directory contains shared schema definitions used across the multimodal SDK packages.

## Structure

- `schemas/cooking.ts` - Cooking-specific instruction schemas
- `schemas/emotion.ts` - Emotion detection schemas
- `schemas/base.ts` - Base schema definitions and validation utilities
- `schemas/index.ts` - Main export file

## Usage

### In SDK Package
```typescript
import { COOKING_INSTRUCTION_SCHEMA, EMOTION_INSTRUCTION_SCHEMA, SchemaValidator } from '../../../shared/schemas';
```

### In Gateway Package
```typescript
import { COOKING_INSTRUCTION_SCHEMA, EMOTION_INSTRUCTION_SCHEMA } from '../../../../shared/schemas';
```

## Available Schemas

- `COOKING_INSTRUCTION_SCHEMA` - Schema for cooking instructions with cues, confidence, context, and priority
- `EMOTION_INSTRUCTION_SCHEMA` - Schema for emotion detection with emotion, confidence, context, and priority
- `DEFAULT_INSTRUCTION_SCHEMA` - Template schema for creating custom instruction schemas
- `SchemaValidator` - Utility class for validating data against schemas

## Adding New Schemas

1. Create a new file in `schemas/` directory
2. Export your schema from the file
3. Add the export to `schemas/index.ts`
4. Update this README with usage examples
