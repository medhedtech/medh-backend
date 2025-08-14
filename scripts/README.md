# Data Migration Scripts

This directory contains scripts for migrating user data from the `users` collection to separate `instructors` and `students` collections.

## 📋 Overview

The migration process moves instructor and student records from the unified `users` collection to their respective dedicated collections while preserving all other user types in the original collection.

## 🚀 Migration Process

### Step 1: Dry Run (Recommended)
Before running the actual migration, always run the dry run first to see what would happen:

```bash
cd medh-backend
node scripts/migration-dry-run.js
```

This will:
- ✅ Analyze all users in the `users` collection
- ✅ Show which records would be migrated
- ✅ Identify any conflicts (duplicate emails)
- ✅ Show projected collection counts
- ✅ **No changes are made to the database**

### Step 2: Actual Migration
Once you're satisfied with the dry run results, run the actual migration:

```bash
cd medh-backend
node scripts/migrate-users-data.js
```

This will:
- ✅ Migrate instructor users to `instructors` collection
- ✅ Migrate student users to `students` collection
- ✅ Remove migrated records from `users` collection
- ✅ Preserve all other user types in `users` collection
- ✅ Provide detailed migration statistics

## 📊 What Gets Migrated

### Instructor Migration
- **Source**: `users` collection with `role: 'instructor'` or `role: ['instructor']`
- **Target**: `instructors` collection
- **Data Mapping**:
  - `full_name` → `full_name`
  - `email` → `email`
  - `phone_number` or `phone_numbers[0]` → `phone_number`
  - `password` → `password` (hashed)
  - `domain` or `meta.domain` → `domain`
  - `meta` → `meta`
  - `is_active` → `status` ('Active'/'Inactive')
  - `email_verified` → `email_verified`
  - `experience` → `experience` (if exists)
  - `qualifications` → `qualifications` (if exists)

### Student Migration
- **Source**: `users` collection with `role: 'student'`, `['student']`, `'corporate-student'`, or `['corporate-student']`
- **Target**: `students` collection
- **Data Mapping**:
  - `full_name` → `full_name`
  - `email` → `email`
  - `age` or `meta.age` → `age`
  - `phone_numbers` or `[phone_number]` → `phone_numbers`
  - `course_name` or `meta.course_name` → `course_name`
  - `is_active` → `status` ('Active'/'Inactive')
  - `meta` → `meta` (with migration metadata)

### Preserved Users
- **Remains in `users` collection**: All users with roles other than instructor/student
- **Examples**: admin, corporate, parent, program_coordinator, sales_team, support_team, etc.

## 🔧 Scripts

### 1. `migration-dry-run.js`
**Purpose**: Safe analysis without making changes
**Usage**: `node scripts/migration-dry-run.js`
**Output**: Detailed analysis of what would be migrated

### 2. `migrate-users-data.js`
**Purpose**: Actual data migration
**Usage**: `node scripts/migrate-users-data.js`
**Output**: Migration results and statistics

## ⚠️ Important Notes

### Safety Features
- ✅ **Duplicate Prevention**: Won't migrate if email already exists in target collection
- ✅ **Conflict Detection**: Identifies and reports conflicts during dry run
- ✅ **Error Handling**: Continues migration even if individual records fail
- ✅ **Verification**: Verifies migration results after completion
- ✅ **Detailed Logging**: Comprehensive logging of all operations

### Data Integrity
- ✅ **No Data Loss**: All data is preserved during migration
- ✅ **Field Mapping**: Proper mapping between different field structures
- ✅ **Password Security**: Passwords are properly hashed in instructor collection
- ✅ **Metadata Preservation**: Original user IDs stored in migration metadata

### Rollback Strategy
If you need to rollback the migration:
1. **Restore from backup** (recommended)
2. **Manual rollback**: Move data back from separate collections to users collection
3. **Update references**: Update any code that references the new collections

## 📈 Migration Statistics

The scripts provide detailed statistics including:
- **Found**: Number of records found to migrate
- **Migrated**: Number of records successfully migrated
- **Failed**: Number of records that failed to migrate
- **Skipped**: Number of records skipped (duplicates)
- **Preserved**: Number of records preserved in users collection

## 🐛 Troubleshooting

### Common Issues

1. **Connection Errors**
   - Ensure MongoDB is running
   - Check `MONGODB_URI` in `.env` file
   - Verify database permissions

2. **Duplicate Email Errors**
   - Run dry run to identify conflicts
   - Resolve duplicates before migration
   - Check both users and target collections

3. **Validation Errors**
   - Check required fields in target schemas
   - Ensure data types match expected formats
   - Review error logs for specific field issues

### Error Recovery
- Migration continues even if individual records fail
- Failed records are logged with details
- You can re-run migration for failed records
- Check error logs for specific issues

## 📞 Support

If you encounter issues:
1. Run the dry run first to identify problems
2. Check the error logs for specific details
3. Verify your database connection and permissions
4. Ensure all required models are properly imported

## 🔄 Post-Migration

After successful migration:
1. **Update API endpoints** to use new collections
2. **Test functionality** to ensure everything works
3. **Update frontend** if it references the old structure
4. **Monitor logs** for any issues
5. **Create backup** of the migrated data
