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
      isAfter: new Date().toISOString()
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
  // Images are now handled through CloudinaryFile association
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

// Instance methods
Auction.prototype.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.startTime && 
         now <= this.endTime;
};

Auction.prototype.hasEnded = function() {
  const now = new Date();
  return now > this.endTime || this.status === 'ended';
};

Auction.prototype.canBid = function() {
  return this.isActive() && this.status === 'active';
};

module.exports = Auction;
