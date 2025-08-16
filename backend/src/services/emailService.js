const sgMail = require('@sendgrid/mail');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@tap2win.com';
    this.templates = new Map();
  }

  async loadTemplate(templateName) {
    if (this.templates.has(templateName)) {
      console.log(`✅ REAL-TIME: Template ${templateName} loaded from cache`);
      return this.templates.get(templateName);
    }

    try {
      const templatePath = path.join(__dirname, '../templates', `${templateName}.hbs`);
      console.log(`✅ REAL-TIME: Loading template from: ${templatePath}`);
      
      const templateContent = await fs.readFile(templatePath, 'utf8');
      console.log(`✅ REAL-TIME: Template content loaded, length: ${templateContent.length} characters`);
      
      const compiledTemplate = handlebars.compile(templateContent);
      this.templates.set(templateName, compiledTemplate);
      console.log(`✅ REAL-TIME: Template ${templateName} compiled and cached successfully`);
      return compiledTemplate;
    } catch (error) {
      console.error(`❌ Error loading template ${templateName}:`, error);
      console.error(`❌ Template path attempted: ${path.join(__dirname, '../templates', `${templateName}.hbs`)}`);
      return null;
    }
  }

  async sendEmail(to, subject, templateName, data = {}) {
    try {
      // ✅ REAL-TIME: Check if SendGrid is configured
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid API key not configured, skipping email send');
        return { success: false, message: 'SendGrid not configured' };
      }

      let html = '';
      
      if (templateName) {
        const template = await this.loadTemplate(templateName);
        if (template) {
          html = template(data);
          console.log(`✅ REAL-TIME: Template ${templateName} loaded and rendered successfully`);
          console.log(`✅ REAL-TIME: HTML content length: ${html.length} characters`);
        } else {
          console.error(`❌ Template ${templateName} not found`);
          throw new Error(`Template ${templateName} not found`);
        }
      }

      // ✅ REAL-TIME: Ensure we have content
      if (!html && !data.html) {
        console.error('❌ No HTML content generated for email');
        throw new Error('No HTML content generated for email');
      }

      const msg = {
        to,
        from: this.fromEmail,
        subject,
        html: html || data.html || '',
        text: data.text || html.replace(/<[^>]*>/g, '') || '' // Strip HTML tags for text version
      };

      if (data.attachments) {
        msg.attachments = data.attachments;
      }

      console.log(`✅ REAL-TIME: Attempting to send email to ${to} with subject: ${subject}`);
      console.log(`✅ REAL-TIME: Email content length: ${msg.html.length} characters`);
      
      const result = await sgMail.send(msg);
      console.log(`✅ REAL-TIME: Email sent successfully to ${to}`);
      return result;
    } catch (error) {
      console.error('❌ Email sending error:', error);
      console.error('❌ Error details:', {
        to,
        subject,
        templateName,
        htmlLength: html ? html.length : 0,
        sendGridKey: process.env.SENDGRID_API_KEY ? 'Configured' : 'Not configured',
        fromEmail: this.fromEmail
      });
      throw error;
    }
  }

  // Specific email types
  async sendWelcomeEmail(user) {
    await this.sendEmail(
      user.email,
      'Welcome to Tap2Win!',
      'welcome',
      {
        firstName: user.firstName,
        username: user.username,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
      }
    );
  }

  async sendBidNotification(user, auction, bid) {
    await this.sendEmail(
      user.email,
      `New bid on ${auction.title}`,
      'bid-notification',
      {
        firstName: user.firstName,
        auctionTitle: auction.title,
        bidAmount: bid.amount,
        auctionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auctions/${auction.id}`
      }
    );
  }

  async sendOutbidNotification(user, auction, newBid) {
    await this.sendEmail(
      user.email,
      `You've been outbid on ${auction.title}`,
      'outbid-notification',
      {
        firstName: user.firstName,
        auctionTitle: auction.title,
        newBidAmount: newBid.amount,
        auctionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auctions/${auction.id}`
      }
    );
  }

  async sendAuctionWonEmail(winner, auction, winningBid) {
    await this.sendEmail(
      winner.email,
      `Congratulations! You won ${auction.title}`,
      'auction-won',
      {
        firstName: winner.firstName,
        auctionTitle: auction.title,
        winningAmount: winningBid.amount,
        sellerName: `${auction.seller.firstName} ${auction.seller.lastName}`
      }
    );
  }

  async sendAuctionEndedEmail(seller, auction, highestBid) {
    const data = {
      firstName: seller.firstName,
      auctionTitle: auction.title,
      auctionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auctions/${auction.id}/manage`
    };

    if (highestBid) {
      data.highestBidAmount = highestBid.amount;
      data.bidderName = `${highestBid.bidder.firstName} ${highestBid.bidder.lastName}`;
    }

    await this.sendEmail(
      seller.email,
      `Your auction has ended: ${auction.title}`,
      'auction-ended',
      data
    );
  }

  async sendBidAcceptedEmail(bidder, seller, auction, finalAmount) {
    // Email to bidder
    await this.sendEmail(
      bidder.email,
      `Your bid has been accepted!`,
      'bid-accepted',
      {
        firstName: bidder.firstName,
        auctionTitle: auction.title,
        finalAmount,
        sellerName: `${seller.firstName} ${seller.lastName}`,
        sellerEmail: seller.email
      }
    );

    // Email to seller
    await this.sendEmail(
      seller.email,
      `Bid accepted for ${auction.title}`,
      'bid-accepted-seller',
      {
        firstName: seller.firstName,
        auctionTitle: auction.title,
        finalAmount,
        buyerName: `${bidder.firstName} ${bidder.lastName}`,
        buyerEmail: bidder.email
      }
    );
  }

  async sendBidRejectedEmail(bidder, auction) {
    await this.sendEmail(
      bidder.email,
      `Your bid was not accepted`,
      'bid-rejected',
      {
        firstName: bidder.firstName,
        auctionTitle: auction.title
      }
    );
  }

  async sendCounterOfferEmail(bidder, auction, counterAmount) {
    await this.sendEmail(
      bidder.email,
      `Counter offer for ${auction.title}`,
      'counter-offer',
      {
        firstName: bidder.firstName,
        auctionTitle: auction.title,
        counterAmount,
        responseUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auctions/${auction.id}/counter-offer`
      }
    );
  }

  async sendCounterOfferResponseEmail(seller, bidder, auction, response, amount) {
    const subject = response === 'accepted' 
      ? `Counter offer accepted for ${auction.title}`
      : `Counter offer declined for ${auction.title}`;

    // Email to seller
    await this.sendEmail(
      seller.email,
      subject,
      'counter-offer-response',
      {
        firstName: seller.firstName,
        auctionTitle: auction.title,
        response,
        amount,
        bidderName: `${bidder.firstName} ${bidder.lastName}`
      }
    );
  }

  async sendInvoiceEmail(recipient, invoice, auction, isWinner = true) {
    const subject = `Invoice for ${auction.title}`;
    const template = isWinner ? 'invoice-buyer' : 'invoice-seller';

    // ✅ REAL-TIME: Send email with PDF attachment
    await this.sendEmail(
      recipient.email,
      subject,
      template,
      {
        firstName: recipient.firstName,
        auctionTitle: auction.title,
        finalAmount: invoice.data.transaction.finalAmount,
        invoiceNumber: invoice.data.invoiceNumber,
        invoiceDate: invoice.data.invoiceDate,
        attachments: [
          {
            content: invoice.buffer.toString('base64'),
            filename: invoice.filename,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      }
    );

    console.log(`✅ REAL-TIME: Invoice email sent to ${recipient.email} for auction ${auction.id}`);
  }
}

module.exports = new EmailService();
