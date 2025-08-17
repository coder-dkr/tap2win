const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Bid = sequelize.define('Bid', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  isWinning: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  bidTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('active', 'outbid', 'winning', 'lost'),
    defaultValue: 'active'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['auctionId', 'amount']
    },
    {
      fields: ['bidderId']
    },
    {
      fields: ['bidTime']
    },
    {
      fields: ['isWinning']
    }
  ]
});
Bid.prototype.toPublic = function() {
  return {
    id: this.id,
    amount: this.amount,
    bidTime: this.bidTime,
    bidder: {
      id: this.bidderId,
      username: this.bidder ? this.bidder.username : 'Anonymous'
    }
  };
};
module.exports = Bid;
