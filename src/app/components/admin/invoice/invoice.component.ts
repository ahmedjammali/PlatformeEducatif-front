// invoice.component.ts - Modified with PDF fixes and component-specific invoices
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
  currentMonthAmounts: {
    tuition: number;
    uniform: number;
    transportation: number;
    inscriptionFee: number;
    grandTotal: number;
  };
  remainingAmounts: {
    tuition: number;
    uniform: number;
    transportation: number;
    inscriptionFee: number;
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
    inscriptionFeeTVA: number;
    totalTVA: number;
  };
  totalsWithTVA: {
    tuitionHT: number;
    uniformHT: number;
    transportationHT: number;
    inscriptionFeeHT: number;
    totalHT: number;
    totalTTC: number;
  };
  discount: {
    enabled: boolean;
    percentage?: number;
    originalTuitionAmount?: number;
    discountAmount?: number;
  };
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
  @Input() currentMonthIndex?: number;
  @Input() currentPaymentDate?: Date;
  @Input() showCurrentMonthOnly: boolean = false;
  // NEW: Component-specific invoice inputs
  // NEW: Component-specific invoice inputs
@Input() componentOnly?: 'uniform' | 'inscriptionFee' | 'tuition'; // ✅ ADD 'tuition'
  
  invoiceData!: InvoiceData;
  isLoading = false;
  isGeneratingPdf = false;

  private readonly TVA_RATE = 0;

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.generateInvoiceData();
  }

  private generateInvoiceData(): void {
    if (!this.student || !this.student.paymentRecord) {
      return;
    }

    const timestamp = new Date().getTime();
    const studentInitials = this.student.name.split(' ').map(n => n.charAt(0)).join('');
    const invoiceNumber = `INV-${this.academicYear}-${studentInitials}-${timestamp.toString().slice(-6)}`;

    const payments = this.paymentService.getPaymentHistory(this.student.paymentRecord);
    const currentMonthAmounts = this.calculateCurrentMonthAmounts();
    
    const totalAmounts = this.student.paymentRecord.totalAmounts || {
      tuition: 0,
      uniform: 0,
      transportation: 0,
      inscriptionFee: 0,
      grandTotal: 0
    };

    const paidAmounts = this.student.paymentRecord.paidAmounts || {
      tuition: 0,
      uniform: 0,
      transportation: 0,
      inscriptionFee: 0,
      grandTotal: 0
    };

    const remainingAmounts = {
      tuition: Math.max(0, totalAmounts.tuition - paidAmounts.tuition),
      uniform: Math.max(0, totalAmounts.uniform - paidAmounts.uniform),
      transportation: Math.max(0, totalAmounts.transportation - paidAmounts.transportation),
      inscriptionFee: Math.max(0, totalAmounts.inscriptionFee - paidAmounts.inscriptionFee),
      grandTotal: Math.max(0, totalAmounts.grandTotal - paidAmounts.grandTotal)
    };

    const tva = this.calculateTVA(currentMonthAmounts);
    const totalsWithTVA = this.calculateTotalsWithTVA(currentMonthAmounts, tva);
    const discount = this.calculateDiscountInfo();
    const currentMonthInfo = this.getCurrentMonthInfo();
     const invoiceDate = this.getInvoiceDate();
    this.invoiceData = {
      student: this.student,
      academicYear: this.academicYear,
         generatedDate: invoiceDate, // ✅ Changed from new Date()
      invoiceNumber,
      payments,
      currentMonthAmounts,
      remainingAmounts,
      tva,
      totalsWithTVA,
      discount,
      currentMonthInfo,
      schoolInfo: {
        name: 'Ons School',
        address: 'Rue de la Liberté, 9110 Jilma',
        phone: '+216 76 65 70 82',
        email: 'onsschool2019@gmail.com'
      }
    };
  }

  private getInvoiceDate(): Date {
  // For component-specific invoices, use the component's payment date
  if (this.componentOnly === 'uniform' && this.student.paymentRecord?.uniform?.paymentDate) {
    return new Date(this.student.paymentRecord.uniform.paymentDate);
  }
  
  if (this.componentOnly === 'inscriptionFee' && this.student.paymentRecord?.inscriptionFee?.paymentDate) {
    return new Date(this.student.paymentRecord.inscriptionFee.paymentDate);
  }
  
  // For monthly invoices, use the specific month's payment date
  if (this.showCurrentMonthOnly && this.currentMonthIndex !== undefined) {
    const monthPayment = this.student.paymentRecord?.tuitionMonthlyPayments?.[this.currentMonthIndex];
    if (monthPayment?.paymentDate) {
      return new Date(monthPayment.paymentDate);
    }
  }
  
  // For cumulative invoices, use the most recent payment date
  if (!this.showCurrentMonthOnly && !this.componentOnly) {
    const payments = this.paymentService.getPaymentHistory(this.student.paymentRecord!);
    if (payments.length > 0) {
      // Sort by date and get the most recent
      const sortedPayments = payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return new Date(sortedPayments[0].date);
    }
  }
  
  // Fallback to current date if no payment dates found
  return new Date();
}

  private calculateCurrentMonthAmounts(): any {
  // Component-specific invoice logic
  if (this.componentOnly === 'uniform') {
    const uniformAmount = this.hasUniform() && this.student.paymentRecord?.uniform?.isPaid ? 
                          (this.student.paymentRecord.uniform.price || 0) : 0;
    return {
      tuition: 0,
      uniform: uniformAmount,
      transportation: 0,
      inscriptionFee: 0,
      grandTotal: uniformAmount
    };
  }

  if (this.componentOnly === 'inscriptionFee') {
    const inscriptionAmount = this.hasInscriptionFee() && this.student.paymentRecord?.inscriptionFee?.isPaid ? 
                             (this.student.paymentRecord.inscriptionFee.price || 0) : 0;
    return {
      tuition: 0,
      uniform: 0,
      transportation: 0,
      inscriptionFee: inscriptionAmount,
      grandTotal: inscriptionAmount
    };
  }

  // Handle tuition-only invoices
  if (this.componentOnly === 'tuition') {
    let tuitionAmount = 0;
    
    if (this.showCurrentMonthOnly && this.currentMonthIndex !== undefined) {
      // For monthly tuition invoices, get the full monthly amount (not just paid amount)
      const monthPayment = this.student.paymentRecord?.tuitionMonthlyPayments?.[this.currentMonthIndex];
      tuitionAmount = monthPayment?.amount || 0; // Full monthly amount
    } else {
      // For cumulative tuition invoices, get total paid tuition
      tuitionAmount = this.student.paymentRecord?.paidAmounts?.tuition || 0;
    }
    
    return {
      tuition: tuitionAmount,
      uniform: 0,
      transportation: 0,
      inscriptionFee: 0,
      grandTotal: tuitionAmount
    };
  }

  if (!this.showCurrentMonthOnly) {
    const paidAmounts = this.student.paymentRecord?.paidAmounts || {
      tuition: 0,
      uniform: 0,
      transportation: 0,
      inscriptionFee: 0,
      grandTotal: 0
    };
    return paidAmounts;
  }

  let tuitionAmount = 0;
  let uniformAmount = 0;
  let transportationAmount = 0;
  let inscriptionFeeAmount = 0;

  if (this.currentMonthIndex !== undefined && this.student.paymentRecord?.tuitionMonthlyPayments) {
    const monthPayment = this.student.paymentRecord.tuitionMonthlyPayments[this.currentMonthIndex];
    if (monthPayment && monthPayment.status === 'paid') {
      tuitionAmount = monthPayment.paidAmount || 0;
    }
  }

  if (this.hasUniform() && this.student.paymentRecord?.uniform?.isPaid) {
    const uniformPaymentDate = new Date(this.student.paymentRecord.uniform.paymentDate || '');
    const currentDate = this.currentPaymentDate || new Date();
    
    if (this.isSameMonth(uniformPaymentDate, currentDate)) {
      uniformAmount = this.student.paymentRecord.uniform.price || 0;
    }
  }

  if (this.hasInscriptionFee() && this.student.paymentRecord?.inscriptionFee?.isPaid) {
    const inscriptionPaymentDate = new Date(this.student.paymentRecord.inscriptionFee.paymentDate || '');
    const currentDate = this.currentPaymentDate || new Date();
    
    if (this.isSameMonth(inscriptionPaymentDate, currentDate)) {
      inscriptionFeeAmount = this.student.paymentRecord.inscriptionFee.price || 0;
    }
  }

  if (this.hasTransportation() && this.currentMonthIndex !== undefined) {
    const transportPayments = this.student.paymentRecord?.transportation?.monthlyPayments || [];
    const monthTransportPayment = transportPayments[this.currentMonthIndex];
    if (monthTransportPayment && monthTransportPayment.status === 'paid') {
      transportationAmount = monthTransportPayment.paidAmount || 0;
    }
  }

  const grandTotal = tuitionAmount + uniformAmount + transportationAmount + inscriptionFeeAmount;

  return {
    tuition: tuitionAmount,
    uniform: uniformAmount,
    transportation: transportationAmount,
    inscriptionFee: inscriptionFeeAmount,
    grandTotal
  };
}
  private isSameMonth(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() && 
           date1.getMonth() === date2.getMonth();
  }

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

  private calculateTVA(amounts: any): any {
    const tuitionTVA = amounts.tuition * this.TVA_RATE;
    const uniformTVA = amounts.uniform * this.TVA_RATE;
    const transportationTVA = amounts.transportation * this.TVA_RATE;
    const inscriptionFeeTVA = amounts.inscriptionFee * this.TVA_RATE;
    const totalTVA = tuitionTVA + uniformTVA + transportationTVA + inscriptionFeeTVA;

    return {
      rate: 0,
      tuitionTVA,
      uniformTVA,
      transportationTVA,
      inscriptionFeeTVA,
      totalTVA
    };
  }

  private calculateTotalsWithTVA(amounts: any, tva: any): any {
    return {
      tuitionHT: amounts.tuition,
      uniformHT: amounts.uniform,
      transportationHT: amounts.transportation,
      inscriptionFeeHT: amounts.inscriptionFee,
      totalHT: amounts.grandTotal,
      totalTTC: amounts.grandTotal + tva.totalTVA
    };
  }

  getTVAAmount(component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): number {
    switch (component) {
      case 'tuition':
        return this.invoiceData?.tva?.tuitionTVA || 0;
      case 'uniform':
        return this.invoiceData?.tva?.uniformTVA || 0;
      case 'transportation':
        return this.invoiceData?.tva?.transportationTVA || 0;
      case 'inscriptionFee':
        return this.invoiceData?.tva?.inscriptionFeeTVA || 0;
      default:
        return 0;
    }
  }

