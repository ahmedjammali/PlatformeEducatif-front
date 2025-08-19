import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentService } from '../../../services/payment.service';
import { StudentWithPayment, MonthlyPayment, RecordPaymentRequest } from '../../../models/payment.model';

export interface PaymentDialogData {
  student: StudentWithPayment;
  type: 'monthly' | 'annual';
  monthIndex?: number;
  academicYear: string;
}

@Component({
  selector: 'app-payment-dialog',
  templateUrl: './payment-dialog.component.html',
  styleUrls: ['./payment-dialog.component.css']
})
export class PaymentDialogComponent implements OnInit {
  @Input() data!: PaymentDialogData;
  @Output() dialogClosed = new EventEmitter<any>();

  paymentForm: FormGroup;
  isLoading = false;
  selectedMonth: MonthlyPayment | null = null;
  
  paymentMethods = [
    { value: 'cash', label: 'Espèces', icon: '💵' },
    { value: 'check', label: 'Chèque', icon: '📝' },
    { value: 'bank_transfer', label: 'Virement', icon: '🏦' },
    { value: 'online', label: 'En ligne', icon: '💳' }
  ];

  // Create a mock dialogRef for compatibility
  dialogRef = {
    close: (result?: any) => {
      this.dialogClosed.emit(result);
    }
  };

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService
  ) {
    this.paymentForm = this.createForm();
  }

  ngOnInit(): void {
    if (!this.data) {
      console.error('PaymentDialogComponent: data input is required');
      return;
    }
    
    this.setupFormDefaults();
    this.setupFormValidation();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      monthIndex: [null],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['cash', Validators.required],
      paymentDate: [this.formatDateForInput(new Date()), Validators.required],
      receiptNumber: [''],
      notes: [''],
      discount: [0, [Validators.min(0)]]
    });
  }

  private setupFormDefaults(): void {
    if (this.data.type === 'monthly' && this.data.monthIndex !== undefined) {
      const month = this.data.student.paymentRecord?.monthlyPayments[this.data.monthIndex];
      if (month) {
        this.selectedMonth = month;
        const remainingAmount = month.amount - month.paidAmount;
        this.paymentForm.patchValue({
          monthIndex: this.data.monthIndex,
          amount: remainingAmount
        });
      }
    } else if (this.data.type === 'annual' && this.data.student.paymentRecord) {
      this.paymentForm.patchValue({
        amount: this.data.student.paymentRecord.remainingAmount
      });
    }
  }

  private setupFormValidation(): void {
    // Custom validation for amount based on available balance
    this.paymentForm.get('amount')?.valueChanges.subscribe(amount => {
      if (this.selectedMonth && amount > (this.selectedMonth.amount - this.selectedMonth.paidAmount)) {
        this.paymentForm.get('amount')?.setErrors({ 
          exceedsBalance: { 
            max: this.selectedMonth.amount - this.selectedMonth.paidAmount,
            actual: amount 
          }
        });
      }
    });
  }

  getUnpaidMonths(): MonthlyPayment[] {
    if (!this.data.student.paymentRecord) return [];
    return this.data.student.paymentRecord.monthlyPayments
      .filter(m => m.status !== 'paid')
      .sort((a, b) => a.month - b.month);
  }

  getMonthIndex(month: MonthlyPayment): number {
    if (!this.data.student.paymentRecord) return -1;
    return this.data.student.paymentRecord.monthlyPayments.findIndex(m => 
      m.month === month.month && m.monthName === month.monthName
    );
  }

  onMonthSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const monthIndex = parseInt(target.value);
    
    if (isNaN(monthIndex) || !this.data.student.paymentRecord) return;
    
    const month = this.data.student.paymentRecord.monthlyPayments[monthIndex];
    if (month) {
      this.selectedMonth = month;
      const remainingAmount = month.amount - month.paidAmount;
      this.paymentForm.patchValue({
        monthIndex: monthIndex,
        amount: remainingAmount
      });
    }
  }

  selectPaymentMethod(method: string): void {
    this.paymentForm.patchValue({ paymentMethod: method });
  }

  calculateTotal(): number {
    const amount = this.paymentForm.get('amount')?.value || 0;
    const discount = this.data.type === 'annual' ? (this.paymentForm.get('discount')?.value || 0) : 0;
    return Math.max(0, amount - discount);
  }

  calculateNewBalance(): number {
    if (!this.data.student.paymentRecord) return 0;
    const currentRemaining = this.data.student.paymentRecord.remainingAmount;
    const paymentAmount = this.calculateTotal();
    return Math.max(0, currentRemaining - paymentAmount);
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.markFormGroupTouched(this.paymentForm);
      this.showMessage('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    // Validate payment amount
    if (!this.validatePaymentAmount()) {
      return;
    }

    this.isLoading = true;
    const formValue = this.paymentForm.value;
    const studentId = this.data.student._id;

    const paymentRequest: RecordPaymentRequest = {
      amount: formValue.amount,
      paymentMethod: formValue.paymentMethod,
      paymentDate: formValue.paymentDate,
      notes: formValue.notes?.trim() || undefined,
      receiptNumber: formValue.receiptNumber?.trim() || undefined
    };

    if (this.data.type === 'monthly') {
      paymentRequest.monthIndex = formValue.monthIndex;
      
      this.paymentService.recordMonthlyPayment(studentId, paymentRequest, this.data.academicYear)
        .subscribe({
          next: (response) => {

            this.dialogRef.close({
              success: true,
              paymentRecord: response,
              type: 'monthly'
            });
          },
          error: (error) => {
            console.error('Error recording monthly payment:', error);
            this.showMessage(error.error?.message || 'Erreur lors de l\'enregistrement du paiement', 'error');
            this.isLoading = false;
          }
        });
    } else {
      paymentRequest.discount = formValue.discount || 0;
      
      this.paymentService.recordAnnualPayment(studentId, paymentRequest, this.data.academicYear)
        .subscribe({
          next: (response) => {
            this.dialogRef.close({
              success: true,
              paymentRecord: response,
              type: 'annual'
            });
          },
          error: (error) => {
            console.error('Error recording annual payment:', error);
            this.showMessage(error.error?.message || 'Erreur lors de l\'enregistrement du paiement', 'error');
            this.isLoading = false;
          }
        });
    }
  }

  private validatePaymentAmount(): boolean {
    const amount = this.paymentForm.get('amount')?.value || 0;
    
    if (amount <= 0) {
      this.showMessage('Le montant doit être supérieur à zéro', 'error');
      return false;
    }

    if (this.data.type === 'monthly' && this.selectedMonth) {
      const maxAmount = this.selectedMonth.amount - this.selectedMonth.paidAmount;
      if (amount > maxAmount) {
        this.showMessage(`Le montant ne peut pas dépasser ${this.formatCurrency(maxAmount)}`, 'error');
        return false;
      }
    }

    if (this.data.student.paymentRecord && amount > this.data.student.paymentRecord.remainingAmount) {
      this.showMessage('Le montant dépasse le solde restant de l\'étudiant', 'error');
      return false;
    }

    return true;
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  // Form validation helpers
  isFieldInvalid(fieldPath: string): boolean {
    const field = this.paymentForm.get(fieldPath);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldPath: string): string {
    const field = this.paymentForm.get(fieldPath);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['min']) return `La valeur minimum est ${field.errors['min'].min}`;
      if (field.errors['exceedsBalance']) {
        const error = field.errors['exceedsBalance'];
        return `Le montant ne peut pas dépasser ${this.formatCurrency(error.max)}`;
      }
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'En attente',
      'partial': 'Partiel',
      'paid': 'Payé',
      'overdue': 'En retard'
    };
    return statusMap[status] || status;
  }

  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    if (type === 'error') {
      alert(`Erreur: ${message}`);
    } else if (type === 'success') {
      // Create a simple success toast
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 9999;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    }
  }
}