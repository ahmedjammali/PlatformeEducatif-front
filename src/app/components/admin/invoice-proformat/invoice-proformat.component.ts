// invoice-proformat.component.ts - Updated for yearly amounts
import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { StudentWithPayment, PaymentHistoryItem } from '../../../models/payment.model';
import { PaymentService } from '../../../services/payment.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface InvoiceProformatData {
  student: StudentWithPayment;
  academicYear: string;
  generatedDate: Date;
  InvoiceProformatNumber: string;
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
  selector: 'app-invoice-proformat',
  templateUrl: './invoice-proformat.component.html',
  styleUrls: ['./invoice-proformat.component.css']
})
export class InvoiceProformatComponent implements OnInit {
  @Input() student!: StudentWithPayment;
  @Input() academicYear!: string;
  @Input() showPaymentHistory: boolean = false;
  @Input() currentMonthIndex?: number;
  @Input() currentPaymentDate?: Date;
  @Input() showCurrentMonthOnly: boolean = false;
  @Input() componentOnly?: 'uniform' | 'inscriptionFee' | 'tuition';
  
  InvoiceProformatData!: InvoiceProformatData;
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
    const InvoiceProformatNumber = `INV-PROFORMAT-${this.academicYear}-${studentInitials}-${timestamp.toString().slice(-6)}`;

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
    const InvoiceProformatDate = this.getInvoiceProformatDate();
    
