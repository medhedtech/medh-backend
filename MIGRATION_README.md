# 🚀 Fast Auth Migration Guide

This guide will help you quickly migrate your authentication system from the old structure to the new user model.

## 📋 What This Migration Does

### Database Changes
- `status: "Active"/"Inactive"` → `is_active: true/false`
- `emailVerified: boolean` → `email_verified: boolean`
- Adds new fields: `phone_verified`, `identity_verified`, `account_type`, `preferences`, etc.
- Updates database indexes
- Preserves all existing user data

### Code Changes
- Updates all references to use new field names
- Updates validation logic
- Updates query logic
- Updates comments and documentation

## 🏃‍♂️ Quick Start (Recommended)

**Run the complete migration in one command:**

```bash
npm run migrate:auth
```

This will:
1. ✅ Migrate database records
2. ✅ Update all code references  
3. ✅ Validate the migration
4. ✅ Provide a detailed summary

## 🔧 Advanced Options

### Database Migration Only
```bash
npm run migrate:auth:db-only
```

### Code Updates Only
```bash
npm run migrate:auth:code-only
```

### Manual Execution
```bash
# Database migration
node scripts/migrate-auth-structure.js

# Code updates
node scripts/update-auth-code.js

# Complete migration
node scripts/fast-auth-migration.js
```

## 📊 Field Mapping Reference

| Old Field | New Field | Type | Description |
|-----------|-----------|------|-------------|
| `status` | `is_active` | boolean | User active status |
| `emailVerified` | `email_verified` | boolean | Email verification status |
| ➕ | `phone_verified` | boolean | Phone verification status |
| ➕ | `identity_verified` | boolean | Identity verification status |
| ➕ | `account_type` | string | Account type (free/premium/admin) |
| ➕ | `preferences` | object | User preferences & settings |

## 🔍 Before Migration

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ MongoDB connection available
- ✅ Backup your database (recommended)
- ✅ Stop your application temporarily

### Backup Command (Optional but Recommended)
```bash
# MongoDB backup
mongodump --uri="your-mongodb-uri" --out=backup-$(date +%Y%m%d)
```

## 🚀 Migration Process

### Step 1: Run Migration
```bash
npm run migrate:auth
```

### Step 2: Review Changes
The migration will show you:
- Number of users migrated
- Files updated
- Total replacements made

### Step 3: Test Your Application
```bash
npm run dev
```

Test these endpoints:
- ✅ User registration
- ✅ Email verification  
- ✅ User login
- ✅ User status checks

## 🧪 Testing the Migration

### Test User Registration
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com", 
    "password": "password123",
    "agree_terms": true,
    "phone_numbers": [{"country": "+1", "number": "+1234567890"}]
  }'
```

### Test User Status Check
```bash
curl -X POST http://localhost:8080/api/v1/auth/check-user-status \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🔄 Frontend Updates Required

Update your frontend code to use the new field names:

### JavaScript/TypeScript
```javascript
// OLD
if (user.status === 'Active') { ... }
if (user.emailVerified) { ... }

// NEW  
if (user.is_active === true) { ... }
if (user.email_verified) { ... }
```

### API Response Changes
```json
{
  "user": {
    "is_active": true,
    "email_verified": false,
    "phone_verified": false,
    "account_type": "free",
    "preferences": {
      "theme": "auto",
      "language": "en"
    }
  }
}
```

## 🛠️ Troubleshooting

### Migration Fails
```bash
# Check logs
tail -f logs/error.log

# Validate database connection
node -e "import mongoose from 'mongoose'; mongoose.connect('your-uri').then(() => console.log('✅ Connected')).catch(console.error)"
```

### Code Issues After Migration
```bash
# Re-run code updates only
npm run migrate:auth:code-only

# Check for remaining old references
grep -r "status.*Active" . --exclude-dir=node_modules
grep -r "emailVerified" . --exclude-dir=node_modules
```

### Database Issues
```bash
# Re-run database migration only
npm run migrate:auth:db-only

# Check migration status
node -e "
import mongoose from 'mongoose';
import User from './models/user-modal.js';
mongoose.connect('your-uri').then(async () => {
  const oldFields = await User.countDocuments({status: {\$exists: true}});
  const newFields = await User.countDocuments({is_active: {\$exists: true}});
  console.log('Old fields:', oldFields, 'New fields:', newFields);
  process.exit(0);
});
"
```

## 📈 Performance Impact

- **Migration Time**: ~1-5 seconds per 1000 users
- **Downtime**: Minimal (recommended during low traffic)
- **Database Size**: No significant change
- **Query Performance**: Improved (better indexes)

## 🔒 Security Considerations

- ✅ All existing passwords remain encrypted
- ✅ User sessions remain valid
- ✅ OAuth connections preserved
- ✅ No sensitive data exposed during migration

## 📞 Support

If you encounter issues:

1. **Check the logs** in `logs/error.log`
2. **Review the migration summary** for specific errors
3. **Test individual components** (registration, login, verification)
4. **Rollback if needed** using your database backup

## 🎯 Success Indicators

After migration, you should see:
- ✅ All users have `is_active` and `email_verified` fields
- ✅ No references to old `status` or `emailVerified` fields in code
- ✅ Registration and login working normally
- ✅ Email verification flow working
- ✅ OAuth login working (if configured)

---

**🎉 Migration Complete!** Your authentication system is now using the modern user model structure. 