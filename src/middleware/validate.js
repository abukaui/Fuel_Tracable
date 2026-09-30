'use strict';

/**
 * Zod validation middleware factory.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Parse and replace req.body with the validated/stripped body
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err && err.name === 'ZodError') {
        const issues = err.issues || err.errors || [];
        const fieldErrors = issues.map(e => ({
          field: e.path ? e.path.join('.') : '',
          message: e.message
        }));
        return res.status(400).json({ error: 'Validation failed', details: fieldErrors });
      }
      next(err);
    }
  };
};

module.exports = validate;
