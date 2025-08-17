const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


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


const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, 
    files: 5 
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});


const cloudinaryUtils = {
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
  deleteImage: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete image from Cloudinary');
    }
  },
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
