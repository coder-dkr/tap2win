const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const jsPDF = require('jspdf');
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

  async generateInvoiceWithPuppeteer(html, invoiceNumber) {
    let browser = null;
    try {
      console.log(`📄 Launching Puppeteer browser...`);
      console.log(`📄 Puppeteer configuration:`, {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'default',
        nodeEnv: process.env.NODE_ENV || 'development'
      });
      
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      };
      
      // Add executable path if specified
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      
      browser = await puppeteer.launch(launchOptions);
      console.log(`✅ Browser launched successfully`);
      
      const page = await browser.newPage();
      console.log(`✅ New page created`);
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 800 });
      
      // Set content with proper wait conditions
      await page.setContent(html, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });
      console.log(`✅ HTML content set on page`);
      
      // Wait a bit for any dynamic content to render
      await page.waitForTimeout(2000);
      
      console.log(`📄 Generating PDF...`);
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        preferCSSPageSize: true,
        displayHeaderFooter: false
      });
      
      console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
      
      // Validate PDF buffer
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF buffer is empty');
      }
      
      // Check if it's a valid PDF by checking the first few bytes
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      if (pdfHeader !== '%PDF') {
        throw new Error('Generated file is not a valid PDF');
      }
      
      console.log(`✅ PDF validation passed - Header: ${pdfHeader}`);
      
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF with Puppeteer:', error);
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log(`✅ Browser closed`);
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
    }
  }

  async generatePDFWithJsPDF(invoiceData, invoiceNumber) {
    try {
      console.log(`📄 Using jsPDF fallback method...`);
      
      const doc = new jsPDF();
      
      // Set font
      doc.setFont('helvetica');
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(102, 126, 234);
      doc.text(invoiceData.company.name, 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(invoiceData.company.address, 105, 30, { align: 'center' });
      doc.text(`Email: ${invoiceData.company.email} | Phone: ${invoiceData.company.phone}`, 105, 35, { align: 'center' });
      
      // Invoice details
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('INVOICE', 20, 50);
      
      doc.setFontSize(10);
      doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 20, 60);
      doc.text(`Date: ${invoiceData.invoiceDate}`, 20, 65);
      
      // Bill to section
      doc.text('Bill To:', 120, 50);
      doc.text(invoiceData.buyer.name, 120, 55);
      doc.text(`Email: ${invoiceData.buyer.email}`, 120, 60);
      doc.text(`Username: ${invoiceData.buyer.username}`, 120, 65);
      
      // Auction details
      doc.setFontSize(12);
      doc.text('Auction Details:', 20, 80);
      doc.setFontSize(10);
      doc.text(`Item: ${invoiceData.auction.title}`, 20, 85);
      doc.text(`Description: ${invoiceData.auction.description}`, 20, 90);
      doc.text(`Category: ${invoiceData.auction.category}`, 20, 95);
      doc.text(`Condition: ${invoiceData.auction.condition}`, 20, 100);
      
      // Table header
      doc.setFontSize(12);
      doc.text('Description', 20, 120);
      doc.text('Amount', 150, 120);
      
      // Table content
      doc.setFontSize(10);
      doc.text('Final Auction Price', 20, 130);
      doc.text(`$${invoiceData.transaction.finalAmount}`, 150, 130);
      
      doc.text('Platform Fee (5%)', 20, 140);
      doc.text(`$${invoiceData.transaction.platformFee}`, 150, 140);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount', 20, 150);
      doc.text(`$${invoiceData.transaction.finalAmount}`, 150, 150);
      
      // Seller information
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text('Seller Information:', 20, 170);
      doc.setFontSize(10);
      doc.text(`Seller: ${invoiceData.seller.name}`, 20, 175);
      doc.text(`Email: ${invoiceData.seller.email}`, 20, 180);
      doc.text(`Username: ${invoiceData.seller.username}`, 20, 185);
      doc.text(`Seller Receives: $${invoiceData.transaction.sellerAmount}`, 20, 190);
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('Thank you for using Tap2Win!', 105, 250, { align: 'center' });
      doc.text('This is an automatically generated invoice. Please keep this for your records.', 105, 255, { align: 'center' });
      doc.text(`© 2024 ${invoiceData.company.name}. All rights reserved.`, 105, 260, { align: 'center' });
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      console.log(`✅ jsPDF PDF generated (${pdfBuffer.length} bytes)`);
      
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF with jsPDF:', error);
      throw error;
    }
  }

  async generateSimplePDFFallback(html, invoiceNumber) {
    try {
      console.log(`📄 Using basic fallback PDF generation method...`);
      
      // For now, we'll create a simple text-based PDF-like content
      // In a production environment, you might want to use a library like jsPDF
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Create a simple PDF-like structure (this is a basic fallback)
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
72 720 Td
(Invoice: ${invoiceNumber}) Tj
0 -20 Td
(${textContent.substring(0, 500)}...) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
350
%%EOF`;

      const pdfBuffer = Buffer.from(pdfContent, 'utf8');
      console.log(`✅ Fallback PDF generated (${pdfBuffer.length} bytes)`);
      
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating fallback PDF:', error);
      throw error;
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
      
      let pdfBuffer;
      
      // Try Puppeteer first
      try {
        pdfBuffer = await this.generateInvoiceWithPuppeteer(html, invoiceNumber);
      } catch (puppeteerError) {
        console.error('Puppeteer PDF generation failed, trying jsPDF fallback:', puppeteerError);
        
        // Try jsPDF fallback method
        try {
          pdfBuffer = await this.generatePDFWithJsPDF(invoiceData, invoiceNumber);
        } catch (jsPDFError) {
          console.error('jsPDF fallback failed, trying basic fallback:', jsPDFError);
          
          // Try basic fallback method
          try {
            pdfBuffer = await this.generateSimplePDFFallback(html, invoiceNumber);
          } catch (fallbackError) {
            console.error('All PDF generation methods failed:', fallbackError);
            throw new Error('Failed to generate PDF invoice');
          }
        }
      }
      
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
