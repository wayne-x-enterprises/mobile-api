/**
 * Interface representing two-factor authentication settings for a user
 */
export interface TwoFactorAuth {
  /**
   * Unique identifier for the 2FA record
   */
  id: string;

  /**
   * User ID this 2FA record belongs to
   */
  userId: string;

  /**
   * Whether 2FA is currently enabled
   */
  enabled: boolean;

  /**
   * The secret key used for TOTP generation (encrypted)
   */
  secretKey: string;

  /**
   * Backup recovery codes (encrypted)
   */
  recoveryCodes: string[];

  /**
   * QR code data URL for initial setup
   */
  qrCodeDataUrl?: string;

  /**
   * Timestamp when 2FA was first set up
   */
  setupAt?: Date;

  /**
   * Timestamp when 2FA was last verified
   */
  lastVerifiedAt?: Date;

  /**
   * Method used for 2FA
   */
  method: 'totp' | 'sms' | 'email';

  /**
   * Phone number for SMS-based 2FA (encrypted)
   */
  phoneNumber?: string;

  /**
   * Backup email for email-based 2FA
   */
  backupEmail?: string;

  /**
   * Device information for trusted devices
   */
  trustedDevices: TrustedDevice[];

  /**
   * Settings for 2FA behavior
   */
  settings: {
    /**
     * Whether to require 2FA for sensitive operations
     */
    requireForSensitiveOps: boolean;
    
    /**
     * How long to remember a device (in days)
     */
    rememberDeviceDays: number;
    
    /**
     * Whether to send notifications for 2FA events
     */
    notifyOnUse: boolean;
  };
}

/**
 * Interface representing a trusted device
 */
export interface TrustedDevice {
  /**
   * Unique identifier for the device
   */
  deviceId: string;

  /**
   * Human-readable device name
   */
  deviceName: string;

  /**
   * Device fingerprint for identification
   */
  fingerprint: string;

  /**
   * When the device was first trusted
   */
  trustedAt: Date;

  /**
   * When the device trust expires
   */
  expiresAt: Date;

  /**
   * Last time this device was used
   */
  lastUsedAt: Date;

  /**
   * IP address when device was trusted
   */
  ipAddress: string;

  /**
   * User agent when device was trusted
   */
  userAgent: string;

  /**
   * Whether this device is currently active
   */
  isActive: boolean;
}

/**
 * Interface for 2FA setup request
 */
export interface TwoFactorSetupRequest {
  userId: string;
  method: 'totp' | 'sms' | 'email';
  phoneNumber?: string;
  backupEmail?: string;
}

/**
 * Interface for 2FA verification request
 */
export interface TwoFactorVerificationRequest {
  userId: string;
  code: string;
  deviceFingerprint?: string;
  rememberDevice?: boolean;
}

/**
 * Interface for 2FA setup response
 */
export interface TwoFactorSetupResponse {
  secretKey: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
  backupMethods: string[];
}

/**
 * Interface for recovery code usage
 */
export interface RecoveryCodeUsage {
  userId: string;
  codeUsed: string;
  usedAt: Date;
  ipAddress: string;
  userAgent: string;
}