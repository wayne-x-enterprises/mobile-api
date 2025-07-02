/**
 * Interface representing a user in the system
 */
export interface User {
  /**
   * Unique identifier for the user
   */
  id: string;

  /**
   * User's email address
   */
  email: string;

  /**
   * User's unique username
   */
  username: string;

  /**
   * User's first name
   */
  firstName: string;

  /**
   * User's last name
   */
  lastName: string;

  /**
   * Timestamp when the user was created
   */
  createdAt: Date;

  /**
   * Timestamp when the user was last updated
   */
  updatedAt: Date;

  /**
   * Whether the user account is active
   */
  isActive: boolean;
}

/**
 * Interface for user registration request data
 */
export interface UserRegistrationRequest {
  /**
   * User's email address
   */
  email: string;

  /**
   * Desired username (3-30 characters, alphanumeric, underscore, hyphen only)
   */
  username: string;

  /**
   * User's first name
   */
  firstName: string;

  /**
   * User's last name
   */
  lastName: string;
}

/**
 * Interface for user registration response
 */
export interface UserRegistrationResponse {
  /**
   * The created user object
   */
  user: User;

  /**
   * Success message
   */
  message: string;
}

/**
 * Interface for API error responses
 */
export interface ApiError {
  /**
   * Error message describing what went wrong
   */
  error: string;
}