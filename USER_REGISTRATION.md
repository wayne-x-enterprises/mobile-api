# User Registration Backend Logic

This document describes the user registration functionality implemented in the backend.

## Overview

The user registration system provides RESTful API endpoints for:
- Registering new users
- Retrieving user information by ID or email
- Validating user input data

## Architecture

### Backend Components

1. **User Model (`user.go`)**
   - `User` struct: Represents a user in the system
   - `UserRegistrationRequest` struct: Request payload for registration
   - `UserRegistrationResponse` struct: Response payload for registration

2. **User Service (`user.go`)**
   - `UserService` struct: Handles user-related operations
   - Validation methods for email and username
   - CRUD operations for users in DynamoDB

3. **Lambda Handler (`lambda.go`)**
   - Extended to handle user registration endpoints
   - Route-based request handling
   - CORS support for web applications

### Frontend Components

1. **User Model (`src/models/User.ts`)**
   - TypeScript interfaces matching backend models
   - Type safety for user data

2. **User Service (`src/services/UserService.ts`)**
   - Frontend service for API communication
   - Client-side validation
   - Error handling

## API Endpoints

### POST /users
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z",
    "isActive": true
  },
  "message": "User registered successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `409 Conflict`: User already exists

### GET /users/{userId}
Retrieve a user by their ID.

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z",
  "isActive": true
}
```

### GET /users?email={email}
Retrieve a user by their email address.

**Query Parameters:**
- `email`: Email address of the user

**Response:** Same as GET /users/{userId}

## Database Schema

### Users Table (DynamoDB)

**Primary Key:** `Email` (String)

**Attributes:**
- `Email` (String) - Primary key
- `ID` (String) - Unique user identifier
- `Username` (String) - Unique username
- `FirstName` (String) - User's first name
- `LastName` (String) - User's last name
- `CreatedAt` (String) - ISO 8601 timestamp
- `UpdatedAt` (String) - ISO 8601 timestamp
- `IsActive` (Boolean) - Account status

**Global Secondary Indexes:**
- `UsernameIndex`: Index on `Username` for username lookups
- `UserIDIndex`: Index on `ID` for ID-based lookups

## Validation Rules

### Email
- Must be a valid email format
- Required field
- Converted to lowercase for storage

### Username
- 3-30 characters in length
- Only alphanumeric characters, underscores, and hyphens allowed
- Must be unique across all users
- Required field

### First Name & Last Name
- Required fields
- Cannot be empty or whitespace only

## Error Handling

The system provides comprehensive error handling:

1. **Validation Errors (400 Bad Request)**
   - Invalid email format
   - Invalid username format
   - Missing required fields

2. **Conflict Errors (409 Conflict)**
   - Email already exists
   - Username already exists

3. **Server Errors (500 Internal Server Error)**
   - Database connection issues
   - Unexpected system errors

## Security Considerations

1. **Input Validation**: All user inputs are validated both client-side and server-side
2. **Data Sanitization**: Email addresses are normalized to lowercase
3. **Unique Constraints**: Email and username uniqueness is enforced
4. **CORS Support**: Proper CORS headers for web application integration

## Testing

The implementation includes comprehensive unit tests:

- **Validation Tests**: Email and username format validation
- **Registration Tests**: User creation with various scenarios
- **Error Handling Tests**: Duplicate user detection and error responses
- **Database Tests**: Mock DynamoDB operations

Run tests with:
```bash
cd submitImage
go test ./opendevopslambda -v
```

## Integration with Existing System

The user registration system integrates seamlessly with the existing image submission functionality:

1. **Shared Lambda Function**: Both user registration and image submission use the same Lambda handler
2. **Route-Based Handling**: Requests are routed based on path and HTTP method
3. **Consistent Error Format**: All endpoints use the same error response format
4. **CORS Support**: All endpoints support CORS for frontend integration

## Future Enhancements

Potential improvements for the user registration system:

1. **Password Authentication**: Add password hashing and authentication
2. **Email Verification**: Implement email verification workflow
3. **User Profile Updates**: Add endpoints for updating user information
4. **User Deactivation**: Add soft delete functionality
5. **Rate Limiting**: Implement registration rate limiting
6. **Audit Logging**: Add user activity logging

## Usage Examples

### Frontend Registration Form

```typescript
import { UserService } from './services/UserService';

const userService = new UserService();

async function registerUser(formData: UserRegistrationRequest) {
  try {
    const response = await userService.registerUser(formData);
    console.log('User registered:', response.user);
  } catch (error) {
    console.error('Registration failed:', error.message);
  }
}
```

### Backend Lambda Deployment

The user registration functionality is automatically deployed with the existing Lambda function. No additional infrastructure changes are required.