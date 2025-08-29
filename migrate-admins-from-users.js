// Migration Script: Copy admin users from `users` collection to `admins`
// Usage:
//   node migrate-admins-from-users.js --dry-run         # Show what would happen
//   node migrate-admins-from-users.js                   # Execute migration
//   node migrate-admins-from-users.js --overwrite       # Overwrite existing admins by email
//
// Environment:
//   MONGODB_URL must be set; falls back to MedhDB Atlas string in dev

import mongoose from "mongoose";
import User from "./models/user-modal.js";
import Admin from "./models/admin-model.js";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const overwrite = args.includes("--overwrite");

// Allowed admin permissions per admin model enum
const ALLOWED_ADMIN_PERMISSIONS = new Set([
  "user_management",
  "course_management",
  "content_management",
  "financial_management",
  "system_settings",
  "analytics_access",
  "support_management",
]);

// Map common legacy permission names to the new enum values
const PERMISSION_SYNONYMS = new Map([
  ["view_courses", "course_management"],
  ["manage_courses", "course_management"],
  ["courses", "course_management"],
  ["users", "user_management"],
  ["manage_users", "user_management"],
  ["settings", "system_settings"],
  ["analytics", "analytics_access"],
  ["support", "support_management"],
  ["content", "content_management"],
]);

function sanitizePermissions(sourcePermissions = []) {
  if (!Array.isArray(sourcePermissions)) return [];
  const normalized = [];
  for (const raw of sourcePermissions) {
    if (!raw) continue;
    const p = String(raw).toLowerCase().trim();
    const mapped = PERMISSION_SYNONYMS.get(p) || p;
    if (ALLOWED_ADMIN_PERMISSIONS.has(mapped)) {
      if (!normalized.includes(mapped)) normalized.push(mapped);
    } else {
      console.log(`⚠️  Dropping unsupported permission: ${raw}`);
    }
  }
  return normalized;
}

async function connect() {
  const mongoUrl = process.env.MONGODB_URL ||
    "mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB";
  await mongoose.connect(mongoUrl);
  console.log("✅ Connected to MongoDB");
  try {
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🔗 URL: ${mongoUrl}`);
  } catch {}
}

function isAdminRole(roleValue) {
  if (!roleValue) return false;
  if (typeof roleValue === "string") return roleValue.toLowerCase() === "admin";
  if (Array.isArray(roleValue)) return roleValue.map(String).some(r => r.toLowerCase() === "admin");
  return false;
}

async function migrate() {
  await connect();

  const usersCollection = mongoose.connection.db.collection("users");
  const adminsCollection = mongoose.connection.db.collection("admins");

  // Find admin-like users in `users`
  const cursor = usersCollection.find({
    $or: [
      { role: "admin" },
      { role: { $in: ["admin"] } },
      { admin_role: { $in: ["super-admin", "admin", "moderator"] } },
    ],
  });

  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  while (await cursor.hasNext()) {
    const user = await cursor.next();
    processed++;

    const email = (user.email || "").toLowerCase();
    if (!email) {
      skipped++;
      console.log(`⏭️  Skipping user without email: _id=${user._id}`);
      continue;
    }

    // Build admin document
    const adminDoc = {
      full_name: user.full_name || user.name || "Admin User",
      email,
      // Preserve hashed password if present; admin model pre-save hook will skip if _skipPasswordHash=true
      password: user.password || "TempPass#12345", // fallback; will be hashed if not already
      admin_role:
        (typeof user.admin_role === "string" && user.admin_role) ||
        (isAdminRole(user.role) ? "admin" : undefined) ||
        "admin",
      permissions: sanitizePermissions(user.permissions),
      is_active: user.is_active !== undefined ? !!user.is_active : true,
      is_verified: user.is_verified !== undefined ? !!user.is_verified : !!user.verified,
      phone: user.phone || user.mobile || undefined,
      department: user.department || undefined,
      designation: user.designation || undefined,
    };

    // If source password looks already hashed, signal admin model to skip hashing
    const looksHashed = typeof adminDoc.password === "string" && adminDoc.password.length > 20 && adminDoc.password.includes("$");

    if (isDryRun) {
      console.log(`🔎 [DRY-RUN] Would upsert admin for: ${email} (role=${adminDoc.admin_role})`);
      continue;
    }

    const existing = await adminsCollection.findOne({ email });
    if (existing && !overwrite) {
      skipped++;
      console.log(`⏭️  Skipping existing admin (use --overwrite to update): ${email}`);
      continue;
    }

    if (existing && overwrite) {
      // Update selected fields; keep existing password unless source has a hashed one
      const update = {
        $set: {
          full_name: adminDoc.full_name,
          admin_role: adminDoc.admin_role,
          permissions: adminDoc.permissions,
          is_active: adminDoc.is_active,
          is_verified: adminDoc.is_verified,
          phone: adminDoc.phone,
          department: adminDoc.department,
          designation: adminDoc.designation,
          updated_at: new Date(),
        },
      };
      if (looksHashed) {
        update.$set.password = adminDoc.password;
      }
      await adminsCollection.updateOne({ email }, update);
      updated++;
      console.log(`✏️  Updated admin: ${email}`);
    } else {
      // Create via Mongoose model to respect hooks
      const admin = new Admin(adminDoc);
      if (looksHashed) admin._skipPasswordHash = true;
      await admin.save();
      created++;
      console.log(`✅ Created admin: ${email}`);
    }
  }

  console.log("\n📊 Migration Summary");
  console.log("===================");
  console.log(`Processed: ${processed}`);
  console.log(`Created:   ${created}`);
  console.log(`Updated:   ${updated}`);
  console.log(`Skipped:   ${skipped}`);
}

migrate()
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    mongoose.connection.close();
    process.exit(1);
  });


