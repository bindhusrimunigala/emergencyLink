const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getHospitals, getHospital, getNearestHospitals,
  createHospital, updateHospital, getMyHospital, getIncomingEmergencies
} = require('../controllers/hospitalController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/nearest', authenticate, getNearestHospitals);
router.get('/me', authenticate, authorize('hospital_staff'), getMyHospital);
router.get('/', authenticate, getHospitals);

router.post('/', authenticate, authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Hospital name required'),
  body('address').trim().notEmpty().withMessage('Address required'),
  body('phone').notEmpty().withMessage('Phone required'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('total_beds').isInt({ min: 0 }).withMessage('Total beds must be a number'),
  validate
], createHospital);

router.get('/:id', authenticate, getHospital);
router.put('/:id', authenticate, authorize('admin', 'hospital_staff'), updateHospital);
router.get('/:id/incoming', authenticate, authorize('admin', 'hospital_staff'), getIncomingEmergencies);

module.exports = router;
