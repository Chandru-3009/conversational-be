import { Request, Response, NextFunction } from 'express';
import { CreateAgentRequest, UpdateAgentRequest, CreateSectionRequest, UpdateSectionRequest, CreateIntentRequest, UpdateIntentRequest } from '../types/intentBuilder';

// Validation helper functions
const validateString = (value: any, fieldName: string, minLength: number, maxLength: number): string[] => {
  const errors: string[] = [];
  
  if (!value || typeof value !== 'string') {
    errors.push(`${fieldName} is required and must be a string`);
  } else if (value.trim().length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters long`);
  } else if (value.length > maxLength) {
    errors.push(`${fieldName} must be ${maxLength} characters or less`);
  }
  
  return errors;
};

const validateOptionalString = (value: any, fieldName: string, maxLength: number): string[] => {
  const errors: string[] = [];
  
  if (value !== undefined && value !== null) {
    if (typeof value !== 'string') {
      errors.push(`${fieldName} must be a string`);
    } else if (value.length > maxLength) {
      errors.push(`${fieldName} must be ${maxLength} characters or less`);
    }
  }
  
  return errors;
};

const validateBoolean = (value: any, fieldName: string): string[] => {
  const errors: string[] = [];
  
  if (value !== undefined && value !== null && typeof value !== 'boolean') {
    errors.push(`${fieldName} must be a boolean value`);
  }
  
  return errors;
};

const validateNumber = (value: any, fieldName: string, min?: number, max?: number): string[] => {
  const errors: string[] = [];
  
  if (value !== undefined && value !== null) {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${fieldName} must be a valid number`);
    } else {
      if (min !== undefined && value < min) {
        errors.push(`${fieldName} must be at least ${min}`);
      }
      if (max !== undefined && value > max) {
        errors.push(`${fieldName} must be ${max} or less`);
      }
    }
  }
  
  return errors;
};

const validateArray = (value: any, fieldName: string, allowedValues?: string[]): string[] => {
  const errors: string[] = [];
  
  if (value !== undefined && value !== null) {
    if (!Array.isArray(value)) {
      errors.push(`${fieldName} must be an array`);
    } else if (allowedValues && value.some(item => !allowedValues.includes(item))) {
      errors.push(`${fieldName} contains invalid values. Allowed: ${allowedValues.join(', ')}`);
    }
  }
  
  return errors;
};

const validateFieldArray = (value: any, fieldName: string): string[] => {
  const errors: string[] = [];
  
  if (value !== undefined && value !== null) {
    if (!Array.isArray(value)) {
      errors.push(`${fieldName} must be an array`);
    } else {
      // Validate each field in the array
      value.forEach((field: any, index: number) => {
        if (!field || typeof field !== 'object') {
          errors.push(`${fieldName}[${index}] must be an object`);
        } else {
          // Validate required field properties
          if (!field.name || typeof field.name !== 'string') {
            errors.push(`${fieldName}[${index}].name is required and must be a string`);
          }
          if (!field.type || typeof field.type !== 'string') {
            errors.push(`${fieldName}[${index}].type is required and must be a string`);
          }
          if (!field.description || typeof field.description !== 'string') {
            errors.push(`${fieldName}[${index}].description is required and must be a string`);
          }
          if (field.example === undefined || field.example === null) {
            errors.push(`${fieldName}[${index}].example is required`);
          }
        }
      });
    }
  }
  
  return errors;
};

