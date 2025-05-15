import cloudinary from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

/* FILE STORAGE */
// Cloudinary
cloudinary.config({
  cloud_name: `${process.env.CLOUD_NAME}`,
  api_key: `${process.env.API_KEY}`,
  api_secret: `${process.env.API_SECRET}`,
  secure: true,
});

// Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: 'Assets',
    format: async (req, file) => 'webp', // Set the format of the uploaded image
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, // Set the public ID for the uploaded image
  },
});

// Initialize Multer upload middleware with limits
const multerConfig = {
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10 MB
  },
};

async function uploadDriveFileToCloudinary(fileId) {
  const fileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    const result = await cloudinary.v2.uploader.upload(fileUrl, {
      folder: 'Assets',
      format: 'webp',
      public_id: `${Date.now()}-${fileId}`,
    });
    return result.secure_url; // Return the secure URL of the uploaded file
  } catch (error) {
    console.error(`Failed to upload file ${fileId}:`, error);
    return null;
  }
}

async function uploadMultipleFiles(fileIds = []) {
  const urls = [];

  for (const id of fileIds) {
    const url = await uploadDriveFileToCloudinary(id);
    if (url) urls.push(url);
  }
  return urls;
}

export const upload = multer(multerConfig);

export { cloudinary, uploadMultipleFiles };
