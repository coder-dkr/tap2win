const express = require('express');
const { optionalAuth, authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateQuery, schemas } = require('../middleware/validation');
const auctionController = require('../controllers/auctionController');
const bidController = require('../controllers/bidController');

const router = express.Router();

// Public routes (with optional auth for viewing)
router.get('/', optionalAuth, validateQuery(schemas.pagination), auctionController.getAuctions);

// User-specific routes (require authentication) - MUST come before /:id routes
router.get('/user/my-auctions', authenticateToken, validateQuery(schemas.pagination), auctionController.getMyAuctions);
router.get('/user/my-bids', authenticateToken, validateQuery(schemas.pagination), auctionController.getMyBids);

// Auction bids routes - MUST come before /:id route
router.get('/:id/bids', optionalAuth, validateQuery(schemas.pagination), auctionController.getAuctionBids);
router.post('/:auctionId/bids', authenticateToken, authorize(['buyer', 'admin']), validateRequest(schemas.placeBid), bidController.placeBid);

// Individual auction route
router.get('/:id', optionalAuth, auctionController.getAuctionById);

// Protected routes (Seller only)
router.post('/', authenticateToken, authorize(['seller', 'admin']), validateRequest(schemas.createAuction), auctionController.createAuction);
router.put('/:id', authenticateToken, authorize(['seller', 'admin']), validateRequest(schemas.createAuction), auctionController.updateAuction);
router.delete('/:id', authenticateToken, authorize(['seller', 'admin']), auctionController.deleteAuction);

module.exports = router;
