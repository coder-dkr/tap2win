const { CloudinaryFile } = require('../models');
const { cloudinaryUtils } = require('../config/cloudinary');
const { asyncHandler } = require('../middleware/errorHandler');
class ImageUploadService {
  static uploadImage = asyncHandler(async (file, userId, auctionId = null) => {
    try {
      const cloudinaryResult = await cloudinaryUtils.uploadImage(file);
      const dbFile = await CloudinaryFile.create({
        publicId: cloudinaryResult.publicId,
        url: cloudinaryResult.url,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: cloudinaryResult.size,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
        uploadedBy: userId,
        auctionId: auctionId
      });
      return dbFile;
    } catch (error) {
      console.error('Image upload service error:', error);
      throw new Error('Failed to upload image');
    }
  });
  static uploadMultipleImages = asyncHandler(async (files, userId, auctionId = null) => {
    try {
      const uploadPromises = files.map(file => 
        this.uploadImage(file, userId, auctionId)
      );
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Multiple image upload service error:', error);
      throw new Error('Failed to upload images');
    }
  });
  static getAuctionImages = asyncHandler(async (auctionId) => {
    try {
      const images = await CloudinaryFile.findByAuctionId(auctionId);
      return images;
    } catch (error) {
      console.error('Get auction images error:', error);
      throw new Error('Failed to get auction images');
    }
  });
  static deleteImage = asyncHandler(async (fileId, userId) => {
    try {
      const file = await CloudinaryFile.findByPk(fileId);
      if (!file) {
        throw new Error('Image not found');
      }
      if (file.uploadedBy !== userId) {
        throw new Error('Unauthorized to delete this image');
      }
      await cloudinaryUtils.deleteImage(file.publicId);
      await file.destroy();
      return { success: true, message: 'Image deleted successfully' };
    } catch (error) {
      console.error('Delete image error:', error);
      throw new Error('Failed to delete image');
    }
  });
  static deleteMultipleImages = asyncHandler(async (fileIds, userId) => {
    try {
      const files = await CloudinaryFile.findAll({
        where: { id: fileIds }
      });
      const unauthorizedFiles = files.filter(file => file.uploadedBy !== userId);
      if (unauthorizedFiles.length > 0) {
        throw new Error('Unauthorized to delete some images');
      }
      const publicIds = files.map(file => file.publicId);
      await cloudinaryUtils.deleteMultipleImages(publicIds);
      await CloudinaryFile.destroy({
        where: { id: fileIds }
      });
      return { success: true, message: 'Images deleted successfully' };
    } catch (error) {
      console.error('Delete multiple images error:', error);
      throw new Error('Failed to delete images');
    }
  });
  static cleanupOrphanedFiles = asyncHandler(async () => {
    try {
      const orphanedFiles = await CloudinaryFile.findOrphanedFiles();
      if (orphanedFiles.length === 0) {
        return { success: true, message: 'No orphaned files found' };
      }
      const publicIds = orphanedFiles.map(file => file.publicId);
      await cloudinaryUtils.deleteMultipleImages(publicIds);
      await CloudinaryFile.destroy({
        where: { id: orphanedFiles.map(file => file.id) }
      });
      return { 
        success: true, 
        message: `Cleaned up ${orphanedFiles.length} orphaned files`,
        deletedCount: orphanedFiles.length
      };
    } catch (error) {
      console.error('Cleanup orphaned files error:', error);
      throw new Error('Failed to cleanup orphaned files');
    }
  });
  static getUserFiles = asyncHandler(async (userId, page = 1, limit = 20) => {
    try {
      const offset = (page - 1) * limit;
      const { count, rows: files } = await CloudinaryFile.findAndCountAll({
        where: { uploadedBy: userId, isActive: true },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: require('./Auction'),
          as: 'auction',
          attributes: ['id', 'title']
        }]
      });
      return {
        files,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Get user files error:', error);
      throw new Error('Failed to get user files');
    }
  });
  static getSystemStats = asyncHandler(async () => {
    try {
      const totalFiles = await CloudinaryFile.count({ where: { isActive: true } });
      const totalSize = await CloudinaryFile.sum('size', { where: { isActive: true } });
      const orphanedFiles = await CloudinaryFile.count({ 
        where: { 
          auctionId: null, 
          isActive: true,
          createdAt: {
            [require('sequelize').Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });
      return {
        totalFiles,
        totalSize: totalSize || 0,
        orphanedFiles,
        totalSizeMB: Math.round((totalSize || 0) / (1024 * 1024) * 100) / 100
      };
    } catch (error) {
      console.error('Get system stats error:', error);
      throw new Error('Failed to get system statistics');
    }
  });
}
module.exports = ImageUploadService;
