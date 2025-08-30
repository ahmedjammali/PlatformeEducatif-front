// invoice.component.ts - Modified to show current month payments only
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
  // ✅ UPDATED: Change to current month amounts instead of cumulative
  currentMonthAmounts: {
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
  tva: {
    rate: number;
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
  discount: {
    enabled: boolean;
    percentage?: number;
    originalTuitionAmount?: number;
    discountAmount?: number;
  };
  // ✅ NEW: Add current month context
  currentMonthInfo?: {
    monthIndex: number;
    monthName: string;
    paymentDate?: Date;
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
  
  // ✅ NEW: Add inputs for current month context
  @Input() currentMonthIndex?: number; // The month being paid (0-based)
  @Input() currentPaymentDate?: Date; // When the payment was made
  @Input() showCurrentMonthOnly: boolean = false; // Toggle between full vs current month view
  
  invoiceData!: InvoiceData;
  isLoading = false;
  isGeneratingPdf = false;

  private readonly TVA_RATE = 0; // 0% TVA rate

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

    // ✅ UPDATED: Calculate current month amounts instead of cumulative
    const currentMonthAmounts = this.calculateCurrentMonthAmounts();
    
    // Calculate remaining amounts (unchanged)
    const totalAmounts = this.student.paymentRecord.totalAmounts || {
      tuition: 0,
      uniform: 0,
      transportation: 0,
      grandTotal: 0
    };

    const paidAmounts = this.student.paymentRecord.paidAmounts || {
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

    // Calculate TVA amounts based on current month amounts
    const tva = this.calculateTVA(currentMonthAmounts);
    const totalsWithTVA = this.calculateTotalsWithTVA(currentMonthAmounts, tva);

    const discount = this.calculateDiscountInfo();

    // ✅ NEW: Add current month context
    const currentMonthInfo = this.getCurrentMonthInfo();

    this.invoiceData = {
      student: this.student,
      academicYear: this.academicYear,
      generatedDate: new Date(),
      invoiceNumber,
      payments,
      currentMonthAmounts, // ✅ UPDATED: Use current month amounts
      remainingAmounts,
      tva,
      totalsWithTVA,
      discount,
      currentMonthInfo, // ✅ NEW: Add month context
      schoolInfo: {
        name: 'Ons School',
        address: 'Rue de la Liberté, 9110 Jilma',
        phone: '+216 76 65 70 82',
        email: 'onsschool2019@gmail.com'
      }
    };
  }

  // ✅ NEW: Calculate amounts for current month only
  private calculateCurrentMonthAmounts(): any {
    if (!this.showCurrentMonthOnly) {
      // Return cumulative amounts (original behavior)
      const paidAmounts = this.student.paymentRecord?.paidAmounts || {
        tuition: 0,
        uniform: 0,
        transportation: 0,
        grandTotal: 0
      };
      return paidAmounts;
    }

    // Calculate current month amounts
    let tuitionAmount = 0;
    let uniformAmount = 0;
    let transportationAmount = 0;

    // 1. Tuition for current month
    if (this.currentMonthIndex !== undefined && this.student.paymentRecord?.tuitionMonthlyPayments) {
      const monthPayment = this.student.paymentRecord.tuitionMonthlyPayments[this.currentMonthIndex];
      if (monthPayment && monthPayment.status === 'paid') {
        tuitionAmount = monthPayment.paidAmount || 0;
      }
    }

    // 2. Uniform (one-time payment, show only if paid recently)
    if (this.hasUniform() && this.student.paymentRecord?.uniform?.isPaid) {
      const uniformPaymentDate = new Date(this.student.paymentRecord.uniform.paymentDate || '');
      const currentDate = this.currentPaymentDate || new Date();
      
      // Show uniform amount if paid in the same month
      if (this.isSameMonth(uniformPaymentDate, currentDate)) {
        uniformAmount = this.student.paymentRecord.uniform.price || 0;
      }
    }

    // 3. Transportation for current month
    if (this.hasTransportation() && this.currentMonthIndex !== undefined) {
      const transportPayments = this.student.paymentRecord?.transportation?.monthlyPayments || [];
      const monthTransportPayment = transportPayments[this.currentMonthIndex];
      if (monthTransportPayment && monthTransportPayment.status === 'paid') {
        transportationAmount = monthTransportPayment.paidAmount || 0;
      }
    }

    const grandTotal = tuitionAmount + uniformAmount + transportationAmount;

    return {
      tuition: tuitionAmount,
      uniform: uniformAmount,
      transportation: transportationAmount,
      grandTotal
    };
  }

  // ✅ NEW: Helper to check if two dates are in the same month
  private isSameMonth(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() && 
           date1.getMonth() === date2.getMonth();
  }

  // ✅ NEW: Get current month information
  private getCurrentMonthInfo(): any {
    if (this.currentMonthIndex === undefined) {
      return null;
    }

    const monthNames = [
      'Septembre', 'Octobre', 'Novembre', 'Décembre',
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'
    ];

    return {
      monthIndex: this.currentMonthIndex,
      monthName: monthNames[this.currentMonthIndex] || 'Mois inconnu',
      paymentDate: this.currentPaymentDate
    };
  }

  // Calculate TVA for each component
  private calculateTVA(amounts: any): any {
    const tuitionTVA = amounts.tuition * this.TVA_RATE;
    const uniformTVA = amounts.uniform * this.TVA_RATE;
    const transportationTVA = amounts.transportation * this.TVA_RATE;
    const totalTVA = tuitionTVA + uniformTVA + transportationTVA;

    return {
      rate: 0,
      tuitionTVA,
      uniformTVA,
      transportationTVA,
      totalTVA
    };
  }

  // Calculate totals including TVA
  private calculateTotalsWithTVA(amounts: any, tva: any): any {
    return {
      tuitionHT: amounts.tuition,
      uniformHT: amounts.uniform,
      transportationHT: amounts.transportation,
      totalHT: amounts.grandTotal,
      totalTTC: amounts.grandTotal + tva.totalTVA
    };
  }

  // ✅ UPDATED: Get TVA amount for current month
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

  // ✅ UPDATED: Get HT amount for current month
  getHTAmount(component: 'tuition' | 'uniform' | 'transportation'): number {
    if (!this.invoiceData) return 0;
    
    switch (component) {
      case 'tuition':
        return this.invoiceData.currentMonthAmounts.tuition;
      case 'uniform':
        return this.invoiceData.currentMonthAmounts.uniform;
      case 'transportation':
        return this.invoiceData.currentMonthAmounts.transportation;
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

  // ✅ NEW: Get the original amount before discount for display
  getOriginalAmountForCurrentMonth(component: 'tuition' | 'uniform' | 'transportation'): number {
    if (!this.showCurrentMonthOnly || this.currentMonthIndex === undefined) {
      // For cumulative view, return total remaining + paid
      const totalAmounts = this.student.paymentRecord?.totalAmounts;
      switch (component) {
        case 'tuition': return totalAmounts?.tuition || 0;
        case 'uniform': return totalAmounts?.uniform || 0;
        case 'transportation': return totalAmounts?.transportation || 0;
        default: return 0;
      }
    }

    // For current month view
    switch (component) {
      case 'tuition':
        // Get the monthly amount for current month
        const monthPayment = this.student.paymentRecord?.tuitionMonthlyPayments?.[this.currentMonthIndex];
        return monthPayment?.amount || 0;
      case 'uniform':
        // Uniform is one-time, so return full price if paid this month
        return this.invoiceData.currentMonthAmounts.uniform > 0 ? 
               (this.student.paymentRecord?.uniform?.price || 0) : 0;
      case 'transportation':
        // Get the monthly transport amount
        const transportPayments = this.student.paymentRecord?.transportation?.monthlyPayments || [];
        const monthTransport = transportPayments[this.currentMonthIndex];
        return monthTransport?.amount || 0;
      default:
        return 0;
    }
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
    const usedRows = this.getUsedRowsCount();
    const totalRows = 10; // Standard invoice table height
    const emptyRowsCount = Math.max(0, totalRows - usedRows);
    return Array(emptyRowsCount).fill(0).map((_, i) => i);
  }

  // ✅ NEW: Calculate used rows based on current month context
  private getUsedRowsCount(): number {
    let count = 0;
    
    // Always count tuition row if there's an amount
    if (this.getHTAmount('tuition') > 0) count++;
    
    // Count uniform only if paid this month (for current month view) or has amount (for cumulative view)
    if (this.hasUniformForCurrentInvoice()) count++;
    
    // Count transportation only if paid this month (for current month view) or has amount (for cumulative view)
    if (this.hasTransportationForCurrentInvoice()) count++;
    
    return count;
  }

  // ✅ NEW: Check if uniform should be shown on current invoice
  hasUniformForCurrentInvoice(): boolean {
    if (!this.hasUniform()) return false;
    
    if (this.showCurrentMonthOnly) {
      // Only show if uniform was paid this month
      return this.invoiceData?.currentMonthAmounts?.uniform > 0;
    }
    
    // Show if student has uniform (original behavior)
    return true;
  }

  // ✅ NEW: Check if transportation should be shown on current invoice
  hasTransportationForCurrentInvoice(): boolean {
    if (!this.hasTransportation()) return false;
    
    if (this.showCurrentMonthOnly) {
      // Only show if transportation was paid this month
      return this.invoiceData?.currentMonthAmounts?.transportation > 0;
    }
    
    // Show if student has transportation (original behavior)
    return true;
  }

  // Old print method (kept for compatibility)
  printInvoice(): void {
    window.print();
  }

  // PDF download method (unchanged)
  async downloadPDF(): Promise<void> {
    this.isGeneratingPdf = true;
    
    try {
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.top = '-9999px';
      wrapper.style.left = '-9999px';
      wrapper.style.width = '800px';
      wrapper.style.padding = '40px';
      wrapper.style.backgroundColor = 'white';
      wrapper.style.fontFamily = 'Arial, sans-serif';
      
      const invoiceElement = document.querySelector('.invoice-content') as HTMLElement;
      if (!invoiceElement) {
        console.error('Invoice content not found');
        this.isGeneratingPdf = false;
        return;
      }
      
      const clonedInvoice = invoiceElement.cloneNode(true) as HTMLElement;
      this.applyInlineStyles(clonedInvoice);
      wrapper.appendChild(clonedInvoice);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        windowHeight: wrapper.scrollHeight
      });

      document.body.removeChild(wrapper);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      const contentHeight = pageHeight - (2 * margin);

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= contentHeight) {
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          imgWidth,
          imgHeight
        );
      } else {
        const totalPages = Math.ceil(imgHeight / contentHeight);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          const sourceY = page * (canvas.height / totalPages);
          const sourceHeight = canvas.height / totalPages;
          
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

      // ✅ UPDATED: Include month info in filename for current month invoices
      let fileName = `Facture_${this.student.name.replace(/\s+/g, '_')}_${this.invoiceData.invoiceNumber.split('-').pop()}`;
      if (this.showCurrentMonthOnly && this.invoiceData.currentMonthInfo) {
        fileName += `_${this.invoiceData.currentMonthInfo.monthName}`;
      }
      fileName += '.pdf';
      
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
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.fontSize = '11px';
    element.style.lineHeight = '1.4';
    element.style.color = '#000';
    
    const header = element.querySelector('.invoice-header') as HTMLElement;
    if (header) {
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.marginBottom = '20px';
      header.style.borderBottom = '1px solid #000';
      header.style.paddingBottom = '15px';
    }

    const studentBox = element.querySelector('.student-box') as HTMLElement;
    if (studentBox) {
      studentBox.style.border = '2px solid #000';
      studentBox.style.padding = '10px';
      studentBox.style.marginBottom = '20px';
    }

    const detailsBox = element.querySelector('.invoice-details-box') as HTMLElement;
    if (detailsBox) {
      detailsBox.style.border = '2px solid #000';
      detailsBox.style.marginBottom = '20px';
    }

    const mainTable = element.querySelector('.main-table') as HTMLElement;
    if (mainTable) {
      mainTable.style.width = '100%';
      mainTable.style.borderCollapse = 'collapse';
      mainTable.style.border = '2px solid #000';
      mainTable.style.marginBottom = '20px';
    }

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

    const totalsSection = element.querySelector('.totals-section') as HTMLElement;
    if (totalsSection) {
      totalsSection.style.display = 'flex';
      totalsSection.style.justifyContent = 'space-between';
      totalsSection.style.marginBottom = '20px';
    }

    const tvaBox = element.querySelector('.tva-box') as HTMLElement;
    if (tvaBox) {
      tvaBox.style.border = '2px solid #000';
      tvaBox.style.padding = '10px';
      tvaBox.style.width = '200px';
    }

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

  private calculateDiscountInfo(): any {
    const paymentRecord = this.student.paymentRecord;
    
    if (!paymentRecord?.discount?.enabled) {
      return { enabled: false };
    }

    const discountPercentage = paymentRecord.discount.percentage || 0;
    
    if (this.showCurrentMonthOnly && this.currentMonthIndex !== undefined) {
      // For current month view, calculate discount for this month's payment
      const monthPayment = paymentRecord.tuitionMonthlyPayments?.[this.currentMonthIndex];
      if (!monthPayment) {
        return { enabled: false };
      }
      
      const currentMonthAmount = monthPayment.paidAmount || 0;
      const originalMonthAmount = currentMonthAmount / (1 - discountPercentage / 100);
      const discountAmount = originalMonthAmount - currentMonthAmount;

      return {
        enabled: true,
        percentage: discountPercentage,
        originalTuitionAmount: originalMonthAmount,
        discountAmount
      };
    } else {
      // For cumulative view (original behavior)
      const currentTuitionAmount = paymentRecord.totalAmounts?.tuition || 0;
      const originalTuitionAmount = currentTuitionAmount / (1 - discountPercentage / 100);
      const discountAmount = originalTuitionAmount - currentTuitionAmount;

      return {
        enabled: true,
        percentage: discountPercentage,
        originalTuitionAmount,
        discountAmount
      };
    }
  }

  // Helper methods for discount display
  hasDiscount(): boolean {
    return this.invoiceData?.discount?.enabled || false;
  }

  getOriginalTuitionAmount(): number {
    return this.invoiceData?.discount?.originalTuitionAmount || 0;
  }

  getDiscountAmount(): number {
    return this.invoiceData?.discount?.discountAmount || 0;
  }

  getDiscountPercentage(): number {
    return this.invoiceData?.discount?.percentage || 0;
  }

  // ✅ NEW: Get the title for the invoice based on context
  getInvoiceTitle(): string {
    if (this.showCurrentMonthOnly && this.invoiceData?.currentMonthInfo) {
      return `FACTURE - ${this.invoiceData.currentMonthInfo.monthName.toUpperCase()}`;
    }
    return 'B.L. FACTURE';
  }

  // ✅ NEW: Get period description for the designation column
  getTuitionPeriodDescription(): string {
    if (this.showCurrentMonthOnly && this.invoiceData?.currentMonthInfo) {
      return `FRAIS SCOLAIRES - ${this.invoiceData.currentMonthInfo.monthName.toUpperCase()} ${this.academicYear}`;
    }
    return `FRAIS SCOLAIRES - ANNÉE ACADÉMIQUE ${this.academicYear}`;
  }

  // ✅ NEW: Get transportation period description
  getTransportationPeriodDescription(): string {
    if (this.showCurrentMonthOnly && this.invoiceData?.currentMonthInfo) {
      return `TRANSPORT - ${this.getTransportationType().toUpperCase()} - ${this.invoiceData.currentMonthInfo.monthName.toUpperCase()}`;
    }
    return `TRANSPORT - ${this.getTransportationType().toUpperCase()}`;
  }
}