// services/budget.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import {
  BudgetOverview,
  BudgetOverviewRequest,
  SetBudgetLimitsRequest,
  SetBudgetLimitsResponse,
  SpendingTrends,
  SpendingTrendsRequest,
  BudgetAlerts,
  BudgetReport,
  BudgetReportRequest,
  PeriodComparison,
  PeriodComparisonRequest,
  BudgetPerformance,
  BudgetPerformanceRequest,
  BudgetProjections,
  BudgetProjectionsRequest,
  CostOptimization,
  BudgetStatus,
  PerformanceStatus,
  TrendDirection,
  AlertType,
  ImpactLevel,
  BUDGET_STATUS_COLORS,
  PERFORMANCE_STATUS_COLORS,
  ALERT_TYPE_COLORS,
  TREND_DIRECTION_ICONS,
  IMPACT_LEVEL_COLORS
} from '../models/budget.model';

@Injectable({
  providedIn: 'root'
})
export class BudgetService extends BaseService {
  private endpoint = '/budget';

  constructor(http: HttpClient) {
    super(http);
  }

  // =================== BUDGET OVERVIEW & MANAGEMENT ===================

  getBudgetOverview(request?: BudgetOverviewRequest): Observable<BudgetOverview> {
    const params = this.buildParams(request || {});
    return this.http.get<BudgetOverview>(
      `${this.apiUrl}${this.endpoint}/overview`,
      { params }
    );
  }

  setBudgetLimits(request: SetBudgetLimitsRequest): Observable<SetBudgetLimitsResponse> {
    return this.http.post<SetBudgetLimitsResponse>(
      `${this.apiUrl}${this.endpoint}/limits`,
      request
    );
  }

  getBudgetAlerts(): Observable<BudgetAlerts> {
    return this.http.get<BudgetAlerts>(
      `${this.apiUrl}${this.endpoint}/alerts`
    );
  }

  // =================== ANALYTICS & TRENDS ===================

  getSpendingTrends(request?: SpendingTrendsRequest): Observable<SpendingTrends> {
    const params = this.buildParams(request || {});
    return this.http.get<SpendingTrends>(
      `${this.apiUrl}${this.endpoint}/trends`,
      { params }
    );
  }

  getBudgetPerformance(request?: BudgetPerformanceRequest): Observable<BudgetPerformance> {
    const params = this.buildParams(request || {});
    return this.http.get<BudgetPerformance>(
      `${this.apiUrl}${this.endpoint}/performance`,
      { params }
    );
  }

  getBudgetProjections(request?: BudgetProjectionsRequest): Observable<BudgetProjections> {
    const params = this.buildParams(request || {});
    return this.http.get<BudgetProjections>(
      `${this.apiUrl}${this.endpoint}/projections`,
      { params }
    );
  }

  getCostOptimization(): Observable<CostOptimization> {
    return this.http.get<CostOptimization>(
      `${this.apiUrl}${this.endpoint}/optimization`
    );
  }

  // =================== REPORTING ===================

  generateBudgetReport(request: BudgetReportRequest): Observable<BudgetReport> {
    const params = this.buildParams(request);
    return this.http.get<BudgetReport>(
      `${this.apiUrl}${this.endpoint}/report`,
      { params }
    );
  }

  compareBudgetPeriods(request: PeriodComparisonRequest): Observable<PeriodComparison> {
    const params = this.buildParams(request);
    return this.http.get<PeriodComparison>(
      `${this.apiUrl}${this.endpoint}/compare`,
      { params }
    );
  }

  // =================== EXPORT FUNCTIONALITY ===================

  exportBudgetReport(request: BudgetReportRequest, format: 'pdf' | 'excel' | 'csv'): Observable<Blob> {
    const params = this.buildParams({ ...request, format });
    return this.http.get(
      `${this.apiUrl}${this.endpoint}/report/export`,
      { params, responseType: 'blob' }
    );
  }

  // =================== UTILITY METHODS ===================

  /**
   * Calculate budget status based on spent amount and budget limit
   */
  calculateBudgetStatus(spent: number, budget: number): BudgetStatus {
    if (!budget || budget <= 0) return 'safe';
    
    const percentage = (spent / budget) * 100;
    
    if (percentage >= 100) return 'exceeded';
    if (percentage >= 80) return 'warning';
    if (percentage >= 60) return 'caution';
    return 'safe';
  }

  /**
   * Calculate performance status based on efficiency percentage
   */
  calculatePerformanceStatus(efficiency: number): PerformanceStatus {
    if (efficiency > 100) return 'over_budget';
    if (efficiency > 90) return 'at_risk';
    if (efficiency > 80) return 'good';
    return 'excellent';
  }

  /**
   * Get status color
   */
  getStatusColor(status: BudgetStatus | PerformanceStatus): string {
    return BUDGET_STATUS_COLORS[status as BudgetStatus] || 
           PERFORMANCE_STATUS_COLORS[status as PerformanceStatus] || 
           '#6B7280';
  }

  /**
   * Get alert type color
   */
  getAlertColor(type: AlertType): string {
    return ALERT_TYPE_COLORS[type];
  }

  /**
   * Get trend direction icon
   */
  getTrendIcon(direction: TrendDirection): string {
    return TREND_DIRECTION_ICONS[direction];
  }

  /**
   * Get impact level color
   */
  getImpactColor(level: ImpactLevel): string {
    return IMPACT_LEVEL_COLORS[level];
  }

  /**
   * Calculate variance (actual - budget)
   */
  calculateVariance(actual: number, budget: number): number {
    return actual - budget;
  }

