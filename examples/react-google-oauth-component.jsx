import React, { useState, useEffect } from "react";

/**
 * GoogleOAuthButton - Production-ready Google OAuth component for MEDH
 *
 * Features:
 * - Google Identity Services integration
 * - Automatic token handling
 * - Error handling and loading states
 * - Customizable styling
 * - Account merging support
 *
 * @param {Object} props - Component props
 * @param {Function} props.onSuccess - Callback for successful authentication
 * @param {Function} props.onError - Callback for authentication errors
 * @param {string} props.buttonText - Custom button text
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Disable the button
 * @param {string} props.theme - Button theme ('outline' | 'filled')
 * @param {string} props.size - Button size ('small' | 'medium' | 'large')
 */
const GoogleOAuthButton = ({
  onSuccess,
  onError,
  buttonText = "Sign in with Google",
  className = "",
  disabled = false,
  theme = "outline",
  size = "large",
  backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080",
}) => {
  const [loading, setLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Google Client ID from environment variables
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    loadGoogleIdentityServices();
  }, []);

  /**
   * Load Google Identity Services script
   */
  const loadGoogleIdentityServices = () => {
    // Check if already loaded
    if (window.google && window.google.accounts) {
      initializeGoogleOAuth();
      return;
    }

    // Create script element
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleOAuth;
    script.onerror = () => {
      console.error("Failed to load Google Identity Services");
      onError && onError(new Error("Failed to load Google OAuth services"));
    };

    document.head.appendChild(script);
  };

  /**
   * Initialize Google OAuth configuration
   */
  const initializeGoogleOAuth = () => {
    if (!GOOGLE_CLIENT_ID) {
      console.error("Google Client ID not found in environment variables");
      onError && onError(new Error("Google OAuth not configured"));
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
        context: "signin",
        ux_mode: "popup",
        itp_support: true,
      });

      setGoogleLoaded(true);
    } catch (error) {
      console.error("Failed to initialize Google OAuth:", error);
      onError && onError(error);
    }
  };

  /**
   * Handle Google OAuth response
   */
  const handleGoogleResponse = async (response) => {
    setLoading(true);

    try {
      // Send credential to backend
      const backendResponse = await fetch(
        `${backendUrl}/api/v1/auth/oauth/frontend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: "google",
            token: response.credential,
          }),
        },
      );

      const result = await backendResponse.json();

      if (result.success) {
        // Store tokens in localStorage
        if (result.data.tokens) {
          localStorage.setItem("access_token", result.data.tokens.access_token);
          localStorage.setItem(
            "refresh_token",
            result.data.tokens.refresh_token,
          );
        }

        // Call success callback
        onSuccess &&
          onSuccess({
            user: result.data.user,
            tokens: result.data.tokens,
            isNewUser: result.data.is_new_user || false,
            accountMerged: result.data.account_merged || false,
          });
      } else {
        throw new Error(result.message || "OAuth authentication failed");
      }
    } catch (error) {
      console.error("Google OAuth error:", error);
      onError && onError(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle button click
   */
  const handleClick = () => {
    if (!googleLoaded || loading || disabled) {
      return;
    }

    try {
      // Trigger Google OAuth popup
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error("Failed to trigger Google OAuth:", error);
      onError && onError(error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || disabled || !googleLoaded}
      className={`google-oauth-btn ${className} ${loading ? "loading" : ""}`}
      type="button"
      aria-label="Sign in with Google"
    >
      {loading ? (
        <div className="oauth-loading">
          <div className="spinner"></div>
          <span>Signing in...</span>
        </div>
      ) : (
        <div className="oauth-content">
          <svg
            className="google-icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{buttonText}</span>
        </div>
      )}
    </button>
  );
};

/**
 * GoogleOAuthProvider - Context provider for Google OAuth configuration
 */
export const GoogleOAuthProvider = ({ children, clientId, backendUrl }) => {
  useEffect(() => {
    if (clientId) {
      process.env.REACT_APP_GOOGLE_CLIENT_ID = clientId;
    }
    if (backendUrl) {
      process.env.REACT_APP_BACKEND_URL = backendUrl;
    }
  }, [clientId, backendUrl]);

  return <>{children}</>;
};

/**
 * useGoogleOAuth - Custom hook for Google OAuth functionality
 */
export const useGoogleOAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async () => {
    setLoading(true);
    setError(null);

    try {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.prompt();
      } else {
        throw new Error("Google OAuth not initialized");
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);

    if (window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  const getConnectedProviders = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;

    try {
      const response = await fetch("/api/v1/auth/oauth/connected", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error("Failed to get connected providers:", error);
      return null;
    }
  };

  const linkProvider = async (provider) => {
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("User not authenticated");

    try {
      const response = await fetch(`/api/v1/auth/oauth/link/${provider}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        window.location.href = result.data.auth_url;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Failed to link provider:", error);
      throw error;
    }
  };

  const unlinkProvider = async (provider) => {
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("User not authenticated");

    try {
      const response = await fetch(`/api/v1/auth/oauth/unlink/${provider}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Failed to unlink provider:", error);
      throw error;
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    getConnectedProviders,
    linkProvider,
    unlinkProvider,
  };
};

// CSS styles (can be moved to a separate CSS file)
export const GoogleOAuthStyles = `
.google-oauth-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 24px;
    border: 2px solid #dadce0;
    border-radius: 8px;
    background: white;
    color: #3c4043;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 200px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.google-oauth-btn:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #dadce0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.google-oauth-btn:active:not(:disabled) {
    background: #f1f3f4;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.google-oauth-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.oauth-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.oauth-loading {
    display: flex;
    align-items: center;
    gap: 8px;
}

.google-icon {
    flex-shrink: 0;
}

.spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #4285f4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.google-oauth-btn.loading {
    pointer-events: none;
}
`;

export default GoogleOAuthButton;
