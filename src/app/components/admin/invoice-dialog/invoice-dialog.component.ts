// Enhanced invoice-dialog.component.ts - Updated for component-specific invoices
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { StudentWithPayment } from '../../../models/payment.model';

@Component({
  selector: 'app-invoice-dialog',
  template: `
    <div class="invoice-dialog-overlay invoice-print-container" (click)="onOverlayClick($event)">
      <div class="invoice-dialog-container" (click)="$event.stopPropagation()">
        <div class="invoice-dialog-header no-print">
          <div class="header-content">
            <div class="header-icon">📋</div>
            <div class="header-text">
              <h2>
                Facture - {{ student?.name }}
                <span *ngIf="showCurrentMonthOnly && monthName" class="month-badge">
                  {{ monthName }}
                </span>
                <span *ngIf="componentOnly === 'uniform'" class="component-badge uniform-badge">
                  Uniforme
                </span>
                <span *ngIf="componentOnly === 'inscriptionFee'" class="component-badge inscription-badge">
                  Frais d'inscription
                </span>
              </h2>
              <p>{{ academicYear }}</p>
              <small class="invoice-type">
                {{ getInvoiceTypeDescription() }}
              </small>
            </div>
          </div>
          <button class="close-btn" (click)="closeDialog()" type="button" title="Fermer">
            <span>✖️</span>
          </button>
        </div>
        
        <div class="invoice-dialog-content">
          <app-invoice 
            [student]="student" 
            [academicYear]="academicYear"
            [showCurrentMonthOnly]="showCurrentMonthOnly"
            [currentMonthIndex]="currentMonthIndex"
            [currentPaymentDate]="currentPaymentDate"
            [componentOnly]="componentOnly"
            [showPaymentHistory]="!showCurrentMonthOnly && !componentOnly">
          </app-invoice>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invoice-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 9999);
      padding: var(--spacing-md, 1rem);
      backdrop-filter: blur(15px);
      animation: fadeInBackdrop 0.3s ease-out;
    }

    @keyframes fadeInBackdrop {
      from {
        opacity: 0;
        backdrop-filter: blur(0px);
        background: rgba(255, 255, 255, 0);
      }
      to {
        opacity: 1;
        backdrop-filter: blur(15px);
        background: rgba(255, 255, 255, 0.85);
      }
    }

    .invoice-dialog-container {
      background: var(--color-white, white);
      border-radius: var(--radius-lg, 20px);
      max-width: 95vw;
      max-height: 95vh;
      overflow: hidden;
      box-shadow: var(--shadow-xl, 0 20px 40px rgba(74, 98, 138, 0.25));
      display: flex;
      flex-direction: column;
      animation: slideInScale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: 2px solid var(--color-secondary, #B9E5E8);
    }

    @keyframes slideInScale {
      from {
        opacity: 0;
        transform: translateY(-50px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes slideOutScale {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-50px) scale(0.9);
      }
    }

    @keyframes fadeOutBackdrop {
      from {
        opacity: 1;
        backdrop-filter: blur(15px);
        background: rgba(255, 255, 255, 0.85);
      }
      to {
        opacity: 0;
        backdrop-filter: blur(0px);
        background: rgba(255, 255, 255, 0);
      }
    }

    .invoice-dialog-header {
      background: var(--gradient-primary, linear-gradient(135deg, #4A628A, #7AB2D3));
      color: var(--color-white, white);
      padding: var(--spacing-xl, 1.5rem);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: var(--radius-lg, 20px) var(--radius-lg, 20px) 0 0;
      position: relative;
      overflow: hidden;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-md, 1rem);
      z-index: 1;
    }

    .header-icon {
      font-size: 2rem;
      padding: var(--spacing-sm, 0.5rem);
      background: rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-full, 50%);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
    }

    .header-text {
      flex: 1;
    }

    .header-text h2 {
      margin: 0;
      font-size: var(--font-xl, 1.25rem);
      font-weight: 700;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .header-text p {
      margin: 0.25rem 0 0;
      font-size: var(--font-sm, 0.875rem);
      opacity: 0.9;
      font-weight: 500;
    }

    .month-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .component-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .uniform-badge {
      background: rgba(255, 152, 0, 0.2);
      color: white;
    }

    .inscription-badge {
      background: rgba(156, 39, 176, 0.2);
      color: white;
    }

    .invoice-type {
      display: block;
      margin-top: 2px;
      font-size: 0.7rem;
      opacity: 0.8;
      font-style: italic;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.2);
      color: var(--color-white, white);
      font-size: 1.2rem;
      width: 50px;
      height: 50px;
      border-radius: var(--radius-full, 50%);
      cursor: pointer;
      transition: var(--transition-base, 0.3s ease);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      z-index: 1;
      position: relative;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.4);
      transform: scale(1.1) rotate(90deg);
    }

    .invoice-dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background: var(--color-gray-light, #F5F5F5);
    }

    @media print {
      .invoice-dialog-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
        backdrop-filter: none !important;
        animation: none !important;
      }
      
      .invoice-dialog-container {
        max-width: none !important;
        max-height: none !important;
        width: 100% !important;
        height: 100% !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        border: none !important;
        animation: none !important;
      }
      
      .invoice-dialog-header {
        display: none !important;
      }
      
      .invoice-dialog-content {
        overflow: visible !important;
        background: white !important;
      }
    }

    @media (max-width: 768px) {
      .header-text h2 {
        font-size: 1rem;
      }
      
      .component-badge,
      .month-badge {
        font-size: 0.65rem;
        padding: 3px 6px;
      }
      
      .header-icon {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
      }
    }
  `]
})
export class InvoiceDialogComponent implements OnInit, OnDestroy {
  @Input() student!: StudentWithPayment;
  @Input() academicYear!: string;
  @Input() showCurrentMonthOnly: boolean = false;
  @Input() currentMonthIndex?: number;
  @Input() currentPaymentDate?: Date;
  @Input() monthName?: string;
  
