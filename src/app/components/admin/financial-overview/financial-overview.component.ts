// financial-overview.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaymentService } from '../../../services/payment.service';
import { PaymentDashboard, GradeCategory } from '../../../models/payment.model';

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

  getCollectionRateNumber(rateString: string): number {
    if (!rateString) return 0;
    return parseFloat(rateString) || 0;
  }

  getCollectionRateClass(rateString: string): string {
    const rate = this.getCollectionRateNumber(rateString);
    if (rate >= 80) return 'excellent';
    if (rate >= 60) return 'good';
    if (rate >= 40) return 'average';
    return 'poor';
  }

  getGradeCategoryLabel(gradeCategory: GradeCategory): string {
    const labels: { [key in GradeCategory]: string } = {
      'maternelle': 'Maternelle',
      'primaire': 'Primaire',
      'secondaire': 'Secondaire (Collège + Lycée)'
    };
    return labels[gradeCategory] || gradeCategory;
  }

  getGradeCategoryIcon(gradeCategory: GradeCategory): string {
    const icons: { [key in GradeCategory]: string } = {
      'maternelle': '🧸',
      'primaire': '📚',
      'secondaire': '🎓'
    };
    return icons[gradeCategory] || '📖';
  }

  hasGradeCategoryStats(): boolean {
    return !!(this.dashboard?.gradeCategoryStats && 
           Object.keys(this.dashboard.gradeCategoryStats).length > 0);
  }

  hasComponentStats(): boolean {
    return !!(this.dashboard?.componentStats);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('fr-TN');
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('fr-TN');
  }

  getGradeCategoryStatsArray(): Array<{key: GradeCategory, value: any}> {
    if (!this.dashboard?.gradeCategoryStats) return [];
    
    return Object.entries(this.dashboard.gradeCategoryStats)
      .filter(([key, value]) => value && value.count > 0)
      .map(([key, value]) => ({ key: key as GradeCategory, value }));
  }

  getAverageRevenue(categoryData: { count: number; revenue: number }): number {
    if (!categoryData || categoryData.count === 0) return 0;
    return categoryData.revenue / categoryData.count;
  }

  // Enhanced component statistics methods
  getComponentUsagePercentage(component: 'uniform' | 'transportation'): number {
    if (!this.dashboard?.componentStats || !this.dashboard?.overview?.totalStudents) return 0;
    
    const componentStats = this.dashboard.componentStats[component];
    if (!componentStats) return 0;
    
    return Math.round((componentStats.totalStudents / this.dashboard.overview.totalStudents) * 100);
  }

  getComponentCollectionRate(component: 'uniform' | 'transportation'): number {
    if (!this.dashboard?.componentStats) return 0;
    
    const componentStats = this.dashboard.componentStats[component];
    if (!componentStats || componentStats.expectedRevenue === 0) return 0;
    
    return Math.round((componentStats.totalRevenue / componentStats.expectedRevenue) * 100);
  }

  // Export functionality
  exportFinancialReport(): void {
    const filters = {
      academicYear: this.academicYear,
      component: 'all' as const
    };
    
    this.paymentService.exportPaymentData(filters).subscribe({
      next: (exportData) => {
        this.downloadFinancialReport(exportData);
      },
      error: (error) => {
        console.error('Error exporting financial report:', error);
        // Add toast notification here
      }
    });
  }

  private downloadFinancialReport(exportData: any): void {
    // Create comprehensive financial summary CSV
    const summaryData = this.createComprehensiveFinancialSummaryData();
    const csvContent = this.convertToCSV(summaryData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `apercu_financier_complet_${this.academicYear}_${this.getCurrentDateForFile()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private createComprehensiveFinancialSummaryData(): any[] {
    if (!this.dashboard) return [];

    const summary = [
      // Header information
      {
        'Section': 'INFORMATIONS GÉNÉRALES',
        'Indicateur': 'Année académique',
        'Valeur': this.academicYear,
        'Montant': '',
        'Pourcentage': ''
      },
      {
        'Section': 'INFORMATIONS GÉNÉRALES',
        'Indicateur': 'Date du rapport',
        'Valeur': `${this.getCurrentDate()} ${this.getCurrentTime()}`,
        'Montant': '',
        'Pourcentage': ''
      },
      {
        'Section': '',
        'Indicateur': '',
        'Valeur': '',
        'Montant': '',
        'Pourcentage': ''
      },

      // Overall statistics
      {
        'Section': 'STATISTIQUES GÉNÉRALES',
        'Indicateur': 'Total Étudiants',
        'Valeur': this.dashboard.overview.totalStudents,
        'Montant': '',
        'Pourcentage': ''
      },
      {
        'Section': 'STATISTIQUES GÉNÉRALES',
        'Indicateur': 'Étudiants avec dossiers de paiement',
        'Valeur': this.dashboard.overview.studentsWithPayments,
        'Montant': '',
        'Pourcentage': Math.round((this.dashboard.overview.studentsWithPayments / this.dashboard.overview.totalStudents) * 100) + '%'
      },
      {
        'Section': 'STATISTIQUES GÉNÉRALES',
        'Indicateur': 'Étudiants sans dossiers',
        'Valeur': this.dashboard.overview.studentsWithoutPayments,
        'Montant': '',
        'Pourcentage': Math.round((this.dashboard.overview.studentsWithoutPayments / this.dashboard.overview.totalStudents) * 100) + '%'
      },
      {
        'Section': '',
        'Indicateur': '',
        'Valeur': '',
        'Montant': '',
        'Pourcentage': ''
      },

      // Revenue summary by component
      {
        'Section': 'REVENUS TOTAUX',
        'Indicateur': 'Total Attendu - Grand Total',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.expectedRevenue.grandTotal),
        'Pourcentage': '100%'
      },
      {
        'Section': 'REVENUS TOTAUX',
        'Indicateur': 'Total Collecté - Grand Total',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.totalRevenue.grandTotal),
        'Pourcentage': this.dashboard.overview.collectionRate.overall + '%'
      },
      {
        'Section': 'REVENUS TOTAUX',
        'Indicateur': 'Total Restant - Grand Total',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.outstandingAmount.grandTotal),
        'Pourcentage': Math.round(100 - this.getCollectionRateNumber(this.dashboard.overview.collectionRate.overall)) + '%'
      },
      {
        'Section': '',
        'Indicateur': '',
        'Valeur': '',
        'Montant': '',
        'Pourcentage': ''
      },

      // Tuition details
      {
        'Section': 'FRAIS SCOLAIRES',
        'Indicateur': 'Attendu',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.expectedRevenue.tuition),
        'Pourcentage': '100%'
      },
      {
        'Section': 'FRAIS SCOLAIRES',
        'Indicateur': 'Collecté',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.totalRevenue.tuition),
        'Pourcentage': this.dashboard.overview.collectionRate.tuition + '%'
      },
      {
        'Section': 'FRAIS SCOLAIRES',
        'Indicateur': 'Restant',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.outstandingAmount.tuition),
        'Pourcentage': Math.round(100 - this.getCollectionRateNumber(this.dashboard.overview.collectionRate.tuition)) + '%'
      },
      {
        'Section': '',
        'Indicateur': '',
        'Valeur': '',
        'Montant': '',
        'Pourcentage': ''
      },

      // Uniform details
      {
        'Section': 'UNIFORME',
        'Indicateur': 'Étudiants concernés',
        'Valeur': this.dashboard.componentStats?.uniform?.totalStudents || 0,
        'Montant': '',
        'Pourcentage': this.getComponentUsagePercentage('uniform') + '%'
      },
      {
        'Section': 'UNIFORME',
        'Indicateur': 'Étudiants ayant payé',
        'Valeur': this.dashboard.componentStats?.uniform?.paidStudents || 0,
        'Montant': '',
        'Pourcentage': this.dashboard.componentStats?.uniform?.totalStudents ? 
          Math.round((this.dashboard.componentStats.uniform.paidStudents / this.dashboard.componentStats.uniform.totalStudents) * 100) + '%' : '0%'
      },
      {
        'Section': 'UNIFORME',
        'Indicateur': 'Revenus attendus',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.expectedRevenue.uniform),
        'Pourcentage': '100%'
      },
      {
        'Section': 'UNIFORME',
        'Indicateur': 'Revenus collectés',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.totalRevenue.uniform),
        'Pourcentage': this.dashboard.overview.collectionRate.uniform + '%'
      },
      {
        'Section': '',
        'Indicateur': '',
        'Valeur': '',
        'Montant': '',
        'Pourcentage': ''
      },

      // Transportation details
      {
        'Section': 'TRANSPORT',
        'Indicateur': 'Total utilisateurs',
        'Valeur': this.dashboard.componentStats?.transportation?.totalStudents || 0,
        'Montant': '',
        'Pourcentage': this.getComponentUsagePercentage('transportation') + '%'
      },
      {
        'Section': 'TRANSPORT',
        'Indicateur': 'Zone proche',
        'Valeur': this.dashboard.componentStats?.transportation?.closeZone || 0,
        'Montant': '',
        'Pourcentage': ''
      },
      {
        'Section': 'TRANSPORT',
        'Indicateur': 'Zone éloignée',
        'Valeur': this.dashboard.componentStats?.transportation?.farZone || 0,
        'Montant': '',
        'Pourcentage': ''
      },
      {
        'Section': 'TRANSPORT',
        'Indicateur': 'Revenus attendus',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.expectedRevenue.transportation),
        'Pourcentage': '100%'
      },
      {
        'Section': 'TRANSPORT',
        'Indicateur': 'Revenus collectés',
        'Valeur': '',
        'Montant': this.formatCurrency(this.dashboard.overview.totalRevenue.transportation),
        'Pourcentage': this.dashboard.overview.collectionRate.transportation + '%'
      },
      {
        'Section': '',
        'Indicateur': '',
        'Valeur': '',
        'Montant': '',
        'Pourcentage': ''
      },

      // Payment status breakdown
      {
        'Section': 'STATUTS DE PAIEMENT',
        'Indicateur': 'Dossiers complétés',
        'Valeur': this.dashboard.statusCounts.completed,
        'Montant': '',
        'Pourcentage': Math.round((this.dashboard.statusCounts.completed / this.dashboard.overview.totalStudents) * 100) + '%'
      },
      {
        'Section': 'STATUTS DE PAIEMENT',
        'Indicateur': 'Dossiers partiels',
        'Valeur': this.dashboard.statusCounts.partial,
        'Montant': '',
        'Pourcentage': Math.round((this.dashboard.statusCounts.partial / this.dashboard.overview.totalStudents) * 100) + '%'
      },
      {
        'Section': 'STATUTS DE PAIEMENT',
        'Indicateur': 'Dossiers en attente',
        'Valeur': this.dashboard.statusCounts.pending,
        'Montant': '',
        'Pourcentage': Math.round((this.dashboard.statusCounts.pending / this.dashboard.overview.totalStudents) * 100) + '%'
      },
      {
        'Section': 'STATUTS DE PAIEMENT',
        'Indicateur': 'Dossiers en retard',
        'Valeur': this.dashboard.statusCounts.overdue,
        'Montant': '',
        'Pourcentage': Math.round((this.dashboard.statusCounts.overdue / this.dashboard.overview.totalStudents) * 100) + '%'
      },
      {
        'Section': 'STATUTS DE PAIEMENT',
        'Indicateur': 'Sans enregistrement',
        'Valeur': this.dashboard.statusCounts.no_record,
        'Montant': '',
        'Pourcentage': Math.round((this.dashboard.statusCounts.no_record / this.dashboard.overview.totalStudents) * 100) + '%'
      },
      {
        'Section': '',
        'Indicateur': '',
        'Valeur': '',
        'Montant': '',
        'Pourcentage': ''
      }
    ];

    // Add grade category statistics
    if (this.dashboard.gradeCategoryStats) {
      summary.push({
        'Section': 'STATISTIQUES PAR NIVEAU',
        'Indicateur': '',
        'Valeur': '',
        'Montant': '',
        'Pourcentage': ''
      });

      Object.entries(this.dashboard.gradeCategoryStats).forEach(([key, value]: [string, any]) => {
        if (value && value.count > 0) {
          const gradeCategory = key as GradeCategory;
          summary.push({
            'Section': 'STATISTIQUES PAR NIVEAU',
            'Indicateur': `${this.getGradeCategoryLabel(gradeCategory)} - Nombre`,
            'Valeur': value.count,
            'Montant': '',
            'Pourcentage': Math.round((value.count / this.dashboard!.overview.totalStudents) * 100) + '%'
          });
          summary.push({
            'Section': 'STATISTIQUES PAR NIVEAU',
            'Indicateur': `${this.getGradeCategoryLabel(gradeCategory)} - Revenus`,
            'Valeur': '',
            'Montant': this.formatCurrency(value.revenue),
            'Pourcentage': ''
          });
          summary.push({
            'Section': 'STATISTIQUES PAR NIVEAU',
            'Indicateur': `${this.getGradeCategoryLabel(gradeCategory)} - Moyenne/étudiant`,
            'Valeur': '',
            'Montant': this.formatCurrency(this.getAverageRevenue(value)),
            'Pourcentage': ''
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

  private getCurrentDateForFile(): string {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
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
        <title>Aperçu Financier Complet - ${this.academicYear}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.4;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #4A628A;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          h1 { 
            color: #4A628A; 
            margin: 0;
            font-size: 24px;
          }
          .subtitle {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
          }
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .section-title {
            color: #4A628A;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .overview-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            margin: 20px 0; 
          }
          .card { 
            border: 1px solid #ddd; 
            padding: 15px; 
            border-radius: 8px;
            background: #f9f9f9;
          }
          .card h3 { 
            margin: 0 0 10px 0; 
            color: #4A628A; 
            font-size: 16px;
          }
          .amount { 
            font-size: 1.2em; 
            font-weight: bold; 
            color: #2c5aa0;
          }
          .rate-section {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background: #f0f4f8;
            border-radius: 10px;
          }
          .rate { 
            font-size: 2em; 
            font-weight: bold; 
            padding: 15px; 
            border-radius: 20px; 
            text-align: center; 
            margin: 10px 0;
          }
          .excellent { background: #4CAF50; color: white; }
          .good { background: #2196F3; color: white; }
          .average { background: #FF9800; color: white; }
          .poor { background: #F44336; color: white; }
          .component-rates {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 20px 0;
          }
          .component-rate {
            text-align: center;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
          }
          .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .breakdown-table th,
          .breakdown-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .breakdown-table th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .status-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin: 15px 0;
          }
          .status-item {
            text-align: center;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: #f9f9f9;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          @media print {
            body { margin: 15px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Aperçu Financier Complet</h1>
          <div class="subtitle">Année académique ${this.academicYear}</div>
          <div class="subtitle">Généré le ${this.getCurrentDate()} à ${this.getCurrentTime()}</div>
        </div>

        <div class="section">
          <div class="section-title">🎯 Taux de Collecte Global</div>
          <div class="rate-section">
            <div class="rate ${this.getCollectionRateClass(this.dashboard.overview.collectionRate.overall)}">
              ${this.dashboard.overview.collectionRate.overall}%
            </div>
            <p>Taux de collecte général sur tous les composants</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📈 Taux par Composant</div>
          <div class="component-rates">
            <div class="component-rate">
              <strong>🎓 Frais Scolaires</strong><br>
              <span class="rate ${this.getCollectionRateClass(this.dashboard.overview.collectionRate.tuition)}" style="font-size: 1.2em;">
                ${this.dashboard.overview.collectionRate.tuition}%
              </span>
            </div>
            <div class="component-rate">
              <strong>👕 Uniforme</strong><br>
              <span class="rate ${this.getCollectionRateClass(this.dashboard.overview.collectionRate.uniform)}" style="font-size: 1.2em;">
                ${this.dashboard.overview.collectionRate.uniform}%
              </span>
            </div>
            <div class="component-rate">
              <strong>🚌 Transport</strong><br>
              <span class="rate ${this.getCollectionRateClass(this.dashboard.overview.collectionRate.transportation)}" style="font-size: 1.2em;">
                ${this.dashboard.overview.collectionRate.transportation}%
              </span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">💰 Aperçu Financier</div>
          <div class="overview-grid">
            <div class="card">
              <h3>💵 Total Collecté</h3>
              <div class="amount">${this.formatCurrency(this.dashboard.overview.totalRevenue.grandTotal)}</div>
              <small>
                Frais: ${this.formatCurrency(this.dashboard.overview.totalRevenue.tuition)}<br>
                Uniforme: ${this.formatCurrency(this.dashboard.overview.totalRevenue.uniform)}<br>
                Transport: ${this.formatCurrency(this.dashboard.overview.totalRevenue.transportation)}
              </small>
            </div>
            <div class="card">
              <h3>📊 Total Attendu</h3>
              <div class="amount">${this.formatCurrency(this.dashboard.overview.expectedRevenue.grandTotal)}</div>
              <small>
                Frais: ${this.formatCurrency(this.dashboard.overview.expectedRevenue.tuition)}<br>
                Uniforme: ${this.formatCurrency(this.dashboard.overview.expectedRevenue.uniform)}<br>
                Transport: ${this.formatCurrency(this.dashboard.overview.expectedRevenue.transportation)}
              </small>
            </div>
            <div class="card">
              <h3>⏳ Total Restant</h3>
              <div class="amount">${this.formatCurrency(this.dashboard.overview.outstandingAmount.grandTotal)}</div>
              <small>
                Frais: ${this.formatCurrency(this.dashboard.overview.outstandingAmount.tuition)}<br>
                Uniforme: ${this.formatCurrency(this.dashboard.overview.outstandingAmount.uniform)}<br>
                Transport: ${this.formatCurrency(this.dashboard.overview.outstandingAmount.transportation)}
              </small>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">👥 Statistiques Étudiants</div>
          <table class="breakdown-table">
            <tr>
              <th>Indicateur</th>
              <th>Nombre</th>
              <th>Pourcentage</th>
            </tr>
            <tr>
              <td>Total étudiants</td>
              <td>${this.dashboard.overview.totalStudents}</td>
              <td>100%</td>
            </tr>
            <tr>
              <td>Avec dossiers de paiement</td>
              <td>${this.dashboard.overview.studentsWithPayments}</td>
              <td>${Math.round((this.dashboard.overview.studentsWithPayments / this.dashboard.overview.totalStudents) * 100)}%</td>
            </tr>
            <tr>
              <td>Sans dossiers</td>
              <td>${this.dashboard.overview.studentsWithoutPayments}</td>
              <td>${Math.round((this.dashboard.overview.studentsWithoutPayments / this.dashboard.overview.totalStudents) * 100)}%</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">📋 Répartition des Statuts</div>
          <div class="status-grid">
            <div class="status-item">
              <strong>✅ Complétés</strong><br>
              ${this.dashboard.statusCounts.completed}<br>
              <small>${Math.round((this.dashboard.statusCounts.completed / this.dashboard.overview.totalStudents) * 100)}%</small>
            </div>
            <div class="status-item">
              <strong>⏱️ Partiels</strong><br>
              ${this.dashboard.statusCounts.partial}<br>
              <small>${Math.round((this.dashboard.statusCounts.partial / this.dashboard.overview.totalStudents) * 100)}%</small>
            </div>
            <div class="status-item">
              <strong>⏳ En attente</strong><br>
              ${this.dashboard.statusCounts.pending}<br>
              <small>${Math.round((this.dashboard.statusCounts.pending / this.dashboard.overview.totalStudents) * 100)}%</small>
            </div>
            <div class="status-item">
              <strong>🚨 En retard</strong><br>
              ${this.dashboard.statusCounts.overdue}<br>
              <small>${Math.round((this.dashboard.statusCounts.overdue / this.dashboard.overview.totalStudents) * 100)}%</small>
            </div>
            <div class="status-item">
              <strong>❌ Sans enreg.</strong><br>
              ${this.dashboard.statusCounts.no_record}<br>
              <small>${Math.round((this.dashboard.statusCounts.no_record / this.dashboard.overview.totalStudents) * 100)}%</small>
            </div>
          </div>
        </div>

        ${this.generateComponentStatsHTML()}
        ${this.generateGradeCategoryStatsHTML()}

        <div class="footer">
          <p><strong>Rapport généré automatiquement</strong></p>
          <p>Date: ${this.getCurrentDate()} ${this.getCurrentTime()} | Année académique: ${this.academicYear}</p>
          <p>Ce document contient des informations confidentielles sur les finances de l'établissement</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateComponentStatsHTML(): string {
    if (!this.hasComponentStats()) return '';

    return `
      <div class="section">
        <div class="section-title">🔧 Utilisation des Services</div>
        
        <div class="section" style="margin-left: 20px;">
          <h4>👕 Uniforme</h4>
          <table class="breakdown-table">
            <tr>
              <th>Indicateur</th>
              <th>Valeur</th>
              <th>Détails</th>
            </tr>
            <tr>
              <td>Étudiants concernés</td>
              <td>${this.dashboard!.componentStats!.uniform.totalStudents}</td>
              <td>${this.getComponentUsagePercentage('uniform')}% des étudiants</td>
            </tr>
            <tr>
              <td>Étudiants ayant payé</td>
              <td>${this.dashboard!.componentStats!.uniform.paidStudents}</td>
              <td>${this.dashboard!.componentStats!.uniform.totalStudents ? 
                Math.round((this.dashboard!.componentStats!.uniform.paidStudents / this.dashboard!.componentStats!.uniform.totalStudents) * 100) + '%' : '0%'} de ceux concernés</td>
            </tr>
            <tr>
              <td>Revenus collectés</td>
              <td>${this.formatCurrency(this.dashboard!.componentStats!.uniform.totalRevenue)}</td>
              <td>sur ${this.formatCurrency(this.dashboard!.componentStats!.uniform.expectedRevenue)} attendus</td>
            </tr>
          </table>
        </div>

        <div class="section" style="margin-left: 20px;">
          <h4>🚌 Transport</h4>
          <table class="breakdown-table">
            <tr>
              <th>Indicateur</th>
              <th>Valeur</th>
              <th>Détails</th>
            </tr>
            <tr>
              <td>Total utilisateurs</td>
              <td>${this.dashboard!.componentStats!.transportation.totalStudents}</td>
              <td>${this.getComponentUsagePercentage('transportation')}% des étudiants</td>
            </tr>
            <tr>
              <td>Zone proche</td>
              <td>${this.dashboard!.componentStats!.transportation.closeZone}</td>
              <td>${this.dashboard!.componentStats!.transportation.totalStudents ? 
                Math.round((this.dashboard!.componentStats!.transportation.closeZone / this.dashboard!.componentStats!.transportation.totalStudents) * 100) + '%' : '0%'} des utilisateurs</td>
            </tr>
            <tr>
              <td>Zone éloignée</td>
              <td>${this.dashboard!.componentStats!.transportation.farZone}</td>
              <td>${this.dashboard!.componentStats!.transportation.totalStudents ? 
                Math.round((this.dashboard!.componentStats!.transportation.farZone / this.dashboard!.componentStats!.transportation.totalStudents) * 100) + '%' : '0%'} des utilisateurs</td>
            </tr>
            <tr>
              <td>Revenus collectés</td>
              <td>${this.formatCurrency(this.dashboard!.componentStats!.transportation.totalRevenue)}</td>
              <td>sur ${this.formatCurrency(this.dashboard!.componentStats!.transportation.expectedRevenue)} attendus</td>
            </tr>
          </table>
        </div>
      </div>
    `;
  }

  private generateGradeCategoryStatsHTML(): string {
    if (!this.hasGradeCategoryStats()) return '';

    const statsHTML = this.getGradeCategoryStatsArray()
      .map(({ key, value }) => `
        <tr>
          <td>${this.getGradeCategoryIcon(key)} ${this.getGradeCategoryLabel(key)}</td>
          <td>${value.count}</td>
          <td>${Math.round((value.count / this.dashboard!.overview.totalStudents) * 100)}%</td>
          <td>${this.formatCurrency(value.revenue)}</td>
          <td>${this.formatCurrency(this.getAverageRevenue(value))}</td>
        </tr>
      `)
      .join('');

    return `
      <div class="section">
        <div class="section-title">🎓 Statistiques par Catégorie de Niveau</div>
        <table class="breakdown-table">
          <tr>
            <th>Catégorie</th>
            <th>Nombre d'étudiants</th>
            <th>% du total</th>
            <th>Revenus collectés</th>
            <th>Moyenne par étudiant</th>
          </tr>
          ${statsHTML}
        </table>
      </div>
    `;
  }

  // Enhanced analytics methods
  getComponentHealthStatus(component: 'tuition' | 'uniform' | 'transportation'): {
    status: 'excellent' | 'good' | 'average' | 'poor';
    message: string;
    color: string;
  } {
    if (!this.dashboard) {
      return { status: 'poor', message: 'Données non disponibles', color: '#F44336' };
    }

    const rate = this.getCollectionRateNumber(this.dashboard.overview.collectionRate[component]);
    
    if (rate >= 90) {
      return { 
        status: 'excellent', 
        message: 'Excellent taux de collecte', 
        color: '#4CAF50' 
      };
    } else if (rate >= 75) {
      return { 
        status: 'good', 
        message: 'Bon taux de collecte', 
        color: '#2196F3' 
      };
    } else if (rate >= 50) {
      return { 
        status: 'average', 
        message: 'Taux de collecte moyen', 
        color: '#FF9800' 
      };
    } else {
      return { 
        status: 'poor', 
        message: 'Taux de collecte faible', 
        color: '#F44336' 
      };
    }
  }

  getFinancialHealthScore(): number {
    if (!this.dashboard) return 0;

    const overallRate = this.getCollectionRateNumber(this.dashboard.overview.collectionRate.overall);
    const completionRate = (this.dashboard.statusCounts.completed / this.dashboard.overview.totalStudents) * 100;
    const paymentCoverageRate = (this.dashboard.overview.studentsWithPayments / this.dashboard.overview.totalStudents) * 100;

    // Weighted score: 50% collection rate, 30% completion rate, 20% coverage rate
    return Math.round((overallRate * 0.5) + (completionRate * 0.3) + (paymentCoverageRate * 0.2));
  }

  getFinancialInsights(): string[] {
    if (!this.dashboard) return [];

    const insights: string[] = [];
    const overallRate = this.getCollectionRateNumber(this.dashboard.overview.collectionRate.overall);
    const tuitionRate = this.getCollectionRateNumber(this.dashboard.overview.collectionRate.tuition);
    const uniformRate = this.getCollectionRateNumber(this.dashboard.overview.collectionRate.uniform);
    const transportationRate = this.getCollectionRateNumber(this.dashboard.overview.collectionRate.transportation);

    // Overall performance insight
    if (overallRate >= 80) {
      insights.push('🎉 Performance financière excellente avec un taux de collecte supérieur à 80%');
    } else if (overallRate >= 60) {
      insights.push('👍 Performance financière correcte, mais des améliorations sont possibles');
    } else {
      insights.push('⚠️ Performance financière préoccupante, actions urgentes recommandées');
    }

    // Component-specific insights
    const rates = [
      { name: 'frais scolaires', rate: tuitionRate, component: 'tuition' },
      { name: 'uniforme', rate: uniformRate, component: 'uniform' },
      { name: 'transport', rate: transportationRate, component: 'transportation' }
    ];

    const bestComponent = rates.reduce((max, current) => current.rate > max.rate ? current : max);
    const worstComponent = rates.reduce((min, current) => current.rate < min.rate ? current : min);

    if (bestComponent.rate > worstComponent.rate + 20) {
      insights.push(`💪 Les ${bestComponent.name} performent le mieux (${bestComponent.rate}%)`);
      insights.push(`🔍 Les ${worstComponent.name} nécessitent une attention particulière (${worstComponent.rate}%)`);
    }

    // Payment coverage insight
    const coverageRate = (this.dashboard.overview.studentsWithPayments / this.dashboard.overview.totalStudents) * 100;
    if (coverageRate < 90) {
      insights.push(`📋 ${this.dashboard.overview.studentsWithoutPayments} étudiants n'ont pas encore de dossier de paiement`);
    }

    // Outstanding amount insight
    const outstandingPercentage = (this.dashboard.overview.outstandingAmount.grandTotal / this.dashboard.overview.expectedRevenue.grandTotal) * 100;
    if (outstandingPercentage > 30) {
      insights.push(`💰 ${this.formatCurrency(this.dashboard.overview.outstandingAmount.grandTotal)} restent à collecter (${Math.round(outstandingPercentage)}%)`);
    }

    return insights;
  }

  getPriorityActions(): string[] {
    if (!this.dashboard) return [];

    const actions: string[] = [];
    
    // Based on overdue payments
    if (this.dashboard.statusCounts.overdue > 0) {
      actions.push(`🚨 Relancer ${this.dashboard.statusCounts.overdue} dossiers en retard de paiement`);
    }

    // Based on students without payment records
    if (this.dashboard.overview.studentsWithoutPayments > 0) {
      actions.push(`📝 Créer des dossiers de paiement pour ${this.dashboard.overview.studentsWithoutPayments} étudiants`);
    }

    // Based on component performance
    const uniformRate = this.getCollectionRateNumber(this.dashboard.overview.collectionRate.uniform);
    const transportationRate = this.getCollectionRateNumber(this.dashboard.overview.collectionRate.transportation);

    if (uniformRate < 70 && this.dashboard.componentStats?.uniform?.totalStudents > 0) {
      actions.push('👕 Améliorer le suivi des paiements d\'uniforme');
    }

    if (transportationRate < 70 && this.dashboard.componentStats?.transportation?.totalStudents > 0) {
      actions.push('🚌 Renforcer la collecte des frais de transport');
    }

    // Based on partial payments
    if (this.dashboard.statusCounts.partial > this.dashboard.statusCounts.completed * 0.3) {
      actions.push('⏱️ Finaliser les dossiers de paiements partiels');
    }

    return actions;
  }

  // Quick action methods
  navigateToOverduePayments(): void {
    this.router.navigate(['../'], { 
      relativeTo: this.route,
      queryParams: { 
        academicYear: this.academicYear,
        paymentStatus: 'overdue'
      }
    });
  }

  navigateToStudentsWithoutRecords(): void {
    this.router.navigate(['../'], { 
      relativeTo: this.route,
      queryParams: { 
        academicYear: this.academicYear,
        paymentStatus: 'no_record'
      }
    });
  }

  navigateToComponentReport(component: 'tuition' | 'uniform' | 'transportation'): void {
    this.router.navigate(['../reports'], { 
      relativeTo: this.route,
      queryParams: { 
        academicYear: this.academicYear,
        reportType: 'component',
        component: component
      }
    });
  }

  // Data validation helpers
  private validateDashboardData(): boolean {
    if (!this.dashboard) return false;

    // Check if essential data is present
    const hasOverview = !!this.dashboard.overview;
    const hasStatusCounts = !!this.dashboard.statusCounts;
    const hasTotalStudents = this.dashboard.overview?.totalStudents > 0;

    return hasOverview && hasStatusCounts && hasTotalStudents;
  }

  isDataIncomplete(): boolean {
    return !this.validateDashboardData();
  }

  getDataCompletenessMessage(): string {
    if (!this.dashboard) return 'Aucune donnée disponible';
    if (!this.dashboard.overview?.totalStudents) return 'Aucun étudiant trouvé';
    if (this.dashboard.overview.studentsWithoutPayments === this.dashboard.overview.totalStudents) {
      return 'Aucun dossier de paiement créé';
    }
    return 'Données complètes';
  }

  // Performance tracking
  getPerformanceMetrics(): {
    metric: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    status: 'good' | 'warning' | 'danger';
  }[] {
    if (!this.dashboard) return [];

    return [
      {
        metric: 'Taux de collecte global',
        value: this.dashboard.overview.collectionRate.overall + '%',
        trend: 'stable', // This would need historical data to determine
        status: this.getCollectionRateNumber(this.dashboard.overview.collectionRate.overall) >= 75 ? 'good' : 
                this.getCollectionRateNumber(this.dashboard.overview.collectionRate.overall) >= 50 ? 'warning' : 'danger'
      },
      {
        metric: 'Couverture des dossiers',
        value: Math.round((this.dashboard.overview.studentsWithPayments / this.dashboard.overview.totalStudents) * 100) + '%',
        trend: 'stable',
        status: (this.dashboard.overview.studentsWithPayments / this.dashboard.overview.totalStudents) >= 0.9 ? 'good' : 
                (this.dashboard.overview.studentsWithPayments / this.dashboard.overview.totalStudents) >= 0.7 ? 'warning' : 'danger'
      },
      {
        metric: 'Dossiers en retard',
        value: this.dashboard.statusCounts.overdue.toString(),
        trend: 'stable',
        status: this.dashboard.statusCounts.overdue === 0 ? 'good' : 
                this.dashboard.statusCounts.overdue <= 5 ? 'warning' : 'danger'
      }
    ];
  }
}