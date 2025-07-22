# 🔐 Two-Factor Authentication & Passkey Implementation - Complete Guide

## ✅ **IMPLEMENTATION SUMMARY**

I've successfully implemented both **Two-Factor Authentication (2FA)** using TOTP and **Passkey Authentication** using WebAuthn standards, providing enterprise-grade security options for your users.

---

## 🔧 **Implemented Features**

### 1. **🔑 Two-Factor Authentication (2FA) with TOTP**

#### **Features Implemented:**

- ✅ **QR Code Generation** for easy setup with authenticator apps
- ✅ **TOTP-based** authentication using Speakeasy library
- ✅ **Backup Codes** (10 codes) for account recovery
- ✅ **Email Notifications** for all 2FA events
- ✅ **Comprehensive Activity Logging** for security auditing
- ✅ **Secure Secret Storage** with encrypted backup codes

#### **API Endpoints:**

```bash
POST   /api/v1/2fa/setup                    # Initiate 2FA setup
POST   /api/v1/2fa/verify-setup            # Verify and enable 2FA
POST   /api/v1/2fa/verify                  # Verify 2FA during login
POST   /api/v1/2fa/disable                 # Disable 2FA
POST   /api/v1/2fa/regenerate-backup-codes # Generate new backup codes
GET    /api/v1/2fa/status                  # Get 2FA status
```

#### **Usage Flow:**

1. **Setup Initiation** - User calls `/2fa/setup` to get QR code
2. **App Configuration** - User scans QR code with Google Authenticator/Authy
3. **Verification** - User provides TOTP code to `/2fa/verify-setup`
4. **Activation** - 2FA is enabled and backup codes are generated
5. **Login** - User provides TOTP code during authentication

---

### 2. **🛡️ Passkey Authentication (WebAuthn)**

#### **Features Implemented:**

- ✅ **WebAuthn Standard** implementation using SimpleWebAuthn
- ✅ **Platform Authenticators** (FaceID, TouchID, Windows Hello)
- ✅ **Cross-Platform Support** with proper transport handling
- ✅ **Multiple Passkeys** per user with custom naming
- ✅ **Passwordless Login** with resident key support
- ✅ **Device Management** with detailed passkey information

#### **API Endpoints:**

```bash
POST   /api/v1/passkeys/register/options     # Generate registration options
POST   /api/v1/passkeys/register/verify      # Verify and store passkey
POST   /api/v1/passkeys/authenticate/options # Generate auth options
POST   /api/v1/passkeys/authenticate/verify  # Verify passkey login
GET    /api/v1/passkeys                      # Get user's passkeys
DELETE /api/v1/passkeys/:id                  # Delete a passkey
PUT    /api/v1/passkeys/:id/name             # Update passkey name
```

#### **Usage Flow:**

1. **Registration** - User calls `/passkeys/register/options` to get challenge
2. **Credential Creation** - Browser creates WebAuthn credential
3. **Verification** - User submits credential to `/passkeys/register/verify`
4. **Storage** - Passkey is stored with device information
5. **Authentication** - User can login using passkey instead of password

---

## 📋 **Technical Implementation Details**

### **Database Schema Updates:**

#### **User Model Enhancements:**

```javascript
// Two-Factor Authentication Fields
two_factor_enabled: Boolean,
two_factor_secret: String (select: false),
two_factor_temp_secret: String (select: false),
two_factor_method: String (enum: ["totp", "sms", "email"]),
two_factor_enabled_at: Date,
two_factor_backup_codes: [{
  code: String (hashed),
  used: Boolean,
  used_at: Date,
  created_at: Date
}],

// Passkey Authentication Fields
passkey_enabled: Boolean,
passkey_enabled_at: Date,
passkeys: [{
  id: String (UUID),
  name: String,
  credential_id: String (base64),
  public_key: String (base64),
  counter: Number,
  device_type: String,
  backed_up: Boolean,
  transports: [String],
  aaguid: String,
  created_at: Date,
  last_used: Date
}]
```

#### **Activity Log Actions Added:**

```javascript
// 2FA Actions
"2fa_setup_initiated",
  "2fa_enabled",
  "2fa_disabled",
  "2fa_verified",
  "2fa_backup_codes_regenerated",
  // Passkey Actions
  "passkey_registration_initiated",
  "passkey_registered",
  "passkey_login",
  "passkey_deleted",
  "passkey_name_updated";
```

---

## 🧪 **API Testing Examples**

### **2FA Setup Flow:**

#### **1. Initiate 2FA Setup:**

