const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const ImageUploadService = require('../services/imageUploadService');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Upload single image
router.post('/upload', 
  authenticateToken, 
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const uploadedFile = await ImageUploadService.uploadImage(
      req.file, 
      req.user.id, 
      req.body.auctionId || null
    );

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: { file: uploadedFile }
    });
  })
);

// Upload multiple images
router.post('/upload-multiple',
  authenticateToken,
  upload.array('images', 5), // Max 5 images
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const uploadedFiles = await ImageUploadService.uploadMultipleImages(
      req.files,
      req.user.id,
      req.body.auctionId || null
    );

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} images uploaded successfully`,
      data: { files: uploadedFiles }
    });
  })
);

// Get auction images
router.get('/auction/:auctionId',
  asyncHandler(async (req, res) => {
    const { auctionId } = req.params;
    const images = await ImageUploadService.getAuctionImages(auctionId);

    res.json({
      success: true,
      data: { images }
    });
  })
);

// Delete single image
router.delete('/:fileId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const result = await ImageUploadService.deleteImage(fileId, req.user.id);

    res.json(result);
  })
);

// Delete multiple images
router.delete('/multiple',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileIds } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds)) {
      return res.status(400).json({
        success: false,
        message: 'File IDs array is required'
      });
    }

    const result = await ImageUploadService.deleteMultipleImages(fileIds, req.user.id);
    res.json(result);
  })
);

// Get user's uploaded files (with pagination)
router.get('/user/files',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await ImageUploadService.getUserFiles(req.user.id, page, limit);

    res.json({
      success: true,
      data: result
    });
  })
);

// Admin routes
router.use('/admin', authenticateToken, authorize(['admin']));

// Get system statistics
router.get('/admin/stats',
  asyncHandler(async (req, res) => {
    const stats = await ImageUploadService.getSystemStats();

    res.json({
      success: true,
      data: stats
    });
  })
);

// Clean up orphaned files
router.post('/admin/cleanup',
  asyncHandler(async (req, res) => {
    const result = await ImageUploadService.cleanupOrphanedFiles();

    res.json({
      success: true,
      data: result
    });
  })
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only JPG, JPEG, and PNG files are allowed'
    });
  }

  next(error);
});

module.exports = router;
