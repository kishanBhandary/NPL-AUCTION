import { NextResponse } from "next/server";
import { uploadImage, isCloudinaryConfigured } from "@/lib/cloudinary";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Multipart form data (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const folder = (formData.get("folder") as string) || "volleyball_auction";

      if (!file) {
        return NextResponse.json({ error: "No image file provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = file.type || "image/jpeg";
      const base64Data = `data:${mimeType};base64,${buffer.toString("base64")}`;

      const secureUrl = await uploadImage(base64Data, folder);
      return NextResponse.json({
        success: true,
        url: secureUrl,
        cloudinary: isCloudinaryConfigured(),
      });
    }

    // JSON payload with base64 data
    const data = await req.json();
    const { image, folder = "volleyball_auction" } = data;

    if (!image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    const secureUrl = await uploadImage(image, folder);
    return NextResponse.json({
      success: true,
      url: secureUrl,
      cloudinary: isCloudinaryConfigured(),
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
