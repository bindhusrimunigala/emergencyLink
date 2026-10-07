const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('role').equals('patient').withMessage('Only patient registration allowed here'),
  validate
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], login);

router.get('/me', authenticate, getMe);

router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate
], changePassword);

module.exports = router;
