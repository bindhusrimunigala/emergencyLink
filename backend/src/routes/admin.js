const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getDashboard, getUsers, createUser,
  toggleUserActive, getEmergencyReport
} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.post('/users', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('role').isIn(['patient', 'driver', 'hospital_staff', 'admin']).withMessage('Invalid role'),
  validate
], createUser);
router.put('/users/:id/toggle', toggleUserActive);
router.get('/reports/emergencies', getEmergencyReport);

module.exports = router;
