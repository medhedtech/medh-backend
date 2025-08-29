# 🔐 Admin Authentication System Setup Guide

## 📋 Overview
This guide explains how to set up and use the secure admin authentication system for MEDH Foundation.

## 🚀 Features
- ✅ Secure admin registration with secret key
- ✅ Admin login with JWT authentication
- ✅ Role-based access control (super-admin, admin, moderator)
- ✅ Session management and tracking
- ✅ Account lockout after failed attempts
- ✅ Same UI theme as user registration/login
- ✅ Automatic redirect to admin dashboard

## 🛠️ Backend Setup

### 1. Environment Variables
Add these to your `.env` file:

```env
# Admin Authentication
ADMIN_SECRET_KEY=MEDH_ADMIN_SECRET_2024
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h

# Database
MONGODB_URL=mongodb+srv://medhupskill:Medh567upskill@medh.xmifs.mongodb.net/MedhDB
```

### 2. API Endpoints

#### Admin Registration
```
POST /api/v1/admin-auth/register
```

**Request Body:**
```json
{
  "full_name": "Admin Name",
  "email": "admin@medh.co",
  "password": "SecurePassword123!",
  "admin_role": "admin",
  "phone": "+1234567890",
  "department": "IT",
  "designation": "System Administrator",
  "secret_key": "MEDH_ADMIN_SECRET_2024"
}
```

#### Admin Login
```
POST /api/v1/admin-auth/login
```

**Request Body:**
```json
{
  "email": "admin@medh.co",
  "password": "SecurePassword123!"
}
```

#### Get Admin Profile
```
GET /api/v1/admin-auth/profile
Authorization: Bearer <admin_token>
```

### 3. Database Collection
- **Collection Name:** `admins`
- **Database:** `MedhDB`
- **Indexes:** email, admin_role, is_active, created_at

## 🎨 Frontend Setup

### 1. Admin Registration Page
```
URL: /admin-secure-registration
File: medh-web/src/app/admin-secure-registration/page.tsx
```

### 2. Admin Login Page
```
URL: /admin-secure-login
File: medh-web/src/app/admin-secure-login/page.tsx
```

### 3. Admin Dashboard Protection
- **Guard:** `AdminAuthGuard.tsx`
- **Applied to:** `/dashboards/admin/*`
- **Redirects to:** `/admin-secure-login` if not authenticated

## 🔒 Security Features

### 1. Secret Key Protection
- Admin registration requires `ADMIN_SECRET_KEY`
- Only authorized personnel can create admin accounts
- Key should be shared securely

### 2. Account Lockout
- 5 failed login attempts = 2 hour lockout
- Automatic unlock after lockout period
- Failed attempts reset on successful login

### 3. JWT Token Security
- 24-hour expiration (configurable)
- Includes admin type and timestamp
- Verified on every protected route

### 4. Session Management
- Track active sessions per admin
- Device and IP tracking
- Session invalidation on logout

## 👥 Admin Roles

### Super Admin
- Full system access
- Can manage other admins
- All permissions by default

### Admin
- Standard admin access
- Configurable permissions
- Cannot manage super admins

### Moderator
- Limited admin access
- Content moderation focus
- Restricted permissions

## 🎯 Usage Instructions

### For Developers:
1. Set `ADMIN_SECRET_KEY` in environment
2. Start backend server
3. Access `/admin-secure-registration`
4. Create first super-admin account

### For Admins:
1. Get secret key from system administrator
2. Visit `/admin-secure-registration`
3. Fill form with secret key
4. Login at `/admin-secure-login`
5. Access admin dashboard

## 🔧 API Testing

### Using cURL:

#### Register Admin:
```bash
curl -X POST http://localhost:8080/api/v1/admin-auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test Admin",
    "email": "test@medh.co",
    "password": "TestPassword123!",
    "admin_role": "admin",
    "secret_key": "MEDH_ADMIN_SECRET_2024"
  }'
```

#### Login Admin:
```bash
curl -X POST http://localhost:8080/api/v1/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@medh.co",
    "password": "TestPassword123!"
  }'
```

## 🚨 Important Notes

1. **Secret Key Security:** Never commit the actual secret key to version control
2. **HTTPS Only:** Use HTTPS in production for admin authentication
3. **Regular Updates:** Change secret key periodically
4. **Monitor Access:** Log all admin authentication attempts
5. **Backup Access:** Always maintain at least one super-admin account

## 🐛 Troubleshooting

### Common Issues:

1. **"Unauthorized admin registration attempt"**
   - Check `ADMIN_SECRET_KEY` in environment
   - Verify secret key in registration form

2. **"Admin not found" during login**
   - Verify admin was created successfully
   - Check database connection

3. **Token expired errors**
   - Check `JWT_SECRET` and `JWT_EXPIRE` settings
   - Clear browser storage and re-login

4. **Dashboard access denied**
   - Verify token is stored in localStorage/sessionStorage
   - Check AdminAuthGuard is properly configured

## 📞 Support

For issues or questions:
- Check logs in browser console and server
- Verify environment variables
- Test API endpoints directly
- Contact system administrator

---

**🔐 Remember: This is a secure admin system. Handle credentials with care!**


