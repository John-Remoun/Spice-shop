import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/** Wraps a Zod schema (shape: { body, query, params }) as Express middleware. */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const firstErrorMsg = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${errs?.join(', ')}`)
        .join('; ');

      return res.status(422).json({
        message: firstErrorMsg || 'بيانات غير صالحة',
        errors: fieldErrors,
      });
    }
    return next();
  };
}
