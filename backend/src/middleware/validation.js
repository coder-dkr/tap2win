const Joi = require('joi');
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};
const schemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    role: Joi.string().valid('buyer', 'seller','admin').required()
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  createAuction: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    startingPrice: Joi.number().positive().precision(2).required(),
    bidIncrement: Joi.number().positive().precision(2).required(),
    startTime: Joi.date().iso().custom((value, helpers) => {
      const now = new Date();
      if (value <= now) {
        return helpers.error('any.invalid', { message: 'Start time must be in the future' });
      }
      return value;
    }).required(),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
    category: Joi.string().required(),
    condition: Joi.string().valid('new', 'like_new', 'good', 'fair', 'poor').default('good'),
    images: Joi.array().items(Joi.string().uri()).max(10).default([])
  }),
  placeBid: Joi.object({
    amount: Joi.alternatives().try(
      Joi.number().positive().precision(2),
      Joi.string().pattern(/^\d+(\.\d{1,2})?$/).custom((value, helpers) => {
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
          return helpers.error('any.invalid', { message: 'Amount must be a positive number' });
        }
        return num;
      })
    ).required()
  }),
  sellerDecision: Joi.object({
    decision: Joi.string().valid('accept', 'reject', 'counter_offer').required(),
    counterOfferAmount: Joi.when('decision', {
      is: 'counter_offer',
      then: Joi.number().positive().precision(2).required(),
      otherwise: Joi.forbidden()
    })
  }),
  counterOfferResponse: Joi.object({
    response: Joi.string().valid('accept', 'reject').required()
  }),
  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(50),
    lastName: Joi.string().min(1).max(50),
    avatar: Joi.string().uri(),
    role: Joi.string().valid('buyer', 'seller','admin')
  }),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'endTime', 'currentPrice', 'title'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    status: Joi.string().valid('pending', 'active', 'ended', 'completed', 'cancelled').allow('', null),
    category: Joi.string().allow('', null),
    search: Joi.string().allow('', null)
  }),
  adminPagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().allow('', null)
  }),
  adminUserPagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    role: Joi.string().valid('buyer', 'seller', 'admin').allow('', null),
    search: Joi.string().allow('', null)
  }),
  adminAuctionPagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    status: Joi.string().valid('pending', 'active', 'ended', 'completed', 'cancelled').allow('', null),
    search: Joi.string().allow('', null)
  })
};
module.exports = {
  validateRequest,
  validateQuery,
  schemas
};
