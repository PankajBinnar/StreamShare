import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Configure Multer in-memory storage with strict 5MB limit and MIME verification
export const chatImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid format: Only JPEG, PNG, and WebP images are permitted for proof sharing.'));
    }
  },
});

/**
 * Upload a raw buffer to Cloudinary using direct streaming
 */
export function uploadImageBuffer(
  buffer: Buffer,
  folder = 'streamshare/chat_proofs'
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [
          { quality: 'auto:good' }, // Auto-optimize size & compression
        ],
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed.'));
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

export { cloudinary };
