# Database Restore Instructions

## Backup Information
- **Date**: 2025-05-27T07:22:42.040Z
- **Database**: MedhDB
- **Purpose**: Pre-migration backup

## Restore Commands

### Full Database Restore
```bash
# Restore entire database
mongorestore --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --drop "backups/backup-2025-05-27T07-22-31-386Z/MedhDB"
```

### Individual Collection Restore
```bash
# Restore specific collections
mongoimport --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --collection="courses" --file="backups/backup-2025-05-27T07-22-31-386Z/collections/courses.json"
mongoimport --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --collection="basecourses" --file="backups/backup-2025-05-27T07-22-31-386Z/collections/basecourses.json"
mongoimport --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --collection="users" --file="backups/backup-2025-05-27T07-22-31-386Z/collections/users.json"
mongoimport --uri="mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB" --collection="enrollments" --file="backups/backup-2025-05-27T07-22-31-386Z/collections/enrollments.json"
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
