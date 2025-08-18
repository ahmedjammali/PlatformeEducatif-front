// financial-overview.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaymentService } from '../../../services/payment.service';
import { PaymentDashboard } from '../../../models/payment.model';

@Component({
  selector: 'app-financial-overview',
  templateUrl: './financial-overview.component.html',
  styleUrls: ['./financial-overview.component.css']
})
export class FinancialOverviewComponent implements OnInit, OnDestroy {
  academicYear: string = '';
  dashboard: PaymentDashboard | null = null;
  isLoading = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private paymentService: PaymentService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get academic year from query params or use current
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.academicYear = params['academicYear'] || this.paymentService.getCurrentAcademicYear();
      this.loadDashboard();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.paymentService.getPaymentDashboard(this.academicYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading financial dashboard:', error);
          this.isLoading = false;
        }
      });
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  navigateToPaymentManagement(): void {
    this.router.navigate(['../'], { 
      relativeTo: this.route,
      queryParams: { academicYear: this.academicYear }
    });
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }

  getCollectionRateNumber(): number {
    if (!this.dashboard) return 0;
    return parseFloat(this.dashboard.overview.collectionRate) || 0;
  }

  getCollectionRateClass(): string {
    const rate = this.getCollectionRateNumber();
    if (rate >= 80) return 'excellent';
    if (rate >= 60) return 'good';
    return 'poor';
  }

  getClassGroupLabel(classGroup: string): string {
    const labels: { [key: string]: string } = {
      'école': 'École',
      'college': 'Collège',
      'lycée': 'Lycée'
    };
    return labels[classGroup] || classGroup;
  }

  getClassGroupIcon(classGroup: string): string {
    const icons: { [key: string]: string } = {
      'école': '🎓',
      'college': '🏫',
      'lycée': '🎯'
    };
    return icons[classGroup] || '📚';
  }

  hasClassGroupStats(): boolean {
    return !!(this.dashboard?.classGroupStats && 
           Object.keys(this.dashboard.classGroupStats).length > 0);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('fr-TN');
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('fr-TN');
  }

  getClassGroupStatsArray(): Array<{key: string, value: any}> {
    if (!this.dashboard?.classGroupStats) return [];
    
    return Object.entries(this.dashboard.classGroupStats)
      .filter(([key, value]) => value && value.count > 0)
      .map(([key, value]) => ({ key, value }));
  }

  // Export functionality
  exportFinancialReport(): void {
    const filters = {
      academicYear: this.academicYear
    };
    
    this.paymentService.exportPaymentData(filters).subscribe({
      next: (exportData) => {
        this.downloadFinancialReport(exportData);
      },
      error: (error) => {
        console.error('Error exporting financial report:', error);
      }
    });
  }

  private downloadFinancialReport(exportData: any): void {
    // Create financial summary CSV
    const summaryData = this.createFinancialSummaryData();
    const csvContent = this.convertToCSV(summaryData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `apercu_financier_${this.academicYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private createFinancialSummaryData(): any[] {
    if (!this.dashboard) return [];

    const summary = [
      {
        'Indicateur': 'Total Étudiants',
        'Valeur': this.dashboard.overview.totalStudents,
        'Montant': '-'
      },
      {
        'Indicateur': 'Montant Attendu',
        'Valeur': '-',
        'Montant': this.formatCurrency(this.dashboard.overview.expectedRevenue)
      },
      {
        'Indicateur': 'Montant Collecté',
        'Valeur': '-',
        'Montant': this.formatCurrency(this.dashboard.overview.totalRevenue)
      },
      {
        'Indicateur': 'Montant Restant',
        'Valeur': '-',
        'Montant': this.formatCurrency(this.dashboard.overview.outstandingAmount)
      },
      {
        'Indicateur': 'Taux de Collecte',
        'Valeur': `${this.dashboard.overview.collectionRate}%`,
        'Montant': '-'
      }
    ];

    // Add class group statistics
    if (this.dashboard.classGroupStats) {
      Object.entries(this.dashboard.classGroupStats).forEach(([key, value]: [string, any]) => {
        if (value && value.count > 0) {
          summary.push({
            'Indicateur': `${this.getClassGroupLabel(key)} - Étudiants`,
            'Valeur': value.count,
            'Montant': '-'
          });
          summary.push({
            'Indicateur': `${this.getClassGroupLabel(key)} - Revenus`,
            'Valeur': '-',
            'Montant': this.formatCurrency(value.revenue)
          });
        }
      });
    }

    return summary;
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ];
    
    return csvRows.join('\n');
  }

  // Print functionality
  printFinancialOverview(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = this.generatePrintableContent();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  }

  private generatePrintableContent(): string {
    if (!this.dashboard) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Aperçu Financier - ${this.academicYear}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #4A628A; border-bottom: 2px solid #4A628A; padding-bottom: 10px; }
          .overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
          .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .card h3 { margin: 0 0 10px 0; color: #4A628A; }
          .amount { font-size: 1.2em; font-weight: bold; }
          .rate { font-size: 1.5em; font-weight: bold; padding: 10px; border-radius: 20px; text-align: center; }
          .excellent { background: #4CAF50; color: white; }
          .good { background: #FF9800; color: white; }
          .poor { background: #F44336; color: white; }
          .class-stats { margin-top: 20px; }
          .class-stat { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
        </style>
      </head>
      <body>
        <h1>Aperçu Financier - ${this.academicYear}</h1>
        <div class="overview">
          <div class="card">
            <h3>💰 Montant Collecté</h3>
            <div class="amount">${this.formatCurrency(this.dashboard.overview.totalRevenue)}</div>
          </div>
          <div class="card">
            <h3>📊 Montant Attendu</h3>
            <div class="amount">${this.formatCurrency(this.dashboard.overview.expectedRevenue)}</div>
          </div>
          <div class="card">
            <h3>⏳ Montant Restant</h3>
            <div class="amount">${this.formatCurrency(this.dashboard.overview.outstandingAmount)}</div>
          </div>
        </div>
        <div class="rate ${this.getCollectionRateClass()}">
          Taux de collecte: ${this.dashboard.overview.collectionRate}%
        </div>
        ${this.generateClassStatsHTML()}
        <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
          Généré le ${this.getCurrentDate()} à ${this.getCurrentTime()}
        </p>
      </body>
      </html>
    `;
  }

  private generateClassStatsHTML(): string {
    if (!this.hasClassGroupStats()) return '';

    const statsHTML = this.getClassGroupStatsArray()
      .map(({ key, value }) => `
        <div class="class-stat">
          <span>${this.getClassGroupIcon(key)} ${this.getClassGroupLabel(key)}</span>
          <span>${value.count} étudiants - ${this.formatCurrency(value.revenue)}</span>
        </div>
      `)
      .join('');

    return `
      <div class="class-stats">
        <h3>Statistiques par Niveau</h3>
        ${statsHTML}
      </div>
    `;
  }
}