```bash
curl -X POST http://localhost:8080/api/v1/2fa/setup \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"

# Response:
{
  "success": true,
  "message": "2FA setup initiated. Scan the QR code with your authenticator app.",
  "data": {
    "qr_code": "data:image/png;base64,iVBOR...",
    "secret": "JBSWY3DPEHPK3PXP",
    "manual_entry_key": "JBSWY3DPEHPK3PXP",
    "issuer": "Medh Learning Platform",
    "account_name": "user@example.com"
  }
}
```

#### **2. Verify 2FA Setup:**

```bash
curl -X POST http://localhost:8080/api/v1/2fa/verify-setup \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'

# Response:
{
  "success": true,
  "message": "2FA enabled successfully",
  "data": {
    "enabled": true,
    "method": "totp",
    "backup_codes": ["A1B2C3D4", "E5F6G7H8", ...],
    "enabled_at": "2024-01-15T10:30:00.000Z",
    "warning": "Please save these backup codes in a secure location."
  }
}
```

#### **3. Verify 2FA During Login:**

```bash
curl -X POST http://localhost:8080/api/v1/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_id_here",
    "token": "123456"
  }'

# Or using backup code:
curl -X POST http://localhost:8080/api/v1/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_id_here",
    "backup_code": "A1B2C3D4"
  }'
```

### **Passkey Setup Flow:**

#### **1. Generate Registration Options:**

```bash
curl -X POST http://localhost:8080/api/v1/passkeys/register/options \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"

# Response includes WebAuthn challenge and options
{
  "success": true,
  "data": {
    "challenge": "base64-challenge-here",
    "rp": {"name": "Medh Learning Platform", "id": "localhost"},
    "user": {"id": "base64-user-id", "name": "user@example.com"},
    "pubKeyCredParams": [...],
    "authenticatorSelection": {...}
  }
}
```

#### **2. Verify Registration:**

```bash
curl -X POST http://localhost:8080/api/v1/passkeys/register/verify \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "credential": {webauthn_credential_response},
    "passkey_name": "My iPhone"
  }'
```

#### **3. Authenticate with Passkey:**

```bash
# Get authentication options
curl -X POST http://localhost:8080/api/v1/passkeys/authenticate/options \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Verify authentication
curl -X POST http://localhost:8080/api/v1/passkeys/authenticate/verify \
  -H "Content-Type: application/json" \
  -d '{
    "credential": {webauthn_auth_response},
    "challenge_key": "auth_user@example.com"
  }'
```

---

## 🔒 **Security Features**

### **2FA Security:**

- **Secret Protection**: 2FA secrets are stored with `select: false` to prevent accidental exposure
- **Backup Code Hashing**: All backup codes are SHA-256 hashed before storage
- **Time Window**: TOTP verification allows 2-step window for clock drift tolerance
- **Single Use**: Backup codes can only be used once and are marked as used
- **Activity Logging**: All 2FA events are logged for security auditing

### **Passkey Security:**

- **Public Key Cryptography**: Uses WebAuthn standard with public/private key pairs
- **Counter Protection**: Implements replay attack protection using signature counters
- **Origin Validation**: Strict origin and RP ID validation
- **User Verification**: Supports platform authenticator user verification
- **Phishing Resistance**: Passkeys are inherently resistant to phishing attacks

---

## 📧 **Email Notifications**

### **2FA Email Events:**

- ✅ **2FA Enabled**: Confirmation when 2FA is first enabled
- ✅ **2FA Disabled**: Alert when 2FA is disabled
- ✅ **Backup Codes Regenerated**: Notification when new codes are generated

### **Passkey Email Events:**

- ✅ **Passkey Added**: Confirmation when new passkey is registered
- ✅ **Passkey Removed**: Alert when passkey is deleted

All emails include:

- **Device Information**: Browser, OS, IP address
- **Timestamp**: When the action occurred
- **Action Button**: Direct link to security settings
- **Security Context**: Additional details for verification

---

## 🎯 **Frontend Integration Guide**

### **2FA Setup Component Example:**

```javascript
// React component for 2FA setup
const TwoFactorSetup = () => {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");

  const initiate2FA = async () => {
    const response = await fetch("/api/v1/2fa/setup", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    setQrCode(data.data.qr_code);
    setSecret(data.data.secret);
  };

  const verify2FA = async () => {
    const response = await fetch("/api/v1/2fa/verify-setup", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    if (data.success) {
      // Show backup codes to user
      alert(
        "2FA enabled! Save these backup codes: " +
          data.data.backup_codes.join(", "),
      );
    }
  };

  return (
    <div>
      <button onClick={initiate2FA}>Setup 2FA</button>
      {qrCode && (
        <div>
          <img src={qrCode} alt="2FA QR Code" />
          <p>Manual entry key: {secret}</p>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter 6-digit code"
          />
          <button onClick={verify2FA}>Verify & Enable</button>
        </div>
      )}
    </div>
  );
};
```

