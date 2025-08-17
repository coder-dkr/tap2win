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
      // Convert finalAmount to number if it's a string
      const numericAmount = parseFloat(finalAmount);
      if (isNaN(numericAmount)) {
        throw new Error(`Invalid finalAmount: ${finalAmount}`);
      }
      
      console.log(`📄 Starting invoice generation for auction ${auction.id}`);
      console.log(`📄 Invoice data:`, {
        auctionTitle: auction.title,
        buyerName: `${buyer.firstName} ${buyer.lastName}`,
        sellerName: `${seller.firstName} ${seller.lastName}`,
        finalAmount: finalAmount,
        numericAmount: numericAmount
      });

      const template = await this.loadInvoiceTemplate();
      if (!template) {
        throw new Error('Failed to load invoice template');
      }
      console.log(`✅ Invoice template loaded successfully`);
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
          finalAmount: numericAmount.toFixed(2),
          currency: 'USD',
          platformFee: (numericAmount * 0.05).toFixed(2), 
          sellerAmount: (numericAmount * 0.95).toFixed(2)
        },
        company: {
          name: 'Tap2Win',
          address: '123 Auction Street, Bid City, BC 12345',
          email: 'support@tap2win.com',
          phone: '+1 (555) 123-4567'
        }
      };
      const html = template(invoiceData);
      console.log(`✅ HTML template rendered successfully (${html.length} characters)`);
      
      console.log(`📄 Launching Puppeteer browser...`);
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log(`✅ Browser launched successfully`);
      
      const page = await browser.newPage();
      console.log(`✅ New page created`);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      console.log(`✅ HTML content set on page`);
      
      console.log(`📄 Generating PDF...`);
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
      console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
      
      await browser.close();
      console.log(`✅ Browser closed`);
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
      // Convert finalAmount to number if it's a string
      const numericAmount = parseFloat(finalAmount);
      if (isNaN(numericAmount)) {
        throw new Error(`Invalid finalAmount: ${finalAmount}`);
      }
      
      console.log(`📄 Starting invoice generation and sending for auction ${auction.id}`);
      console.log(`📄 Buyer: ${buyer.firstName} ${buyer.lastName} (${buyer.email})`);
      console.log(`📄 Amount: $${finalAmount} (numeric: $${numericAmount})`);
      
      const seller = await auction.getSeller();
      console.log(`📄 Seller: ${seller.firstName} ${seller.lastName} (${seller.email})`);
      
      const invoice = await this.generateInvoice(auction, buyer, seller, numericAmount);
      console.log(`✅ Invoice generated successfully`);
      
      console.log(`📧 Sending invoice email to buyer...`);
      await emailService.sendInvoiceEmail(buyer, {
        buffer: invoice.buffer,
        filename: invoice.filename,
        data: invoice.data
      }, auction, true);
      console.log(`✅ Invoice email sent to buyer`);
      
      console.log(`📧 Sending invoice email to seller...`);
      await emailService.sendInvoiceEmail(seller, {
        buffer: invoice.buffer,
        filename: invoice.filename,
        data: invoice.data
      }, auction, false);
      console.log(`✅ Invoice email sent to seller`);
      
      console.log(`✅ REAL-TIME: Invoices sent for auction ${auction.id} - Amount: $${finalAmount}`);
      return invoice;
    } catch (error) {
      console.error('❌ Error generating and sending invoices:', error);
      console.error('❌ Error details:', {
        auctionId: auction.id,
        buyerEmail: buyer.email,
        finalAmount: finalAmount,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
module.exports = new InvoiceService();
