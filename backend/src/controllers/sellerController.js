const { Auction, User, Bid, Notification } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const { broadcastToUser, broadcastToAuction } = require('../socket/socketManager');
const invoiceService = require('../services/invoiceService');

const makeSellerDecision = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const { decision, counterOfferAmount } = req.body;
  const sellerId = req.user.id;

  // Get auction with highest bid and bidder info
  const auction = await Auction.findByPk(auctionId, {
    include: [
      {
        model: Bid,
        as: 'highestBid',
        include: [{
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }]
      },
      {
        model: Bid,
        as: 'bids',
        include: [{
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }],
        order: [['amount', 'DESC']],
        limit: 1
      },
      {
        model: User,
        as: 'seller',
        attributes: ['id', 'username', 'firstName', 'lastName', 'email']
      }
    ]
  });

  if (!auction) {
    return res.status(404).json({
      success: false,
      message: 'Auction not found'
    });
  }

  if (auction.sellerId !== sellerId) {
    return res.status(403).json({
      success: false,
      message: 'You can only manage your own auctions'
    });
  }

  if (auction.status !== 'ended') {
    return res.status(400).json({
      success: false,
      message: 'Can only make decisions on ended auctions'
    });
  }

  // Allow seller to make decisions if decision is pending or if they want to change a counter offer
  if (auction.sellerDecision && auction.sellerDecision !== 'pending' && auction.sellerDecision !== 'counter_offered') {
    return res.status(400).json({
      success: false,
      message: 'Decision has already been made for this auction'
    });
  }

  console.log('🔍 Debug auction data:', {
    id: auction.id,
    sellerDecision: auction.sellerDecision,
    highestBidId: auction.highestBidId,
    highestBid: auction.highestBid,
    bids: auction.bids ? auction.bids.length : 0
  });

  // Get the highest bid - try highestBid association first, then fallback to bids array
  let highestBid = auction.highestBid;
  let bidder;
  
  if (!highestBid && auction.bids && auction.bids.length > 0) {
    highestBid = auction.bids[0]; // First bid in DESC order is the highest
    console.log('🔄 Using fallback highest bid from bids array');
  }
  
  if (!highestBid) {
    return res.status(400).json({
      success: false,
      message: 'No bids to accept or reject'
    });
  }
  
  bidder = highestBid.bidder;

  try {
    switch (decision) {
      case 'accept':
        await handleAcceptBid(auction, highestBid, bidder);
        break;
      
      case 'reject':
        await handleRejectBid(auction, highestBid, bidder);
        break;
      
      case 'counter_offer':
        if (!counterOfferAmount || counterOfferAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Valid counter offer amount is required'
          });
        }
        await handleCounterOffer(auction, highestBid, bidder, counterOfferAmount);
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid decision. Must be accept, reject, or counter_offer'
        });
    }

    // Get updated auction
    const updatedAuction = await Auction.findByPk(auctionId, {
      include: [
        {
          model: Bid,
          as: 'highestBid',
          include: [{
            model: User,
            as: 'bidder',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }]
        }
      ]
    });

    res.json({
      success: true,
      message: `Bid ${decision.replace('_', ' ')} successfully`,
      data: {
        auction: updatedAuction
      }
    });

  } catch (error) {
    console.error('Error processing seller decision:', error);
    throw error;
  }
});

