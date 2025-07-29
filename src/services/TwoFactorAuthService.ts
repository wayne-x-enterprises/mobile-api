import { TwoFactorAuth, TwoFactorSetupRequest, TwoFactorVerificationRequest, TwoFactorSetupResponse, TrustedDevice, RecoveryCodeUsage } from '../models/TwoFactorAuth';
import { CryptoService } from './CryptoService';

/**
 * Service class for managing two-factor authentication
 */
export class TwoFactorAuthService {
  private twoFactorRecords: Map<string, TwoFactorAuth> = new Map();
  private recoveryCodeUsage: RecoveryCodeUsage[] = [];
  private cryptoService: CryptoService;

  // TOTP settings
  private readonly TOTP_WINDOW = 1; // Allow 1 step before/after current time
  private readonly TOTP_STEP = 30; // 30 seconds
  private readonly RECOVERY_CODE_LENGTH = 8;
  private readonly RECOVERY_CODE_COUNT = 10;

  constructor() {
    this.cryptoService = new CryptoService();
  }

  /**
   * Set up two-factor authentication for a user
   */
  public async setupTwoFactor(request: TwoFactorSetupRequest): Promise<TwoFactorSetupResponse> {
    // Generate secret key
    const secretKey = this.generateSecretKey();
    
    // Generate QR code data URL
    const qrCodeDataUrl = this.generateQRCode(request.userId, secretKey);
    
    // Generate recovery codes
    const recoveryCodes = this.generateRecoveryCodes();
    
    // Create 2FA record
    const twoFactorAuth: TwoFactorAuth = {
      id: this.generateTwoFactorId(),
      userId: request.userId,
      enabled: false, // Will be enabled after verification
      secretKey: await this.cryptoService.encrypt(secretKey),
      recoveryCodes: await Promise.all(recoveryCodes.map(code => this.cryptoService.encrypt(code))),
      qrCodeDataUrl,
      method: request.method,
      phoneNumber: request.phoneNumber ? await this.cryptoService.encrypt(request.phoneNumber) : undefined,
      backupEmail: request.backupEmail,
      trustedDevices: [],
      settings: {
        requireForSensitiveOps: true,
        rememberDeviceDays: 30,
        notifyOnUse: true,
      },
    };

    this.twoFactorRecords.set(request.userId, twoFactorAuth);

    return {
      secretKey,
      qrCodeDataUrl,
      recoveryCodes,
      backupMethods: this.getBackupMethods(request.method),
    };
  }

  /**
   * Verify and enable two-factor authentication
   */
  public async enableTwoFactor(userId: string, verificationCode: string): Promise<boolean> {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth) {
      throw new Error('Two-factor authentication not set up for this user');
    }

    // Verify the code
    const isValid = await this.verifyTOTPCode(twoFactorAuth.secretKey, verificationCode);
    if (!isValid) {
      return false;
    }

    // Enable 2FA
    twoFactorAuth.enabled = true;
    twoFactorAuth.setupAt = new Date();
    twoFactorAuth.lastVerifiedAt = new Date();
    
