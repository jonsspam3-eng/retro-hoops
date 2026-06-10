import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = String(process.env.BOOTSTRAP_ADMIN_NAME ?? "").trim() || "Sovereign Super Admin";
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "");

  if (!email || !password) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required.");
  }

  const activeSuperAdmins = await prisma.user.count({
    where: {
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  if (activeSuperAdmins > 0) {
    throw new Error("Bootstrap blocked: at least one active SUPER_ADMIN already exists.");
  }

  const passwordHash = await hash(password, 12);
  const existing = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
  });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          email,
          role: "SUPER_ADMIN",
          isActive: true,
          passwordHash,
          requireGoogleMfa: true,
        },
      })
    : await prisma.user.create({
        data: {
          name,
          email,
          role: "SUPER_ADMIN",
          isActive: true,
          passwordHash,
          requireGoogleMfa: true,
        },
      });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "SUPER_ADMIN_BOOTSTRAPPED",
      entityType: "USER",
      entityId: user.id,
      metadata: {
        email: user.email,
      },
    },
  });

  console.log(`Bootstrap complete for ${user.email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
