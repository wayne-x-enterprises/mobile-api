import { User, UserCredentials, UserRegistration, UserSession } from '../models/User';
import { AuthenticationAttempt, SecurityAlert } from '../models/AuthenticationAttempt';
import { TwoFactorAuthService } from './TwoFactorAuthService';
import { CryptoService } from './CryptoService';

/**
 * Service class for managing user authentication
 */
export class AuthenticationService {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private authAttempts: AuthenticationAttempt[] = [];
  private twoFactorService: TwoFactorAuthService;
  private cryptoService: CryptoService;

  // Rate limiting
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.twoFactorService = new TwoFactorAuthService();
    this.cryptoService = new CryptoService();
  }

  /**
   * Register a new user
   */
  public async registerUser(registration: UserRegistration): Promise<{ user: User; requiresEmailVerification: boolean }> {
    // Check if user already exists
    const existingUser = Array.from(this.users.values()).find(u => u.email === registration.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    this.validatePasswordStrength(registration.password);

    // Create user
    const user: User = {
      id: this.generateUserId(),
      email: registration.email,
      passwordHash: await this.cryptoService.hashPassword(registration.password),
      displayName: registration.displayName,
      emailVerified: false,
      twoFactorEnabled: false,
      createdAt: new Date(),
      status: 'pending_verification',
      preferences: {
        language: registration.language || 'en',
        securityNotifications: true,
        sessionTimeout: 30, // 30 minutes
      },
      security: {
        failedLoginAttempts: 0,
        isLocked: false,
        passwordChangeHistory: [new Date()],
      },
    };

    this.users.set(user.id, user);

    // Log registration attempt
    await this.logAuthenticationAttempt({
      email: registration.email,
      type: 'login',
      result: 'success',
      ipAddress: '0.0.0.0', // Would be provided by request context
      userAgent: 'Unknown', // Would be provided by request context
    });

    return { user, requiresEmailVerification: true };
  }

  /**
   * Authenticate user with credentials
   */
  public async authenticateUser(
    credentials: UserCredentials,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string
  ): Promise<{ success: boolean; user?: User; session?: UserSession; requires2FA?: boolean; error?: string }> {
    const startTime = Date.now();

    try {
      // Check rate limiting
      if (this.isRateLimited(credentials.email)) {
        await this.logAuthenticationAttempt({
          email: credentials.email,
          type: 'login',
          result: 'blocked',
          failureReason: 'rate_limited',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Too many failed attempts. Please try again later.' };
      }

      // Find user
      const user = Array.from(this.users.values()).find(u => u.email === credentials.email);
      if (!user) {
        await this.handleFailedLogin(credentials.email, ipAddress, userAgent, 'invalid_credentials');
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.security.isLocked) {
        await this.logAuthenticationAttempt({
          userId: user.id,
          email: credentials.email,
          type: 'login',
          result: 'blocked',
          failureReason: 'account_locked',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Account is locked. Please contact support.' };
      }

      // Verify password
      const passwordValid = await this.cryptoService.verifyPassword(credentials.password, user.passwordHash);
      if (!passwordValid) {
        await this.handleFailedLogin(credentials.email, ipAddress, userAgent, 'invalid_credentials', user.id);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if 2FA is required
      if (user.twoFactorEnabled) {
        if (!credentials.twoFactorCode) {
          return { success: false, requires2FA: true };
        }

        // Verify 2FA code
        const twoFactorValid = await this.twoFactorService.verifyCode(
          user.id,
          credentials.twoFactorCode,
          deviceFingerprint
        );

        if (!twoFactorValid) {
          await this.logAuthenticationAttempt({
            userId: user.id,
            email: credentials.email,
            type: 'two_factor',
            result: 'failure',
            failureReason: 'invalid_2fa',
            ipAddress,
            userAgent,
            twoFactorDetails: {
              method: 'totp',
              codeLength: credentials.twoFactorCode.length,
              attemptsRemaining: 2, // Would be tracked separately
              deviceTrusted: false,
            },
          });
          return { success: false, error: 'Invalid two-factor authentication code' };
        }
      }

      // Create session
      const session = this.createSession(user, ipAddress, userAgent);
      
      // Update user login info
      user.lastLoginAt = new Date();
      user.security.failedLoginAttempts = 0;
      this.users.set(user.id, user);

      // Clear rate limiting
      this.loginAttempts.delete(credentials.email);

      // Log successful authentication
      await this.logAuthenticationAttempt({
        userId: user.id,
        email: credentials.email,
        type: user.twoFactorEnabled ? 'two_factor' : 'login',
        result: 'success',
        ipAddress,
        userAgent,
        sessionId: session.sessionId,
      });

      return { success: true, user, session };

    } catch (error) {
      await this.logAuthenticationAttempt({
        email: credentials.email,
        type: 'login',
        result: 'failure',
        ipAddress,
        userAgent,
      });
      throw error;
    }
  }

  /**
   * Validate session
   */
  public validateSession(sessionId: string): { valid: boolean; user?: User; session?: UserSession } {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return { valid: false };
    }

    const user = this.users.get(session.userId);
    if (!user) {
      return { valid: false };
    }

    return { valid: true, user, session };
  }

  /**
   * Logout user
   */
  public logout(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.set(sessionId, session);
      return true;
    }
    return false;
  }

  /**
   * Get user by ID
   */
  public getUser(userId: string): User | null {
    return this.users.get(userId) || null;
  }

  /**
   * Update user password
   */
  public async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    // Verify current password
    const currentPasswordValid = await this.cryptoService.verifyPassword(currentPassword, user.passwordHash);
    if (!currentPasswordValid) return false;

    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    // Update password
    user.passwordHash = await this.cryptoService.hashPassword(newPassword);
    user.security.passwordChangeHistory.push(new Date());
    
    // Keep only last 5 password changes
    if (user.security.passwordChangeHistory.length > 5) {
      user.security.passwordChangeHistory = user.security.passwordChangeHistory.slice(-5);
    }

    this.users.set(userId, user);
    return true;
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
    userId?: string
  ): Promise<void> {
    // Update rate limiting
    const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: new Date() };
    attempts.count++;
    attempts.lastAttempt = new Date();
    this.loginAttempts.set(email, attempts);

    // Update user failed attempts if user exists
    if (userId) {
      const user = this.users.get(userId);
      if (user) {
        user.security.failedLoginAttempts++;
        
        // Lock account after max attempts
        if (user.security.failedLoginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
          user.security.isLocked = true;
          user.security.lastLockoutAt = new Date();
        }
        
        this.users.set(userId, user);
      }
    }

    // Log attempt
    await this.logAuthenticationAttempt({
      userId,
      email,
      type: 'login',
      result: 'failure',
      failureReason: reason as any,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Check if email is rate limited
   */
  private isRateLimited(email: string): boolean {
    const attempts = this.loginAttempts.get(email);
    if (!attempts) return false;

    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    if (timeSinceLastAttempt > this.LOCKOUT_DURATION) {
      this.loginAttempts.delete(email);
      return false;
    }

    return attempts.count >= this.MAX_LOGIN_ATTEMPTS;
  }

  /**
   * Create user session
   */
  private createSession(user: User, ipAddress: string, userAgent: string): UserSession {
    const session: UserSession = {
      sessionId: this.generateSessionId(),
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + user.preferences.sessionTimeout * 60 * 1000),
      ipAddress,
      userAgent,
      isActive: true,
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  /**
   * Log authentication attempt
   */
  private async logAuthenticationAttempt(attempt: Partial<AuthenticationAttempt>): Promise<void> {
    const fullAttempt: AuthenticationAttempt = {
      id: this.generateAttemptId(),
      attemptedAt: new Date(),
      metadata: {
        suspicious: false,
        riskScore: 0,
        riskFactors: [],
        captchaRequired: false,
        duration: 0,
      },
      ...attempt,
    } as AuthenticationAttempt;

    // Calculate risk score
    fullAttempt.metadata.riskScore = this.calculateRiskScore(fullAttempt);
    fullAttempt.metadata.suspicious = fullAttempt.metadata.riskScore > 70;

    this.authAttempts.push(fullAttempt);

    // Trigger security alerts if needed
    if (fullAttempt.metadata.suspicious) {
      await this.triggerSecurityAlert(fullAttempt);
    }
  }

  /**
   * Calculate risk score for authentication attempt
   */
  private calculateRiskScore(attempt: AuthenticationAttempt): number {
    let score = 0;
    const factors: string[] = [];

    // Multiple failures from same IP
    const recentFailures = this.authAttempts.filter(
      a => a.ipAddress === attempt.ipAddress && 
           a.result === 'failure' && 
           Date.now() - a.attemptedAt.getTime() < 3600000 // 1 hour
    ).length;

    if (recentFailures > 3) {
      score += 30;
      factors.push('multiple_failures_same_ip');
    }

    // Failed 2FA attempts
    if (attempt.type === 'two_factor' && attempt.result === 'failure') {
      score += 25;
      factors.push('failed_2fa');
    }

    // Account lockout
    if (attempt.failureReason === 'account_locked') {
      score += 40;
      factors.push('account_locked');
    }

    attempt.metadata.riskFactors = factors;
    return Math.min(score, 100);
  }

  /**
   * Trigger security alert
   */
  private async triggerSecurityAlert(attempt: AuthenticationAttempt): Promise<void> {
    // Implementation would send alerts via email, SMS, etc.
    console.warn('Security Alert:', {
      type: 'suspicious_authentication',
      attempt,
    });
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
    }
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
  }

  /**
   * Generate unique attempt ID
   */
  private generateAttemptId(): string {
    return 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}