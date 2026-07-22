const { body, validationResult } = require('express-validator');

// Runs Express validations, returning formatted error messages if inputs fail specifications
const checkValidationResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array().map(err => err.msg).join(', ');
    return res.status(400).json({
      success: false,
      error: errorMsg,
      errors: errors.array()
    });
  }
  next();
};

const validateRegister = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  checkValidationResults
];

const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email/Username is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  checkValidationResults
];

module.exports = {
  validateRegister,
  validateLogin
};
