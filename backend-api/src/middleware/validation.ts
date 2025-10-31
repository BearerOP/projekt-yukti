import type { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema<any>) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        message: error?.errors?.[0]?.message || 'Invalid request data',
        code: 400
      }
    });
  }
};


