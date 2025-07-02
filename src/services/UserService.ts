import { User, UserRegistrationRequest, UserRegistrationResponse, ApiError } from '../models/User';

/**
 * Service class for managing user operations
 */
export class UserService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Register a new user
   * @param registrationData User registration data
   * @returns Promise resolving to the registration response
   * @throws Error if registration fails
   */
  async registerUser(registrationData: UserRegistrationRequest): Promise<UserRegistrationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.error || `Registration failed with status ${response.status}`);
      }

      // Convert date strings to Date objects
      const result = data as UserRegistrationResponse;
      result.user.createdAt = new Date(result.user.createdAt);
      result.user.updatedAt = new Date(result.user.updatedAt);

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during registration');
    }
  }

  /**
   * Get a user by their ID
   * @param userId The ID of the user to retrieve
   * @returns Promise resolving to the user object
   * @throws Error if user is not found or request fails
   */
  async getUserById(userId: string): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.error || `Failed to get user with status ${response.status}`);
      }

      // Convert date strings to Date objects
      const user = data as User;
      user.createdAt = new Date(user.createdAt);
      user.updatedAt = new Date(user.updatedAt);

      return user;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching user');
    }
  }

  /**
   * Get a user by their email address
   * @param email The email address of the user to retrieve
   * @returns Promise resolving to the user object
   * @throws Error if user is not found or request fails
   */
  async getUserByEmail(email: string): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/users?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.error || `Failed to get user with status ${response.status}`);
      }

      // Convert date strings to Date objects
      const user = data as User;
      user.createdAt = new Date(user.createdAt);
      user.updatedAt = new Date(user.updatedAt);

      return user;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching user');
    }
  }

  /**
   * Validate email format
   * @param email Email to validate
   * @returns true if email is valid, false otherwise
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validate username format
   * @param username Username to validate
   * @returns true if username is valid, false otherwise
   */
  validateUsername(username: string): boolean {
    if (username.length < 3 || username.length > 30) {
      return false;
    }
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    return usernameRegex.test(username);
  }

  /**
   * Validate user registration data
   * @param data Registration data to validate
   * @returns Array of validation error messages (empty if valid)
   */
  validateRegistrationData(data: UserRegistrationRequest): string[] {
    const errors: string[] = [];

    if (!data.email || !this.validateEmail(data.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!data.username || !this.validateUsername(data.username)) {
      errors.push('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens');
    }

    if (!data.firstName || data.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    return errors;
  }
}