const handleAcceptBid = async (auction, highestBid, bidder) => {
  // Update auction status
  await auction.update({
    sellerDecision: 'accepted',
    status: 'completed',
    finalPrice: highestBid.amount,
    completedAt: new Date(),
    winnerId: bidder.id
  });

  // Sync Redis with database to ensure consistency
  try {
    const updatedAuction = await redisService.syncAuctionWithDatabase(auction.id, Auction);
    if (updatedAuction) {
      console.log(`✅ Synced Redis with database for auction ${auction.id}, sellerDecision: ${updatedAuction.sellerDecision}`);
    }
  } catch (error) {
    console.error(`❌ Error syncing Redis with database for auction ${auction.id}:`, error);
  }

  // Create notifications
  await Notification.create({
    userId: bidder.id,
    type: 'bid_accepted',
    title: 'Congratulations! Your bid was accepted',
    message: `Your bid of $${highestBid.amount} for "${auction.title}" has been accepted by the seller.`,
    data: {
      auctionId: auction.id,
      bidAmount: highestBid.amount,
      sellerId: auction.sellerId
    }
  });

  await Notification.create({
    userId: auction.sellerId,
    type: 'bid_accepted',
    title: 'Auction completed successfully',
    message: `You have accepted the bid of $${highestBid.amount} for "${auction.title}".`,
    data: {
      auctionId: auction.id,
      finalPrice: highestBid.amount,
      winnerId: bidder.id
    }
  });

  // ✅ REAL-TIME: Send real-time notifications
  broadcastToUser(bidder.id, {
    type: 'notification',
    notificationType: 'bidAccepted',
    title: 'Congratulations! Your bid was accepted',
    message: `Your bid of $${highestBid.amount} for "${auction.title}" has been accepted`,
    timestamp: new Date().toISOString(),
    auctionId: auction.id,
    isRead: false
  });

  broadcastToUser(auction.sellerId, {
    type: 'notification',
    notificationType: 'auctionCompleted',
    title: 'Auction Completed Successfully',
    message: `You accepted the bid of $${highestBid.amount} for "${auction.title}"`,
    timestamp: new Date().toISOString(),
    auctionId: auction.id,
    isRead: false
  });

  // ✅ REAL-TIME: Broadcast to auction room
  broadcastToAuction(auction.id, {
    type: 'auctionCompleted',
    auctionId: auction.id,
    status: 'completed',
    sellerDecision: 'accepted',
    decision: 'accepted',
    finalPrice: highestBid.amount,
    winner: {
      id: bidder.id,
      username: bidder.username
    }
  });

  // Send confirmation emails
  try {
    await emailService.sendBidAcceptedEmail(bidder, auction.seller, auction, highestBid.amount);
  } catch (error) {
    console.error('Failed to send bid accepted emails:', error);
  }

  // Generate and send invoices
  try {
    await invoiceService.generateAndSendInvoices(auction, bidder, highestBid.amount);
  } catch (error) {
    console.error('Failed to generate invoices:', error);
  }
};

const handleRejectBid = async (auction, highestBid, bidder) => {
  // Update auction status
  await auction.update({
    sellerDecision: 'rejected',
    status: 'completed',
    completedAt: new Date()
  });

  // Sync Redis with database to ensure consistency
  try {
    const updatedAuction = await redisService.syncAuctionWithDatabase(auction.id, Auction);
    if (updatedAuction) {
      console.log(`✅ Synced Redis with database for auction ${auction.id}, sellerDecision: ${updatedAuction.sellerDecision}`);
    }
  } catch (error) {
    console.error(`❌ Error syncing Redis with database for auction ${auction.id}:`, error);
  }

  // Create notifications
  await Notification.create({
    userId: bidder.id,
    type: 'bid_rejected',
    title: 'Your bid was not accepted',
    message: `Unfortunately, your bid of $${highestBid.amount} for "${auction.title}" was not accepted by the seller.`,
    data: {
      auctionId: auction.id,
      bidAmount: highestBid.amount,
      sellerId: auction.sellerId
    }
  });

  await Notification.create({
    userId: auction.sellerId,
    type: 'bid_rejected',
    title: 'Auction completed',
    message: `You have rejected the bid of $${highestBid.amount} for "${auction.title}".`,
    data: {
      auctionId: auction.id,
      rejectedBidAmount: highestBid.amount
    }
  });

  // ✅ REAL-TIME: Send real-time notifications
  broadcastToUser(bidder.id, {
    type: 'notification',
    notificationType: 'bidRejected',
    title: 'Your bid was not accepted',
    message: `Unfortunately, your bid of $${highestBid.amount} for "${auction.title}" was not accepted`,
    timestamp: new Date().toISOString(),
    auctionId: auction.id,
    isRead: false
  });

  broadcastToUser(auction.sellerId, {
    type: 'notification',
    notificationType: 'auctionCompleted',
    title: 'Auction Completed',
    message: `You rejected the bid of $${highestBid.amount} for "${auction.title}"`,
    timestamp: new Date().toISOString(),
    auctionId: auction.id,
    isRead: false
  });

  // ✅ REAL-TIME: Broadcast to auction room
  broadcastToAuction(auction.id, {
    type: 'auctionCompleted',
    auctionId: auction.id,
    status: 'completed',
    sellerDecision: 'rejected',
    decision: 'rejected'
  });

  // Send email notification
  try {
    await emailService.sendBidRejectedEmail(bidder, auction);
  } catch (error) {
    console.error('Failed to send bid rejected email:', error);
  }
};

