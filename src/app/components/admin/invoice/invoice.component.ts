// invoice.component.ts
import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { StudentWithPayment, PaymentHistoryItem } from '../../../models/payment.model';
import { PaymentService } from '../../../services/payment.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface InvoiceData {
  student: StudentWithPayment;
  academicYear: string;
  generatedDate: Date;
  invoiceNumber: string;
  payments: PaymentHistoryItem[];
  totals: {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  };
  remainingAmounts: {
    tuition: number;
    uniform: number;
    transportation: number;
    grandTotal: number;
  };
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.css']
})
export class InvoiceComponent implements OnInit {
  @Input() student!: StudentWithPayment;
  @Input() academicYear!: string;
  
  invoiceData!: InvoiceData;
  isLoading = false;
  isGeneratingPdf = false;

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.generateInvoiceData();
  }

  private generateInvoiceData(): void {
    if (!this.student || !this.student.paymentRecord) {
      return;
    }

    // Generate unique invoice number
    const timestamp = new Date().getTime();
    const studentInitials = this.student.name.split(' ').map(n => n.charAt(0)).join('');
    const invoiceNumber = `INV-${this.academicYear}-${studentInitials}-${timestamp.toString().slice(-6)}`;

    // Get payment history
    const payments = this.paymentService.getPaymentHistory(this.student.paymentRecord);

    // Calculate totals
    const paidAmounts = this.student.paymentRecord.paidAmounts || {
      tuition: 0,
      uniform: 0,
      transportation: 0,
      grandTotal: 0
    };

    const totals = {
      tuition: paidAmounts.tuition || 0,
      uniform: paidAmounts.uniform || 0,
      transportation: paidAmounts.transportation || 0,
      grandTotal: paidAmounts.grandTotal || 0
    };

    const totalAmounts = this.student.paymentRecord.totalAmounts || {
      tuition: 0,
      uniform: 0,
      transportation: 0,
      grandTotal: 0
    };

    const remainingAmounts = {
      tuition: Math.max(0, totalAmounts.tuition - paidAmounts.tuition),
      uniform: Math.max(0, totalAmounts.uniform - paidAmounts.uniform),
      transportation: Math.max(0, totalAmounts.transportation - paidAmounts.transportation),
      grandTotal: Math.max(0, totalAmounts.grandTotal - paidAmounts.grandTotal)
    };

    this.invoiceData = {
      student: this.student,
      academicYear: this.academicYear,
      generatedDate: new Date(),
      invoiceNumber,
      payments,
      totals,
      remainingAmounts,
      schoolInfo: {
        name: 'École Internationale',
        address: '123 Rue de l\'Éducation, Tunis, Tunisie',
        phone: '+216 XX XXX XXX',
        email: 'contact@ecole-internationale.tn'
      }
    };
  }

  // Old print method (kept for compatibility)
  printInvoice(): void {
    window.print();
  }

  // Improved PDF download method with better formatting
  async downloadPDF(): Promise<void> {
    this.isGeneratingPdf = true;
    
    try {
      // Create a wrapper div with proper styling for PDF generation
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.top = '-9999px';
      wrapper.style.left = '-9999px';
      wrapper.style.width = '800px'; // Fixed width for consistent rendering
      wrapper.style.padding = '40px';
      wrapper.style.backgroundColor = 'white';
      wrapper.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
      
      // Clone the invoice content
      const invoiceElement = document.querySelector('.invoice-content') as HTMLElement;
      if (!invoiceElement) {
        console.error('Invoice content not found');
        this.isGeneratingPdf = false;
        return;
      }
      
      const clonedInvoice = invoiceElement.cloneNode(true) as HTMLElement;
      
      // Apply inline styles to the cloned content for better PDF rendering
      this.applyInlineStyles(clonedInvoice);
      
      wrapper.appendChild(clonedInvoice);
      document.body.appendChild(wrapper);

      // Generate canvas with improved settings
      const canvas = await html2canvas(wrapper, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        windowHeight: wrapper.scrollHeight
      });

      // Remove wrapper from DOM
      document.body.removeChild(wrapper);

      // Create PDF with proper dimensions and margins
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15; // 15mm margins
      const contentWidth = pageWidth - (2 * margin);
      const contentHeight = pageHeight - (2 * margin);

      // Calculate image dimensions to fit within margins
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Handle multi-page content
      if (imgHeight <= contentHeight) {
        // Single page
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          imgWidth,
          imgHeight
        );
      } else {
        // Multiple pages
        const totalPages = Math.ceil(imgHeight / contentHeight);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          // Calculate the portion of image to show on this page
          const sourceY = page * (canvas.height / totalPages);
          const sourceHeight = canvas.height / totalPages;
          
          // Create a temporary canvas for this page portion
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(
              canvas,
              0, sourceY, canvas.width, sourceHeight,
              0, 0, canvas.width, sourceHeight
            );
            
            pdf.addImage(
              pageCanvas.toDataURL('image/png'),
              'PNG',
              margin,
              margin,
              imgWidth,
              contentHeight
            );
          }
        }
      }

      // Add page numbers
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(150);
        pdf.text(
          `Page ${i} / ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Generate filename
      const fileName = `Facture_${this.student.name.replace(/\s+/g, '_')}_${this.invoiceData.invoiceNumber}.pdf`;
      
      // Save the PDF
      pdf.save(fileName);
      
      this.isGeneratingPdf = false;
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.isGeneratingPdf = false;
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    }
  }

  // Apply inline styles for better PDF rendering
  private applyInlineStyles(element: HTMLElement): void {
    // Invoice header
    const header = element.querySelector('.invoice-header') as HTMLElement;
    if (header) {
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.marginBottom = '30px';
      header.style.paddingBottom = '20px';
      header.style.borderBottom = '3px solid #007bff';
    }

    // School info
    const schoolInfo = element.querySelector('.school-info') as HTMLElement;
    if (schoolInfo) {
      schoolInfo.style.flex = '1';
    }

    const schoolName = element.querySelector('.school-name') as HTMLElement;
    if (schoolName) {
      schoolName.style.fontSize = '24px';
      schoolName.style.fontWeight = 'bold';
      schoolName.style.color = '#007bff';
      schoolName.style.marginBottom = '10px';
    }

    // Invoice info
    const invoiceInfo = element.querySelector('.invoice-info') as HTMLElement;
    if (invoiceInfo) {
      invoiceInfo.style.textAlign = 'right';
      invoiceInfo.style.flex = '1';
    }

    const invoiceTitle = element.querySelector('.invoice-title') as HTMLElement;
    if (invoiceTitle) {
      invoiceTitle.style.fontSize = '28px';
      invoiceTitle.style.fontWeight = 'bold';
      invoiceTitle.style.color = '#007bff';
      invoiceTitle.style.marginBottom = '10px';
    }

    // Student section
    const studentSection = element.querySelector('.student-section') as HTMLElement;
    if (studentSection) {
      studentSection.style.background = '#f8f9fa';
      studentSection.style.padding = '15px';
      studentSection.style.borderRadius = '8px';
      studentSection.style.marginBottom = '20px';
      studentSection.style.pageBreakInside = 'avoid';
    }

    // Services section
    const servicesSection = element.querySelector('.services-section') as HTMLElement;
    if (servicesSection) {
      servicesSection.style.marginBottom = '20px';
      servicesSection.style.pageBreakInside = 'avoid';
    }

    // Service items
    const serviceItems = element.querySelectorAll('.service-item');
    serviceItems.forEach((item) => {
      const serviceItem = item as HTMLElement;
      serviceItem.style.background = 'white';
      serviceItem.style.border = '1px solid #e9ecef';
      serviceItem.style.borderRadius = '8px';
      serviceItem.style.padding = '10px';
      serviceItem.style.marginBottom = '10px';
      serviceItem.style.pageBreakInside = 'avoid';
    });

    // Payments table
    const paymentsTable = element.querySelector('.payments-table') as HTMLElement;
    if (paymentsTable) {
      paymentsTable.style.width = '100%';
      paymentsTable.style.borderCollapse = 'collapse';
      paymentsTable.style.marginBottom = '20px';
      paymentsTable.style.pageBreakInside = 'auto';
    }

    // Table headers
    const tableHeaders = element.querySelectorAll('.payments-table thead th');
    tableHeaders.forEach((th) => {
      const header = th as HTMLElement;
      header.style.background = '#343a40';
      header.style.color = 'white';
      header.style.padding = '10px';
      header.style.textAlign = 'left';
      header.style.fontSize = '12px';
    });

    // Table cells
    const tableCells = element.querySelectorAll('.payments-table tbody td');
    tableCells.forEach((td) => {
      const cell = td as HTMLElement;
      cell.style.padding = '8px';
      cell.style.borderBottom = '1px solid #e9ecef';
      cell.style.fontSize = '11px';
    });

    // Table rows - prevent breaking
    const tableRows = element.querySelectorAll('.payments-table tbody tr');
    tableRows.forEach((tr) => {
      const row = tr as HTMLElement;
      row.style.pageBreakInside = 'avoid';
    });

    // Summary section
    const summarySection = element.querySelector('.invoice-summary') as HTMLElement;
    if (summarySection) {
      summarySection.style.background = 'linear-gradient(135deg, #f8f9fa, #e9ecef)';
      summarySection.style.padding = '15px';
      summarySection.style.borderRadius = '8px';
      summarySection.style.marginBottom = '20px';
      summarySection.style.pageBreakInside = 'avoid';
    }

    // Footer
    const footer = element.querySelector('.invoice-footer') as HTMLElement;
    if (footer) {
      footer.style.marginTop = '30px';
      footer.style.paddingTop = '20px';
      footer.style.borderTop = '2px solid #e9ecef';
      footer.style.pageBreakInside = 'avoid';
    }
  }

  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }

  formatDate(date: Date | string): string {
    return this.paymentService.formatDate(date);
  }

  getClassName(): string {
    if (typeof this.student.studentClass === 'object' && this.student.studentClass?.name) {
      return this.student.studentClass.name;
    }
    return 'Non assigné';
  }

  getClassGrade(): string {
    if (this.student.grade) {
      return this.paymentService.getGradeLabel(this.student.grade);
    }
    if (typeof this.student.studentClass === 'object' && this.student.studentClass?.grade) {
      return this.student.studentClass.grade;
    }
    return 'Non assigné';
  }

  getPaymentMethodLabel(method: string): string {
    return this.paymentService.getPaymentMethodLabel(method);
  }

  getComponentLabel(component: string): string {
    switch (component) {
      case 'tuition': return 'Frais Scolaires';
      case 'uniform': return 'Uniforme';
      case 'transportation': return 'Transport';
      default: return component;
    }
  }

  hasUniform(): boolean {
    return this.student.paymentRecord?.uniform?.purchased || false;
  }

  hasTransportation(): boolean {
    return this.student.paymentRecord?.transportation?.using || false;
  }

  getTransportationType(): string {
    if (!this.hasTransportation()) return '';
    const type = this.student.paymentRecord?.transportation?.type || '';
    return type === 'close' ? 'Zone proche' : type === 'far' ? 'Zone éloignée' : type;
  }
}