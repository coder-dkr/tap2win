# 📧 Email Setup Guide for Tap2Win

## SendGrid Configuration

Tap2Win uses SendGrid for sending transactional emails. Follow these steps to set up email functionality:

### 1. Get a SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### 2. Create an API Key

1. In SendGrid dashboard, go to **Settings > API Keys**
2. Click **Create API Key**
3. Choose **Full Access** or **Restricted Access** (Mail Send)
4. Copy the generated API key

### 3. Verify Your Sender Domain (Optional but Recommended)

1. Go to **Settings > Sender Authentication**
2. Choose **Domain Authentication**
3. Follow the DNS setup instructions
4. This improves email deliverability

### 4. Configure Environment Variables

Create a `.env` file in the `backend` directory with:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com

# Other required variables
FRONTEND_URL=http://localhost:5173
```

### 5. Test Email Configuration

Run the email test script:

```bash
cd backend
node test-email.js
```

### 6. Email Templates

The following email templates are included:

- **welcome.hbs** - Welcome email for new users
- **counter-offer.hbs** - Counter offer notifications
- **invoice-buyer.hbs** - Buyer invoice emails
- **invoice-seller.hbs** - Seller invoice emails
- **invoice.hbs** - PDF invoice template

### 7. Troubleshooting

#### Common Issues:

1. **"SendGrid API key not configured"**
   - Make sure `SENDGRID_API_KEY` is set in your `.env` file
   - Restart your server after adding the key

2. **"Template not found"**
   - Check that all template files exist in `backend/src/templates/`
   - Verify template file names match the code

3. **"Email sending error"**
   - Check SendGrid dashboard for error details
   - Verify your sender email is authenticated
   - Check if you've exceeded your daily email limit

4. **"Authentication failed"**
   - Verify your API key is correct
   - Make sure your SendGrid account is active

### 8. Production Setup

For production deployment:

1. Use a verified domain for `FROM_EMAIL`
2. Set up domain authentication in SendGrid
3. Monitor email delivery in SendGrid dashboard
4. Consider upgrading to a paid plan for higher limits

### 9. Email Types Supported

- ✅ Welcome emails (new user registration)
- ✅ Counter offer notifications
- ✅ Invoice emails with PDF attachments
- ✅ Bid notifications
- ✅ Auction end notifications
- ✅ Winner notifications

### 10. Admin Email Management

Admins can view and manage all sent emails through the admin panel:

- View all sent emails
- Check email status
- Resend failed emails
- Download email content

---

**Note**: Email sending is now non-blocking - if emails fail to send, user registration and other operations will still succeed. Check the server logs for email error details.
