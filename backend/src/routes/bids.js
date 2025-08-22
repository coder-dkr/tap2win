const express = require('express');
const { authorize } = require('../middleware/auth');
const { validateRequest, validateQuery, schemas } = require('../middleware/validation');
const bidController = require('../controllers/bidController');
const router = express.Router();

router.post('/auctions/:auctionId/bids', authorize(['buyer', 'admin']), validateRequest(schemas.placeBid), bidController.placeBid);
router.get('/auctions/:auctionId/bids', validateQuery(schemas.pagination), bidController.getAuctionBids);
router.get('/bids/:id', bidController.getBidById);
router.delete('/bids/:id', bidController.deleteBid);

module.exports = router;
