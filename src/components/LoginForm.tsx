import React, { useState } from 'react';
import { AuthenticationService } from '../services/AuthenticationService';
import { TwoFactorVerification } from './TwoFactorVerification';
import { User, UserSession } from '../models/User';
import { CryptoUtils } from '../services/CryptoService';

interface LoginFormProps {
  onLoginSuccess: (user: User, session: UserSession) => void;
  onLoginFailure: (error: string) => void;
  onRegisterClick?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  onLoginFailure,
  onRegisterClick,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(false);

  const authService = new AuthenticationService();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (!CryptoUtils.isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authService.authenticateUser(
        { email, password },
        getClientIP(),
        navigator.userAgent
      );

      if (result.success && result.user && result.session) {
        onLoginSuccess(result.user, result.session);
      } else if (result.requires2FA) {
        // Extract user ID from email for 2FA
        const user = authService.getUser(email); // This would need to be implemented differently
        if (user) {
          setPendingUserId(user.id);
          setRequires2FA(true);
        } else {
          setError('Unable to proceed with two-factor authentication');
        }
      } else {
        setError(result.error || 'Login failed');
        onLoginFailure(result.error || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onLoginFailure(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handle2FASuccess = async (deviceTrusted: boolean) => {
    try {
      // Complete the authentication with 2FA
      const result = await authService.authenticateUser(
        { email, password, twoFactorCode: 'verified' }, // This would be handled differently in real implementation
        getClientIP(),
        navigator.userAgent
      );

      if (result.success && result.user && result.session) {
        onLoginSuccess(result.user, result.session);
      } else {
        setError('Authentication failed after 2FA verification');
        setRequires2FA(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      setRequires2FA(false);
    }
  };

  const handle2FAFailure = (error: string) => {
    setError(error);
    setRequires2FA(false);
    onLoginFailure(error);
  };

  const getClientIP = (): string => {
    // In a real application, this would be provided by the server
    return '127.0.0.1';
  };

  const handleForgotPassword = () => {
    // Implement password reset functionality
    alert('Password reset functionality would be implemented here');
  };

  if (requires2FA) {
    return (
      <TwoFactorVerification
        userId={pendingUserId}
        onVerificationSuccess={handle2FASuccess}
        onVerificationFailure={handle2FAFailure}
        onCancel={() => setRequires2FA(false)}
        allowDeviceTrust={true}
        showRecoveryOption={true}
      />
    );
  }

  return (
    <div className="login-form">
      <div className="login-header">
        <h1>🔐 Sign In</h1>
        <p>Welcome back! Please sign in to your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form-content">
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-container">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div className="form-options">
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            className="forgot-password"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          className="login-button"
          disabled={loading || !email || !password}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        {onRegisterClick && (
          <div className="register-link">
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="link-button"
                onClick={onRegisterClick}
                disabled={loading}
              >
                Create one here
              </button>
            </p>
          </div>
        )}
      </form>

      <div className="security-notice">
        <p>
          🔒 Your connection is secure and your data is protected with industry-standard encryption.
        </p>
      </div>

      <style jsx>{`
        .login-form {
          max-width: 400px;
          margin: 0 auto;
          padding: 30px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .login-header h1 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 28px;
          font-weight: 600;
        }

        .login-header p {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .login-form-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .error-message {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 15px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }

        .error-icon {
          font-size: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }

        .form-group input {
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .form-group input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .password-input-container {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 5px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .password-toggle:hover:not(:disabled) {
          background-color: #f0f0f0;
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 10px 0;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #666;
        }

        .forgot-password {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          font-size: 14px;
          text-decoration: underline;
          padding: 5px;
        }

        .forgot-password:hover:not(:disabled) {
          color: #0056b3;
        }

        .login-button {
          padding: 15px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .login-button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .login-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .register-link {
          text-align: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .register-link p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .link-button {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          text-decoration: underline;
          font-size: 14px;
          padding: 0;
        }

        .link-button:hover:not(:disabled) {
          color: #0056b3;
        }

        .security-notice {
          margin-top: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
          text-align: center;
        }

        .security-notice p {
          margin: 0;
          font-size: 12px;
          color: #666;
        }

        @media (max-width: 480px) {
          .login-form {
            padding: 20px;
            margin: 10px;
          }

          .form-options {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};