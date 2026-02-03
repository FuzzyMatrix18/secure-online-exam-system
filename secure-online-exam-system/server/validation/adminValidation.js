import Joi from 'joi';

export const listResultsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  exam: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  user: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  minScore: Joi.number().optional(),
  maxScore: Joi.number().optional(),
  from: Joi.string().isoDate().optional(),
  to: Joi.string().isoDate().optional(),
  sort: Joi.string().optional()
});