### **Passkey Registration Example:**

```javascript
// React component for Passkey registration
const PasskeySetup = () => {
  const [passkeyName, setPasskeyName] = useState("");

  const registerPasskey = async () => {
    // Get registration options
    const optionsResponse = await fetch("/api/v1/passkeys/register/options", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
    });

    const options = await optionsResponse.json();

    // Create WebAuthn credential
    const credential = await navigator.credentials.create({
      publicKey: options.data,
    });

    // Verify registration
    const verifyResponse = await fetch("/api/v1/passkeys/register/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credential: {
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          response: {
            attestationObject: Array.from(
              new Uint8Array(credential.response.attestationObject),
            ),
            clientDataJSON: Array.from(
              new Uint8Array(credential.response.clientDataJSON),
            ),
          },
          type: credential.type,
        },
        passkey_name: passkeyName,
      }),
    });

    const result = await verifyResponse.json();
    if (result.success) {
      alert("Passkey registered successfully!");
    }
  };

  return (
    <div>
      <input
        type="text"
        value={passkeyName}
        onChange={(e) => setPasskeyName(e.target.value)}
        placeholder="Passkey name (e.g., 'My iPhone')"
      />
      <button onClick={registerPasskey}>Add Passkey</button>
    </div>
  );
};
```

---

## 🚀 **Deployment Considerations**

### **Environment Variables:**

```bash
# WebAuthn Configuration
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_ORIGIN=https://yourdomain.com

# Email Configuration (for notifications)
EMAIL_FROM=security@yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

### **HTTPS Requirements:**

- **WebAuthn** requires HTTPS in production (localhost exception for development)
- **Secure Cookies** should be enabled for session management
- **CSP Headers** should allow WebAuthn API calls

### **Browser Support:**

- **2FA**: Works in all modern browsers (QR code scanning via mobile apps)
- **Passkeys**: Requires WebAuthn support (Chrome 67+, Firefox 60+, Safari 14+)
- **Platform Authenticators**: FaceID, TouchID, Windows Hello, Android biometrics

---

## 📊 **Security Benefits**

### **2FA Benefits:**

- 🛡️ **99.9% Attack Prevention**: Even if passwords are compromised
- 📱 **Universal Support**: Works with any TOTP authenticator app
- 🔄 **Backup Recovery**: 10 backup codes prevent lockouts
- 📧 **Instant Alerts**: Email notifications for all security events

### **Passkey Benefits:**

- 🚫 **Phishing Proof**: Cannot be used on wrong domains
- 🔐 **No Shared Secrets**: Public key cryptography eliminates server breaches
- ⚡ **Faster Login**: One-touch authentication with biometrics
- 🌍 **Cross-Platform**: Works across devices with proper sync

---

## 🎉 **IMPLEMENTATION COMPLETE**

✅ **Two-Factor Authentication** - Full TOTP implementation with backup codes
✅ **Passkey Authentication** - Complete WebAuthn integration
✅ **Email Notifications** - Security event notifications
✅ **Activity Logging** - Comprehensive audit trails
✅ **API Documentation** - Complete endpoint documentation
✅ **Frontend Examples** - Ready-to-use React components

Your authentication system now supports **three security levels**:

1. **Password Only** (basic)
2. **Password + 2FA** (strong)
3. **Passkey Only** (strongest + most convenient)

This implementation provides **enterprise-grade security** while maintaining an excellent user experience! 🚀

---

## 🔧 **Quick Start Commands**

```bash
# Test 2FA setup
curl -X POST http://localhost:8080/api/v1/2fa/setup \
  -H "Authorization: Bearer <token>"

# Test Passkey registration options
curl -X POST http://localhost:8080/api/v1/passkeys/register/options \
  -H "Authorization: Bearer <token>"

# Check 2FA status
curl -X GET http://localhost:8080/api/v1/2fa/status \
  -H "Authorization: Bearer <token>"

# Get user's passkeys
curl -X GET http://localhost:8080/api/v1/passkeys \
  -H "Authorization: Bearer <token>"
```

Your users can now enjoy **passwordless authentication** and **military-grade 2FA protection**! 🔐✨
