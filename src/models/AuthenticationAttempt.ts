/**
 * Interface representing an authentication attempt for security auditing
 */
export interface AuthenticationAttempt {
  /**
   * Unique identifier for the authentication attempt
   */
  id: string;

  /**
   * User ID (if known) or email attempted
   */
  userId?: string;
  email: string;

  /**
   * Type of authentication attempt
   */
  type: 'login' | 'two_factor' | 'password_reset' | 'account_recovery';

  /**
   * Result of the authentication attempt
   */
  result: 'success' | 'failure' | 'blocked' | 'pending';

  /**
   * Reason for failure (if applicable)
   */
  failureReason?: 'invalid_credentials' | 'invalid_2fa' | 'account_locked' | 'account_suspended' | 'rate_limited' | 'invalid_recovery_code';

  /**
   * Timestamp of the attempt
   */
  attemptedAt: Date;

  /**
   * IP address of the attempt
   */
  ipAddress: string;

  /**
   * User agent string
   */
  userAgent: string;

  /**
   * Geographic location (if available)
   */
  location?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };

  /**
   * Device fingerprint for tracking
   */
  deviceFingerprint?: string;

  /**
   * Session ID (if successful)
   */
  sessionId?: string;

  /**
   * Additional metadata about the attempt
   */
  metadata: {
    /**
     * Whether this was a suspicious attempt
     */
    suspicious: boolean;
    
    /**
     * Risk score (0-100)
     */
    riskScore: number;
    
    /**
     * Factors that contributed to risk score
     */
    riskFactors: string[];
    
    /**
     * Whether CAPTCHA was required/completed
     */
    captchaRequired: boolean;
    captchaCompleted?: boolean;
    
    /**
     * Time taken for the attempt (in milliseconds)
     */
    duration: number;
  };

  /**
   * Two-factor authentication details (if applicable)
   */
  twoFactorDetails?: {
    method: 'totp' | 'sms' | 'email' | 'recovery_code';
    codeLength: number;
    attemptsRemaining: number;
    deviceTrusted: boolean;
  };
}

/**
 * Interface for authentication attempt query filters
 */
export interface AuthenticationAttemptFilter {
  userId?: string;
  email?: string;
  type?: string[];
  result?: string[];
  ipAddress?: string;
  dateFrom?: Date;
  dateTo?: Date;
  suspicious?: boolean;
  riskScoreMin?: number;
  riskScoreMax?: number;
  limit?: number;
  offset?: number;
}

/**
 * Interface for authentication statistics
 */
export interface AuthenticationStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  blockedAttempts: number;
  suspiciousAttempts: number;
  averageRiskScore: number;
  topFailureReasons: { reason: string; count: number }[];
  topCountries: { country: string; count: number }[];
  timeRange: {
    from: Date;
    to: Date;
  };
}

/**
 * Interface for real-time security alerts
 */
export interface SecurityAlert {
  id: string;
  userId?: string;
  email: string;
  alertType: 'multiple_failures' | 'suspicious_location' | 'new_device' | 'account_lockout' | 'brute_force';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actions: string[];
  metadata: Record<string, any>;
}