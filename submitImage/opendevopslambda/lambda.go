package opendevopslambda

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base32"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambdacontext"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbiface"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3iface"
	"github.com/google/uuid"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Dependency struct {
	DepS3 s3iface.S3API
	DepDynamoDB dynamodbiface.DynamoDBAPI
}

// User represents a user in the system
type User struct {
	ID                string    `json:"id"`
	Email             string    `json:"email"`
	PasswordHash      string    `json:"password_hash"`
	DisplayName       string    `json:"display_name"`
	EmailVerified     bool      `json:"email_verified"`
	TwoFactorEnabled  bool      `json:"two_factor_enabled"`
	CreatedAt         time.Time `json:"created_at"`
	LastLoginAt       *time.Time `json:"last_login_at,omitempty"`
	Status            string    `json:"status"`
	FailedAttempts    int       `json:"failed_attempts"`
	IsLocked          bool      `json:"is_locked"`
	LastLockoutAt     *time.Time `json:"last_lockout_at,omitempty"`
}

// TwoFactorAuth represents 2FA settings for a user
type TwoFactorAuth struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	Enabled          bool      `json:"enabled"`
	SecretKey        string    `json:"secret_key"`
	RecoveryCodes    []string  `json:"recovery_codes"`
	Method           string    `json:"method"`
	PhoneNumber      string    `json:"phone_number,omitempty"`
	BackupEmail      string    `json:"backup_email,omitempty"`
	SetupAt          *time.Time `json:"setup_at,omitempty"`
	LastVerifiedAt   *time.Time `json:"last_verified_at,omitempty"`
}

// AuthenticationAttempt represents a login attempt for auditing
type AuthenticationAttempt struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id,omitempty"`
	Email           string    `json:"email"`
	Type            string    `json:"type"`
	Result          string    `json:"result"`
	FailureReason   string    `json:"failure_reason,omitempty"`
	AttemptedAt     time.Time `json:"attempted_at"`
	IPAddress       string    `json:"ip_address"`
	UserAgent       string    `json:"user_agent"`
	SessionID       string    `json:"session_id,omitempty"`
	RiskScore       int       `json:"risk_score"`
	Suspicious      bool      `json:"suspicious"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email          string `json:"email"`
	Password       string `json:"password"`
	TwoFactorCode  string `json:"two_factor_code,omitempty"`
	RememberDevice bool   `json:"remember_device,omitempty"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	Success      bool   `json:"success"`
	SessionID    string `json:"session_id,omitempty"`
	UserID       string `json:"user_id,omitempty"`
	Requires2FA  bool   `json:"requires_2fa,omitempty"`
	Error        string `json:"error,omitempty"`
}

var bucketRootName = "open-devops-images"

func (d *Dependency) processRequest(imageUrl string, region string, aws_account_id string) (string, error) {
	response, err := http.Get(imageUrl)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	if response.StatusCode != 200 {
		return "", errors.New(fmt.Sprintf("response.StatusCode %d != 200\n", response.StatusCode))
	}

	data, err := io.ReadAll(response.Body)
	if err != nil {
		return "", err
	}

	bucketName := fmt.Sprintf("%s-%s-%s", bucketRootName, region, aws_account_id)

	imageUuid, uuidErr := uuid.NewRandom()
	if uuidErr != nil {
		return "", uuidErr
	}

	s3Input := &s3.PutObjectInput{
		Body:   bytes.NewReader(data),
		Bucket: aws.String(bucketName),
		Key:    aws.String(imageUuid.String()),
	}

	_, s3err := d.DepS3.PutObject(s3Input)
	if s3err != nil {
		return "", s3err
	}

	dynamoInput := &dynamodb.PutItemInput{
		Item: map[string]*dynamodb.AttributeValue{
			"Id": {
				S: aws.String(imageUuid.String()),
			},
			"Label": {
				S: aws.String("NOT_CLASSIFIED"),
			},
		},
		TableName: aws.String("ImageLabels"),
	}

	_, dynamoErr := d.DepDynamoDB.PutItem(dynamoInput)
	if dynamoErr != nil {
		return "", dynamoErr
	}

	return imageUuid.String(), nil
}

func isValidExtension(urlVal string) bool {
	validExtensions := []string{"jpeg", "jpg", "bmp", "png", "tiff", "gif", "tif"}

	urlSlice := strings.Split(urlVal, "/")
	fileName := urlSlice[len(urlSlice)-1]
	fileNameSlice := strings.Split(fileName, ".")
	fileExtension := fileNameSlice[len(fileNameSlice)-1]

	for _, ext := range validExtensions {
		if fileExtension == ext {
			return true
		}
	}
	return false
}

