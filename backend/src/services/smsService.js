const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Only initialize client if credentials are present
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

const smsEnabled = () => {
  return client && fromNumber && process.env.SMS_ENABLED === 'true';
};

/**
 * Send a single SMS
 * @param {string} to - recipient phone number (E.164 format e.g. +919876543210)
 * @param {string} message - SMS body
 */
const sendSMS = async (to, message) => {
  if (!smsEnabled()) {
    console.log(`[SMS DISABLED] To: ${to} | Message: ${message}`);
    return { success: false, reason: 'SMS disabled or not configured' };
  }

  // Normalize Indian phone numbers to E.164
  let normalized = to.replace(/\s+/g, '').replace(/-/g, '');
  if (!normalized.startsWith('+')) {
    // Assume India (+91) if no country code
    normalized = normalized.startsWith('91')
      ? `+${normalized}`
      : `+91${normalized}`;
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: normalized,
    });
    console.log(`✅ SMS sent to ${normalized} | SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error(`❌ SMS failed to ${normalized}:`, err.message);
    return { success: false, error: err.message };
  }
};

// ── Pre-built message templates ───────────────────────────────────────────────

/**
 * Notify patient that ambulance is dispatched
 */
const notifyPatientDispatch = async (phone, patientName, vehicleNumber, driverName, etaMinutes) => {
  const message =
    `🚨 EmergencyLink: Dear ${patientName}, ` +
    `Ambulance ${vehicleNumber} (Driver: ${driverName}) has been dispatched to your location. ` +
    `Estimated arrival: ${etaMinutes || 'TBD'} minutes. ` +
    `Please stay at your location. - EmergencyLink`;
  return sendSMS(phone, message);
};

/**
 * Notify patient of status update
 */
const notifyPatientStatusUpdate = async (phone, patientName, status, hospitalName) => {
  const statusMessages = {
    en_route:     `Your ambulance is on the way to you.`,
    at_scene:     `Your ambulance has arrived at your location.`,
    transporting: `You are being transported to ${hospitalName || 'the hospital'}.`,
    completed:    `Your emergency has been completed. Stay safe!`,
  };
  const statusText = statusMessages[status];
  if (!statusText) return { success: false, reason: 'No message for this status' };

  const message = `🚑 EmergencyLink: Dear ${patientName}, ${statusText} - EmergencyLink`;
  return sendSMS(phone, message);
};

/**
 * Notify driver of new dispatch
 */
const notifyDriverDispatch = async (phone, driverName, emergencyType, pickupAddress, patientName, patientPhone) => {
  const message =
    `🚨 EmergencyLink Dispatch: Dear ${driverName}, ` +
    `NEW EMERGENCY: ${emergencyType}. ` +
    `Patient: ${patientName} (${patientPhone}). ` +
    `Pickup: ${pickupAddress || 'See app for location'}. ` +
    `Open the EmergencyLink app immediately. - EmergencyLink`;
  return sendSMS(phone, message);
};

/**
 * Notify hospital of incoming emergency
 */
const notifyHospitalIncoming = async (phone, hospitalName, emergencyType, patientName, etaMinutes, priority) => {
  const message =
    `🏥 EmergencyLink Alert [${priority?.toUpperCase()}]: ${hospitalName}, ` +
    `incoming patient — ${emergencyType}. ` +
    `Patient: ${patientName}. ` +
    `ETA: ${etaMinutes || 'TBD'} minutes. ` +
    `Please prepare accordingly. - EmergencyLink`;
  return sendSMS(phone, message);
};

/**
 * Send OTP / verification code (future use)
 */
const sendOTP = async (phone, otp) => {
  const message = `Your EmergencyLink verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  return sendSMS(phone, message);
};

module.exports = {
  sendSMS,
  notifyPatientDispatch,
  notifyPatientStatusUpdate,
  notifyDriverDispatch,
  notifyHospitalIncoming,
  sendOTP,
};