  // NEW: Component-specific invoice inputs
// NEW: Component-specific invoice inputs
@Input() componentOnly?: 'uniform' | 'inscriptionFee' | 'tuition'; // ✅ ADD 'tuition'
  
  @Output() dialogClosed = new EventEmitter<void>();

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('invoice-dialog-open');
    
    setTimeout(() => {
      const closeBtn = document.querySelector('.close-btn') as HTMLElement;
      if (closeBtn) {
        closeBtn.focus();
      }
    }, 100);

    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
    document.body.classList.remove('invoice-dialog-open');
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeDialog();
    }
  }

  closeDialog(): void {
    const container = document.querySelector('.invoice-dialog-container') as HTMLElement;
    const overlay = document.querySelector('.invoice-dialog-overlay') as HTMLElement;
    
    if (container && overlay) {
      container.style.animation = 'slideOutScale 0.3s ease-in forwards';
      overlay.style.animation = 'fadeOutBackdrop 0.3s ease-out forwards';
      
      setTimeout(() => {
        document.body.style.overflow = 'auto';
        this.dialogClosed.emit();
      }, 300);
    } else {
      document.body.style.overflow = 'auto';
      this.dialogClosed.emit();
    }
  }

  onOverlayClick(event: Event): void {
    this.closeDialog();
  }

getInvoiceTypeDescription(): string {
  if (this.componentOnly === 'uniform') {
    return 'Facture uniforme scolaire';
  }
  if (this.componentOnly === 'inscriptionFee') {
    return 'Facture frais d\'inscription';
  }
  // ✅ ADD: Handle tuition-only monthly invoices
  if (this.componentOnly === 'tuition' && this.showCurrentMonthOnly && this.monthName) {
    return `Facture frais scolaires - ${this.monthName}`;
  }
  if (this.showCurrentMonthOnly && this.monthName) {
    return `Facture mensuelle - ${this.monthName}`;
  }
  return 'Facture cumulative';
}
}