func (d *Dependency) Handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	lc, _ := lambdacontext.FromContext(ctx)
	region := strings.Split(lc.InvokedFunctionArn, ":")[3]
	aws_account_id := strings.Split(lc.InvokedFunctionArn, ":")[4]

	// Handle different endpoints
	path := request.Path
	method := request.HTTPMethod

	// Set CORS headers
	headers := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
		"Content-Type":                 "application/json",
	}

	// Handle preflight requests
	if method == "OPTIONS" {
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers:    headers,
			Body:       "",
		}, nil
	}

	// Route requests
	switch {
	case path == "/auth/login" && method == "POST":
		return d.handleLogin(ctx, request, headers)
	case path == "/auth/2fa/setup" && method == "POST":
		return d.handle2FASetup(ctx, request, headers)
	case path == "/auth/2fa/verify" && method == "POST":
		return d.handle2FAVerify(ctx, request, headers)
	case path == "/auth/logout" && method == "POST":
		return d.handleLogout(ctx, request, headers)
	case strings.HasPrefix(path, "/bootstrap"):
		// Legacy image processing endpoint
		return d.handleImageProcessing(ctx, request, region, aws_account_id, headers)
	default:
		return events.APIGatewayProxyResponse{
			StatusCode: 404,
			Headers:    headers,
			Body:       `{"error":"endpoint not found"}`,
		}, nil
	}
}

func (d *Dependency) handleImageProcessing(ctx context.Context, request events.APIGatewayProxyRequest, region, aws_account_id string, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	urlParam, found := request.QueryStringParameters["url"]
	if found {
		urlVal, err := url.QueryUnescape(urlParam)
		if err != nil {
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Headers:    headers,
				Body:       `{"ImageId":"error"}`,
			}, err
		}

		if !isValidExtension(urlVal) {
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Headers:    headers,
				Body:       `{"ImageId":"error"}`,
			}, errors.New("file extension is not valid")
		}

		processString, processErr := d.processRequest(urlVal, region, aws_account_id)
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers:    headers,
			Body:       fmt.Sprintf(`{"ImageId":"%s"}`, processString),
		}, processErr
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 500,
		Headers:    headers,
		Body:       `{"ImageId":"error"}`,
	}, errors.New("url parameter not found")
}

// Authentication handlers
func (d *Dependency) handleLogin(ctx context.Context, request events.APIGatewayProxyRequest, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	var loginReq LoginRequest
	if err := json.Unmarshal([]byte(request.Body), &loginReq); err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       `{"error":"invalid request body"}`,
		}, nil
	}

	// Get client IP and User Agent
	clientIP := getClientIP(request)
	userAgent := getUserAgent(request)

	// Log authentication attempt
	attemptID := generateUUID()
	attempt := AuthenticationAttempt{
		ID:          attemptID,
		Email:       loginReq.Email,
		Type:        "login",
		AttemptedAt: time.Now(),
		IPAddress:   clientIP,
		UserAgent:   userAgent,
	}

	// Get user from DynamoDB
	user, err := d.getUserByEmail(loginReq.Email)
	if err != nil {
		attempt.Result = "failure"
		attempt.FailureReason = "invalid_credentials"
		d.logAuthenticationAttempt(attempt)
		
		return events.APIGatewayProxyResponse{
			StatusCode: 401,
			Headers:    headers,
			Body:       `{"success":false,"error":"invalid credentials"}`,
		}, nil
	}

	// Check if account is locked
	if user.IsLocked {
		attempt.Result = "blocked"
		attempt.FailureReason = "account_locked"
		attempt.UserID = user.ID
		d.logAuthenticationAttempt(attempt)
		
		return events.APIGatewayProxyResponse{
			StatusCode: 423,
			Headers:    headers,
			Body:       `{"success":false,"error":"account is locked"}`,
		}, nil
	}

	// Verify password (simplified - in production use proper password hashing)
	if !verifyPassword(loginReq.Password, user.PasswordHash) {
		user.FailedAttempts++
		if user.FailedAttempts >= 5 {
			user.IsLocked = true
			now := time.Now()
			user.LastLockoutAt = &now
		}
		d.updateUser(user)

		attempt.Result = "failure"
		attempt.FailureReason = "invalid_credentials"
		attempt.UserID = user.ID
		d.logAuthenticationAttempt(attempt)
		
		return events.APIGatewayProxyResponse{
			StatusCode: 401,
			Headers:    headers,
			Body:       `{"success":false,"error":"invalid credentials"}`,
		}, nil
	}

	// Check if 2FA is required
	if user.TwoFactorEnabled {
		if loginReq.TwoFactorCode == "" {
			return events.APIGatewayProxyResponse{
				StatusCode: 200,
				Headers:    headers,
				Body:       `{"success":false,"requires_2fa":true}`,
			}, nil
		}

		// Verify 2FA code
		valid, err := d.verify2FACode(user.ID, loginReq.TwoFactorCode)
		if err != nil || !valid {
			attempt.Result = "failure"
			attempt.FailureReason = "invalid_2fa"
			attempt.UserID = user.ID
			d.logAuthenticationAttempt(attempt)
			
			return events.APIGatewayProxyResponse{
				StatusCode: 401,
				Headers:    headers,
				Body:       `{"success":false,"error":"invalid two-factor code"}`,
			}, nil
		}
	}

	// Successful login
	sessionID := generateUUID()
	now := time.Now()
	user.LastLoginAt = &now
	user.FailedAttempts = 0
	d.updateUser(user)

	attempt.Result = "success"
	attempt.UserID = user.ID
	attempt.SessionID = sessionID
	d.logAuthenticationAttempt(attempt)

	response := LoginResponse{
		Success:   true,
		SessionID: sessionID,
		UserID:    user.ID,
	}

	responseBody, _ := json.Marshal(response)
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       string(responseBody),
	}, nil
}

