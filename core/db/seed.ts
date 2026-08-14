import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { DEFAULT_ADMIN_ROLE_ID } from "./seedConstants";
import { getUserByEmail } from "../services/auth/userService";
import { buildEmailFields, normalizeEmail } from "../services/security/piiEmail";
import { adminThemeProfiles, adminThemeTemplates, roles, userRoles, users } from "./schema";
import { hashSeedAdminPassword } from "./seedPassword";
import {
  type AdminThemeSeedStore,
  type SeedDefaultAdminThemeResult,
  runDefaultAdminThemeSeed,
} from "./seedAdminTheme";

/**
 * Injectable seams for `seedAdmin` (mirrors `CreateFirstAdminDeps` in
 * `core/services/admin/firstRunService.ts`) so DB-backed tests can point the
 * whole seed at one worker schema without touching the shared `public` tables.
 */
export type SeedAdminDeps = {
  db?: typeof db;
  getUserByEmail?: typeof getUserByEmail;
};

export async function seedAdmin(deps: SeedAdminDeps = {}) {
  const database = deps.db ?? db;
  const lookupUser = deps.getUserByEmail ?? getUserByEmail;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin seed.");
    return;
  }

  console.log(`Seeding admin user: ${adminEmail}`);

  // 1. Resolve the admin role: migration-guaranteed stable id first
  //    (TASK-518, core/db/seedConstants.ts), then select-by-name "admin" for
  //    pre-518 installs whose role carries a legacy random id. Never create a
  //    duplicate role and never renumber an existing one.
  let [role] = await database.select().from(roles).where(eq(roles.id, DEFAULT_ADMIN_ROLE_ID));
  if (!role) {
    [role] = await database.select().from(roles).where(eq(roles.name, "admin"));
  }
  if (!role) throw new Error("admin_role_missing");
  console.log("Resolved admin role");

  // 2. Create or get admin user.
  const normalizedEmail = normalizeEmail(adminEmail);
  let user = await lookupUser(normalizedEmail);

  if (!user) {
    const passwordHash = await hashSeedAdminPassword(adminPassword);
    const emailFields = buildEmailFields(normalizedEmail);
    [user] = await database
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
  const [existingUserRole] = await database
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, user.id), eq(userRoles.roleId, role.id)));

  if (!existingUserRole) {
    await database
      .insert(userRoles)
      .values({ userId: user.id, roleId: role.id })
      .onConflictDoNothing();
    console.log("Assigned admin role to user");
  } else {
    console.log("Admin role already assigned");
  }
}

/**
 * Drizzle-backed {@link AdminThemeSeedStore} over the real `admin_theme_*` tables.
 * The DB-agnostic orchestration lives in `./seedAdminTheme` so it can be unit
 * tested without a live database.
 */
function createDbAdminThemeSeedStore(): AdminThemeSeedStore {
  return {
    async findTemplateByName(name) {
      const [row] = await db
        .select({ id: adminThemeTemplates.id })
        .from(adminThemeTemplates)
        .where(eq(adminThemeTemplates.name, name));
      return row ?? null;
    },
    async insertTemplate(input) {
      const now = new Date();
      const [row] = await db
        .insert(adminThemeTemplates)
        .values({
          name: input.name,
          description: input.description,
          tokens: input.tokens,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: adminThemeTemplates.id });
      return row;
    },
    async findActiveProfile() {
      const [row] = await db
        .select({ id: adminThemeProfiles.id })
        .from(adminThemeProfiles)
        .where(eq(adminThemeProfiles.isActive, true));
      return row ?? null;
    },
    async insertProfile(input) {
      const now = new Date();
      await db.insert(adminThemeProfiles).values({
        name: input.name,
        templateId: input.templateId,
        isActive: input.isActive,
        createdAt: now,
        updatedAt: now,
      });
    },
  };
}

/**
 * Seed the default "Soft Violet" admin theme template (+ activate a "Default"
 * profile when none is active). Idempotent and non-destructive — safe to run on
 * every boot. `admin_theme_templates.tokens` is `jsonb`, so no schema migration
 * is needed to carry the TASK-479-05 token fields.
 */
export async function seedDefaultAdminTheme(): Promise<SeedDefaultAdminThemeResult> {
  console.log("Seeding default admin theme (Soft Violet)");
  return runDefaultAdminThemeSeed(createDbAdminThemeSeedStore(), (message) => console.log(message));
}

// Allow running directly if executed as a script
if (import.meta.main) {
  seedAdmin()
    .then(() => seedDefaultAdminTheme())
    .then(() => {
      console.log("Seed complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed", err);
      process.exit(1);
    });
}
