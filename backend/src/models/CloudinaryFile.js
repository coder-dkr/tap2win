const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CloudinaryFile = sequelize.define('CloudinaryFile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  publicId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  format: {
    type: DataTypes.STRING,
    allowNull: true
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  auctionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Auctions',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'cloudinary_files',
  timestamps: true,
  paranoid: true, // Soft deletes
  indexes: [
    {
      fields: ['publicId']
    },
    {
      fields: ['uploadedBy']
    },
    {
      fields: ['auctionId']
    },
    {
      fields: ['isActive']
    }
  ]
});

// Instance methods
CloudinaryFile.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

// Class methods
CloudinaryFile.findByAuctionId = function(auctionId) {
  return this.findAll({
    where: { auctionId, isActive: true },
    order: [['createdAt', 'ASC']]
  });
};

CloudinaryFile.findByUserId = function(userId) {
  return this.findAll({
    where: { uploadedBy: userId, isActive: true },
    order: [['createdAt', 'DESC']]
  });
};

CloudinaryFile.findOrphanedFiles = function() {
  return this.findAll({
    where: { 
      auctionId: null, 
      isActive: true,
      createdAt: {
        [require('sequelize').Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
      }
    }
  });
};

module.exports = CloudinaryFile;
