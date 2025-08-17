const { asyncHandler } = require('../middleware/errorHandler');
const { Notification } = require('../models');

const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const { count, rows: notifications } = await Notification.findAndCountAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = await Notification.findOne({
    where: { id, userId }
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  await notification.update({ isRead: true });

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: { notification }
  });
});

const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = await Notification.findOne({
    where: { id, userId }
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  await notification.destroy();

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};
