package opendevopslambda

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbiface"
)

// MockDynamoDBAPI is a mock implementation of DynamoDB API for testing
type MockDynamoDBAPI struct {
	dynamodbiface.DynamoDBAPI
	GetItemFunc    func(*dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error)
	PutItemFunc    func(*dynamodb.PutItemInput) (*dynamodb.PutItemOutput, error)
	QueryFunc      func(*dynamodb.QueryInput) (*dynamodb.QueryOutput, error)
}

func (m *MockDynamoDBAPI) GetItem(input *dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error) {
	if m.GetItemFunc != nil {
		return m.GetItemFunc(input)
	}
	return &dynamodb.GetItemOutput{}, nil
}

func (m *MockDynamoDBAPI) PutItem(input *dynamodb.PutItemInput) (*dynamodb.PutItemOutput, error) {
	if m.PutItemFunc != nil {
		return m.PutItemFunc(input)
	}
	return &dynamodb.PutItemOutput{}, nil
}

func (m *MockDynamoDBAPI) Query(input *dynamodb.QueryInput) (*dynamodb.QueryOutput, error) {
	if m.QueryFunc != nil {
		return m.QueryFunc(input)
	}
	return &dynamodb.QueryOutput{}, nil
}

func TestValidateEmail(t *testing.T) {
	userService := NewUserService(&MockDynamoDBAPI{})

	tests := []struct {
		name    string
		email   string
		wantErr bool
	}{
		{"Valid email", "test@example.com", false},
		{"Valid email with subdomain", "user@mail.example.com", false},
		{"Valid email with numbers", "user123@example.org", false},
		{"Empty email", "", true},
		{"Invalid format - no @", "testexample.com", true},
		{"Invalid format - no domain", "test@", true},
		{"Invalid format - no TLD", "test@example", true},
		{"Invalid format - spaces", "test @example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := userService.ValidateEmail(tt.email)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateUsername(t *testing.T) {
	userService := NewUserService(&MockDynamoDBAPI{})

	tests := []struct {
		name     string
		username string
		wantErr  bool
	}{
		{"Valid username", "testuser", false},
		{"Valid username with numbers", "user123", false},
		{"Valid username with underscore", "test_user", false},
		{"Valid username with hyphen", "test-user", false},
		{"Empty username", "", true},
		{"Too short username", "ab", true},
		{"Too long username", "this_is_a_very_long_username_that_exceeds_thirty_characters", true},
		{"Invalid characters - space", "test user", true},
		{"Invalid characters - special chars", "test@user", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := userService.ValidateUsername(tt.username)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateUsername() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateUserRegistration(t *testing.T) {
	userService := NewUserService(&MockDynamoDBAPI{})

	tests := []struct {
		name    string
		req     UserRegistrationRequest
		wantErr bool
	}{
		{
			"Valid registration",
			UserRegistrationRequest{
				Email:     "test@example.com",
				Username:  "testuser",
				FirstName: "Test",
				LastName:  "User",
			},
			false,
		},
		{
			"Invalid email",
			UserRegistrationRequest{
				Email:     "invalid-email",
				Username:  "testuser",
				FirstName: "Test",
				LastName:  "User",
			},
			true,
		},
		{
			"Invalid username",
			UserRegistrationRequest{
				Email:     "test@example.com",
				Username:  "ab",
				FirstName: "Test",
				LastName:  "User",
			},
			true,
		},
		{
			"Empty first name",
			UserRegistrationRequest{
				Email:     "test@example.com",
				Username:  "testuser",
				FirstName: "",
				LastName:  "User",
			},
			true,
		},
		{
			"Empty last name",
			UserRegistrationRequest{
				Email:     "test@example.com",
				Username:  "testuser",
				FirstName: "Test",
				LastName:  "",
			},
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := userService.ValidateUserRegistration(tt.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateUserRegistration() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestCreateUser(t *testing.T) {
	tests := []struct {
		name           string
		req            UserRegistrationRequest
		mockGetItem    func(*dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error)
		mockQuery      func(*dynamodb.QueryInput) (*dynamodb.QueryOutput, error)
		mockPutItem    func(*dynamodb.PutItemInput) (*dynamodb.PutItemOutput, error)
		wantErr        bool
		expectedErrMsg string
	}{
		{
			name: "Successful user creation",
			req: UserRegistrationRequest{
				Email:     "test@example.com",
				Username:  "testuser",
				FirstName: "Test",
				LastName:  "User",
			},
			mockGetItem: func(input *dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error) {
				return &dynamodb.GetItemOutput{Item: nil}, nil
			},
			mockQuery: func(input *dynamodb.QueryInput) (*dynamodb.QueryOutput, error) {
				return &dynamodb.QueryOutput{Items: []map[string]*dynamodb.AttributeValue{}}, nil
			},
			mockPutItem: func(input *dynamodb.PutItemInput) (*dynamodb.PutItemOutput, error) {
				return &dynamodb.PutItemOutput{}, nil
			},
			wantErr: false,
		},
		{
			name: "Email already exists",
			req: UserRegistrationRequest{
				Email:     "existing@example.com",
				Username:  "testuser",
				FirstName: "Test",
				LastName:  "User",
			},
			mockGetItem: func(input *dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error) {
				return &dynamodb.GetItemOutput{
					Item: map[string]*dynamodb.AttributeValue{
						"Email": {S: aws.String("existing@example.com")},
					},
				}, nil
			},
			mockQuery: func(input *dynamodb.QueryInput) (*dynamodb.QueryOutput, error) {
				return &dynamodb.QueryOutput{Items: []map[string]*dynamodb.AttributeValue{}}, nil
			},
			wantErr:        true,
			expectedErrMsg: "user with this email already exists",
		},
		{
			name: "Username already exists",
			req: UserRegistrationRequest{
				Email:     "test@example.com",
				Username:  "existinguser",
				FirstName: "Test",
				LastName:  "User",
			},
			mockGetItem: func(input *dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error) {
				return &dynamodb.GetItemOutput{Item: nil}, nil
			},
			mockQuery: func(input *dynamodb.QueryInput) (*dynamodb.QueryOutput, error) {
				return &dynamodb.QueryOutput{
					Items: []map[string]*dynamodb.AttributeValue{
						{
							"Username": {S: aws.String("existinguser")},
						},
					},
				}, nil
			},
			wantErr:        true,
			expectedErrMsg: "user with this username already exists",
		},
		{
			name: "Invalid email format",
			req: UserRegistrationRequest{
				Email:     "invalid-email",
				Username:  "testuser",
				FirstName: "Test",
				LastName:  "User",
			},
			wantErr:        true,
			expectedErrMsg: "invalid email format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockDB := &MockDynamoDBAPI{
				GetItemFunc: tt.mockGetItem,
				QueryFunc:   tt.mockQuery,
				PutItemFunc: tt.mockPutItem,
			}

			userService := NewUserService(mockDB)
			user, err := userService.CreateUser(tt.req)

			if tt.wantErr {
				if err == nil {
					t.Errorf("CreateUser() expected error but got none")
					return
				}
				if tt.expectedErrMsg != "" && err.Error() != tt.expectedErrMsg {
					t.Errorf("CreateUser() error = %v, expectedErrMsg %v", err.Error(), tt.expectedErrMsg)
				}
				return
			}

			if err != nil {
				t.Errorf("CreateUser() unexpected error = %v", err)
				return
			}

			if user == nil {
				t.Errorf("CreateUser() returned nil user")
				return
			}

			// Validate user fields
			if user.Email != strings.ToLower(tt.req.Email) {
				t.Errorf("CreateUser() user.Email = %v, want %v", user.Email, strings.ToLower(tt.req.Email))
			}
			if user.Username != tt.req.Username {
				t.Errorf("CreateUser() user.Username = %v, want %v", user.Username, tt.req.Username)
			}
			if user.FirstName != tt.req.FirstName {
				t.Errorf("CreateUser() user.FirstName = %v, want %v", user.FirstName, tt.req.FirstName)
			}
			if user.LastName != tt.req.LastName {
				t.Errorf("CreateUser() user.LastName = %v, want %v", user.LastName, tt.req.LastName)
			}
			if !user.IsActive {
				t.Errorf("CreateUser() user.IsActive = %v, want %v", user.IsActive, true)
			}
			if user.ID == "" {
				t.Errorf("CreateUser() user.ID is empty")
			}
		})
	}
}

func TestGetUserByEmail(t *testing.T) {
	tests := []struct {
		name        string
		email       string
		mockGetItem func(*dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error)
		wantErr     bool
		wantUser    bool
	}{
		{
			name:  "User found",
			email: "test@example.com",
			mockGetItem: func(input *dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error) {
				return &dynamodb.GetItemOutput{
					Item: map[string]*dynamodb.AttributeValue{
						"ID":        {S: aws.String("user-123")},
						"Email":     {S: aws.String("test@example.com")},
						"Username":  {S: aws.String("testuser")},
						"FirstName": {S: aws.String("Test")},
						"LastName":  {S: aws.String("User")},
						"CreatedAt": {S: aws.String(time.Now().Format(time.RFC3339))},
						"UpdatedAt": {S: aws.String(time.Now().Format(time.RFC3339))},
						"IsActive":  {BOOL: aws.Bool(true)},
					},
				}, nil
			},
			wantErr:  false,
			wantUser: true,
		},
		{
			name:  "User not found",
			email: "notfound@example.com",
			mockGetItem: func(input *dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error) {
				return &dynamodb.GetItemOutput{Item: nil}, nil
			},
			wantErr:  true,
			wantUser: false,
		},
		{
			name:  "DynamoDB error",
			email: "test@example.com",
			mockGetItem: func(input *dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error) {
				return nil, errors.New("DynamoDB error")
			},
			wantErr:  true,
			wantUser: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockDB := &MockDynamoDBAPI{
				GetItemFunc: tt.mockGetItem,
			}

			userService := NewUserService(mockDB)
			user, err := userService.GetUserByEmail(tt.email)

			if tt.wantErr {
				if err == nil {
					t.Errorf("GetUserByEmail() expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("GetUserByEmail() unexpected error = %v", err)
				return
			}

			if tt.wantUser {
				if user == nil {
					t.Errorf("GetUserByEmail() returned nil user")
					return
				}
				if user.Email != tt.email {
					t.Errorf("GetUserByEmail() user.Email = %v, want %v", user.Email, tt.email)
				}
			}
		})
	}
}