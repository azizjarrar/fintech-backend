const express = require('express');
const router = express.Router();
const {createNotification,getNotifications,getNotificationsunread} = require('../controllers/notification_controller');
const authenticate = require('../middleware/auth_middleware');

router.post('/',authenticate, createNotification);
router.get('/',authenticate, getNotifications);
router.get('/getNotificationsunread',authenticate, getNotificationsunread);

module.exports = router;