const { User, Notification } = require('../models');
const { Op } = require('sequelize');
const { generateToken } = require('../utils/jwt');
const { asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const { broadcastToAdmins, broadcastToAll } = require('../socket/socketManager');

const register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ email }, { username }]
    }
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    return res.status(400).json({
      success: false,
      message: `User with this ${field} already exists`
    });
  }

  // Create new user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    role
  });

  // Generate token
  const token = generateToken(user.id);

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user);
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    console.error('❌ User registration will continue without email');
    // Don't fail registration if email fails - just log the error
  }

  // ✅ REAL-TIME: Notify all admins about new user registration
  try {
    // Create notification for admins
    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    for (const admin of adminUsers) {
      await Notification.create({
        userId: admin.id,
        type: 'new_user_registered',
        title: 'New User Registered',
        message: `${firstName} ${lastName} (${username}) registered as a ${user.role || 'buyer'}`,
        data: {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role || 'buyer',
          fullName: `${firstName} ${lastName}`
        }
      });
    }

    // Broadcast to all admins in real-time
    broadcastToAdmins({
      type: 'notification',
      notificationType: 'newUserRegistered',
      title: 'New User Registered',
      message: `${firstName} ${lastName} (${username}) registered as a ${user.role || 'buyer'}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      isRead: false
    });

    // Broadcast to all users for activity feed
    broadcastToAll({
      type: 'systemActivity',
      activityType: 'userRegistration',
      message: `New ${user.role || 'buyer'} joined the platform`,
      timestamp: new Date().toISOString(),
      data: {
        userId: user.id,
        username: user.username,
        role: user.role || 'buyer'
      }
    });

  } catch (error) {
    console.error('Failed to broadcast user registration:', error);
    // Don't fail registration if broadcast fails
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token
    }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ where: { email } });

  if (!user || !(await user.validatePassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Generate token
  const token = generateToken(user.id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token
    }
  });
});

const getProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, avatar } = req.body;
  const userId = req.user.id;

  const user = await User.findByPk(userId);
  
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (avatar) user.avatar = avatar;

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user
    }
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await User.findByPk(userId);

  if (!(await user.validatePassword(currentPassword))) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const token = generateToken(userId);

  res.json({
    success: true,
    data: {
      token
    }
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken
};
