# Two-Factor Authentication (2FA) User Guide

## Overview

Two-Factor Authentication (2FA) adds an extra layer of security to your account by requiring a second form of verification in addition to your password. This guide will help you set up and use 2FA to protect your account.

## Table of Contents

1. [What is Two-Factor Authentication?](#what-is-two-factor-authentication)
2. [Why Use 2FA?](#why-use-2fa)
3. [Setting Up 2FA](#setting-up-2fa)
4. [Using 2FA](#using-2fa)
5. [Recovery Options](#recovery-options)
6. [Managing Trusted Devices](#managing-trusted-devices)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

## What is Two-Factor Authentication?

Two-Factor Authentication (2FA) is a security method that requires two different forms of identification to access your account:

1. **Something you know** - Your password
2. **Something you have** - Your phone or authenticator app

Even if someone obtains your password, they won't be able to access your account without the second factor.

## Why Use 2FA?

### Benefits of 2FA:
- **Enhanced Security**: Protects against password breaches and phishing attacks
- **Account Protection**: Prevents unauthorized access even if your password is compromised
- **Peace of Mind**: Know that your sensitive data is protected by multiple layers of security
- **Compliance**: Meets security requirements for many organizations and regulations

### When 2FA is Required:
- Accessing sensitive account information
- Making changes to security settings
- Performing high-value transactions
- Administrative actions

## Setting Up 2FA

### Prerequisites
- An active account with verified email
- A smartphone or device capable of running an authenticator app
- Access to your email or phone for verification

### Step 1: Choose Your 2FA Method

We support three 2FA methods:

#### 🔐 Authenticator App (Recommended)
- **Best for**: Maximum security and reliability
- **Requirements**: Smartphone with authenticator app
- **Supported Apps**: 
  - Google Authenticator
  - Microsoft Authenticator
  - Authy
  - 1Password
  - Bitwarden

#### 📱 SMS Text Message
- **Best for**: Users without smartphones or as backup method
- **Requirements**: Phone capable of receiving text messages
- **Note**: Less secure than authenticator apps

#### 📧 Email
- **Best for**: Backup method or when other options aren't available
- **Requirements**: Access to a secure email account
- **Note**: Should not be your primary email used for the account

### Step 2: Access 2FA Setup

1. Log in to your account
2. Go to **Account Settings** → **Security**
3. Click **Set Up Two-Factor Authentication**
4. Select your preferred method

### Step 3: Configure Your Chosen Method

#### For Authenticator App:

1. **Download an authenticator app** if you don't have one
2. **Scan the QR code** displayed on screen with your authenticator app
3. **Enter the 6-digit code** from your app to verify setup
4. **Save your recovery codes** in a secure location
5. **Complete setup** by clicking "Enable 2FA"

#### For SMS:

1. **Enter your phone number** including country code
2. **Receive verification code** via text message
3. **Enter the code** to verify your phone number
4. **Save your recovery codes** in a secure location
5. **Complete setup** by clicking "Enable 2FA"

#### For Email:

1. **Enter your backup email address**
2. **Check your email** for the verification code
3. **Enter the code** to verify your email
4. **Save your recovery codes** in a secure location
5. **Complete setup** by clicking "Enable 2FA"

### Step 4: Save Recovery Codes

⚠️ **IMPORTANT**: Save your recovery codes immediately!

- **Download** the recovery codes file
- **Print** a copy and store it securely
- **Store digitally** in a secure password manager
- **Never share** recovery codes with anyone

Each recovery code can only be used once, so keep them safe!

## Using 2FA

### Logging In with 2FA

1. **Enter your email and password** as usual
2. **You'll be prompted for 2FA verification**
3. **Open your authenticator app** or check your SMS/email
4. **Enter the 6-digit code** in the verification field
5. **Optionally check "Trust this device"** to skip 2FA for 30 days
6. **Click "Verify"** to complete login

### Code Requirements

- **TOTP codes**: 6 digits, valid for 30 seconds
- **SMS codes**: 6 digits, valid for 5 minutes
- **Email codes**: 6 digits, valid for 10 minutes
- **Recovery codes**: 8 characters, single use

### Trusted Devices

You can mark devices as "trusted" to skip 2FA verification:

- **Duration**: Trusted status lasts 30 days
- **Security**: Only trust devices you own and control
- **Management**: View and revoke trusted devices in security settings

## Recovery Options

### Using Recovery Codes

If you can't access your primary 2FA method:

1. **Click "Use recovery code instead"** on the 2FA verification screen
2. **Enter one of your 8-character recovery codes**
3. **Complete login** - the code will be marked as used
4. **Generate new codes** if you're running low

### If You Lose Access

If you lose access to both your 2FA device and recovery codes:

1. **Contact Support** immediately
2. **Provide account verification** information
3. **Follow identity verification** process
4. **Account recovery** may take 24-48 hours for security

### Generating New Recovery Codes

To generate new recovery codes:

1. **Go to Security Settings**
2. **Click "Generate New Recovery Codes"**
3. **Enter your current 2FA code** to verify
4. **Download and save** the new codes
5. **Old codes** will be invalidated

## Managing Trusted Devices

### Viewing Trusted Devices

In your security settings, you can see:
- **Device name** and type
- **When it was trusted**
- **Last used date**
- **IP address** and location

### Removing Trusted Devices

To revoke trust from a device:

1. **Go to Security Settings** → **Trusted Devices**
2. **Find the device** you want to remove
3. **Click "Remove"** next to the device
4. **Confirm removal** - the device will require 2FA on next login

### Best Practices for Trusted Devices

- **Only trust personal devices** you control
- **Don't trust public computers** or shared devices
- **Regularly review** and clean up old devices
- **Remove devices** you no longer use

## Troubleshooting

### Common Issues and Solutions

#### "Invalid code" errors:
- **Check time sync**: Ensure your device's time is correct
- **Try next code**: TOTP codes change every 30 seconds
- **Check app**: Make sure you're using the right account in your authenticator

#### Can't scan QR code:
- **Manual entry**: Use the text secret key instead
- **Camera permissions**: Ensure your app has camera access
- **Screen brightness**: Increase brightness for better scanning

#### Not receiving SMS/Email:
- **Check spam folder** for email codes
- **Verify phone number** is correct and can receive texts
- **Network issues**: Try again after a few minutes
- **Contact support** if problems persist

#### Lost authenticator app:
- **Use recovery codes** to log in
- **Reinstall app** and re-add account using backup
- **Contact support** if no recovery options available

### Getting Help

If you need assistance:

1. **Check this guide** for common solutions
2. **Visit our FAQ** section
3. **Contact support** with specific details about your issue
4. **Include**: Account email, device type, error messages

## Security Best Practices

### Protecting Your 2FA

- **Keep recovery codes secure** - treat them like passwords
- **Don't share codes** with anyone, including support staff
- **Use strong passwords** in addition to 2FA
- **Keep apps updated** for latest security features
- **Enable app locks** on your authenticator apps

### Account Security

- **Regular reviews**: Check your security settings monthly
- **Monitor login activity**: Review authentication logs
- **Update contact info**: Keep phone/email current
- **Use unique passwords**: Don't reuse passwords across sites

### What to Avoid

- **Don't disable 2FA** unless absolutely necessary
- **Don't use SMS** as your only 2FA method if possible
- **Don't trust public devices** for extended periods
- **Don't ignore security alerts** about your account

### Emergency Preparedness

- **Backup your backup**: Have multiple recovery methods
- **Document your setup**: Keep notes about your 2FA configuration
- **Test recovery**: Periodically test your recovery codes
- **Plan for device loss**: Know how to recover if you lose your phone

## Frequently Asked Questions

### Q: Can I use multiple 2FA methods?
A: Yes! You can set up multiple methods and use any of them for verification.

### Q: What happens if I change phones?
A: You'll need to transfer your authenticator app or set up 2FA again on your new device.

### Q: Can I temporarily disable 2FA?
A: Yes, but we strongly recommend keeping it enabled. You can disable it in security settings.

### Q: How often do codes change?
A: TOTP codes change every 30 seconds. SMS and email codes are valid for several minutes.

### Q: Is 2FA required for all users?
A: 2FA is optional but strongly recommended. Some account types may require it.

### Q: Can I use 2FA offline?
A: Yes! Authenticator apps work offline. SMS and email require internet connectivity.

## Support and Contact

If you need help with 2FA:

- **Email**: security@signatureapp.com
- **Support Portal**: https://support.signatureapp.com
- **Emergency**: Use the account recovery process for urgent issues

---

**Last Updated**: [Current Date]
**Version**: 1.0

For the latest version of this guide, visit: https://docs.signatureapp.com/security/2fa-guide