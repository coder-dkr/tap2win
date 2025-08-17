const express = require('express');
const { validateRequest, schemas } = require('../middleware/validation');
const sellerController = require('../controllers/sellerController');
const router = express.Router();

// Counter offer response - accessible to buyers (winners)
router.post('/auctions/:auctionId/counter-offer-response', validateRequest(schemas.counterOfferResponse), sellerController.respondToCounterOffer);

module.exports = router;