getHTAmount(component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): number {
  if (!this.invoiceData) return 0;
  
  switch (component) {
    case 'tuition':
      // ✅ CHANGE: For monthly invoices, show the full monthly amount
      if (this.showCurrentMonthOnly && this.currentMonthIndex !== undefined) {
        const monthPayment = this.student.paymentRecord?.tuitionMonthlyPayments?.[this.currentMonthIndex];
        return monthPayment?.amount || 0; // Show full amount, not just paid amount
      }
      return this.invoiceData.currentMonthAmounts.tuition;
    case 'uniform':
      return this.invoiceData.currentMonthAmounts.uniform;
    case 'transportation':
      // ✅ CHANGE: For monthly invoices, show the full monthly amount
      if (this.showCurrentMonthOnly && this.currentMonthIndex !== undefined) {
        const transportPayments = this.student.paymentRecord?.transportation?.monthlyPayments || [];
        const monthTransport = transportPayments[this.currentMonthIndex];
        return monthTransport?.amount || 0; // Show full amount, not just paid amount
      }
      return this.invoiceData.currentMonthAmounts.transportation;
    case 'inscriptionFee':
      return this.invoiceData.currentMonthAmounts.inscriptionFee;
    default:
      return 0;
  }
}

  getTTCAmount(component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): number {
    const htAmount = this.getHTAmount(component);
    const tvaAmount = this.getTVAAmount(component);
    return htAmount + tvaAmount;
  }

