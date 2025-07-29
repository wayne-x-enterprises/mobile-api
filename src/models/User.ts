/**
 * Interface representing a user in the system
 */
export interface User {
  /**
   * Unique identifier for the user
   */
  id: string;

  /**
   * User's email address (used as username)
   */
  email: string;

  /**
   * Hashed password
   */
  passwordHash: string;

  /**
   * User's display name
   */
  displayName: string;

  /**
   * Whether the user's email has been verified
   */
  emailVerified: boolean;

  /**
   * Whether two-factor authentication is enabled
   */
  twoFactorEnabled: boolean;

  /**
   * Timestamp when the user account was created
   */
  createdAt: Date;

  /**
   * Timestamp when the user last logged in
   */
  lastLoginAt?: Date;

  /**
   * User's account status
   */
  status: 'active' | 'suspended' | 'pending_verification';

  /**
   * User preferences and settings
   */
  preferences: {
    /**
     * Preferred language for the interface
     */
    language: string;
    
    /**
     * Whether to receive security notifications
     */
    securityNotifications: boolean;
    
    /**
     * Session timeout in minutes
     */
    sessionTimeout: number;
  };

  /**
   * Security metadata
   */
  security: {
    /**
     * Number of failed login attempts
     */
    failedLoginAttempts: number;
    
    /**
     * Timestamp when account was last locked due to failed attempts
     */
    lastLockoutAt?: Date;
    
    /**
     * Whether account is currently locked
     */
    isLocked: boolean;
    
    /**
     * Password change history (timestamps only for security)
     */
    passwordChangeHistory: Date[];
  };
}

/**
 * Interface for user registration data
 */
export interface UserRegistration {
  email: string;
  password: string;
  displayName: string;
  language?: string;
}

/**
 * Interface for user login credentials
 */
export interface UserCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

/**
 * Interface for user session data
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}