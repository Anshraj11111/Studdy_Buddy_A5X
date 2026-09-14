# 📧 Email Setup Guide - Password Reset System

## Quick Start (Gmail - 5 Minutes)

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification"
3. Follow the steps to enable it

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other" as the device (name it "Studdy Buddy")
4. Click "Generate"
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update Backend .env File

Open `backend/.env` and add these lines:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop
EMAIL_FROM_NAME=Studdy Buddy
```

**Important:** 
- Remove spaces from the app password: `abcd efgh ijkl mnop` → `abcdefghijklmnop`
- Use your actual Gmail address for `SMTP_USER`

### Step 4: Restart Backend

```bash
cd backend
npm start
```

### Step 5: Test It!

1. Go to http://localhost:3001/forgot-password
2. Enter a registered email
3. Check your Gmail inbox for the reset code
4. Enter the code and new password
5. Success! 🎉

---

## Alternative: Outlook/Hotmail (If you prefer)

Update `backend/.env`:

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-outlook-password
EMAIL_FROM_NAME=Studdy Buddy
```

---

## Troubleshooting

### "Email service not configured" warning
✅ **This is normal during development**. Emails will be logged to console if SMTP is not configured.

Check your terminal for logs like:
```
Password reset code for user@example.com: 123456
```

### Emails not sending
1. ✅ Check SMTP credentials are correct
2. ✅ Verify 2FA is enabled (for Gmail)
3. ✅ Remove spaces from app password
4. ✅ Check firewall isn't blocking port 587
5. ✅ Try using a different email service

### "Invalid credentials" error
- Gmail: Make sure you're using the App Password, not your regular Gmail password
- Outlook: Regular password should work

### Rate limit errors
If you're testing repeatedly:
- Wait 15 minutes between tests
- Or temporarily increase limits in `backend/src/middleware/rate-limit.middleware.js`

---

## Production Setup (SendGrid - Recommended)

### Why SendGrid?
- ✅ 100 emails/day free forever
- ✅ Better deliverability than Gmail
- ✅ Professional email infrastructure
- ✅ Detailed analytics

### Setup Steps

1. **Sign up**: https://sendgrid.com
2. **Verify your email**
3. **Create API Key**:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it "Studdy Buddy"
   - Select "Full Access"
   - Copy the key (starts with `SG.`)

4. **Update `.env`**:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxx
EMAIL_FROM_NAME=Studdy Buddy
NODE_ENV=production
```

5. **Verify Sender Identity** (Required by SendGrid):
   - Go to Settings → Sender Authentication
   - Verify a single sender email
   - Or verify your domain (for custom emails)

---

## Environment Variables Reference

```env
# Required
SMTP_HOST=smtp.gmail.com           # Email server
SMTP_PORT=587                      # Usually 587
SMTP_SECURE=false                  # true for port 465, false for 587
SMTP_USER=your-email@gmail.com     # Email username
SMTP_PASS=your-app-password        # Email password/app password

# Optional
EMAIL_FROM_NAME=Studdy Buddy       # "From" name in emails
NODE_ENV=production                # Enable production features
```

---

## Email Templates

The system sends two types of emails:

### 1. Password Reset Code
- Professional HTML design
- Large, easy-to-read 6-digit code
- 10-minute expiry warning
- Security notice

### 2. Password Changed Confirmation
- Success confirmation
- Timestamp of change
- Security alert if unauthorized

---

## Security Features

✅ **Rate Limiting**
- Max 3 reset requests per 15 minutes
- Max 5 verification attempts per 10 minutes

✅ **Code Expiry**
- Codes expire after 10 minutes
- Must request new code if expired

✅ **Brute Force Protection**
- Max 5 failed attempts
- Code invalidated after limit reached

✅ **Email Enumeration Prevention**
- Same response for existing/non-existing emails
- Prevents discovering valid accounts

✅ **Security Logging**
- All reset requests logged with IP
- Failed attempts tracked
- Password changes audited

---

## Cost Comparison

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Gmail** | 500/day | Development |
| **SendGrid** | 100/day | Small apps |
| **AWS SES** | 62K/month | Production |
| **Mailgun** | 5K/month | Mid-size apps |

---

## Testing Checklist

- [ ] Email credentials added to `.env`
- [ ] Backend restarted
- [ ] Can request reset code
- [ ] Email received within 2 minutes
- [ ] Code works to reset password
- [ ] Confirmation email received
- [ ] Invalid code shows error
- [ ] Expired code shows error
- [ ] Rate limiting works

---

## Support

If you need help:
1. Check console logs for errors
2. Verify email credentials
3. Try test email service first
4. Read troubleshooting section above

---

*Setup time: 5-10 minutes*  
*Difficulty: Easy ⭐*