getOriginalAmountForCurrentMonth(component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): number {
  if (this.componentOnly) {
    if (component === 'uniform' && this.componentOnly === 'uniform') {
      return this.student.paymentRecord?.uniform?.price || 0;
    }
    if (component === 'inscriptionFee' && this.componentOnly === 'inscriptionFee') {
      return this.student.paymentRecord?.inscriptionFee?.price || 0;
    }
    return 0;
  }

  if (!this.showCurrentMonthOnly || this.currentMonthIndex === undefined) {
    const totalAmounts = this.student.paymentRecord?.totalAmounts;
    switch (component) {
      case 'tuition': return totalAmounts?.tuition || 0;
      case 'uniform': return totalAmounts?.uniform || 0;
      case 'transportation': return totalAmounts?.transportation || 0;
      case 'inscriptionFee': return totalAmounts?.inscriptionFee || 0;
      default: return 0;
    }
  }

  switch (component) {
    case 'tuition':
      const monthPayment = this.student.paymentRecord?.tuitionMonthlyPayments?.[this.currentMonthIndex];
      // ✅ CHANGE: Always return the full monthly amount, not just paid amount
      return monthPayment?.amount || 0; // Changed from monthPayment?.paidAmount
    case 'uniform':
      return this.invoiceData.currentMonthAmounts.uniform > 0 ? 
             (this.student.paymentRecord?.uniform?.price || 0) : 0;
    case 'transportation':
      const transportPayments = this.student.paymentRecord?.transportation?.monthlyPayments || [];
      const monthTransport = transportPayments[this.currentMonthIndex];
      // ✅ CHANGE: Always return the full monthly amount, not just paid amount
      return monthTransport?.amount || 0; // Changed from monthTransport?.paidAmount
    case 'inscriptionFee':
      return this.invoiceData.currentMonthAmounts.inscriptionFee > 0 ? 
             (this.student.paymentRecord?.inscriptionFee?.price || 0) : 0;
    default:
      return 0;
  }
}

  formatCurrencyTable(amount: number): string {
    return amount.toFixed(3).replace('.', ',');
  }

  formatDateShort(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }

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

  getEmptyRows(): number[] {
    const usedRows = this.getUsedRowsCount();
    const totalRows = 8; // Reduced for better PDF formatting
    const emptyRowsCount = Math.max(0, totalRows - usedRows);
    return Array(emptyRowsCount).fill(0).map((_, i) => i);
  }