const handleCounterOffer = async (auction, highestBid, bidder, counterOfferAmount) => {
  // Update auction with counter offer
  await auction.update({
    sellerDecision: 'counter_offered',
    counterOfferAmount: counterOfferAmount,
    counterOfferStatus: 'pending'
  });

  // Sync Redis with database to ensure consistency
  try {
    const updatedAuction = await redisService.syncAuctionWithDatabase(auction.id, Auction);
    if (updatedAuction) {
      console.log(`✅ Synced Redis with database for auction ${auction.id}, sellerDecision: ${updatedAuction.sellerDecision}`);
    }
  } catch (error) {
    console.error(`❌ Error syncing Redis with database for auction ${auction.id}:`, error);
  }

  // Create notifications
  await Notification.create({
    userId: bidder.id,
    type: 'counter_offer',
    title: 'Counter offer received',
    message: `The seller has made a counter offer of $${counterOfferAmount} for "${auction.title}". Your original bid was $${highestBid.amount}.`,
    data: {
      auctionId: auction.id,
      originalBidAmount: highestBid.amount,
      counterOfferAmount: counterOfferAmount,
      sellerId: auction.sellerId
    }
  });

  await Notification.create({
    userId: auction.sellerId,
    type: 'counter_offer',
    title: 'Counter offer sent',
    message: `You have sent a counter offer of $${counterOfferAmount} for "${auction.title}".`,
    data: {
      auctionId: auction.id,
      counterOfferAmount: counterOfferAmount,
      bidderId: bidder.id
    }
  });

  // ✅ REAL-TIME: Send real-time notifications
  broadcastToUser(bidder.id, {
    type: 'notification',
    notificationType: 'counterOffer',
    title: 'Counter Offer Received',
    message: `The seller made a counter offer of $${counterOfferAmount} for "${auction.title}"`,
    timestamp: new Date().toISOString(),
    auctionId: auction.id,
    isRead: false
  });

  broadcastToUser(auction.sellerId, {
    type: 'notification',
    notificationType: 'counterOfferSent',
    title: 'Counter Offer Sent',
    message: `You sent a counter offer of $${counterOfferAmount} for "${auction.title}"`,
    timestamp: new Date().toISOString(),
    auctionId: auction.id,
    isRead: false
  });

  // ✅ REAL-TIME: Broadcast to auction room
  broadcastToAuction(auction.id, {
    type: 'counterOfferSent',
    auctionId: auction.id,
    sellerDecision: 'counter_offered',
    counterOfferAmount: counterOfferAmount,
    originalBidAmount: highestBid.amount,
    winner: {
      id: bidder.id,
      username: bidder.username
    }
  });

  // Send email notification
  try {
    await emailService.sendCounterOfferEmail(bidder, auction, counterOfferAmount);
  } catch (error) {
    console.error('Failed to send counter offer email:', error);
  }
};