func (d *Dependency) handle2FASetup(ctx context.Context, request events.APIGatewayProxyRequest, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	// Extract user ID from authorization header or session
	userID := extractUserIDFromAuth(request)
	if userID == "" {
		return events.APIGatewayProxyResponse{
			StatusCode: 401,
			Headers:    headers,
			Body:       `{"error":"unauthorized"}`,
		}, nil
	}

	// Generate secret key for TOTP
	secretKey := generateTOTPSecret()
	
	// Generate recovery codes
	recoveryCodes := generateRecoveryCodes()

	// Store 2FA settings in DynamoDB
	twoFA := TwoFactorAuth{
		ID:            generateUUID(),
		UserID:        userID,
		Enabled:       false, // Will be enabled after verification
		SecretKey:     secretKey,
		RecoveryCodes: recoveryCodes,
		Method:        "totp",
	}

	err := d.store2FASettings(twoFA)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       `{"error":"failed to setup 2FA"}`,
		}, nil
	}

	// Generate QR code URL
	qrCodeURL := generateQRCodeURL(userID, secretKey)

	response := map[string]interface{}{
		"secret_key":      secretKey,
		"qr_code_url":     qrCodeURL,
		"recovery_codes":  recoveryCodes,
	}

	responseBody, _ := json.Marshal(response)
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       string(responseBody),
	}, nil
}

func (d *Dependency) handle2FAVerify(ctx context.Context, request events.APIGatewayProxyRequest, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	var verifyReq struct {
		UserID string `json:"user_id"`
		Code   string `json:"code"`
	}

	if err := json.Unmarshal([]byte(request.Body), &verifyReq); err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       `{"error":"invalid request body"}`,
		}, nil
	}

	valid, err := d.verify2FACode(verifyReq.UserID, verifyReq.Code)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       `{"error":"verification failed"}`,
		}, nil
	}

	if valid {
		// Enable 2FA for the user
		err = d.enable2FA(verifyReq.UserID)
		if err != nil {
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Headers:    headers,
				Body:       `{"error":"failed to enable 2FA"}`,
			}, nil
		}
	}

	response := map[string]bool{"valid": valid}
	responseBody, _ := json.Marshal(response)
	
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       string(responseBody),
	}, nil
}

func (d *Dependency) handleLogout(ctx context.Context, request events.APIGatewayProxyRequest, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	// In a real implementation, you would invalidate the session
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       `{"success":true}`,
	}, nil
}

// Utility functions
func getClientIP(request events.APIGatewayProxyRequest) string {
	if ip := request.Headers["X-Forwarded-For"]; ip != "" {
		return strings.Split(ip, ",")[0]
	}
	if ip := request.Headers["X-Real-IP"]; ip != "" {
		return ip
	}
	return request.RequestContext.Identity.SourceIP
}

