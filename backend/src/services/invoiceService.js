const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const emailService = require('./emailService');

class InvoiceService {
  constructor() {
    this.templates = new Map();
  }

  async loadInvoiceTemplate() {
    if (this.templates.has('invoice')) {
      return this.templates.get('invoice');
    }

    try {
      const templatePath = path.join(__dirname, '../templates', 'invoice.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(templateContent);
      this.templates.set('invoice', compiledTemplate);
      return compiledTemplate;
    } catch (error) {
      console.error('Error loading invoice template:', error);
      return null;
    }
  }

  async generateInvoice(auction, buyer, seller, finalAmount) {
    try {
      const template = await this.loadInvoiceTemplate();
      if (!template) {
        throw new Error('Failed to load invoice template');
      }

      const invoiceNumber = this.generateInvoiceNumber();
      const invoiceDate = new Date().toISOString().split('T')[0];

      const invoiceData = {
        invoiceNumber,
        invoiceDate,
        auction: {
          title: auction.title,
          description: auction.description,
          category: auction.category,
          condition: auction.condition
        },
        buyer: {
          name: `${buyer.firstName} ${buyer.lastName}`,
          email: buyer.email,
          username: buyer.username
        },
        seller: {
          name: `${seller.firstName} ${seller.lastName}`,
          email: seller.email,
          username: seller.username
        },
        transaction: {
          finalAmount: finalAmount.toFixed(2),
          currency: 'USD',
          platformFee: (finalAmount * 0.05).toFixed(2), // 5% platform fee
          sellerAmount: (finalAmount * 0.95).toFixed(2)
        },
        company: {
          name: 'Tap2Win',
          address: '123 Auction Street, Bid City, BC 12345',
          email: 'support@tap2win.com',
          phone: '+1 (555) 123-4567'
        }
      };

      const html = template(invoiceData);

      // Generate PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });

      await browser.close();

      return {
        buffer: pdfBuffer,
        filename: `invoice-${invoiceNumber}.pdf`,
        data: invoiceData
      };

    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  generateInvoiceNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${timestamp}-${random}`;
  }

  async generateAndSendInvoices(auction, buyer, finalAmount) {
    try {
      // Get seller info
      const seller = await auction.getSeller();

      // Generate invoice
      const invoice = await this.generateInvoice(auction, buyer, seller, finalAmount);

      // Send to buyer
      await emailService.sendInvoiceEmail(buyer, invoice, auction, true);

      // Send to seller
      await emailService.sendInvoiceEmail(seller, invoice, auction, false);

      console.log(`Invoices sent for auction ${auction.id} - Amount: $${finalAmount}`);

      return invoice;

    } catch (error) {
      console.error('Error generating and sending invoices:', error);
      throw error;
    }
  }
}

module.exports = new InvoiceService();
