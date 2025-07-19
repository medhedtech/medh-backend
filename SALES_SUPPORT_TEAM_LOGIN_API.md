# Sales and Support Team Login API Documentation

This document describes the specialized authentication and management system for sales and support team members in the MEDH Backend.

## Overview

The sales and support team login system provides:

- Specialized authentication for team members
- Role-based access control with team-specific permissions
- Dashboard statistics and team management
- Secure session management with device tracking

## Base URL

```
/api/v1/team
```

## Authentication

Team members use JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Team Roles and Permissions

### Sales Team

- **Role**: `sales_team`
- **Admin Role**: `sales-admin`
- **Permissions**:
  - `sales_dashboard` - Access to sales dashboard
  - `view_leads` - View lead information
  - `manage_leads` - Create and update leads
  - `view_sales_reports` - Access sales reports
  - `manage_quotes` - Create and manage quotes
  - `view_customer_data` - View customer information

### Support Team

- **Role**: `support_team`
- **Admin Role**: `support-admin`
- **Permissions**:
  - `support_dashboard` - Access to support dashboard
  - `view_tickets` - View support tickets
  - `manage_tickets` - Create and update tickets
  - `view_support_reports` - Access support reports
  - `manage_faq` - Manage FAQ content
  - `view_customer_support_data` - View customer support information

## API Endpoints

### 1. Team Authentication

#### Login

- **Endpoint**: `POST /api/v1/team/login`
- **Description**: Specialized login for sales and support team members
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "team.member@medh.co",
    "password": "securepassword123",
    "team_type": "sales"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Sales team login successful",
    "data": {
      "user": {
        "id": "user_id",
        "full_name": "Team Member Name",
        "email": "team.member@medh.co",
        "role": "sales_team",
        "admin_role": null,
        "team_type": "sales",
        "permissions": [
          "sales_dashboard",
          "view_leads",
          "view_sales_reports",
          "view_customer_data"
        ]
      },
      "token": "jwt_token_here",
      "session_id": "session_id",
      "expires_in": "24h",
      "team_type": "sales"
    }
  }
  ```

#### Logout

- **Endpoint**: `POST /api/v1/team/logout`
- **Description**: Logout team member and invalidate session
- **Access**: Private (Authenticated team members)
- **Request Body**:
  ```json
  {
    "session_id": "session_id_from_login"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Team logout successful"
  }
  ```

### 2. Sales Team Endpoints

#### Get Sales Dashboard Statistics

- **Endpoint**: `GET /api/v1/team/sales/dashboard-stats`
- **Description**: Get sales team dashboard statistics
- **Access**: Private (Sales team members and admins)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Sales team dashboard statistics",
    "data": {
      "team_type": "sales",
      "total_team_members": 15,
      "active_team_members": 8,
      "recent_logins_24h": 12,
      "dashboard_type": "sales_dashboard"
    }
  }
  ```

#### Get Sales Team Members

- **Endpoint**: `GET /api/v1/team/sales/members`
- **Description**: Get all sales team members
- **Access**: Private (Sales team members and admins)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Sales team members retrieved",
    "data": {
      "team_type": "sales",
      "members": [
        {
          "id": "user_id",
          "full_name": "Sales Member",
          "email": "sales@medh.co",
          "role": "sales_team",
          "admin_role": null,
          "is_active": true,
          "last_login": "2024-01-15T10:30:00Z"
        }
      ],
      "total_count": 15
    }
  }
  ```

### 3. Support Team Endpoints

#### Get Support Dashboard Statistics

- **Endpoint**: `GET /api/v1/team/support/dashboard-stats`
- **Description**: Get support team dashboard statistics
- **Access**: Private (Support team members and admins)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Support team dashboard statistics",
    "data": {
      "team_type": "support",
      "total_team_members": 10,
      "active_team_members": 6,
      "recent_logins_24h": 8,
      "dashboard_type": "support_dashboard"
    }
  }
  ```

#### Get Support Team Members

