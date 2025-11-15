import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/intentBuilder';

// Custom error class for API errors
export class ApiErrorClass extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error | ApiErrorClass,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: string | undefined;

  // Handle custom API errors
  if (err instanceof ApiErrorClass) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Handle MongoDB errors
  else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    const mongoErr = err as any;
    
    switch (mongoErr.code) {
      case 11000: // Duplicate key error
        statusCode = 409;
        message = 'Resource already exists';
        details = 'A resource with this identifier already exists';
        break;
      case 121: // Document validation failed
        statusCode = 400;
        message = 'Validation failed';
        details = 'The provided data does not meet the required format';
        break;
      default:
        statusCode = 500;
        message = 'Database error';
        details = 'An error occurred while accessing the database';
    }
  }
  // Handle validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.message;
  }
  // Handle cast errors (invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    details = 'The provided ID is not in the correct format';
  }
  // Handle JSON parsing errors
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON';
    details = 'The request body contains invalid JSON';
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  }

  // Send error response
  const errorResponse: ApiError = {
    error: message,
    details,
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(errorResponse);
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: ApiError = {
    error: 'Not found',
    details: `The requested resource ${req.method} ${req.url} was not found`,
    timestamp: new Date().toISOString()
  };

  res.status(404).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Rate limiting error
export const rateLimitError = (req: Request, res: Response) => {
  const errorResponse: ApiError = {
    error: 'Too many requests',
    details: 'Rate limit exceeded. Please try again later.',
    timestamp: new Date().toISOString()
  };

  res.status(429).json(errorResponse);
}; 