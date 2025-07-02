package opendevopslambda

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbiface"
	"github.com/google/uuid"
	"regexp"
	"strings"
	"time"
)

// User represents a user in the system
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	IsActive  bool      `json:"isActive"`
}

// UserRegistrationRequest represents the request payload for user registration
type UserRegistrationRequest struct {
	Email     string `json:"email"`
	Username  string `json:"username"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// UserRegistrationResponse represents the response for user registration
type UserRegistrationResponse struct {
	User    User   `json:"user"`
	Message string `json:"message"`
}

// UserService handles user-related operations
type UserService struct {
	dynamoDB dynamodbiface.DynamoDBAPI
}

// NewUserService creates a new UserService instance
func NewUserService(dynamoDB dynamodbiface.DynamoDBAPI) *UserService {
	return &UserService{
		dynamoDB: dynamoDB,
	}
}

// ValidateEmail validates email format
func (us *UserService) ValidateEmail(email string) error {
	if email == "" {
		return errors.New("email is required")
	}
	
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return errors.New("invalid email format")
	}
	
	return nil
}

// ValidateUsername validates username format
func (us *UserService) ValidateUsername(username string) error {
	if username == "" {
		return errors.New("username is required")
	}
	
	if len(username) < 3 || len(username) > 30 {
		return errors.New("username must be between 3 and 30 characters")
	}
	
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !usernameRegex.MatchString(username) {
		return errors.New("username can only contain letters, numbers, underscores, and hyphens")
	}
	
	return nil
}

// ValidateUserRegistration validates the user registration request
func (us *UserService) ValidateUserRegistration(req UserRegistrationRequest) error {
	if err := us.ValidateEmail(req.Email); err != nil {
		return err
	}
	
	if err := us.ValidateUsername(req.Username); err != nil {
		return err
	}
	
	if strings.TrimSpace(req.FirstName) == "" {
		return errors.New("first name is required")
	}
	
	if strings.TrimSpace(req.LastName) == "" {
		return errors.New("last name is required")
	}
	
	return nil
}

// CheckUserExists checks if a user with the given email or username already exists
func (us *UserService) CheckUserExists(email, username string) (bool, error) {
	// Check by email
	emailInput := &dynamodb.GetItemInput{
		TableName: aws.String("Users"),
		Key: map[string]*dynamodb.AttributeValue{
			"Email": {
				S: aws.String(email),
			},
		},
	}
	
	emailResult, err := us.dynamoDB.GetItem(emailInput)
	if err != nil {
		return false, fmt.Errorf("error checking email existence: %v", err)
	}
	
	if emailResult.Item != nil {
		return true, errors.New("user with this email already exists")
	}
	
	// Check by username using GSI (Global Secondary Index)
	usernameInput := &dynamodb.QueryInput{
		TableName:              aws.String("Users"),
		IndexName:              aws.String("UsernameIndex"),
		KeyConditionExpression: aws.String("Username = :username"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":username": {
				S: aws.String(username),
			},
		},
	}
	
	usernameResult, err := us.dynamoDB.Query(usernameInput)
	if err != nil {
		return false, fmt.Errorf("error checking username existence: %v", err)
	}
	
	if len(usernameResult.Items) > 0 {
		return true, errors.New("user with this username already exists")
	}
	
	return false, nil
}

// CreateUser creates a new user in the database
func (us *UserService) CreateUser(req UserRegistrationRequest) (*User, error) {
	// Validate the request
	if err := us.ValidateUserRegistration(req); err != nil {
		return nil, err
	}
	
	// Check if user already exists
	exists, err := us.CheckUserExists(req.Email, req.Username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, err
	}
	
	// Generate user ID
	userID, err := uuid.NewRandom()
	if err != nil {
		return nil, fmt.Errorf("error generating user ID: %v", err)
	}
	
	now := time.Now()
	user := &User{
		ID:        userID.String(),
		Email:     strings.ToLower(strings.TrimSpace(req.Email)),
		Username:  strings.TrimSpace(req.Username),
		FirstName: strings.TrimSpace(req.FirstName),
		LastName:  strings.TrimSpace(req.LastName),
		CreatedAt: now,
		UpdatedAt: now,
		IsActive:  true,
	}
	
	// Save to DynamoDB
	item := map[string]*dynamodb.AttributeValue{
		"Email": {
			S: aws.String(user.Email),
		},
		"ID": {
			S: aws.String(user.ID),
		},
		"Username": {
			S: aws.String(user.Username),
		},
		"FirstName": {
			S: aws.String(user.FirstName),
		},
		"LastName": {
			S: aws.String(user.LastName),
		},
		"CreatedAt": {
			S: aws.String(user.CreatedAt.Format(time.RFC3339)),
		},
		"UpdatedAt": {
			S: aws.String(user.UpdatedAt.Format(time.RFC3339)),
		},
		"IsActive": {
			BOOL: aws.Bool(user.IsActive),
		},
	}
	
	input := &dynamodb.PutItemInput{
		TableName: aws.String("Users"),
		Item:      item,
		ConditionExpression: aws.String("attribute_not_exists(Email)"),
	}
	
	_, err = us.dynamoDB.PutItem(input)
	if err != nil {
		return nil, fmt.Errorf("error creating user: %v", err)
	}
	
	return user, nil
}

// GetUserByID retrieves a user by their ID
func (us *UserService) GetUserByID(userID string) (*User, error) {
	// Query by ID using GSI
	input := &dynamodb.QueryInput{
		TableName:              aws.String("Users"),
		IndexName:              aws.String("UserIDIndex"),
		KeyConditionExpression: aws.String("ID = :id"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":id": {
				S: aws.String(userID),
			},
		},
	}
	
	result, err := us.dynamoDB.Query(input)
	if err != nil {
		return nil, fmt.Errorf("error retrieving user: %v", err)
	}
	
	if len(result.Items) == 0 {
		return nil, errors.New("user not found")
	}
	
	item := result.Items[0]
	user := &User{}
	
	if item["ID"] != nil && item["ID"].S != nil {
		user.ID = *item["ID"].S
	}
	if item["Email"] != nil && item["Email"].S != nil {
		user.Email = *item["Email"].S
	}
	if item["Username"] != nil && item["Username"].S != nil {
		user.Username = *item["Username"].S
	}
	if item["FirstName"] != nil && item["FirstName"].S != nil {
		user.FirstName = *item["FirstName"].S
	}
	if item["LastName"] != nil && item["LastName"].S != nil {
		user.LastName = *item["LastName"].S
	}
	if item["CreatedAt"] != nil && item["CreatedAt"].S != nil {
		if createdAt, err := time.Parse(time.RFC3339, *item["CreatedAt"].S); err == nil {
			user.CreatedAt = createdAt
		}
	}
	if item["UpdatedAt"] != nil && item["UpdatedAt"].S != nil {
		if updatedAt, err := time.Parse(time.RFC3339, *item["UpdatedAt"].S); err == nil {
			user.UpdatedAt = updatedAt
		}
	}
	if item["IsActive"] != nil && item["IsActive"].BOOL != nil {
		user.IsActive = *item["IsActive"].BOOL
	}
	
	return user, nil
}

// GetUserByEmail retrieves a user by their email
func (us *UserService) GetUserByEmail(email string) (*User, error) {
	input := &dynamodb.GetItemInput{
		TableName: aws.String("Users"),
		Key: map[string]*dynamodb.AttributeValue{
			"Email": {
				S: aws.String(strings.ToLower(strings.TrimSpace(email))),
			},
		},
	}
	
	result, err := us.dynamoDB.GetItem(input)
	if err != nil {
		return nil, fmt.Errorf("error retrieving user: %v", err)
	}
	
	if result.Item == nil {
		return nil, errors.New("user not found")
	}
	
	item := result.Item
	user := &User{}
	
	if item["ID"] != nil && item["ID"].S != nil {
		user.ID = *item["ID"].S
	}
	if item["Email"] != nil && item["Email"].S != nil {
		user.Email = *item["Email"].S
	}
	if item["Username"] != nil && item["Username"].S != nil {
		user.Username = *item["Username"].S
	}
	if item["FirstName"] != nil && item["FirstName"].S != nil {
		user.FirstName = *item["FirstName"].S
	}
	if item["LastName"] != nil && item["LastName"].S != nil {
		user.LastName = *item["LastName"].S
	}
	if item["CreatedAt"] != nil && item["CreatedAt"].S != nil {
		if createdAt, err := time.Parse(time.RFC3339, *item["CreatedAt"].S); err == nil {
			user.CreatedAt = createdAt
		}
	}
	if item["UpdatedAt"] != nil && item["UpdatedAt"].S != nil {
		if updatedAt, err := time.Parse(time.RFC3339, *item["UpdatedAt"].S); err == nil {
			user.UpdatedAt = updatedAt
		}
	}
	if item["IsActive"] != nil && item["IsActive"].BOOL != nil {
		user.IsActive = *item["IsActive"].BOOL
	}
	
	return user, nil
}