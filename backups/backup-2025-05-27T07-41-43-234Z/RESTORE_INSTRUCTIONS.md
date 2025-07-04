# Database Restore Instructions

## Backup Information
- **Date**: 2025-05-27T07:42:00.947Z
- **Database**: MedhDB
- **Purpose**: Pre-migration backup

## Restore Commands

### Full Database Restore
```bash
# Restore entire database
mongorestore --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --drop "backups/backup-2025-05-27T07-41-43-234Z/MedhDB"
```

### Individual Collection Restore
```bash
# Restore specific collections
mongoimport --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --collection="courses" --file="backups/backup-2025-05-27T07-41-43-234Z/collections/courses.json"
mongoimport --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --collection="basecourses" --file="backups/backup-2025-05-27T07-41-43-234Z/collections/basecourses.json"
mongoimport --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --collection="users" --file="backups/backup-2025-05-27T07-41-43-234Z/collections/users.json"
mongoimport --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --collection="enrollments" --file="backups/backup-2025-05-27T07-41-43-234Z/collections/enrollments.json"
```

## Verification
After restore, verify data integrity:
```bash
# Check collection counts
mongosh "mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --eval "db.courses.countDocuments()"
mongosh "mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --eval "db.basecourses.countDocuments()"
```

## Emergency Contacts
- Database Administrator: [Your DBA]
- DevOps Team: [Your DevOps Team]