func getUserAgent(request events.APIGatewayProxyRequest) string {
	return request.Headers["User-Agent"]
}

func extractUserIDFromAuth(request events.APIGatewayProxyRequest) string {
	// In a real implementation, you would extract this from JWT token or session
	auth := request.Headers["Authorization"]
	if auth == "" {
		return ""
	}
	// Simplified - in production, decode JWT token
	return "user_123" // Placeholder
}

func generateUUID() string {
	id, _ := uuid.NewRandom()
	return id.String()
}

func verifyPassword(password, hash string) bool {
	// Simplified password verification - in production use bcrypt
	return password == hash // This is NOT secure - just for demo
}

func generateTOTPSecret() string {
	// Generate a 32-character base32 secret
	secret := make([]byte, 20)
	for i := range secret {
		secret[i] = byte(time.Now().UnixNano() % 256)
	}
	return base32.StdEncoding.EncodeToString(secret)
}

func generateRecoveryCodes() []string {
	codes := make([]string, 10)
	for i := range codes {
		codes[i] = fmt.Sprintf("%08d", time.Now().UnixNano()%100000000)
	}
	return codes
}

func generateQRCodeURL(userID, secret string) string {
	issuer := "SignatureApp"
	accountName := fmt.Sprintf("%s:%s", issuer, userID)
	return fmt.Sprintf("otpauth://totp/%s?secret=%s&issuer=%s", 
		url.QueryEscape(accountName), secret, url.QueryEscape(issuer))
}

func generateTOTPCode(secret string, timeStep int64) string {
	// Simplified TOTP implementation
	key, _ := base32.StdEncoding.DecodeString(secret)
	
	// Convert time step to byte array
	timeBytes := make([]byte, 8)
	for i := 7; i >= 0; i-- {
		timeBytes[i] = byte(timeStep & 0xff)
		timeStep >>= 8
	}
	
	// HMAC-SHA256
	h := hmac.New(sha256.New, key)
	h.Write(timeBytes)
	hash := h.Sum(nil)
	
	// Dynamic truncation
	offset := hash[len(hash)-1] & 0x0f
	code := ((int(hash[offset]) & 0x7f) << 24) |
		((int(hash[offset+1]) & 0xff) << 16) |
		((int(hash[offset+2]) & 0xff) << 8) |
		(int(hash[offset+3]) & 0xff)
	
	code = code % 1000000
	return fmt.Sprintf("%06d", code)
}

// Database operations (simplified - in production use proper DynamoDB operations)
func (d *Dependency) getUserByEmail(email string) (*User, error) {
	// Simplified - in production, query DynamoDB
	input := &dynamodb.GetItemInput{
		TableName: aws.String("Users"),
		Key: map[string]*dynamodb.AttributeValue{
			"email": {
				S: aws.String(email),
			},
		},
	}
	
	result, err := d.DepDynamoDB.GetItem(input)
	if err != nil {
		return nil, err
	}
	
	if result.Item == nil {
		return nil, errors.New("user not found")
	}
	
	// Parse user from DynamoDB item (simplified)
	user := &User{
		ID:               *result.Item["id"].S,
		Email:            *result.Item["email"].S,
		PasswordHash:     *result.Item["password_hash"].S,
		DisplayName:      *result.Item["display_name"].S,
		TwoFactorEnabled: *result.Item["two_factor_enabled"].BOOL,
		Status:           *result.Item["status"].S,
	}
	
	if result.Item["failed_attempts"] != nil {
		failedAttempts, _ := strconv.Atoi(*result.Item["failed_attempts"].N)
		user.FailedAttempts = failedAttempts
	}
	
	if result.Item["is_locked"] != nil {
		user.IsLocked = *result.Item["is_locked"].BOOL
	}
	
	return user, nil
}

func (d *Dependency) updateUser(user *User) error {
	// Simplified - in production, use proper DynamoDB update
	input := &dynamodb.PutItemInput{
		TableName: aws.String("Users"),
		Item: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(user.ID),
			},
			"email": {
				S: aws.String(user.Email),
			},
			"password_hash": {
				S: aws.String(user.PasswordHash),
			},
			"display_name": {
				S: aws.String(user.DisplayName),
			},
			"two_factor_enabled": {
				BOOL: aws.Bool(user.TwoFactorEnabled),
			},
			"status": {
				S: aws.String(user.Status),
			},
			"failed_attempts": {
				N: aws.String(strconv.Itoa(user.FailedAttempts)),
			},
			"is_locked": {
				BOOL: aws.Bool(user.IsLocked),
			},
		},
	}
	
	_, err := d.DepDynamoDB.PutItem(input)
	return err
}

