import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaymentService } from '../../../services/payment.service';
import { PaymentConfiguration } from '../../../models/payment.model';
import { MatCheckboxModule } from '@angular/material/checkbox';
@Component({
  selector: 'app-payment-config',
  templateUrl: './payment-config.component.html',
  styleUrls: ['./payment-config.component.css']
})
export class PaymentConfigComponent implements OnInit {
  configForm: FormGroup;
  isLoading = false;
  currentConfig: PaymentConfiguration | null = null;
  academicYears: string[] = [];
  currentAcademicYear: string;

  months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
  ];

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.currentAcademicYear = this.paymentService.getCurrentAcademicYear();
    this.academicYears = this.paymentService.getAcademicYears();
    this.configForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadCurrentConfig();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      academicYear: [this.currentAcademicYear, Validators.required],
      paymentAmounts: this.fb.group({
        college: [0, [Validators.required, Validators.min(0)]],
        moyenne: [0, [Validators.required, Validators.min(0)]],
        lycee: [0, [Validators.required, Validators.min(0)]]
      }),
      paymentSchedule: this.fb.group({
        startMonth: [9, Validators.required],
        endMonth: [5, Validators.required]
      }),
      gracePeriod: [5, [Validators.required, Validators.min(0), Validators.max(30)]],
      annualPaymentDiscount: this.fb.group({
        enabled: [false],
        percentage: [0, [Validators.min(0), Validators.max(100)]],
        amount: [0, [Validators.min(0)]]
      })
    });
  }

  loadCurrentConfig(): void {
    this.isLoading = true;
    const academicYear = this.configForm.get('academicYear')?.value;
    
    this.paymentService.getPaymentConfig(academicYear).subscribe({
      next: (config) => {
        this.currentConfig = config;
        this.patchFormWithConfig(config);
        this.isLoading = false;
      },
      error: (error) => {
        if (error.status !== 404) {
          this.showSnackBar('Erreur lors du chargement de la configuration', 'error');
        }
        this.isLoading = false;
      }
    });
  }

  private patchFormWithConfig(config: PaymentConfiguration): void {
    this.configForm.patchValue({
      academicYear: config.academicYear,
      paymentAmounts: config.paymentAmounts,
      paymentSchedule: {
        startMonth: config.paymentSchedule.startMonth,
        endMonth: config.paymentSchedule.endMonth
      },
      gracePeriod: config.gracePeriod,
      annualPaymentDiscount: config.annualPaymentDiscount || {
        enabled: false,
        percentage: 0,
        amount: 0
      }
    });
  }

  calculateTotalMonths(): number {
    const startMonth = this.configForm.get('paymentSchedule.startMonth')?.value;
    const endMonth = this.configForm.get('paymentSchedule.endMonth')?.value;
    
    let months = endMonth - startMonth + 1;
    if (months <= 0) {
      months += 12;
    }
    return months;
  }

  calculateMonthlyAmount(classGroup: string): number {
    const totalAmount = this.configForm.get(`paymentAmounts.${classGroup}`)?.value || 0;
    const totalMonths = this.calculateTotalMonths();
    return totalMonths > 0 ? Math.round(totalAmount / totalMonths) : 0;
  }

  onSubmit(): void {
    if (this.configForm.invalid) {
      this.markFormGroupTouched(this.configForm);
      return;
    }

    this.isLoading = true;
    const formValue = this.configForm.value;

    this.paymentService.createOrUpdatePaymentConfig(formValue).subscribe({
      next: (config) => {
        this.currentConfig = config;
        this.showSnackBar('Configuration enregistrée avec succès', 'success');
        setTimeout(() => {
          this.router.navigate(['/payments']);
        }, 1500);
      },
      error: (error) => {
        this.showSnackBar(error.error?.message || 'Erreur lors de l\'enregistrement', 'error');
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/payments']);
  }

  onAcademicYearChange(): void {
    this.loadCurrentConfig();
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