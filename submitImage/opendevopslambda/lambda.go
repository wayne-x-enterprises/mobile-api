package opendevopslambda

import (
	"bytes"
	"context"
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
	"strings"
)

type Dependency struct {
	DepS3 s3iface.S3API
	DepDynamoDB dynamodbiface.DynamoDBAPI
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
	// Set CORS headers
	headers := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
		"Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
		"Content-Type":                 "application/json",
	}

	// Handle CORS preflight requests
	if request.HTTPMethod == "OPTIONS" {
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers:    headers,
			Body:       "",
		}, nil
	}

	// Route based on path and method
	switch {
	case request.Path == "/users" && request.HTTPMethod == "POST":
		return d.handleUserRegistration(request, headers)
	case strings.HasPrefix(request.Path, "/users/") && request.HTTPMethod == "GET":
		return d.handleGetUser(request, headers)
	case request.Path == "/submit-image" || request.Path == "/" || request.Path == "":
		return d.handleImageSubmission(ctx, request, headers)
	default:
		return events.APIGatewayProxyResponse{
			StatusCode: 404,
			Headers:    headers,
			Body:       `{"error":"endpoint not found"}`,
		}, nil
	}
}

// handleUserRegistration handles POST /users for user registration
func (d *Dependency) handleUserRegistration(request events.APIGatewayProxyRequest, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	userService := NewUserService(d.DepDynamoDB)
	
	var registrationReq UserRegistrationRequest
	if err := json.Unmarshal([]byte(request.Body), &registrationReq); err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       `{"error":"invalid JSON format"}`,
		}, nil
	}

	user, err := userService.CreateUser(registrationReq)
	if err != nil {
		statusCode := 400
		if strings.Contains(err.Error(), "already exists") {
			statusCode = 409
		}
		
		errorResponse := map[string]string{"error": err.Error()}
		errorJSON, _ := json.Marshal(errorResponse)
		
		return events.APIGatewayProxyResponse{
			StatusCode: statusCode,
			Headers:    headers,
			Body:       string(errorJSON),
		}, nil
	}

	response := UserRegistrationResponse{
		User:    *user,
		Message: "User registered successfully",
	}
	
	responseJSON, err := json.Marshal(response)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       `{"error":"internal server error"}`,
		}, nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 201,
		Headers:    headers,
		Body:       string(responseJSON),
	}, nil
}

// handleGetUser handles GET /users/{id} or /users?email={email}
func (d *Dependency) handleGetUser(request events.APIGatewayProxyRequest, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	userService := NewUserService(d.DepDynamoDB)
	
	// Extract user ID from path
	pathParts := strings.Split(strings.Trim(request.Path, "/"), "/")
	if len(pathParts) < 2 {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    headers,
			Body:       `{"error":"user ID is required"}`,
		}, nil
	}
	
	userID := pathParts[1]
	
	// Check if it's an email query instead
	if email, found := request.QueryStringParameters["email"]; found {
		user, err := userService.GetUserByEmail(email)
		if err != nil {
			statusCode := 404
			if strings.Contains(err.Error(), "not found") {
				statusCode = 404
			} else {
				statusCode = 500
			}
			
			errorResponse := map[string]string{"error": err.Error()}
			errorJSON, _ := json.Marshal(errorResponse)
			
			return events.APIGatewayProxyResponse{
				StatusCode: statusCode,
				Headers:    headers,
				Body:       string(errorJSON),
			}, nil
		}
		
		userJSON, err := json.Marshal(user)
		if err != nil {
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Headers:    headers,
				Body:       `{"error":"internal server error"}`,
			}, nil
		}
		
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers:    headers,
			Body:       string(userJSON),
		}, nil
	}
	
	// Get user by ID
	user, err := userService.GetUserByID(userID)
	if err != nil {
		statusCode := 404
		if strings.Contains(err.Error(), "not found") {
			statusCode = 404
		} else {
			statusCode = 500
		}
		
		errorResponse := map[string]string{"error": err.Error()}
		errorJSON, _ := json.Marshal(errorResponse)
		
		return events.APIGatewayProxyResponse{
			StatusCode: statusCode,
			Headers:    headers,
			Body:       string(errorJSON),
		}, nil
	}
	
	userJSON, err := json.Marshal(user)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    headers,
			Body:       `{"error":"internal server error"}`,
		}, nil
	}
	
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       string(userJSON),
	}, nil
}

// handleImageSubmission handles the original image submission functionality
func (d *Dependency) handleImageSubmission(ctx context.Context, request events.APIGatewayProxyRequest, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	lc, _ := lambdacontext.FromContext(ctx)
	region := strings.Split(lc.InvokedFunctionArn, ":")[3]
	aws_account_id := strings.Split(lc.InvokedFunctionArn, ":")[4]

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