// Agent validation middleware
export const validateCreateAgent = (req: Request, res: Response, next: NextFunction) => {
  const data: CreateAgentRequest = req.body;
  const errors: string[] = [];

  // Validate required fields
  errors.push(...validateString(data.name, 'name', 1, 255));
  errors.push(...validateString(data.about, 'about', 1, 1000));

  // Validate optional fields
  errors.push(...validateArray(data.mode, 'mode', ['text', 'audio']));
  errors.push(...validateOptionalString(data.tone, 'tone', 255));
  errors.push(...validateOptionalString(data.personality, 'personality', 255));
  
  // Case-insensitive gender validation
  if (data.gender) {
    const genderLower = data.gender.toLowerCase();
    if (!['male', 'female'].includes(genderLower)) {
      errors.push('gender must be either "male" or "female" (case-insensitive)');
    } else {
      // Normalize to lowercase for consistency
      req.body.gender = genderLower;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

export const validateUpdateAgent = (req: Request, res: Response, next: NextFunction) => {
  const data: UpdateAgentRequest = req.body;
  const errors: string[] = [];

  // Validate optional fields
  errors.push(...validateOptionalString(data.name, 'name', 255));
  errors.push(...validateOptionalString(data.about, 'about', 1000));
  errors.push(...validateArray(data.mode, 'mode', ['text', 'audio']));
  errors.push(...validateOptionalString(data.tone, 'tone', 255));
  errors.push(...validateOptionalString(data.personality, 'personality', 255));
  
  // Case-insensitive gender validation
  if (data.gender) {
    const genderLower = data.gender.toLowerCase();
    if (!['male', 'female'].includes(genderLower)) {
      errors.push('gender must be either "male" or "female" (case-insensitive)');
    } else {
      // Normalize to lowercase for consistency
      req.body.gender = genderLower;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Section validation middleware
export const validateCreateSection = (req: Request, res: Response, next: NextFunction) => {
  const data: CreateSectionRequest = req.body;
  const errors: string[] = [];

  // Validate required fields
  errors.push(...validateString(data.name, 'name', 1, 255));
  errors.push(...validateString(data.about, 'about', 1, 1000));

  // Validate optional fields
  errors.push(...validateNumber(data.order, 'order', 0));

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

export const validateUpdateSection = (req: Request, res: Response, next: NextFunction) => {
  const data: UpdateSectionRequest = req.body;
  const errors: string[] = [];

  // Validate optional fields
  errors.push(...validateOptionalString(data.name, 'name', 255));
  errors.push(...validateOptionalString(data.about, 'about', 1000));
  errors.push(...validateNumber(data.order, 'order', 0));

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Intent validation middleware
export const validateCreateIntent = (req: Request, res: Response, next: NextFunction) => {
  const data: CreateIntentRequest = req.body;
  const errors: string[] = [];

  // Validate required fields
  errors.push(...validateString(data.intent, 'intent', 1, 500));
  errors.push(...validateFieldArray(data.fieldsToExtract, 'fieldsToExtract'));
  errors.push(...validateBoolean(data.isMandatory, 'isMandatory'));

  // Validate optional fields
  errors.push(...validateNumber(data.order, 'order', 0));

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

export const validateUpdateIntent = (req: Request, res: Response, next: NextFunction) => {
  const data: UpdateIntentRequest = req.body;
  const errors: string[] = [];

  // Validate optional fields
  errors.push(...validateOptionalString(data.intent, 'intent', 500));
  if (data.fieldsToExtract !== undefined) {
    errors.push(...validateFieldArray(data.fieldsToExtract, 'fieldsToExtract'));
  }
  errors.push(...validateBoolean(data.isMandatory, 'isMandatory'));
  errors.push(...validateNumber(data.order, 'order', 0));

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// ID validation middleware
export const validateObjectId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      error: 'Missing ID parameter',
      details: 'ID parameter is required',
      timestamp: new Date().toISOString()
    });
  }

  // Check if it's a valid MongoDB ObjectId (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return res.status(400).json({
      error: 'Invalid ID format',
      details: 'ID must be a valid 24-character hexadecimal string (MongoDB ObjectId)',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Pagination validation middleware
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit } = req.query;
  const errors: string[] = [];

  if (page !== undefined) {
    const pageNum = parseInt(page as string);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('page must be a positive integer');
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('limit must be a positive integer between 1 and 100');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid pagination parameters',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  next();
}; 