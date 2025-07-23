import React, { useState } from "react";
import GoogleOAuthButton, {
  useGoogleOAuth,
  GoogleOAuthStyles,
} from "./react-google-oauth-component";

/**
 * Complete usage example for Google OAuth integration in React
 * This demonstrates how to use the GoogleOAuthButton component in your application
 */

// 1. Environment Variables Setup
// Add these to your .env file:
// REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
// REACT_APP_BACKEND_URL=http://localhost:8080

// 2. Main App Component with Google OAuth
const App = () => {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // 'success', 'error', 'info'

  // Handle successful OAuth authentication
  const handleOAuthSuccess = (data) => {
    console.log("OAuth Success:", data);

    setUser(data.user);
    setMessage(
      data.isNewUser
        ? `Welcome ${data.user.full_name}! Your account has been created.`
        : `Welcome back, ${data.user.full_name}!`,
    );
    setMessageType("success");

    // Optional: Redirect to dashboard
    // window.location.href = '/dashboard';
  };

  // Handle OAuth errors
  const handleOAuthError = (error) => {
    console.error("OAuth Error:", error);
    setMessage(`Authentication failed: ${error.message}`);
    setMessageType("error");
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setMessage("You have been logged out successfully.");
    setMessageType("info");
  };

  return (
    <div className="app">
      <style>{GoogleOAuthStyles}</style>

      <header className="app-header">
        <h1>🚀 MEDH Learning Platform</h1>
        <p>Sign in to access your courses and continue learning</p>
      </header>

      {/* Status Message */}
      {message && (
        <div className={`message ${messageType}`}>
          {message}
          <button className="close-btn" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}

      <main className="main-content">
        {user ? (
          // User is logged in
          <UserDashboard user={user} onLogout={handleLogout} />
        ) : (
          // User is not logged in
          <LoginSection
            onSuccess={handleOAuthSuccess}
            onError={handleOAuthError}
          />
        )}
      </main>
    </div>
  );
};

// 3. Login Section Component
const LoginSection = ({ onSuccess, onError }) => {
  return (
    <div className="login-section">
      <div className="login-card">
        <h2>Sign In to Your Account</h2>
        <p>Choose your preferred sign-in method:</p>

        {/* Google OAuth Button */}
        <div className="oauth-buttons">
          <GoogleOAuthButton
            onSuccess={onSuccess}
            onError={onError}
            buttonText="Continue with Google"
            className="primary-oauth-btn"
          />
        </div>

        <div className="divider">
          <span>or</span>
        </div>

        {/* Traditional Email Login */}
        <EmailLoginForm />
      </div>
    </div>
  );
};

// 4. User Dashboard Component (after login)
const UserDashboard = ({ user, onLogout }) => {
  const { getConnectedProviders, linkProvider, unlinkProvider } =
    useGoogleOAuth();
  const [connectedProviders, setConnectedProviders] = useState([]);

  // Load connected providers on component mount
  React.useEffect(() => {
    loadConnectedProviders();
  }, []);

  const loadConnectedProviders = async () => {
    try {
      const providers = await getConnectedProviders();
      if (providers) {
        setConnectedProviders(providers.connected_providers || []);
      }
    } catch (error) {
      console.error("Failed to load connected providers:", error);
    }
  };

  const handleLinkProvider = async (provider) => {
    try {
      await linkProvider(provider);
    } catch (error) {
      console.error("Failed to link provider:", error);
    }
  };

  const handleUnlinkProvider = async (provider) => {
    try {
      const result = await unlinkProvider(provider);
      if (result.success) {
        loadConnectedProviders(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to unlink provider:", error);
    }
  };

  return (
    <div className="dashboard">
      <div className="user-profile">
        <div className="profile-header">
          {user.user_image?.url && (
            <img
              src={user.user_image.url}
              alt={user.full_name}
              className="profile-avatar"
            />
          )}
          <div className="profile-info">
            <h2>Welcome, {user.full_name}!</h2>
            <p className="user-email">{user.email}</p>
            <p className="user-role">
              Role:{" "}
              {Array.isArray(user.role) ? user.role.join(", ") : user.role}
            </p>
            {user.student_id && (
              <p className="student-id">Student ID: {user.student_id}</p>
            )}
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat">
            <span className="stat-label">Account Type</span>
            <span className="stat-value">{user.account_type}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Email Verified</span>
            <span
              className={`stat-value ${user.email_verified ? "verified" : "unverified"}`}
            >
              {user.email_verified ? "✅ Verified" : "❌ Not Verified"}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Profile Completion</span>
            <span className="stat-value">{user.profile_completion || 0}%</span>
          </div>
        </div>
      </div>

      {/* Connected OAuth Providers */}
      <div className="oauth-management">
        <h3>Connected Accounts</h3>
        <div className="provider-list">
          {connectedProviders.length > 0 ? (
            connectedProviders.map((provider) => (
              <div key={provider.provider} className="provider-item">
                <div className="provider-info">
                  <span className="provider-name">{provider.provider}</span>
                  <span className="connected-date">
                    Connected:{" "}
                    {new Date(provider.connected_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="unlink-btn"
                  onClick={() => handleUnlinkProvider(provider.provider)}
                >
                  Disconnect
                </button>
              </div>
            ))
          ) : (
            <p>No connected accounts</p>
          )}
        </div>

        {/* Link Additional Providers */}
        <div className="link-providers">
          <h4>Link Additional Accounts</h4>
          <button
            className="link-btn"
            onClick={() => handleLinkProvider("google")}
          >
            Link Google Account
          </button>
        </div>
      </div>

      <div className="dashboard-actions">
        <button className="btn btn-primary">View Courses</button>
        <button className="btn btn-secondary">Edit Profile</button>
        <button className="btn btn-danger" onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
};

// 5. Traditional Email Login Form (fallback)
const EmailLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem("access_token", result.data.access_token);
        window.location.reload();
      } else {
        alert("Login failed: " + result.message);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleEmailLogin} className="email-login-form">
      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Signing in..." : "Sign In with Email"}
      </button>

      <div className="form-links">
        <a href="/forgot-password">Forgot Password?</a>
        <a href="/register">Create New Account</a>
      </div>
    </form>
  );
};

// 6. CSS Styles (add to your CSS file)
const AppStyles = `
.app {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
    text-align: center;
    padding: 40px 20px;
    color: white;
}

.app-header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
}

.main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.message {
    padding: 15px 20px;
    margin: 20px 0;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.message.info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

.close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    opacity: 0.7;
}

.login-section {
    display: flex;
    justify-content: center;
    padding: 40px 0;
}

.login-card {
    background: white;
    padding: 40px;
    border-radius: 15px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    width: 100%;
    text-align: center;
}

.oauth-buttons {
    margin: 30px 0;
}

.primary-oauth-btn {
    width: 100%;
    margin: 10px 0;
}

.divider {
    margin: 30px 0;
    position: relative;
    text-align: center;
}

.divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e0e0e0;
}

.divider span {
    background: white;
    padding: 0 15px;
    color: #666;
}

.email-login-form {
    text-align: left;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
}

.form-group input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s;
}

.form-group input:focus {
    outline: none;
    border-color: #4285f4;
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
}

.btn-primary {
    background: #4285f4;
    color: white;
    width: 100%;
}

.btn-primary:hover {
    background: #3367d6;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-danger {
    background: #dc3545;
    color: white;
}

.form-links {
    margin-top: 20px;
    text-align: center;
}

.form-links a {
    color: #4285f4;
    text-decoration: none;
    margin: 0 10px;
}

.dashboard {
    background: white;
    border-radius: 15px;
    padding: 40px;
    margin: 20px 0;
}

.profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 30px;
}

.profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin-right: 20px;
}

.profile-info h2 {
    margin: 0 0 10px 0;
    color: #333;
}

.profile-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 30px 0;
}

.stat {
    display: flex;
    flex-direction: column;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.stat-label {
    font-size: 14px;
    color: #666;
    margin-bottom: 5px;
}

.stat-value {
    font-size: 18px;
    font-weight: 600;
    color: #333;
}

.stat-value.verified {
    color: #28a745;
}

.stat-value.unverified {
    color: #dc3545;
}

.oauth-management {
    margin: 40px 0;
    padding: 30px;
    background: #f8f9fa;
    border-radius: 10px;
}

.provider-list {
    margin: 20px 0;
}

.provider-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: white;
    border-radius: 8px;
    margin-bottom: 10px;
}

.provider-info {
    display: flex;
    flex-direction: column;
}

.provider-name {
    font-weight: 600;
    text-transform: capitalize;
}

.connected-date {
    font-size: 14px;
    color: #666;
}

.unlink-btn, .link-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 500;
}

.unlink-btn {
    background: #dc3545;
    color: white;
}

.link-btn {
    background: #28a745;
    color: white;
    margin: 10px 5px;
}

.dashboard-actions {
    margin-top: 40px;
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

@media (max-width: 768px) {
    .login-card {
        margin: 20px;
        padding: 30px 20px;
    }
    
    .profile-header {
        flex-direction: column;
        text-align: center;
    }
    
    .profile-avatar {
        margin: 0 0 20px 0;
    }
    
    .dashboard-actions {
        flex-direction: column;
    }
}
`;

// 7. Export the main App component
export default App;

// 8. Usage in your main index.js or App.js:
/*
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
*/
