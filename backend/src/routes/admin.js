const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All admin routes require admin role
router.use(requireAdmin);

// Admin dashboard statistics
router.get('/stats', adminController.getStats);

// Auction management
router.get('/auctions', adminController.getAllAuctions);
router.post('/auctions/:id/start', adminController.startAuction);
router.post('/auctions/:id/end', adminController.endAuction);
router.post('/auctions/:id/reset', adminController.resetAuction);
router.put('/auctions/:id', adminController.updateAuction);
router.delete('/auctions/:id', adminController.deleteAuction);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// System monitoring
router.get('/monitoring', adminController.getSystemStatus);
router.get('/monitoring/activity', adminController.getRecentActivity);

module.exports = router;
