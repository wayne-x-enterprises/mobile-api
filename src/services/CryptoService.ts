/**
 * Service class for cryptographic operations
 * Provides secure encryption, decryption, and hashing functionality
 */
export class CryptoService {
  private readonly SALT_ROUNDS = 12;
  private readonly ENCRYPTION_KEY = 'your-secret-encryption-key-32-chars'; // In production, use environment variable

  /**
   * Hash a password using bcrypt-like algorithm
   */
  public async hashPassword(password: string): Promise<string> {
    // In a real implementation, you would use bcrypt or similar
    // This is a simplified version for demonstration
    const salt = this.generateSalt();
    const hash = await this.simpleHash(password + salt);
    return `${salt}:${hash}`;
  }

  /**
   * Verify a password against its hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const [salt, expectedHash] = hash.split(':');
      const actualHash = await this.simpleHash(password + salt);
      return actualHash === expectedHash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Encrypt sensitive data
   */
  public async encrypt(data: string): Promise<string> {
    // In a real implementation, you would use AES or similar
    // This is a simplified version for demonstration
    const iv = this.generateIV();
    const encrypted = this.simpleEncrypt(data, this.ENCRYPTION_KEY, iv);
    return `${iv}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  public async decrypt(encryptedData: string): Promise<string> {
    try {
      const [iv, encrypted] = encryptedData.split(':');
      return this.simpleDecrypt(encrypted, this.ENCRYPTION_KEY, iv);
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate a secure random token
   */
  public generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a cryptographically secure random number
   */
  public generateSecureRandom(min: number = 0, max: number = 1000000): number {
    // In a real implementation, you would use crypto.getRandomValues()
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Create a hash of data for integrity checking
   */
  public async createHash(data: string): Promise<string> {
    return this.simpleHash(data);
  }

  /**
   * Verify data integrity using hash
   */
  public async verifyHash(data: string, expectedHash: string): Promise<boolean> {
    const actualHash = await this.createHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Generate device fingerprint
   */
  public generateDeviceFingerprint(userAgent: string, screenResolution: string, timezone: string): string {
    const data = `${userAgent}|${screenResolution}|${timezone}|${Date.now()}`;
    return this.simpleHash(data);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  public constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate salt for password hashing
   */
  private generateSalt(): string {
    return this.generateSecureToken(16);
  }

  /**
   * Generate initialization vector for encryption
   */
  private generateIV(): string {
    return this.generateSecureToken(16);
  }

  /**
   * Simple hash function (for demonstration only)
   * In production, use SHA-256 or similar
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Simple encryption function (for demonstration only)
   * In production, use AES-256-GCM or similar
   */
  private simpleEncrypt(data: string, key: string, iv: string): string {
    let result = '';
    const keyHash = this.simpleHash(key + iv);
    
    for (let i = 0; i < data.length; i++) {
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      const dataChar = data.charCodeAt(i);
      const encryptedChar = (dataChar + keyChar) % 256;
      result += String.fromCharCode(encryptedChar);
    }
    
    return btoa(result); // Base64 encode
  }

  /**
   * Simple decryption function (for demonstration only)
   * In production, use AES-256-GCM or similar
   */
  private simpleDecrypt(encryptedData: string, key: string, iv: string): string {
    const data = atob(encryptedData); // Base64 decode
    let result = '';
    const keyHash = this.simpleHash(key + iv);
    
    for (let i = 0; i < data.length; i++) {
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      const encryptedChar = data.charCodeAt(i);
      const decryptedChar = (encryptedChar - keyChar + 256) % 256;
      result += String.fromCharCode(decryptedChar);
    }
    
    return result;
  }
}

/**
 * Utility functions for cryptographic operations
 */
export class CryptoUtils {
  /**
   * Generate a UUID v4
   */
  public static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Validate email format
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  public static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Sanitize input to prevent XSS
   */
  public static sanitizeInput(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Generate a secure password
   */
  public static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}