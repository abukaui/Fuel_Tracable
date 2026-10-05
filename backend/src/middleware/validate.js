'use strict';

/**
 * Zod validation middleware factory.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Parse the full request object (body, params, query) against the schema
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      // Replace req fields with validated/stripped values
      if (parsed.body) req.body = parsed.body;
      if (parsed.params) req.params = parsed.params;
      if (parsed.query) req.query = parsed.query;
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
