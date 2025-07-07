// validations/memberAuthValidation.ts
import { body } from 'express-validator';

export const validateResetPassword = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').notEmpty().withMessage('OTP is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const validateForgotPassword = [
  body('email').isEmail().withMessage('Email is required'),
];
