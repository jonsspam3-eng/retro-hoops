import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { deleteMedia, updateMedia } from "@/lib/cms";

export async function PATCH(request, { params }) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const media = await updateMedia(params.id, payload);
    return NextResponse.json(media);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Unable to update media." },
      { status: 400 },
    );
  }
}

export async function DELETE(_, { params }) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const deleted = await deleteMedia(params.id);
    return NextResponse.json(deleted);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Unable to delete media." },
      { status: 400 },
    );
  }
}
