export const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, { allowUnknown: true, stripUnknown: true });
  if (error) return res.status(400).json({ errors: error.details.map(d => d.message) });
  req.query = value;
  next();
};
