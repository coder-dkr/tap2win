const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tap2win-auctions',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto:good' }
    ],
    resource_type: 'image'
  }
});

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Cloudinary utility functions
const cloudinaryUtils = {
  // Upload single image
  uploadImage: async (file) => {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'tap2win-auctions',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto:good' }
        ]
      });
      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  },

  // Upload multiple images
  uploadMultipleImages: async (files) => {
    try {
      const uploadPromises = files.map(file => cloudinaryUtils.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Multiple image upload error:', error);
      throw new Error('Failed to upload images to Cloudinary');
    }
  },

  // Delete image by public ID
  deleteImage: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete image from Cloudinary');
    }
  },

  // Delete multiple images
  deleteMultipleImages: async (publicIds) => {
    try {
      const deletePromises = publicIds.map(publicId => cloudinaryUtils.deleteImage(publicId));
      const results = await Promise.all(deletePromises);
      return results;
    } catch (error) {
      console.error('Multiple image delete error:', error);
      throw new Error('Failed to delete images from Cloudinary');
    }
  },

  // Get image info
  getImageInfo: async (publicId) => {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary get info error:', error);
      throw new Error('Failed to get image info from Cloudinary');
    }
  }
};

module.exports = {
  cloudinary,
  storage,
  upload,
  cloudinaryUtils
};
