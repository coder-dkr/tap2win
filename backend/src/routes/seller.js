const express = require('express');
const { validateRequest, schemas } = require('../middleware/validation');
const sellerController = require('../controllers/sellerController');
const router = express.Router();
router.post('/auctions/:auctionId/decision', validateRequest(schemas.sellerDecision), sellerController.makeSellerDecision);
router.post('/auctions/:auctionId/counter-offer-response', validateRequest(schemas.counterOfferResponse), sellerController.respondToCounterOffer);
module.exports = router;
