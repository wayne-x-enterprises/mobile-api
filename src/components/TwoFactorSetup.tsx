import React, { useState, useEffect } from 'react';
import { TwoFactorAuthService } from '../services/TwoFactorAuthService';
import { TwoFactorSetupResponse } from '../models/TwoFactorAuth';

interface TwoFactorSetupProps {
  userId: string;
  onSetupComplete: (success: boolean) => void;
  onCancel: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  userId,
  onSetupComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<'method' | 'setup' | 'verify'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'totp' | 'sms' | 'email'>('totp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [backupEmail, setBackupEmail] = useState('');
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  const twoFactorService = new TwoFactorAuthService();

  const handleMethodSelection = () => {
    if (selectedMethod === 'sms' && !phoneNumber) {
      setError('Phone number is required for SMS authentication');
      return;
    }
    if (selectedMethod === 'email' && !backupEmail) {
      setError('Email address is required for email authentication');
      return;
    }
    setError(null);
    setStep('setup');
    setupTwoFactor();
  };

  const setupTwoFactor = async () => {
    setLoading(true);
    try {
      const response = await twoFactorService.setupTwoFactor({
        userId,
        method: selectedMethod,
        phoneNumber: selectedMethod === 'sms' ? phoneNumber : undefined,
        backupEmail: selectedMethod === 'email' ? backupEmail : undefined,
      });
      setSetupData(response);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const success = await twoFactorService.enableTwoFactor(userId, verificationCode);
      if (success) {
        setShowRecoveryCodes(true);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onSetupComplete(true);
  };

  const downloadRecoveryCodes = () => {
    if (!setupData) return;

    const codesText = setupData.recoveryCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderMethodSelection = () => (
    <div className="method-selection">
      <h3>Choose Two-Factor Authentication Method</h3>
      <p>Select how you'd like to receive your authentication codes:</p>

      <div className="method-options">
        <label className={`method-option ${selectedMethod === 'totp' ? 'selected' : ''}`}>
          <input
            type="radio"
            value="totp"
            checked={selectedMethod === 'totp'}
            onChange={(e) => setSelectedMethod(e.target.value as 'totp')}
          />
          <div className="method-content">
            <h4>📱 Authenticator App (Recommended)</h4>
            <p>Use an app like Google Authenticator, Authy, or 1Password</p>
            <ul>
              <li>Works offline</li>
              <li>Most secure option</li>
              <li>Compatible with all devices</li>
            </ul>
          </div>
        </label>

        <label className={`method-option ${selectedMethod === 'sms' ? 'selected' : ''}`}>
          <input
            type="radio"
            value="sms"
            checked={selectedMethod === 'sms'}
            onChange={(e) => setSelectedMethod(e.target.value as 'sms')}
          />
          <div className="method-content">
            <h4>📞 SMS Text Message</h4>
            <p>Receive codes via text message</p>
            <ul>
              <li>Easy to use</li>
              <li>Works on any phone</li>
              <li>Requires cellular service</li>
            </ul>
          </div>
        </label>

        <label className={`method-option ${selectedMethod === 'email' ? 'selected' : ''}`}>
          <input
            type="radio"
            value="email"
            checked={selectedMethod === 'email'}
            onChange={(e) => setSelectedMethod(e.target.value as 'email')}
          />
          <div className="method-content">
            <h4>📧 Email</h4>
            <p>Receive codes via email</p>
            <ul>
              <li>Always accessible</li>
              <li>Good backup option</li>
              <li>Requires internet access</li>
            </ul>
          </div>
        </label>
      </div>

      {selectedMethod === 'sms' && (
        <div className="additional-input">
          <label htmlFor="phoneNumber">Phone Number:</label>
          <input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
            required
          />
        </div>
      )}

      {selectedMethod === 'email' && (
        <div className="additional-input">
          <label htmlFor="backupEmail">Backup Email:</label>
          <input
            id="backupEmail"
            type="email"
            value={backupEmail}
            onChange={(e) => setBackupEmail(e.target.value)}
            placeholder="backup@example.com"
            required
          />
        </div>
      )}

      <div className="button-group">
        <button onClick={onCancel} className="secondary">
          Cancel
        </button>
        <button onClick={handleMethodSelection} disabled={loading}>
          {loading ? 'Setting up...' : 'Continue'}
        </button>
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="setup-instructions">
      <h3>Set Up {selectedMethod.toUpperCase()} Authentication</h3>
      
      {selectedMethod === 'totp' && setupData && (
        <div className="totp-setup">
          <p>Scan this QR code with your authenticator app:</p>
          <div className="qr-code">
            <img src={setupData.qrCodeDataUrl} alt="QR Code for 2FA setup" />
          </div>
          <p>Or manually enter this secret key:</p>
          <div className="secret-key">
            <code>{setupData.secretKey}</code>
            <button
              onClick={() => navigator.clipboard.writeText(setupData.secretKey)}
              className="copy-button"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {selectedMethod === 'sms' && (
        <div className="sms-setup">
          <p>We'll send a verification code to: <strong>{phoneNumber}</strong></p>
          <p>Make sure your phone is nearby and can receive text messages.</p>
        </div>
      )}

      {selectedMethod === 'email' && (
        <div className="email-setup">
          <p>We'll send a verification code to: <strong>{backupEmail}</strong></p>
          <p>Check your email inbox and spam folder.</p>
        </div>
      )}

      <div className="button-group">
        <button onClick={() => setStep('method')} className="secondary">
          Back
        </button>
        <button onClick={() => setStep('verify')}>
          I'm Ready to Verify
        </button>
      </div>
    </div>
  );

  const renderVerification = () => (
    <div className="verification">
      <h3>Verify Your Setup</h3>
      <p>Enter the 6-digit code from your {selectedMethod === 'totp' ? 'authenticator app' : selectedMethod}:</p>
      
      <div className="verification-input">
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          maxLength={6}
          autoComplete="one-time-code"
        />
      </div>

      <div className="button-group">
        <button onClick={() => setStep('setup')} className="secondary">
          Back
        </button>
        <button onClick={handleVerification} disabled={loading || verificationCode.length !== 6}>
          {loading ? 'Verifying...' : 'Verify & Enable'}
        </button>
      </div>
    </div>
  );

  const renderRecoveryCodes = () => (
    <div className="recovery-codes">
      <h3>🎉 Two-Factor Authentication Enabled!</h3>
      <p>Save these recovery codes in a safe place. You can use them to access your account if you lose your device:</p>
      
      <div className="codes-container">
        <div className="codes-grid">
          {setupData?.recoveryCodes.map((code, index) => (
            <div key={index} className="recovery-code">
              {code}
            </div>
          ))}
        </div>
        
        <div className="codes-actions">
          <button onClick={downloadRecoveryCodes} className="secondary">
            📥 Download Codes
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(setupData?.recoveryCodes.join('\n') || '')}
            className="secondary"
          >
            📋 Copy All
          </button>
        </div>
      </div>

      <div className="warning">
        <p><strong>⚠️ Important:</strong></p>
        <ul>
          <li>Each recovery code can only be used once</li>
          <li>Store them securely - treat them like passwords</li>
          <li>You can generate new codes anytime from your security settings</li>
        </ul>
      </div>

      <div className="button-group">
        <button onClick={handleComplete} className="primary">
          Complete Setup
        </button>
      </div>
    </div>
  );

  return (
    <div className="two-factor-setup">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      {step === 'method' && renderMethodSelection()}
      {step === 'setup' && renderSetup()}
      {step === 'verify' && renderVerification()}
      {showRecoveryCodes && renderRecoveryCodes()}

      <style jsx>{`
        .two-factor-setup {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .error-message {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .close-error {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #c33;
        }

        .method-options {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin: 20px 0;
        }

        .method-option {
          border: 2px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 15px;
        }

        .method-option.selected {
          border-color: #007bff;
          background-color: #f8f9ff;
        }

        .method-option input[type="radio"] {
          margin-top: 5px;
        }

        .method-content h4 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .method-content p {
          margin: 0 0 10px 0;
          color: #666;
        }

        .method-content ul {
          margin: 0;
          padding-left: 20px;
          color: #666;
          font-size: 14px;
        }

        .additional-input {
          margin: 20px 0;
        }

        .additional-input label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .additional-input input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }

        .qr-code {
          text-align: center;
          margin: 20px 0;
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 8px;
        }

        .qr-code img {
          max-width: 200px;
          height: auto;
        }

        .secret-key {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 15px 0;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }

        .secret-key code {
          flex: 1;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          word-break: break-all;
        }

        .copy-button {
          padding: 5px 10px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .verification-input {
          text-align: center;
          margin: 30px 0;
        }

        .verification-input input {
          font-size: 24px;
          text-align: center;
          letter-spacing: 8px;
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          width: 200px;
          font-family: 'Courier New', monospace;
        }

        .codes-container {
          margin: 20px 0;
        }

        .codes-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .recovery-code {
          background-color: #f5f5f5;
          padding: 10px;
          text-align: center;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          border-radius: 4px;
          letter-spacing: 1px;
        }

        .codes-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .warning {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }

        .warning p {
          margin: 0 0 10px 0;
          font-weight: 500;
        }

        .warning ul {
          margin: 0;
          padding-left: 20px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 30px;
        }

        button {
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.2s;
        }

        button.primary, button:not(.secondary) {
          background-color: #007bff;
          color: white;
        }

        button.primary:hover, button:not(.secondary):hover {
          background-color: #0056b3;
        }

        button.secondary {
          background-color: #6c757d;
          color: white;
        }

        button.secondary:hover {
          background-color: #545b62;
        }

        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        h3 {
          color: #333;
          margin-bottom: 15px;
        }

        p {
          color: #666;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};