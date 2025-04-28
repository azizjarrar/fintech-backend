// routes/auth_route.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { login } = require('../controllers/auth_controllers');

const router = express.Router();

// Validation chain as middleware:
const loginValidation = [
  body('email')
    .exists().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email'),
  body('password')
    .exists().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
];

// Wrapper to catch validation errors:
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // return first error or full array
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};





router.post('/login', loginValidation, validate, login);

module.exports = router