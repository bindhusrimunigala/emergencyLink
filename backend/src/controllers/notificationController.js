const pool = require('../config/db');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead, markAllRead };
