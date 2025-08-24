// Enhanced invoice-dialog.component.ts
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
              <h2>Facture - {{ student?.name }}</h2>
              <p>{{ academicYear }}</p>
            </div>
          </div>
          <button class="close-btn" (click)="closeDialog()" type="button" title="Fermer">
            <span>✖️</span>
          </button>
        </div>
        
        <div class="invoice-dialog-content">
          <app-invoice 
            [student]="student" 
            [academicYear]="academicYear">
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

    .invoice-dialog-header::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      border-radius: 50%;
      transform: translate(50px, -50px);
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
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    .header-text {
      flex: 1;
    }

    .header-text h2 {
      margin: 0;
      font-size: var(--font-xl, 1.25rem);
      font-weight: 700;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
    }

    .header-text p {
      margin: 0.25rem 0 0;
      font-size: var(--font-sm, 0.875rem);
      opacity: 0.9;
      font-weight: 500;
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

    .close-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      transform: scale(0);
      transition: transform var(--transition-base, 0.3s ease);
    }

    .close-btn:hover::before {
      transform: scale(1);
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.4);
      transform: scale(1.1) rotate(90deg);
    }

    .close-btn:active {
      transform: scale(0.95) rotate(90deg);
    }

    .invoice-dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background: var(--color-gray-light, #F5F5F5);
    }

    .invoice-dialog-content::-webkit-scrollbar {
      width: 8px;
    }

    .invoice-dialog-content::-webkit-scrollbar-track {
      background: var(--color-gray, #E0E0E0);
      border-radius: 4px;
    }

    .invoice-dialog-content::-webkit-scrollbar-thumb {
      background: var(--gradient-primary, linear-gradient(135deg, #4A628A, #7AB2D3));
      border-radius: 4px;
    }

    .invoice-dialog-content::-webkit-scrollbar-thumb:hover {
      background: var(--color-primary-dark, #4A628A);
    }

    /* Enhanced hover effects */
    .invoice-dialog-container:hover {
      box-shadow: var(--shadow-xl, 0 20px 40px rgba(74, 98, 138, 0.25)), 
                  0 0 0 1px var(--color-primary, #7AB2D3);
    }

    /* Print-specific styles for this component */
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
      
      .no-print {
        display: none !important;
      }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .invoice-dialog-overlay {
        padding: var(--spacing-sm, 0.5rem);
      }

      .invoice-dialog-container {
        max-width: 100vw;
        max-height: 100vh;
        border-radius: var(--radius-md, 12px);
      }
      
      .invoice-dialog-header {
        padding: var(--spacing-lg, 1rem);
        border-radius: var(--radius-md, 12px) var(--radius-md, 12px) 0 0;
      }

      .header-content {
        gap: var(--spacing-sm, 0.5rem);
      }

      .header-icon {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
      }

      .header-text h2 {
        font-size: var(--font-lg, 1.125rem);
      }

      .header-text p {
        font-size: var(--font-xs, 0.75rem);
      }

      .close-btn {
        width: 40px;
        height: 40px;
        font-size: 1rem;
      }
    }

    @media (max-width: 480px) {
      .invoice-dialog-container {
        border-radius: 0;
        max-height: 100vh;
      }
      
      .invoice-dialog-header {
        border-radius: 0;
        padding: var(--spacing-md, 1rem);
      }

      .header-content {
        flex-direction: row;
        text-align: left;
      }

      .header-icon {
        width: 40px;
        height: 40px;
        font-size: 1.2rem;
      }
    }

    /* Animation for mobile */
    @media (max-width: 768px) {
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: translateY(100px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    }

    /* Focus management for accessibility */
    .close-btn:focus {
      outline: 2px solid var(--color-accent, #DFF2EB);
      outline-offset: 2px;
    }

    .invoice-dialog-container:focus-within {
      box-shadow: var(--shadow-xl, 0 20px 40px rgba(74, 98, 138, 0.25)), 
                  0 0 0 3px var(--color-accent, #DFF2EB);
    }
  `]
})
export class InvoiceDialogComponent implements OnInit, OnDestroy {
  @Input() student!: StudentWithPayment;
  @Input() academicYear!: string;
  @Output() dialogClosed = new EventEmitter<void>();

  ngOnInit(): void {
    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';
    // Add print-specific class to body
    document.body.classList.add('invoice-dialog-open');
    
    // Focus management for accessibility
    setTimeout(() => {
      const closeBtn = document.querySelector('.close-btn') as HTMLElement;
      if (closeBtn) {
        closeBtn.focus();
      }
    }, 100);

    // Handle escape key
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy(): void {
    // Restore body scroll when dialog is closed
    document.body.style.overflow = 'auto';
    // Remove print-specific class from body
    document.body.classList.remove('invoice-dialog-open');
    
    // Remove event listener
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeDialog();
    }
  }

  closeDialog(): void {
    // Add closing animation class
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
    // Close dialog when clicking on overlay
    this.closeDialog();
  }
}