const respondToCounterOffer = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const { response } = req.body; // 'accept' or 'reject'
  const bidderId = req.user.id;

  // Get auction with seller and highest bid info
  const auction = await Auction.findByPk(auctionId, {
    include: [
      {
        model: User,
        as: 'seller',
        attributes: ['id', 'username', 'firstName', 'lastName', 'email']
      },
      {
        model: Bid,
        as: 'highestBid',
        include: [{
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }]
      }
    ]
  });

  if (!auction) {
    return res.status(404).json({
      success: false,
      message: 'Auction not found'
    });
  }

  if (!auction.highestBid || auction.highestBid.bidderId !== bidderId) {
    return res.status(403).json({
      success: false,
      message: 'You can only respond to counter offers on your own bids'
    });
  }

  if (auction.sellerDecision !== 'counter_offered' || auction.counterOfferStatus !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'No pending counter offer to respond to'
    });
  }

  try {
    if (response === 'accept') {
      // Accept counter offer
      await auction.update({
        counterOfferStatus: 'accepted',
        status: 'completed',
        finalPrice: auction.counterOfferAmount,
        completedAt: new Date(),
        winnerId: bidderId
      });

      // Sync Redis with database to ensure consistency
      try {
        const updatedAuction = await redisService.syncAuctionWithDatabase(auction.id, Auction);
        if (updatedAuction) {
          console.log(`✅ Synced Redis with database for auction ${auction.id}, counterOfferStatus: ${updatedAuction.counterOfferStatus}`);
        }
      } catch (error) {
        console.error(`❌ Error syncing Redis with database for auction ${auction.id}:`, error);
      }

      // Create notifications
      await Notification.create({
        userId: bidderId,
        type: 'counter_offer_accepted',
        title: 'Counter offer accepted',
        message: `You have accepted the counter offer of $${auction.counterOfferAmount} for "${auction.title}".`,
        data: {
          auctionId: auction.id,
          finalPrice: auction.counterOfferAmount
        }
      });

      await Notification.create({
        userId: auction.sellerId,
        type: 'counter_offer_accepted',
        title: 'Counter offer accepted',
        message: `Your counter offer of $${auction.counterOfferAmount} for "${auction.title}" has been accepted.`,
        data: {
          auctionId: auction.id,
          finalPrice: auction.counterOfferAmount,
          winnerId: bidderId
        }
      });

      // ✅ REAL-TIME: Send real-time notifications
      broadcastToUser(bidderId, {
        type: 'notification',
        notificationType: 'counterOfferAccepted',
        title: 'Counter Offer Accepted',
        message: `You accepted the counter offer of $${auction.counterOfferAmount} for "${auction.title}"`,
        timestamp: new Date().toISOString(),
        auctionId: auction.id,
        isRead: false
      });

      broadcastToUser(auction.sellerId, {
        type: 'notification',
        notificationType: 'counterOfferAccepted',
        title: 'Counter Offer Accepted',
        message: `Your counter offer of $${auction.counterOfferAmount} for "${auction.title}" was accepted`,
        timestamp: new Date().toISOString(),
        auctionId: auction.id,
        isRead: false
      });

      // ✅ REAL-TIME: Broadcast to auction room
      broadcastToAuction(auction.id, {
        type: 'auctionCompleted',
        auctionId: auction.id,
        status: 'completed',
        decision: 'counter_offer_accepted',
        finalPrice: auction.counterOfferAmount,
        winner: {
          id: bidderId,
          username: req.user.username
        }
      });

      // Send emails and generate invoices
      try {
        // Send counter offer response email to seller
        await emailService.sendCounterOfferResponseEmail(
          auction.seller,
          auction.highestBid.bidder,
          auction,
          'accepted',
          auction.counterOfferAmount
        );
        
        // Send bid accepted email to buyer
        await emailService.sendBidAcceptedEmail(
          auction.highestBid.bidder, 
          auction.seller, 
          auction, 
          auction.counterOfferAmount
        );
        
        // Generate and send invoices
        await invoiceService.generateAndSendInvoices(auction, auction.highestBid.bidder, auction.counterOfferAmount);
      } catch (error) {
        console.error('Failed to send emails or generate invoices:', error);
      }

    } else if (response === 'reject') {
      // Reject counter offer
      await auction.update({
        counterOfferStatus: 'rejected',
        status: 'completed',
        completedAt: new Date()
      });

      // Sync Redis with database to ensure consistency
      try {
        const updatedAuction = await redisService.syncAuctionWithDatabase(auction.id, Auction);
        if (updatedAuction) {
          console.log(`✅ Synced Redis with database for auction ${auction.id}, counterOfferStatus: ${updatedAuction.counterOfferStatus}`);
        }
      } catch (error) {
        console.error(`❌ Error syncing Redis with database for auction ${auction.id}:`, error);
      }

      // Create notifications
      await Notification.create({
        userId: bidderId,
        type: 'counter_offer_rejected',
        title: 'Counter offer rejected',
        message: `You have rejected the counter offer of $${auction.counterOfferAmount} for "${auction.title}".`,
        data: {
          auctionId: auction.id,
          rejectedCounterOffer: auction.counterOfferAmount
        }
      });

      await Notification.create({
        userId: auction.sellerId,
        type: 'counter_offer_rejected',
        title: 'Counter offer rejected',
        message: `Your counter offer of $${auction.counterOfferAmount} for "${auction.title}" has been rejected.`,
        data: {
          auctionId: auction.id,
          rejectedCounterOffer: auction.counterOfferAmount
        }
      });

      // ✅ REAL-TIME: Send real-time notifications
      broadcastToUser(bidderId, {
        type: 'notification',
        notificationType: 'counterOfferRejected',
        title: 'Counter Offer Rejected',
        message: `You rejected the counter offer of $${auction.counterOfferAmount} for "${auction.title}"`,
        timestamp: new Date().toISOString(),
        auctionId: auction.id,
        isRead: false
      });

      broadcastToUser(auction.sellerId, {
        type: 'notification',
        notificationType: 'counterOfferRejected',
        title: 'Counter Offer Rejected',
        message: `Your counter offer of $${auction.counterOfferAmount} for "${auction.title}" was rejected`,
        timestamp: new Date().toISOString(),
        auctionId: auction.id,
        isRead: false
      });

      // ✅ REAL-TIME: Broadcast to auction room
      broadcastToAuction(auction.id, {
        type: 'auctionCompleted',
        auctionId: auction.id,
        status: 'completed',
        decision: 'counter_offer_rejected'
      });

      // Send counter offer response email to seller
      try {
        await emailService.sendCounterOfferResponseEmail(
          auction.seller,
          auction.highestBid.bidder,
          auction,
          'rejected',
          auction.counterOfferAmount
        );
      } catch (error) {
        console.error('Failed to send counter offer response email:', error);
      }

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid response. Must be accept or reject'
      });
    }

    // Get updated auction
    const updatedAuction = await Auction.findByPk(auctionId, {
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Bid,
          as: 'highestBid',
          include: [{
            model: User,
            as: 'bidder',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }]
        }
      ]
    });

    res.json({
      success: true,
      message: `Counter offer ${response}ed successfully`,
      data: {
        auction: updatedAuction
      }
    });

  } catch (error) {
    console.error('Error processing counter offer response:', error);
    throw error;
  }
});

module.exports = {
  makeSellerDecision,
  respondToCounterOffer
};