    this.InvoiceProformatData = {
      student: this.student,
      academicYear: this.academicYear,
      generatedDate: InvoiceProformatDate,
      InvoiceProformatNumber,
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
        phone: '51333695 / 94051936 / 55000611',
        email: 'onsschool2019@gmail.com'
      }
    };
  }

  private calculateCurrentMonthAmounts(): any {
    // ✅ FOR PROFORMAT: Always show TOTAL YEARLY AMOUNTS from totalAmounts
    const totalAmounts = this.student.paymentRecord?.totalAmounts || {
      tuition: 0,
      uniform: 0,
      transportation: 0,
      inscriptionFee: 0,
      grandTotal: 0
    };

    return {
      tuition: totalAmounts.tuition,
      uniform: totalAmounts.uniform,
      transportation: totalAmounts.transportation,
      inscriptionFee: totalAmounts.inscriptionFee,
      grandTotal: totalAmounts.grandTotal
    };
  }

  private getInvoiceProformatDate(): Date {
    return new Date();
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
        return this.InvoiceProformatData?.tva?.tuitionTVA || 0;
      case 'uniform':
        return this.InvoiceProformatData?.tva?.uniformTVA || 0;
      case 'transportation':
        return this.InvoiceProformatData?.tva?.transportationTVA || 0;
      case 'inscriptionFee':
        return this.InvoiceProformatData?.tva?.inscriptionFeeTVA || 0;
      default:
        return 0;
    }
  }

  getHTAmount(component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): number {
    if (!this.InvoiceProformatData) return 0;
    
    // ✅ FOR PROFORMAT: Always return total yearly amounts
    switch (component) {
      case 'tuition':
        return this.InvoiceProformatData.currentMonthAmounts.tuition;
      case 'uniform':
        return this.InvoiceProformatData.currentMonthAmounts.uniform;
      case 'transportation':
        return this.InvoiceProformatData.currentMonthAmounts.transportation;
      case 'inscriptionFee':
        return this.InvoiceProformatData.currentMonthAmounts.inscriptionFee;
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
    // ✅ FOR PROFORMAT: Always return total yearly amounts
    const totalAmounts = this.student.paymentRecord?.totalAmounts;
    
    switch (component) {
      case 'tuition': 
        return totalAmounts?.tuition || 0;
      case 'uniform': 
        return totalAmounts?.uniform || 0;
      case 'transportation': 
        return totalAmounts?.transportation || 0;
      case 'inscriptionFee': 
        return totalAmounts?.inscriptionFee || 0;
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
    const totalRows = 8;
    const emptyRowsCount = Math.max(0, totalRows - usedRows);
    return Array(emptyRowsCount).fill(0).map((_, i) => i);
  }

  private getUsedRowsCount(): number {
    let count = 0;
    
    if (this.getHTAmount('tuition') > 0) count++;
    if (this.hasUniformForCurrentInvoiceProformat()) count++;
    if (this.hasTransportationForCurrentInvoiceProformat()) count++;
    if (this.hasInscriptionFeeForCurrentInvoiceProformat()) count++;
    
    return count;
  }

  hasUniformForCurrentInvoiceProformat(): boolean {
    // ✅ FOR PROFORMAT: Show if student has uniform (regardless of payment status)
    return this.hasUniform() && (this.student.paymentRecord?.uniform?.price || 0) > 0;
  }

  hasTransportationForCurrentInvoiceProformat(): boolean {
    // ✅ FOR PROFORMAT: Show if student uses transportation (regardless of payment status)
    return this.hasTransportation() && (this.student.paymentRecord?.totalAmounts?.transportation || 0) > 0;
  }

  hasInscriptionFeeForCurrentInvoiceProformat(): boolean {
    // ✅ FOR PROFORMAT: Show if inscription fee is applicable (regardless of payment status)
    return this.hasInscriptionFee() && (this.student.paymentRecord?.inscriptionFee?.price || 0) > 0;
  }

  printInvoiceProformat(): void {
    window.print();
  }

  async downloadPDF(): Promise<void> {
    this.isGeneratingPdf = true;
    
    try {
      const InvoiceProformatElement = document.querySelector('.invoice-proformat-content') as HTMLElement;
      if (!InvoiceProformatElement) {
        console.error('Invoice Proformat content not found');
        this.isGeneratingPdf = false;
        return;
      }
      
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'fixed';
      pdfContainer.style.top = '-9999px';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '794px';
      pdfContainer.style.minHeight = '1123px';
      pdfContainer.style.padding = '40px';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.fontSize = '11px';
      pdfContainer.style.lineHeight = '1.4';
      pdfContainer.style.color = '#000';
      
      const clonedInvoiceProformat = InvoiceProformatElement.cloneNode(true) as HTMLElement;
      this.optimizeForPDF(clonedInvoiceProformat);
      pdfContainer.appendChild(clonedInvoiceProformat);
      document.body.appendChild(pdfContainer);

      const canvas = await html2canvas(pdfContainer, {
        useCORS: true,
        logging: false,
        width: 794,
        height: Math.min(1123, pdfContainer.scrollHeight + 80),
      });

      document.body.removeChild(pdfContainer);

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

      const fileName = `Facture_Proformative_${this.student.name.replace(/\s+/g, '_')}_${this.academicYear}.pdf`;
      
      pdf.save(fileName);
      this.isGeneratingPdf = false;
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.isGeneratingPdf = false;
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    }
  }

  private optimizeForPDF(element: HTMLElement): void {
    element.style.margin = '0';
    element.style.padding = '20px';
    element.style.fontSize = '10px';
    element.style.lineHeight = '1.3';
    
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
    
    const totalsSection = element.querySelector('.totals-section') as HTMLElement;
    if (totalsSection) {
      totalsSection.style.marginBottom = '15px';
    }
    
    const footer = element.querySelector('.footer-section') as HTMLElement;
    if (footer) {
      footer.style.marginTop = '15px';
    }
    
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

  hasDiscount(): boolean {
    return this.InvoiceProformatData?.discount?.enabled || false;
  }

  getOriginalTuitionAmount(): number {
    return this.InvoiceProformatData?.discount?.originalTuitionAmount || 0;
  }

  getDiscountAmount(): number {
    return this.InvoiceProformatData?.discount?.discountAmount || 0;
  }

  getDiscountPercentage(): number {
    return this.InvoiceProformatData?.discount?.percentage || 0;
  }

  getInvoiceProformatTitle(): string {
    return 'FACTURE PROFORMATIVE - ANNÉE ACADÉMIQUE COMPLÈTE';
  }

  getTuitionPeriodDescription(): string {
    return `FRAIS SCOLAIRES - ANNÉE COMPLÈTE ${this.academicYear}`;
  }

  getTransportationPeriodDescription(): string {
    return `TRANSPORT - ${this.getTransportationType().toUpperCase()} - ANNÉE COMPLÈTE`;
  }

  private referenceCounter = 1;

  getNextReferenceNumber(): string {
    if (this.referenceCounter === 1) {
      let counter = 0;
      
      if (this.getHTAmount('tuition') > 0) {
        counter++;
      }
      
      if (this.hasUniformForCurrentInvoiceProformat() && this.getHTAmount('uniform') > 0) {
        counter++;
      }
      
      return String(counter + 1).padStart(3, '0');
    }
    
    return String(this.referenceCounter++).padStart(3, '0');
  }

  getInvoiceProformatItemNumber(): number {
    let itemCount = 0;
    
    if (this.getHTAmount('tuition') > 0) {
      itemCount++;
    }
    
    if (this.hasUniformForCurrentInvoiceProformat() && this.getHTAmount('uniform') > 0) {
      itemCount++;
    }
    
    if (this.hasTransportationForCurrentInvoiceProformat() && this.getHTAmount('transportation') > 0) {
      itemCount++;
    }
    
    return itemCount + 1;
  }
}