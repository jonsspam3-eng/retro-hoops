import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createMedia, getCollectionFromCategory } from "@/lib/cms";
import { cloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";

const VALID_COLLECTIONS = new Set(["LIBRARY", "PHOTOGRAPHY", "MOODBOARD"]);

function resolveCollection(rawCollection, rawCategory) {
  if (VALID_COLLECTIONS.has(rawCollection)) {
    return rawCollection;
  }
  return getCollectionFromCategory(rawCategory);
}

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
    const fileList = formData.getAll("files");
    const singleFile = formData.get("file");
    const files = [
      ...fileList.filter((item) => item && typeof item !== "string"),
      ...(singleFile && typeof singleFile !== "string" ? [singleFile] : []),
    ];
    const title = String(formData.get("title") ?? "").trim();
    const collectionRaw = String(formData.get("collection") ?? "").trim().toUpperCase();
    const category = String(formData.get("category") ?? "").trim().toLowerCase() || null;
    const altText = String(formData.get("altText") ?? "").trim() || null;

    if (!files.length) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const items = await Promise.all(
      files.map(async (file, index) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        const dataUri = `data:${file.type};base64,${base64}`;
        const uploaded = await cloudinary.uploader.upload(dataUri, {
          folder: "portfolio-cms",
          resource_type: "image",
        });

        const fileStem = file.name?.replace(/\.[^.]+$/, "") || "Uploaded media";
        const resolvedTitle =
          title && files.length === 1 ? title : `${title || fileStem} ${files.length > 1 ? index + 1 : ""}`.trim();
        const collection = resolveCollection(collectionRaw, category);

        const media = await createMedia({
          title: resolvedTitle,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          altText,
          collection,
          category,
          published: true,
          featured: false,
          sortOrder: 0,
        });

        return media;
      }),
    );

    if (items.length === 1) {
      return NextResponse.json({ ok: true, media: items[0] }, { status: 201 });
    }
    return NextResponse.json({ ok: true, items }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to upload media." },
      { status: 400 },
    );
  }
}