- **Endpoint**: `GET /api/v1/team/support/members`
- **Description**: Get all support team members
- **Access**: Private (Support team members and admins)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Support team members retrieved",
    "data": {
      "team_type": "support",
      "members": [
        {
          "id": "user_id",
          "full_name": "Support Member",
          "email": "support@medh.co",
          "role": "support_team",
          "admin_role": null,
          "is_active": true,
          "last_login": "2024-01-15T10:30:00Z"
        }
      ],
      "total_count": 10
    }
  }
  ```

### 4. Admin Management Endpoints

#### Create Team Member

- **Endpoint**: `POST /api/v1/team/admin/create-member`
- **Description**: Create a new team member (Admin only)
- **Access**: Private (Admins only)
- **Request Body**:
  ```json
  {
    "full_name": "New Team Member",
    "email": "newmember@medh.co",
    "password": "securepassword123",
    "team_type": "sales",
    "role": "sales_team"
  }
  ```

#### Update Team Member

- **Endpoint**: `PUT /api/v1/team/admin/update-member/:id`
- **Description**: Update team member details (Admin only)
- **Access**: Private (Admins only)

#### Remove Team Member

- **Endpoint**: `DELETE /api/v1/team/admin/remove-member/:id`
- **Description**: Remove team member (Admin only)
- **Access**: Private (Admins only)

## Error Responses

### Authentication Errors

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Authorization Errors

```json
{
  "success": false,
  "message": "Access denied. You must be a sales team member to access this login."
}
```

### Validation Errors

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Account Locked

```json
{
  "success": false,
  "message": "Account is locked. Please contact your administrator."
}
```

## Security Features

### 1. Role-Based Access Control

- Team members can only access their designated team endpoints
- Admin roles have elevated permissions within their team
- Super admins have access to all team functions

### 2. Session Management

- Unique session IDs for each login
- Device tracking and location monitoring
- Automatic session cleanup

### 3. MFA Support

- Two-factor authentication support for team members
- SMS and TOTP methods available
- Secure MFA verification flow

### 4. Activity Logging

- All login/logout activities are logged
- Device and location information tracked
- Audit trail for security monitoring

## Usage Examples

### JavaScript/Node.js

```javascript
// Team Login
const loginResponse = await fetch("/api/v1/team/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "sales@medh.co",
    password: "password123",
    team_type: "sales",
  }),
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// Use token for authenticated requests
const dashboardResponse = await fetch("/api/v1/team/sales/dashboard-stats", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/v1/team/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sales@medh.co",
    "password": "password123",
    "team_type": "sales"
  }'

# Get dashboard stats
curl -X GET http://localhost:3000/api/v1/team/sales/dashboard-stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Integration Notes

### 1. User Model Updates

The user model has been extended with:

- New roles: `sales_team`, `support_team`
- New admin roles: `sales-admin`, `support-admin`
- Team-specific permissions
- Helper methods for role checking

### 2. Middleware Updates

New middleware functions added:

- `isSalesTeam()` - Check if user is sales team member
- `isSupportTeam()` - Check if user is support team member
- `isSalesAdmin()` - Check if user is sales admin
- `isSupportAdmin()` - Check if user is support admin

### 3. Authentication Flow

1. User provides email, password, and team type
2. System validates team membership
3. Password verification
4. MFA check (if enabled)
5. Session creation and JWT generation
6. Activity logging

### 4. Permission System

Permissions are automatically assigned based on:

- User's role (team member vs admin)
- Team type (sales vs support)
- Super admin status (full access)

## Best Practices

1. **Security**:

   - Always use HTTPS in production
   - Implement rate limiting for login attempts
   - Regularly rotate JWT secrets
   - Monitor login activities for suspicious patterns

2. **User Management**:

   - Use strong password policies
   - Enable MFA for sensitive accounts
   - Regularly audit team member access
   - Implement proper onboarding/offboarding procedures

3. **Monitoring**:
   - Track login success/failure rates
   - Monitor session durations
   - Alert on unusual login patterns
   - Log all administrative actions

## Troubleshooting

### Common Issues

1. **"Access denied" errors**:

   - Verify user has correct team role
   - Check if user is active
   - Ensure proper admin role assignment

2. **"Invalid credentials" errors**:

   - Verify email format
   - Check password requirements
   - Ensure account is not locked

3. **"Team type must be either 'sales' or 'support'"**:
   - Verify team_type parameter is correct
   - Check for typos in request body

### Debug Information

Enable debug logging by setting `NODE_ENV=development` to get detailed error information and request/response logging.