private getUsedRowsCount(): number {
    let count = 0;
    
    if (this.componentOnly === 'uniform') {
      return this.hasUniformForCurrentInvoice() ? 1 : 0;
    }
    
    if (this.componentOnly === 'inscriptionFee') {
      return this.hasInscriptionFeeForCurrentInvoice() ? 1 : 0;
    }
    
    // ✅ ADD: Handle tuition-only invoices
    if (this.componentOnly === 'tuition') {
      return this.getHTAmount('tuition') > 0 ? 1 : 0;
    }
    
    if (this.getHTAmount('tuition') > 0) count++;
    if (this.hasUniformForCurrentInvoice()) count++;
    if (this.hasTransportationForCurrentInvoice()) count++;
    if (this.hasInscriptionFeeForCurrentInvoice()) count++;
    
    return count;
  }

hasUniformForCurrentInvoice(): boolean {
  if (this.componentOnly === 'tuition') return false; // ✅ ADD: Block uniform for tuition-only invoices
  if (this.componentOnly === 'inscriptionFee') return false;
  if (this.componentOnly === 'uniform') return this.hasUniform() && (this.student.paymentRecord?.uniform?.isPaid || false);
  
  if (!this.hasUniform()) return false;
  
  if (this.showCurrentMonthOnly) {
    return (this.invoiceData?.currentMonthAmounts?.uniform || 0) > 0;
  }
  
  return true;
}

