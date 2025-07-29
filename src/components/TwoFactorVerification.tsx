import React, { useState, useEffect, useRef } from 'react';
import { TwoFactorAuthService } from '../services/TwoFactorAuthService';

interface TwoFactorVerificationProps {
  userId: string;
  onVerificationSuccess: (deviceTrusted: boolean) => void;
  onVerificationFailure: (error: string) => void;
  onCancel?: () => void;
  allowDeviceTrust?: boolean;
  showRecoveryOption?: boolean;
}

export const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  userId,
  onVerificationSuccess,
  onVerificationFailure,
  onCancel,
  allowDeviceTrust = true,
  showRecoveryOption = true,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const twoFactorService = new TwoFactorAuthService();

  useEffect(() => {
    // Generate device fingerprint
    const fingerprint = generateDeviceFingerprint();
    setDeviceFingerprint(fingerprint);

    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const generateDeviceFingerprint = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join('|');
    
    return btoa(fingerprint).slice(0, 32);
  };

  const handleVerification = async () => {
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await twoFactorService.verifyCode(
        userId,
        code.trim(),
        deviceFingerprint,
        rememberDevice
      );

      if (success) {
        onVerificationSuccess(rememberDevice);
      } else {
        const newAttemptsRemaining = attemptsRemaining - 1;
        setAttemptsRemaining(newAttemptsRemaining);
        
        if (newAttemptsRemaining <= 0) {
          onVerificationFailure('Too many failed attempts. Please try again later.');
        } else {
          setError(`Invalid code. ${newAttemptsRemaining} attempt${newAttemptsRemaining !== 1 ? 's' : ''} remaining.`);
          setCode('');
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      onVerificationFailure(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !loading) {
      handleVerification();
    }
  };

  const handleCodeChange = (value: string) => {
    // Allow only digits and limit to 6-8 characters (TOTP codes are 6, recovery codes are 8)
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= (showRecoveryInput ? 8 : 6)) {
      setCode(cleanValue);
      setError(null);
    }
  };

  const toggleRecoveryMode = () => {
    setShowRecoveryInput(!showRecoveryInput);
    setCode('');
    setError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const formatCodeDisplay = (value: string) => {
    if (showRecoveryInput) {
      // Format recovery code as XXXX-XXXX
      return value.replace(/(.{4})/g, '$1-').slice(0, 9);
    } else {
      // Format TOTP code as XXX XXX
      return value.replace(/(.{3})/g, '$1 ').trim();
    }
  };

  return (
    <div className="two-factor-verification">
      <div className="verification-header">
        <h2>🔐 Two-Factor Authentication</h2>
        <p>
          {showRecoveryInput 
            ? 'Enter one of your recovery codes:'
            : 'Enter the 6-digit code from your authenticator app:'
          }
        </p>
      </div>

      <div className="verification-form">
        <div className="code-input-container">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={showRecoveryInput ? '12345678' : '123456'}
            maxLength={showRecoveryInput ? 8 : 6}
            autoComplete="one-time-code"
            className={`code-input ${error ? 'error' : ''}`}
            disabled={loading}
          />
          <div className="code-display">
            {formatCodeDisplay(code)}
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {allowDeviceTrust && !showRecoveryInput && (
          <label className="remember-device">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              disabled={loading}
            />
            <span>Trust this device for 30 days</span>
            <div className="help-text">
              You won't need to enter a code on this device for 30 days
            </div>
          </label>
        )}

        <div className="button-group">
          {onCancel && (
            <button
              onClick={onCancel}
              className="secondary"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={handleVerification}
            disabled={loading || code.length < (showRecoveryInput ? 8 : 6)}
            className="primary"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>

        {showRecoveryOption && (
          <div className="recovery-options">
            <button
              onClick={toggleRecoveryMode}
              className="link-button"
              disabled={loading}
            >
              {showRecoveryInput 
                ? '← Back to authenticator code'
                : 'Use recovery code instead'
              }
            </button>
          </div>
        )}

        <div className="help-section">
          <details>
            <summary>Need help?</summary>
            <div className="help-content">
              <h4>Authenticator App Issues:</h4>
              <ul>
                <li>Make sure your device's time is correct</li>
                <li>Try refreshing your authenticator app</li>
                <li>Check if you have multiple accounts in your app</li>
              </ul>
              
              <h4>Recovery Codes:</h4>
              <ul>
                <li>Each recovery code can only be used once</li>
                <li>Enter the code exactly as shown (8 characters)</li>
                <li>Contact support if you've lost all recovery codes</li>
              </ul>
              
              <h4>Device Trust:</h4>
              <ul>
                <li>Trusted devices skip 2FA for 30 days</li>
                <li>Only trust devices you own and control</li>
                <li>You can revoke device trust in security settings</li>
              </ul>
            </div>
          </details>
        </div>
      </div>

      <style jsx>{`
        .two-factor-verification {
          max-width: 400px;
          margin: 0 auto;
          padding: 30px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .verification-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .verification-header h2 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 24px;
        }

        .verification-header p {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .verification-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .code-input-container {
          position: relative;
        }

        .code-input {
          width: 100%;
          padding: 20px;
          font-size: 24px;
          text-align: center;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          letter-spacing: 4px;
          transition: border-color 0.2s;
          background: transparent;
          color: transparent;
          caret-color: #007bff;
        }

        .code-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .code-input.error {
          border-color: #dc3545;
        }

        .code-display {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          font-family: 'Courier New', monospace;
          letter-spacing: 4px;
          color: #333;
          pointer-events: none;
          font-weight: bold;
        }

        .error-message {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 12px;
          border-radius: 6px;
          text-align: center;
          font-size: 14px;
        }

        .remember-device {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .remember-device:hover {
          background-color: #e9ecef;
        }

        .remember-device input[type="checkbox"] {
          margin-top: 2px;
        }

        .remember-device span {
          font-weight: 500;
          color: #333;
        }

        .help-text {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          justify-content: stretch;
        }

        button {
          flex: 1;
          padding: 15px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          transition: all 0.2s;
        }

        button.primary {
          background-color: #007bff;
          color: white;
        }

        button.primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        button.secondary {
          background-color: #6c757d;
          color: white;
        }

        button.secondary:hover:not(:disabled) {
          background-color: #545b62;
        }

        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .recovery-options {
          text-align: center;
          margin-top: 10px;
        }

        .link-button {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          text-decoration: underline;
          font-size: 14px;
          padding: 5px;
        }

        .link-button:hover:not(:disabled) {
          color: #0056b3;
        }

        .help-section {
          margin-top: 20px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }

        .help-section details {
          cursor: pointer;
        }

        .help-section summary {
          color: #666;
          font-size: 14px;
          padding: 5px 0;
        }

        .help-content {
          margin-top: 15px;
          font-size: 13px;
          color: #666;
        }

        .help-content h4 {
          margin: 15px 0 8px 0;
          color: #333;
          font-size: 14px;
        }

        .help-content ul {
          margin: 0 0 15px 0;
          padding-left: 20px;
        }

        .help-content li {
          margin-bottom: 4px;
        }

        @media (max-width: 480px) {
          .two-factor-verification {
            padding: 20px;
            margin: 10px;
          }

          .code-input, .code-display {
            font-size: 20px;
            letter-spacing: 2px;
          }

          .button-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};