import { Algorithm, hash } from "@node-rs/argon2";
import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { getUserByEmail } from "../services/auth/userService";
import { buildEmailFields, normalizeEmail } from "../services/security/piiEmail";
import { roles, userRoles, users } from "./schema";

export async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin seed.");
    return;
  }

  console.log(`Seeding admin user: ${adminEmail}`);

  // 1. Create or get admin role.
  let [role] = await db.select().from(roles).where(eq(roles.name, "admin"));
  
  if (!role) {
    [role] = await db.insert(roles).values({
      name: "admin",
      permissions: ["*"],
    }).returning();
    console.log("Created admin role");
  } else {
    console.log("Admin role already exists");
  }

  // 2. Create or get admin user.
  const normalizedEmail = normalizeEmail(adminEmail);
  let user = await getUserByEmail(normalizedEmail);

  if (!user) {
    const passwordHash = await hash(adminPassword, {
      algorithm: Algorithm.Argon2id,
    });
    const emailFields = buildEmailFields(normalizedEmail);
    [user] = await db
      .insert(users)
      .values({
        email: emailFields.email,
        emailHash: emailFields.emailHash,
        emailEncrypted: emailFields.emailEncrypted,
        passwordHash,
        name: "System Admin",
      })
      .returning();
    console.log("Created admin user");
  } else {
    console.log("Admin user already exists");
  }

  // 3. Assign Role
  const [existingUserRole] = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, user.id), eq(userRoles.roleId, role.id)));

  if (!existingUserRole) {
    await db
      .insert(userRoles)
      .values({ userId: user.id, roleId: role.id })
      .onConflictDoNothing();
    console.log("Assigned admin role to user");
  } else {
    console.log("Admin role already assigned");
  }
}

// Allow running directly if executed as a script
if (import.meta.main) {
  seedAdmin().then(() => {
    console.log("Seed complete");
    process.exit(0);
  }).catch((err) => {
    console.error("Seed failed", err);
    process.exit(1);
  });
}
