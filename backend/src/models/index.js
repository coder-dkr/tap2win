const User = require('./User');
const Auction = require('./Auction');
const Bid = require('./Bid');
const Notification = require('./Notification');
const CloudinaryFile = require('./CloudinaryFile');

// Define associations
User.hasMany(Auction, {
  foreignKey: 'sellerId',
  as: 'auctions'
});

Auction.belongsTo(User, {
  foreignKey: 'sellerId',
  as: 'seller'
});

User.hasMany(Bid, {
  foreignKey: 'bidderId',
  as: 'bids'
});

Bid.belongsTo(User, {
  foreignKey: 'bidderId',
  as: 'bidder'
});

Auction.hasMany(Bid, {
  foreignKey: 'auctionId',
  as: 'bids'
});

Bid.belongsTo(Auction, {
  foreignKey: 'auctionId',
  as: 'auction'
});

User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications'
});

Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Add association for winning bidder
Auction.belongsTo(User, {
  foreignKey: 'winnerId',
  as: 'winner',
  allowNull: true
});

User.hasMany(Auction, {
  foreignKey: 'winnerId',
  as: 'wonAuctions'
});

// Add association for highest bid
Auction.belongsTo(Bid, {
  foreignKey: 'highestBidId',
  as: 'highestBid',
  allowNull: true
});

// CloudinaryFile associations
User.hasMany(CloudinaryFile, {
  foreignKey: 'uploadedBy',
  as: 'uploadedFiles'
});

CloudinaryFile.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploader'
});

Auction.hasMany(CloudinaryFile, {
  foreignKey: 'auctionId',
  as: 'images'
});

CloudinaryFile.belongsTo(Auction, {
  foreignKey: 'auctionId',
  as: 'auction'
});

module.exports = {
  User,
  Auction,
  Bid,
  Notification,
  CloudinaryFile
};
