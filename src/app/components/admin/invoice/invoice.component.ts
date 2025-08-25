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
  // New TVA-related properties
  tva: {
    rate: number; // TVA rate (7%)
    tuitionTVA: number;
    uniformTVA: number;
    transportationTVA: number;
    totalTVA: number;
  };
  totalsWithTVA: {
    tuitionHT: number;
    uniformHT: number;
    transportationHT: number;
    totalHT: number;
    totalTTC: number;
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
  @Input() showPaymentHistory: boolean = false;
  
  invoiceData!: InvoiceData;
  isLoading = false;
  isGeneratingPdf = false;

  private readonly TVA_RATE = 0; // 7% TVA rate

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

    // Calculate TVA amounts
    const tva = this.calculateTVA(totals);
    const totalsWithTVA = this.calculateTotalsWithTVA(totals, tva);

    this.invoiceData = {
      student: this.student,
      academicYear: this.academicYear,
      generatedDate: new Date(),
      invoiceNumber,
      payments,
      totals,
      remainingAmounts,
      tva,
      totalsWithTVA,
      schoolInfo: {
        name: 'Ons School',
        address: 'Rue de la Liberté, 9110 Jilma',
        phone: '+216 76 65 70 82',
        email: 'onsschool2019@gmail.com'
      }
    };
  }

  // Calculate TVA for each component
  private calculateTVA(totals: any): any {
    const tuitionTVA = totals.tuition * this.TVA_RATE;
    const uniformTVA = totals.uniform * this.TVA_RATE;
    const transportationTVA = totals.transportation * this.TVA_RATE;
    const totalTVA = tuitionTVA + uniformTVA + transportationTVA;

    return {
      rate: 0, // Fixed rate as integer to avoid floating point issues
      tuitionTVA,
      uniformTVA,
      transportationTVA,
      totalTVA
    };
  }

  // Calculate totals including TVA
  private calculateTotalsWithTVA(totals: any, tva: any): any {
    return {
      tuitionHT: totals.tuition,
      uniformHT: totals.uniform,
      transportationHT: totals.transportation,
      totalHT: totals.grandTotal,
      totalTTC: totals.grandTotal + tva.totalTVA
    };
  }

  // Get TVA amount for a specific component
  getTVAAmount(component: 'tuition' | 'uniform' | 'transportation'): number {
    switch (component) {
      case 'tuition':
        return this.invoiceData?.tva?.tuitionTVA || 0;
      case 'uniform':
        return this.invoiceData?.tva?.uniformTVA || 0;
      case 'transportation':
        return this.invoiceData?.tva?.transportationTVA || 0;
      default:
        return 0;
    }
  }

  // Get HT amount (amount without TVA)
  getHTAmount(component: 'tuition' | 'uniform' | 'transportation'): number {
    if (!this.invoiceData) return 0;
    
    switch (component) {
      case 'tuition':
        return this.invoiceData.totals.tuition;
      case 'uniform':
        return this.invoiceData.totals.uniform;
      case 'transportation':
        return this.invoiceData.totals.transportation;
      default:
        return 0;
    }
  }

  // Get TTC amount (amount with TVA)
  getTTCAmount(component: 'tuition' | 'uniform' | 'transportation'): number {
    const htAmount = this.getHTAmount(component);
    const tvaAmount = this.getTVAAmount(component);
    return htAmount + tvaAmount;
  }

  // Format currency for table display (Tunisian format)
  formatCurrencyTable(amount: number): string {
    return amount.toFixed(3).replace('.', ',');
  }

  // Format date in short format (dd/MM/yyyy)
  formatDateShort(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Convert amount to words in French (simplified version)
  convertAmountToWords(amount: number): string {
    const ones = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
    const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];
    
    if (amount === 0) return 'ZÉRO DINARS';
    if (amount < 0) return 'MONTANT NÉGATIF';
    
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 1000);
    
    let result = this.convertIntegerToWords(integerPart, ones, teens, tens);
    result += integerPart === 1 ? ' DINAR' : ' DINARS';
    
    if (decimalPart > 0) {
      result += ' ET ' + this.convertIntegerToWords(decimalPart, ones, teens, tens);
      result += decimalPart === 1 ? ' MILLIME' : ' MILLIMES';
    }
    
    return result;
  }

  private convertIntegerToWords(num: number, ones: string[], teens: string[], tens: string[]): string {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const tensPart = Math.floor(num / 10);
      const onesPart = num % 10;
      return tens[tensPart] + (onesPart > 0 ? '-' + ones[onesPart] : '');
    }
    if (num < 1000) {
      const hundredsPart = Math.floor(num / 100);
      const remainder = num % 100;
      let result = hundredsPart === 1 ? 'CENT' : ones[hundredsPart] + ' CENT';
      if (remainder > 0) {
        result += ' ' + this.convertIntegerToWords(remainder, ones, teens, tens);
      }
      return result;
    }
    if (num < 1000000) {
      const thousandsPart = Math.floor(num / 1000);
      const remainder = num % 1000;
      let result = thousandsPart === 1 ? 'MILLE' : this.convertIntegerToWords(thousandsPart, ones, teens, tens) + ' MILLE';
      if (remainder > 0) {
        result += ' ' + this.convertIntegerToWords(remainder, ones, teens, tens);
      }
      return result;
    }
    
    return 'MONTANT TROP ÉLEVÉ';
  }

  // Get empty rows for table spacing
  getEmptyRows(): number[] {
    const usedRows = 1 + (this.hasUniform() ? 1 : 0) + (this.hasTransportation() ? 1 : 0);
    const totalRows = 10; // Standard invoice table height
    const emptyRowsCount = Math.max(0, totalRows - usedRows);
    return Array(emptyRowsCount).fill(0).map((_, i) => i);
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
      wrapper.style.fontFamily = 'Arial, sans-serif';
      
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
      const fileName = `Facture_${this.student.name.replace(/\s+/g, '_')}_${this.invoiceData.invoiceNumber.split('-').pop()}.pdf`;
      
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
    // Apply the new traditional invoice styles
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.fontSize = '11px';
    element.style.lineHeight = '1.4';
    element.style.color = '#000';
    
    // Invoice header
    const header = element.querySelector('.invoice-header') as HTMLElement;
    if (header) {
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.marginBottom = '20px';
      header.style.borderBottom = '1px solid #000';
      header.style.paddingBottom = '15px';
    }

    // Student box
    const studentBox = element.querySelector('.student-box') as HTMLElement;
    if (studentBox) {
      studentBox.style.border = '2px solid #000';
      studentBox.style.padding = '10px';
      studentBox.style.marginBottom = '20px';
    }

    // Invoice details box
    const detailsBox = element.querySelector('.invoice-details-box') as HTMLElement;
    if (detailsBox) {
      detailsBox.style.border = '2px solid #000';
      detailsBox.style.marginBottom = '20px';
    }

    // Main table
    const mainTable = element.querySelector('.main-table') as HTMLElement;
    if (mainTable) {
      mainTable.style.width = '100%';
      mainTable.style.borderCollapse = 'collapse';
      mainTable.style.border = '2px solid #000';
      mainTable.style.marginBottom = '20px';
    }

    // Table headers and cells
    const tableHeaders = element.querySelectorAll('.main-table th');
    tableHeaders.forEach((th) => {
      const header = th as HTMLElement;
      header.style.border = '1px solid #000';
      header.style.padding = '8px 5px';
      header.style.textAlign = 'center';
      header.style.fontWeight = 'bold';
      header.style.background = '#f0f0f0';
      header.style.fontSize = '10px';
    });

    const tableCells = element.querySelectorAll('.main-table td');
    tableCells.forEach((td) => {
      const cell = td as HTMLElement;
      cell.style.border = '1px solid #000';
      cell.style.padding = '8px 5px';
      cell.style.textAlign = 'center';
      cell.style.fontSize = '10px';
      cell.style.verticalAlign = 'top';
    });

    // Totals section
    const totalsSection = element.querySelector('.totals-section') as HTMLElement;
    if (totalsSection) {
      totalsSection.style.display = 'flex';
      totalsSection.style.justifyContent = 'space-between';
      totalsSection.style.marginBottom = '20px';
    }

    // TVA box
    const tvaBox = element.querySelector('.tva-box') as HTMLElement;
    if (tvaBox) {
      tvaBox.style.border = '2px solid #000';
      tvaBox.style.padding = '10px';
      tvaBox.style.width = '200px';
    }

    // Signature box
    const signatureBox = element.querySelector('.signature-box') as HTMLElement;
    if (signatureBox) {
      signatureBox.style.border = '1px solid #000';
      signatureBox.style.height = '80px';
      signatureBox.style.marginTop = '10px';
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