    this.twoFactorRecords.set(userId, twoFactorAuth);
    return true;
  }

  /**
   * Verify two-factor authentication code
   */
  public async verifyCode(
    userId: string,
    code: string,
    deviceFingerprint?: string,
    rememberDevice: boolean = false
  ): Promise<boolean> {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth || !twoFactorAuth.enabled) {
      return false;
    }

    let isValid = false;

    // Check if it's a recovery code
    if (code.length === this.RECOVERY_CODE_LENGTH && /^[A-Z0-9]+$/.test(code)) {
      isValid = await this.verifyRecoveryCode(userId, code);
    } else {
      // Verify TOTP code
      isValid = await this.verifyTOTPCode(twoFactorAuth.secretKey, code);
    }

    if (isValid) {
      twoFactorAuth.lastVerifiedAt = new Date();
      
      // Add trusted device if requested
      if (rememberDevice && deviceFingerprint) {
        await this.addTrustedDevice(userId, deviceFingerprint);
      }
      
      this.twoFactorRecords.set(userId, twoFactorAuth);
    }

    return isValid;
  }

  /**
   * Check if device is trusted
   */
  public isDeviceTrusted(userId: string, deviceFingerprint: string): boolean {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth) return false;

    const trustedDevice = twoFactorAuth.trustedDevices.find(
      device => device.fingerprint === deviceFingerprint && 
                device.isActive && 
                device.expiresAt > new Date()
    );

    if (trustedDevice) {
      // Update last used time
      trustedDevice.lastUsedAt = new Date();
      this.twoFactorRecords.set(userId, twoFactorAuth);
      return true;
    }

    return false;
  }

  /**
   * Disable two-factor authentication
   */
  public async disableTwoFactor(userId: string, verificationCode: string): Promise<boolean> {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth || !twoFactorAuth.enabled) {
      return false;
    }

    // Verify the code before disabling
    const isValid = await this.verifyCode(userId, verificationCode);
    if (!isValid) {
      return false;
    }

    // Disable 2FA and clear sensitive data
    twoFactorAuth.enabled = false;
    twoFactorAuth.secretKey = '';
    twoFactorAuth.recoveryCodes = [];
    twoFactorAuth.trustedDevices = [];
    
    this.twoFactorRecords.set(userId, twoFactorAuth);
    return true;
  }

  /**
   * Generate new recovery codes
   */
  public async generateNewRecoveryCodes(userId: string, verificationCode: string): Promise<string[]> {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth || !twoFactorAuth.enabled) {
      throw new Error('Two-factor authentication not enabled for this user');
    }

    // Verify the code before generating new codes
    const isValid = await this.verifyCode(userId, verificationCode);
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Generate new recovery codes
    const newRecoveryCodes = this.generateRecoveryCodes();
    twoFactorAuth.recoveryCodes = await Promise.all(
      newRecoveryCodes.map(code => this.cryptoService.encrypt(code))
    );
    
    this.twoFactorRecords.set(userId, twoFactorAuth);
    return newRecoveryCodes;
  }

  /**
   * Get trusted devices for a user
   */
  public getTrustedDevices(userId: string): TrustedDevice[] {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth) return [];

    return twoFactorAuth.trustedDevices.filter(device => device.isActive);
  }

  /**
   * Remove trusted device
   */
  public removeTrustedDevice(userId: string, deviceId: string): boolean {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth) return false;

    const deviceIndex = twoFactorAuth.trustedDevices.findIndex(device => device.deviceId === deviceId);
    if (deviceIndex === -1) return false;

    twoFactorAuth.trustedDevices[deviceIndex].isActive = false;
    this.twoFactorRecords.set(userId, twoFactorAuth);
    return true;
  }

  /**
   * Get 2FA status for user
   */
  public getTwoFactorStatus(userId: string): { enabled: boolean; method?: string; hasRecoveryCodes: boolean; trustedDeviceCount: number } {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth) {
      return { enabled: false, hasRecoveryCodes: false, trustedDeviceCount: 0 };
    }

    return {
      enabled: twoFactorAuth.enabled,
      method: twoFactorAuth.method,
      hasRecoveryCodes: twoFactorAuth.recoveryCodes.length > 0,
      trustedDeviceCount: twoFactorAuth.trustedDevices.filter(d => d.isActive).length,
    };
  }

  /**
   * Verify TOTP code
   */
  private async verifyTOTPCode(encryptedSecretKey: string, code: string): Promise<boolean> {
    try {
      const secretKey = await this.cryptoService.decrypt(encryptedSecretKey);
      const currentTime = Math.floor(Date.now() / 1000 / this.TOTP_STEP);
      
      // Check current time window and adjacent windows
      for (let i = -this.TOTP_WINDOW; i <= this.TOTP_WINDOW; i++) {
        const timeStep = currentTime + i;
        const expectedCode = this.generateTOTPCode(secretKey, timeStep);
        if (expectedCode === code) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying TOTP code:', error);
      return false;
    }
  }

  /**
   * Verify recovery code
   */
  private async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth) return false;

    // Check if code exists in recovery codes
    for (let i = 0; i < twoFactorAuth.recoveryCodes.length; i++) {
      const encryptedCode = twoFactorAuth.recoveryCodes[i];
      const decryptedCode = await this.cryptoService.decrypt(encryptedCode);
      
      if (decryptedCode === code) {
        // Remove used recovery code
        twoFactorAuth.recoveryCodes.splice(i, 1);
        this.twoFactorRecords.set(userId, twoFactorAuth);
        
        // Log recovery code usage
        this.recoveryCodeUsage.push({
          userId,
          codeUsed: code,
          usedAt: new Date(),
          ipAddress: '0.0.0.0', // Would be provided by request context
          userAgent: 'Unknown', // Would be provided by request context
        });
        
        return true;
      }
    }

    return false;
  }

  /**
   * Add trusted device
   */
  private async addTrustedDevice(userId: string, deviceFingerprint: string): Promise<void> {
    const twoFactorAuth = this.twoFactorRecords.get(userId);
    if (!twoFactorAuth) return;

    // Check if device already exists
    const existingDevice = twoFactorAuth.trustedDevices.find(
      device => device.fingerprint === deviceFingerprint
    );

    if (existingDevice) {
      // Update existing device
      existingDevice.lastUsedAt = new Date();
      existingDevice.expiresAt = new Date(Date.now() + twoFactorAuth.settings.rememberDeviceDays * 24 * 60 * 60 * 1000);
      existingDevice.isActive = true;
    } else {
      // Add new trusted device
      const trustedDevice: TrustedDevice = {
        deviceId: this.generateDeviceId(),
        deviceName: this.getDeviceName(deviceFingerprint),
        fingerprint: deviceFingerprint,
        trustedAt: new Date(),
        expiresAt: new Date(Date.now() + twoFactorAuth.settings.rememberDeviceDays * 24 * 60 * 60 * 1000),
        lastUsedAt: new Date(),
        ipAddress: '0.0.0.0', // Would be provided by request context
        userAgent: 'Unknown', // Would be provided by request context
        isActive: true,
      };

      twoFactorAuth.trustedDevices.push(trustedDevice);
    }

    this.twoFactorRecords.set(userId, twoFactorAuth);
  }

  /**
   * Generate secret key for TOTP
   */
  private generateSecretKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate QR code data URL
   */
  private generateQRCode(userId: string, secretKey: string): string {
    const issuer = 'SignatureApp';
    const accountName = `${issuer}:${userId}`;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(accountName)}?secret=${secretKey}&issuer=${encodeURIComponent(issuer)}`;
    
    // In a real implementation, you would use a QR code library
    // For now, return a placeholder data URL
    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="100" y="100" text-anchor="middle">QR Code for ${secretKey}</text></svg>`)}`;
  }

  /**
   * Generate recovery codes
   */
  private generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < this.RECOVERY_CODE_COUNT; i++) {
      let code = '';
      for (let j = 0; j < this.RECOVERY_CODE_LENGTH; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Generate TOTP code
   */
  private generateTOTPCode(secretKey: string, timeStep: number): string {
    // Simplified TOTP implementation
    // In a real implementation, you would use a proper TOTP library
    const hash = this.simpleHash(secretKey + timeStep.toString());
    const code = (hash % 1000000).toString().padStart(6, '0');
    return code;
  }

  /**
   * Simple hash function (for demonstration only)
   */
  private simpleHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get backup methods for 2FA
   */
  private getBackupMethods(primaryMethod: string): string[] {
    const allMethods = ['totp', 'sms', 'email', 'recovery_codes'];
    return allMethods.filter(method => method !== primaryMethod);
  }

  /**
   * Get device name from fingerprint
   */
  private getDeviceName(fingerprint: string): string {
    // In a real implementation, you would parse the fingerprint to determine device type
    return `Device ${fingerprint.substring(0, 8)}`;
  }

  /**
   * Generate unique two-factor ID
   */
  private generateTwoFactorId(): string {
    return '2fa_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    return 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}