import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER-ADMIN" },
    update: {},
    create: { name: "SUPER-ADMIN" },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: { name: "USER" },
  });

  // Create a super-admin user
  const passwordHash = bcrypt.hashSync("superadminpassword", 10);

  await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: {
      firstName: "Super",
      lastName: "Admin",
      email: "superadmin@example.com",
      passwordHash: passwordHash,
      role: {
        connect: { id: superAdminRole.id },
      },
    },
  });

  console.log("Roles and user created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
