import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createMedia, getCollectionFromCategory } from "@/lib/cms";
import { cloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";

export async function POST(request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured." },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = String(formData.get("title") ?? "").trim() || "Uploaded media";
    const category = String(formData.get("category") ?? "").trim().toLowerCase() || null;
    const altText = String(formData.get("altText") ?? "").trim() || null;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: "portfolio-cms",
      resource_type: "image",
    });

    const collection = getCollectionFromCategory(category);
    const media = await createMedia({
      title,
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      altText,
      collection,
      category,
      published: true,
      featured: false,
      sortOrder: 0,
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to upload media." },
      { status: 400 },
    );
  }
}
