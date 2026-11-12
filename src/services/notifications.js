const Notification = require('../models/Notification');

// Best-effort notification creation: never fail the primary request because of a notification error.
const notify = async (userId, { type, message, relatedId }) => {
  if (!userId) {
    return null;
  }

  try {
    return await Notification.create({ userId, type, message, relatedId });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

module.exports = { notify };