hasTransportationForCurrentInvoice(): boolean {
  if (this.componentOnly === 'tuition') return false; // ✅ ADD: Block transportation for tuition-only invoices
  if (this.componentOnly) return false;
  if (!this.hasTransportation()) return false;
  
  if (this.showCurrentMonthOnly) {
    return (this.invoiceData?.currentMonthAmounts?.transportation || 0) > 0;
  }
  
  return true;
}



hasInscriptionFeeForCurrentInvoice(): boolean {
  if (this.componentOnly === 'tuition') return false; // ✅ ADD: Block inscription fee for tuition-only invoices
  if (this.componentOnly === 'uniform') return false;
  if (this.componentOnly === 'inscriptionFee') return this.hasInscriptionFee() && (this.student.paymentRecord?.inscriptionFee?.isPaid || false);
  
  if (!this.hasInscriptionFee()) return false;
  
  if (this.showCurrentMonthOnly) {
    return (this.invoiceData?.currentMonthAmounts?.inscriptionFee || 0) > 0;
  }
  
  return true;
}
  printInvoice(): void {
    window.print();
  }

  async downloadPDF(): Promise<void> {
    this.isGeneratingPdf = true;
    
    try {
      const invoiceElement = document.querySelector('.invoice-content') as HTMLElement;
      if (!invoiceElement) {
        console.error('Invoice content not found');
        this.isGeneratingPdf = false;
        return;
      }
      
      // Create a container specifically for PDF generation
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'fixed';
      pdfContainer.style.top = '-9999px';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '794px'; // A4 width in pixels at 96 DPI
      pdfContainer.style.minHeight = '1123px'; // A4 height in pixels at 96 DPI
      pdfContainer.style.padding = '40px';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.fontSize = '11px';
      pdfContainer.style.lineHeight = '1.4';
      pdfContainer.style.color = '#000';
      
      const clonedInvoice = invoiceElement.cloneNode(true) as HTMLElement;
      this.optimizeForPDF(clonedInvoice);
      pdfContainer.appendChild(clonedInvoice);
      document.body.appendChild(pdfContainer);

      // Generate canvas with better settings for single page
      const canvas = await html2canvas(pdfContainer, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: Math.min(1123, pdfContainer.scrollHeight + 80),
        windowWidth: 794,
        windowHeight: 1123
      });

      document.body.removeChild(pdfContainer);

      // Create PDF with optimized dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - (2 * margin);
      
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      
      // Always try to fit on single page
      if (imgHeight <= pageHeight - (2 * margin)) {
        pdf.addImage(
          canvas.toDataURL('image/png', 0.95),
          'PNG',
          margin,
          margin,
          imgWidth,
          imgHeight
        );
      } else {
        // If too tall, scale down to fit single page
        const scaledHeight = pageHeight - (2 * margin);
        const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
        
        pdf.addImage(
          canvas.toDataURL('image/png', 0.95),
          'PNG',
          (pageWidth - scaledWidth) / 2,
          margin,
          scaledWidth,
          scaledHeight
        );
      }

      // Generate filename
      let fileName = `Facture_${this.student.name.replace(/\s+/g, '_')}_${this.invoiceData.invoiceNumber.split('-').pop()}`;
      
      if (this.componentOnly === 'uniform') {
        fileName += '_Uniforme';
      } else if (this.componentOnly === 'inscriptionFee') {
        fileName += '_FraisInscription';
      } else if (this.showCurrentMonthOnly && this.invoiceData.currentMonthInfo) {
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

  private optimizeForPDF(element: HTMLElement): void {
    // Reduce margins and padding for PDF
    element.style.margin = '0';
    element.style.padding = '20px';
    element.style.fontSize = '10px';
    element.style.lineHeight = '1.3';
    
    // Optimize table for single page
    const mainTable = element.querySelector('.main-table') as HTMLElement;
    if (mainTable) {
      mainTable.style.marginBottom = '15px';
      mainTable.style.fontSize = '9px';
      
      const cells = mainTable.querySelectorAll('td, th');
      cells.forEach(cell => {
        const cellElement = cell as HTMLElement;
        cellElement.style.padding = '6px 4px';
        cellElement.style.fontSize = '9px';
      });
    }
    
    // Optimize totals section
    const totalsSection = element.querySelector('.totals-section') as HTMLElement;
    if (totalsSection) {
      totalsSection.style.marginBottom = '15px';
    }
    
    // Optimize footer
    const footer = element.querySelector('.footer-section') as HTMLElement;
    if (footer) {
      footer.style.marginTop = '15px';
    }
    
    // Optimize signature box
    const signatureBox = element.querySelector('.signature-box') as HTMLElement;
    if (signatureBox) {
      signatureBox.style.height = '60px';
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
      case 'inscriptionFee': return 'Frais d\'inscription';
      default: return component;
    }
  }

  hasUniform(): boolean {
    return this.student.paymentRecord?.uniform?.purchased || false;
  }

  hasTransportation(): boolean {
    return this.student.paymentRecord?.transportation?.using || false;
  }

  hasInscriptionFee(): boolean {
    return this.student.paymentRecord?.inscriptionFee?.applicable || false;
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

getInvoiceTitle(): string {
  if (this.componentOnly === 'uniform') {
    return 'FACTURE - UNIFORME SCOLAIRE';
  }
  if (this.componentOnly === 'inscriptionFee') {
    return 'FACTURE - FRAIS D\'INSCRIPTION';
  }
  // Add this new condition:
  if (this.componentOnly === 'tuition' && this.showCurrentMonthOnly && this.invoiceData?.currentMonthInfo) {
    return `FACTURE - FRAIS SCOLAIRES ${this.invoiceData.currentMonthInfo.monthName.toUpperCase()}`;
  }
  if (this.showCurrentMonthOnly && this.invoiceData?.currentMonthInfo) {
    return `FACTURE - ${this.invoiceData.currentMonthInfo.monthName.toUpperCase()}`;
  }
  return 'B.L. FACTURE';
}

  getTuitionPeriodDescription(): string {
    if (this.showCurrentMonthOnly && this.invoiceData?.currentMonthInfo) {
      return `FRAIS SCOLAIRES - ${this.invoiceData.currentMonthInfo.monthName.toUpperCase()} ${this.academicYear}`;
    }
    return `FRAIS SCOLAIRES - ANNÉE ACADÉMIQUE ${this.academicYear}`;
  }

  getTransportationPeriodDescription(): string {
    if (this.showCurrentMonthOnly && this.invoiceData?.currentMonthInfo) {
      return `TRANSPORT - ${this.getTransportationType().toUpperCase()} - ${this.invoiceData.currentMonthInfo.monthName.toUpperCase()}`;
    }
    return `TRANSPORT - ${this.getTransportationType().toUpperCase()}`;
  }

  // Ajouter cette méthode dans votre composant invoice.component.ts

private referenceCounter = 1;

getNextReferenceNumber(): string {
  // Reset counter for each invoice generation
  if (this.referenceCounter === 1) {
    // Count existing items to set proper starting number
    let counter = 0;
    
    // Check tuition
    if (!this.componentOnly && this.getHTAmount('tuition') > 0) {
      counter++;
    }
    
    // Check uniform
    if (this.hasUniformForCurrentInvoice() && this.getHTAmount('uniform') > 0) {
      counter++;
    }
    
    // Return next number
    return String(counter + 1).padStart(3, '0');
  }
  
  return String(this.referenceCounter++).padStart(3, '0');
}

// Alternative simpler method - you can use this instead
getInvoiceItemNumber(): number {
  let itemCount = 0;
  
  // Count tuition
  if (!this.componentOnly && this.getHTAmount('tuition') > 0) {
    itemCount++;
  }
  
  // Count uniform
  if (this.hasUniformForCurrentInvoice() && this.getHTAmount('uniform') > 0) {
    itemCount++;
  }
  
  // Count transportation
  if (!this.componentOnly && this.hasTransportationForCurrentInvoice() && this.getHTAmount('transportation') > 0) {
    itemCount++;
  }
  
  // This will be called for inscription fee, so return next number
  return itemCount + 1;
}
}