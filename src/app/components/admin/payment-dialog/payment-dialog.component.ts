import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  paymentForm: FormGroup;
  isLoading = false;
  selectedMonth: MonthlyPayment | null = null;
  paymentMethods = [
    { value: 'cash', label: 'Espèces', icon: 'payments' },
    { value: 'check', label: 'Chèque', icon: 'receipt' },
    { value: 'bank_transfer', label: 'Virement', icon: 'account_balance' },
    { value: 'online', label: 'En ligne', icon: 'credit_card' }
  ];

  constructor(
    public dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentDialogData,
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private snackBar: MatSnackBar
  ) {
    this.paymentForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.data.type === 'monthly' && this.data.monthIndex !== undefined) {
      this.selectedMonth = this.data.student.paymentRecord?.monthlyPayments[this.data.monthIndex] || null;
    }
    this.setupFormDefaults();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      monthIndex: [null],
      amount: [0, [Validators.required, Validators.min(1)]],
      paymentMethod: ['cash', Validators.required],
      paymentDate: [new Date(), Validators.required],
      receiptNumber: [''],
      notes: [''],
      discount: [0, [Validators.min(0)]]
    });
  }

  private setupFormDefaults(): void {
    if (this.data.type === 'monthly' && this.selectedMonth) {
      const remainingAmount = this.selectedMonth.amount - this.selectedMonth.paidAmount;
      this.paymentForm.patchValue({
        monthIndex: this.data.monthIndex,
        amount: remainingAmount
      });
    } else if (this.data.type === 'annual' && this.data.student.paymentRecord) {
      this.paymentForm.patchValue({
        amount: this.data.student.paymentRecord.remainingAmount
      });
    }
  }

  getUnpaidMonths(): MonthlyPayment[] {
    if (!this.data.student.paymentRecord) return [];
    return this.data.student.paymentRecord.monthlyPayments.filter(m => m.status !== 'paid');
  }

  onMonthSelect(monthIndex: number): void {
    const month = this.data.student.paymentRecord?.monthlyPayments[monthIndex];
    if (month) {
      this.selectedMonth = month;
      const remainingAmount = month.amount - month.paidAmount;
      this.paymentForm.patchValue({
        monthIndex: monthIndex,
        amount: remainingAmount
      });
    }
  }

  calculateTotal(): number {
    const amount = this.paymentForm.get('amount')?.value || 0;
    const discount = this.paymentForm.get('discount')?.value || 0;
    return Math.max(0, amount - discount);
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.markFormGroupTouched(this.paymentForm);
      return;
    }

    this.isLoading = true;
    const formValue = this.paymentForm.value;
    const studentId = this.data.student._id;

    const paymentRequest: RecordPaymentRequest = {
      amount: formValue.amount,
      paymentMethod: formValue.paymentMethod,
      paymentDate: formValue.paymentDate,
      notes: formValue.notes,
      receiptNumber: formValue.receiptNumber
    };

    if (this.data.type === 'monthly') {
      paymentRequest.monthIndex = formValue.monthIndex;
      
      this.paymentService.recordMonthlyPayment(studentId, paymentRequest, this.data.academicYear)
        .subscribe({
          next: (response) => {
            this.showSnackBar('Paiement mensuel enregistré avec succès', 'success');
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.showSnackBar(error.error?.message || 'Erreur lors de l\'enregistrement', 'error');
            this.isLoading = false;
          }
        });
    } else {
      paymentRequest.discount = formValue.discount;
      
      this.paymentService.recordAnnualPayment(studentId, paymentRequest, this.data.academicYear)
        .subscribe({
          next: (response) => {
            this.showSnackBar('Paiement annuel enregistré avec succès', 'success');
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.showSnackBar(error.error?.message || 'Erreur lors de l\'enregistrement', 'error');
            this.isLoading = false;
          }
        });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
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

  private showSnackBar(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`${type}-snackbar`]
    });
  }

  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }
}