func (d *Dependency) store2FASettings(twoFA TwoFactorAuth) error {
	// Store 2FA settings in DynamoDB
	input := &dynamodb.PutItemInput{
		TableName: aws.String("TwoFactorAuth"),
		Item: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(twoFA.ID),
			},
			"user_id": {
				S: aws.String(twoFA.UserID),
			},
			"enabled": {
				BOOL: aws.Bool(twoFA.Enabled),
			},
			"secret_key": {
				S: aws.String(twoFA.SecretKey),
			},
			"method": {
				S: aws.String(twoFA.Method),
			},
		},
	}
	
	_, err := d.DepDynamoDB.PutItem(input)
	return err
}

func (d *Dependency) verify2FACode(userID, code string) (bool, error) {
	// Get 2FA settings for user
	input := &dynamodb.GetItemInput{
		TableName: aws.String("TwoFactorAuth"),
		Key: map[string]*dynamodb.AttributeValue{
			"user_id": {
				S: aws.String(userID),
			},
		},
	}
	
	result, err := d.DepDynamoDB.GetItem(input)
	if err != nil {
		return false, err
	}
	
	if result.Item == nil {
		return false, errors.New("2FA not configured")
	}
	
	secretKey := *result.Item["secret_key"].S
	
	// Verify TOTP code
	currentTime := time.Now().Unix() / 30 // 30-second window
	
	// Check current time and ±1 window for clock skew
	for i := -1; i <= 1; i++ {
		expectedCode := generateTOTPCode(secretKey, currentTime+int64(i))
		if code == expectedCode {
			return true, nil
		}
	}
	
	// Check if it's a recovery code
	// In production, you would check against stored recovery codes
	
	return false, nil
}

func (d *Dependency) enable2FA(userID string) error {
	// Update 2FA settings to enabled
	input := &dynamodb.UpdateItemInput{
		TableName: aws.String("TwoFactorAuth"),
		Key: map[string]*dynamodb.AttributeValue{
			"user_id": {
				S: aws.String(userID),
			},
		},
		UpdateExpression: aws.String("SET enabled = :enabled, setup_at = :setup_at"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":enabled": {
				BOOL: aws.Bool(true),
			},
			":setup_at": {
				S: aws.String(time.Now().Format(time.RFC3339)),
			},
		},
	}
	
	_, err := d.DepDynamoDB.UpdateItem(input)
	if err != nil {
		return err
	}
	
	// Also update user record
	userInput := &dynamodb.UpdateItemInput{
		TableName: aws.String("Users"),
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(userID),
			},
		},
		UpdateExpression: aws.String("SET two_factor_enabled = :enabled"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":enabled": {
				BOOL: aws.Bool(true),
			},
		},
	}
	
	_, err = d.DepDynamoDB.UpdateItem(userInput)
	return err
}

func (d *Dependency) logAuthenticationAttempt(attempt AuthenticationAttempt) error {
	// Log authentication attempt to DynamoDB for security auditing
	input := &dynamodb.PutItemInput{
		TableName: aws.String("AuthenticationAttempts"),
		Item: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(attempt.ID),
			},
			"email": {
				S: aws.String(attempt.Email),
			},
			"type": {
				S: aws.String(attempt.Type),
			},
			"result": {
				S: aws.String(attempt.Result),
			},
			"attempted_at": {
				S: aws.String(attempt.AttemptedAt.Format(time.RFC3339)),
			},
			"ip_address": {
				S: aws.String(attempt.IPAddress),
			},
			"user_agent": {
				S: aws.String(attempt.UserAgent),
			},
		},
	}
	
	if attempt.UserID != "" {
		input.Item["user_id"] = &dynamodb.AttributeValue{S: aws.String(attempt.UserID)}
	}
	
	if attempt.FailureReason != "" {
		input.Item["failure_reason"] = &dynamodb.AttributeValue{S: aws.String(attempt.FailureReason)}
	}
	
	if attempt.SessionID != "" {
		input.Item["session_id"] = &dynamodb.AttributeValue{S: aws.String(attempt.SessionID)}
	}
	
	_, err := d.DepDynamoDB.PutItem(input)
	return err
}
