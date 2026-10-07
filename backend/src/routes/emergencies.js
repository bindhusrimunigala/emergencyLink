const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createEmergency, getEmergencies, getEmergency,
  updateEmergencyStatus, getActiveEmergencies
} = require('../controllers/emergencyController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/active', authenticate, authorize('admin', 'hospital_staff', 'driver'), getActiveEmergencies);

router.get('/', authenticate, getEmergencies);

router.post('/', authenticate, [
  body('patient_name').trim().notEmpty().withMessage('Patient name required'),
  body('patient_phone').notEmpty().withMessage('Patient phone required'),
  body('emergency_type').notEmpty().withMessage('Emergency type required'),
  body('pickup_latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('pickup_longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  validate
], createEmergency);

router.get('/:id', authenticate, getEmergency);

router.put('/:id/status', authenticate,
  authorize('admin', 'driver', 'hospital_staff'), [
  body('status').notEmpty().withMessage('Status required'),
  validate
], updateEmergencyStatus);

module.exports = router;