  /**
   * Calculate efficiency percentage
   */
  calculateEfficiency(spent: number, budget: number): number {
    if (!budget || budget <= 0) return 0;
    return Math.round((spent / budget) * 100 * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate remaining budget
   */
  calculateRemaining(budget: number, spent: number): number {
    return Math.max(0, budget - spent);
  }

  /**
   * Get alert severity based on percentage
   */
  getAlertSeverity(percentage: number): AlertType {
    if (percentage >= 90) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'info';
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'TND'): string {
    const currencySymbols: { [key: string]: string } = {
      'TND': 'د.ت',
      'USD': '$',
      'EUR': '€'
    };

    const symbol = currencySymbols[currency] || currency;
    return `${amount.toFixed(2)} ${symbol}`;
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Calculate budget utilization percentage
   */
  calculateUtilization(spent: number, budget: number): number {
    if (!budget || budget <= 0) return 0;
    return Math.min(100, (spent / budget) * 100);
  }

  /**
   * Check if budget is critical (over 90% or exceeded)
   */
  isBudgetCritical(spent: number, budget: number): boolean {
    const status = this.calculateBudgetStatus(spent, budget);
    return status === 'exceeded' || status === 'warning';
  }

  /**
   * Check if budget is healthy (under 60% utilization)
   */
  isBudgetHealthy(spent: number, budget: number): boolean {
    const status = this.calculateBudgetStatus(spent, budget);
    return status === 'safe';
  }

  /**
   * Get month name from month number
   */
  getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  }

  /**
   * Get short month name from month number
   */
  getShortMonthName(month: number): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1] || 'Unknown';
  }

  /**
   * Calculate year-to-date progress
   */
  calculateYTDProgress(): number {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
    
    const totalYearMs = endOfYear.getTime() - startOfYear.getTime();
    const elapsedMs = now.getTime() - startOfYear.getTime();
    
    return (elapsedMs / totalYearMs) * 100;
  }

  /**
   * Get budget health score (0-100)
   */
  getBudgetHealthScore(categoryAnalysis: any[]): number {
    if (!categoryAnalysis || categoryAnalysis.length === 0) return 100;

    const scores = categoryAnalysis.map(category => {
      const efficiency = this.calculateEfficiency(category.actualSpending, category.budgetLimit || 0);
      
      // Score based on efficiency (lower is better)
      if (efficiency <= 60) return 100;
      if (efficiency <= 80) return 80;
      if (efficiency <= 90) return 60;
      if (efficiency <= 100) return 40;
      return 20; // Over budget
    });

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  /**
   * Get spending velocity (spending rate compared to time progress)
   */
  getSpendingVelocity(spent: number, budget: number): number {
    const timeProgress = this.calculateYTDProgress();
    const spendingProgress = this.calculateUtilization(spent, budget);
    
    if (timeProgress === 0) return 0;
    return spendingProgress / timeProgress;
  }

  /**
   * Predict end-of-year spending based on current velocity
   */
  predictEOYSpending(spent: number, budget: number): number {
    const velocity = this.getSpendingVelocity(spent, budget);
    const timeProgress = this.calculateYTDProgress() / 100;
    
    if (timeProgress === 0) return spent;
    return spent / timeProgress;
  }

  /**
   * Get budget recommendations based on analysis
   */
  getBudgetRecommendations(categoryAnalysis: any[]): string[] {
    const recommendations: string[] = [];

    categoryAnalysis.forEach(category => {
      const efficiency = this.calculateEfficiency(category.actualSpending, category.budgetLimit || 0);
      
      if (efficiency > 100) {
        recommendations.push(`Consider increasing budget for ${category.category} or reducing expenses`);
      } else if (efficiency > 90) {
        recommendations.push(`Monitor ${category.category} spending closely - approaching budget limit`);
      } else if (efficiency < 50 && category.budgetLimit > 0) {
        recommendations.push(`${category.category} budget might be overallocated - consider redistribution`);
      }
    });

    return recommendations;
  }

  /**
   * Calculate savings target based on overspend
   */
  calculateSavingsTarget(categoryAnalysis: any[]): number {
    return categoryAnalysis
      .filter(cat => cat.actualSpending > (cat.budgetLimit || 0))
      .reduce((total, cat) => total + (cat.actualSpending - (cat.budgetLimit || 0)), 0);
  }

  /**
   * Get top spending categories
   */
  getTopSpendingCategories(categoryAnalysis: any[], limit: number = 5): any[] {
    return [...categoryAnalysis]
      .sort((a, b) => b.actualSpending - a.actualSpending)
      .slice(0, limit);
  }

  /**
   * Get categories over budget
   */
  getCategoriesOverBudget(categoryAnalysis: any[]): any[] {
    return categoryAnalysis.filter(cat => 
      cat.budgetLimit && cat.actualSpending > cat.budgetLimit
    );
  }

  /**
   * Get categories under budget
   */
  getCategoriesUnderBudget(categoryAnalysis: any[]): any[] {
    return categoryAnalysis.filter(cat => 
      cat.budgetLimit && cat.actualSpending <= cat.budgetLimit * 0.8
    );
  }

  /**
   * Build HTTP params from object
   */
  protected override buildParams(obj: any): any {
    const params: any = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined && value !== null && value !== '') {
        if (value instanceof Date) {
          params[key] = value.toISOString().split('T')[0]; // YYYY-MM-DD format
        } else {
          params[key] = value.toString();
        }
      }
    });
    
    return params;
  }
}