import { v2 as cloudinary } from "cloudinary";

// Parse and configure Cloudinary
const cloudinaryUrl = process.env.CLOUDINARY_URL;
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudinaryUrl) {
  cloudinary.config({
    secure: true,
  });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    ((process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET)
  );
}

export async function uploadImage(fileBufferOrBase64: string, folder = "volleyball_auction"): Promise<string> {
  // If Cloudinary keys are configured, upload to Cloudinary
  if (isCloudinaryConfigured()) {
    try {
      const uploadResponse = await cloudinary.uploader.upload(fileBufferOrBase64, {
        folder,
        resource_type: "image",
        transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
      });
      return uploadResponse.secure_url;
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
    }
  }

  // Graceful fallback for local development or when Cloudinary keys are not yet configured:
  if (fileBufferOrBase64.startsWith("data:image")) {
    return fileBufferOrBase64;
  }

  return `https://images.unsplash.com/photo-1592656094267-764a45160876?w=600&auto=format&fit=crop&q=80`;
}

export default cloudinary;
