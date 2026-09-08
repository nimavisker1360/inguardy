import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession, isAdminUser } from "@/lib/server-auth";

const MAX_IMAGE_LENGTH = 900_000;
const DATA_IMAGE_PATTERN = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      isAdmin: isAdminUser(user),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      firstName?: unknown;
      lastName?: unknown;
      image?: unknown;
    };

    const firstName = cleanText(body.firstName);
    const lastName = cleanText(body.lastName);

    if (!firstName) {
      return NextResponse.json(
        { success: false, message: "First name is required" },
        { status: 400 }
      );
    }

    const image = typeof body.image === "string" ? body.image.trim() : null;

    if (image && image.length > MAX_IMAGE_LENGTH) {
      return NextResponse.json(
        { success: false, message: "Profile photo is too large" },
        { status: 400 }
      );
    }

    const isRemoteImage =
      image &&
      image.length <= 2_000 &&
      (() => {
        try {
          const url = new URL(image);
          return url.protocol === "https:" || url.protocol === "http:";
        } catch {
          return false;
        }
      })();

    if (image && !DATA_IMAGE_PATTERN.test(image) && !isRemoteImage) {
      return NextResponse.json(
        { success: false, message: "Profile photo must be PNG, JPG, WEBP, or a valid image URL" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: [firstName, lastName].filter(Boolean).join(" "),
        image: image || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
