const Notification = require('../models/notification_model');

exports.createNotification = async (req, res) => {
  try {
    const { user, title, message, link } = req.body;

    const notification = await Notification.create({ user, title, message, link });
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { id } = req.user;
    const notifications = await Notification.find({ user: id }).sort({ createdAt: -1 });
    await Notification.updateMany({ user: id, read: false }, { $set: { read: true } });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getNotificationsunread=async (req,res)=>{
  try {
    const { id } = req.user;
    const notifications = await Notification.find({ user: id,read:false}).sort({ createdAt: -1 });
    res.status(200).json({numOfUnRead:notifications.length});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


// =========================================
// REUSABLE NOTIFICATION SENDER FUNCTION
// =========================================

/**
 * Send notification to one or multiple users
 * @param {Object} options
 * @param {String|Array} options.users 
 * @param {String} options.title 
 * @param {String} options.message 
 * @param {String} [options.link] 
 */
exports.sendNotification = async ( users, title, message, link = '' ) => {
    try {

      if (!users || !title || !message) {
        throw new Error('Missing required parameters');
      }
      const userList = Array.isArray(users) ? users : [users];
      const notifications = userList.map(userId => ({
        user: userId,
        title,
        message,
        link,
      }));
      await Notification.insertMany(notifications).then(data=>{
      });
  
      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error.message);
      return { success: false, error: error.message };
    }
  };