const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Auction = sequelize.define('Auction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 2000]
    }
  },
  startingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currentPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null
  },
  bidIncrement: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfterNow(value) {
        const now = new Date();
        if (value <= now) {
          throw new Error('Start time must be in the future');
        }
      }
    }
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfterStartTime(value) {
        if (this.startTime && value <= this.startTime) {
          throw new Error('End time must be after start time');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'ended', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  condition: {
    type: DataTypes.ENUM('new', 'like_new', 'good', 'fair', 'poor'),
    defaultValue: 'good'
  },
  sellerDecision: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'counter_offered'),
    allowNull: true
  },
  winnerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  counterOfferAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  counterOfferStatus: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    allowNull: true
  },
  finalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['startTime']
    },
    {
      fields: ['endTime']
    },
    {
      fields: ['sellerId']
    }
  ]
});
Auction.prototype.isActive = function() {
  const now = new Date();
  const startTime = new Date(this.startTime);
  const endTime = new Date(this.endTime);
  return now >= startTime && now <= endTime;
};
Auction.prototype.hasEnded = function() {
  const now = new Date();
  return now > this.endTime || this.status === 'ended';
};
Auction.prototype.canBid = function() {
  const now = new Date();
  const startTime = new Date(this.startTime);
  const endTime = new Date(this.endTime);
  let realTimeStatus = this.status;
  if (now < startTime) {
    realTimeStatus = 'pending';
  } else if (now >= startTime && now < endTime) {
    realTimeStatus = 'active';
  } else if (now >= endTime) {
    realTimeStatus = 'ended';
  }
  return realTimeStatus === 'active';
};
module.exports = Auction;
