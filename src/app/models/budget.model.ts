// models/budget.model.ts
import { ChargeCategory } from './charge.model';

export interface BudgetOverview {
  summary: BudgetSummary;
  categoryAnalysis: CategoryBudgetAnalysis[];
  categories: number;
  totalCharges: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentage: number;
  period: string;
}

export interface CategoryBudgetAnalysis {
  category: ChargeCategory;
  categoryInfo: {
    name: string;
    description: string;
    icon: string;
    color: string;
  };
  budgetLimit: number | null;
  actualSpending: number;
  chargeCount: number;
  avgAmount: number;
  lastCharge: Date | null;
  percentage: number;
  status: BudgetStatus;
  remaining: number | null;
}

export type BudgetStatus = 'safe' | 'caution' | 'warning' | 'exceeded';

// Budget Limits
export interface BudgetLimit {
  categoryName: ChargeCategory;
  monthly?: number;
  quarterly?: number;
  yearly?: number;
}

export interface SetBudgetLimitsRequest {
  budgets: BudgetLimit[];
}

export interface SetBudgetLimitsResponse {
  message: string;
  results: BudgetUpdateResult[];
}

export interface BudgetUpdateResult {
  category: string;
  updated: boolean;
  budgetLimit?: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  error?: string;
}

// Spending Trends
export interface SpendingTrends {
  monthlyTrends: MonthlyTrend[];
  trendDirection: TrendDirection;
  forecastNext: number;
  categoryBreakdown: CategorySpendingBreakdown[];
  period: {
    startDate: Date;
    endDate: Date;
    months: number;
  };
  totalSpent: number;
  averageMonthly: number;
}

export interface MonthlyTrend {
  _id: {
    year: number;
    month: number;
  };
  totalAmount: number;
  chargeCount: number;
  avgAmount: number;
}

export interface CategorySpendingBreakdown {
  _id: ChargeCategory;
  totalAmount: number;
  chargeCount: number;
  avgAmount: number;
  trend: TrendPoint[];
}

export interface TrendPoint {
  month: number;
  year: number;
  amount: number;
}

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

// Budget Alerts
export interface BudgetAlerts {
  alerts: BudgetAlert[];
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  generatedAt: Date;
}

export interface BudgetAlert {
  type: AlertType;
  category: string;
  message: string;
  budgetLimit?: number;
  actualSpending?: number;
  percentage?: number;
  period: 'monthly' | 'yearly';
  icon: string;
  color: string;
  currentSpending?: number;
  averageSpending?: number;
  details?: any;
}

export type AlertType = 'critical' | 'warning' | 'info';

// Budget Reports
export interface BudgetReport {
  reportInfo: {
    generatedAt: Date;
    period: {
      startDate: string;
      endDate: string;
    };
    school: string;
  };
  summary: {
    totalCharges: number;
    totalAmount: number;
    averageAmount: number;
    maxAmount: number;
    minAmount: number;
    pendingAmount: number;
    paidAmount: number;
  };
  categoryBreakdown: CategorySpendingBreakdown[];
  monthlyComparison: MonthlyComparison[];
  topSuppliers: TopSupplierInReport[];
  metadata: {
    totalCategories: number;
    reportPeriodDays: number;
  };
}

export interface MonthlyComparison {
  _id: {
    year: number;
    month: number;
  };
  totalAmount: number;
  chargeCount: number;
}

export interface TopSupplierInReport {
  _id: string;
  totalSpent: number;
  orderCount: number;
  avgOrder: number;
}

// Period Comparison
export interface PeriodComparison {
  summary: {
    period1Total: number;
    period2Total: number;
    totalDifference: number;
    percentageChange: number;
    periods: {
      period1: { start: string; end: string };
      period2: { start: string; end: string };
    };
  };
  comparison: ComparisonItem[];
  compareBy: 'category' | 'month';
  totalComparisons: number;
}

export interface ComparisonItem {
  identifier: any;
  period1: {
    totalAmount: number;
    chargeCount: number;
  };
  period2: {
    totalAmount: number;
    chargeCount: number;
  };
  difference: number;
  percentageChange: number;
  trend: 'increased' | 'decreased' | 'stable';
}

// Budget Performance
export interface BudgetPerformance {
  summary: {
    totalBudget: number;
    totalSpent: number;
    overallVariance: number;
    overallEfficiency: number;
    categoriesOnTrack: number;
    categoriesAtRisk: number;
    categoriesOverBudget: number;
  };
  performance: CategoryPerformance[];
  year: number;
}

export interface CategoryPerformance {
  category: ChargeCategory;
  categoryInfo: {
    name: string;
    description: string;
    icon: string;
    color: string;
  };
  budget: number;
  actualSpent: number;
  variance: number;
  efficiency: number;
  status: PerformanceStatus;
  chargeCount: number;
  remaining: number;
}

export type PerformanceStatus = 'excellent' | 'good' | 'at_risk' | 'over_budget';

// Budget Projections
export interface BudgetProjections {
  projections: MonthlyProjection[];
  basedOnMonths: number;
  projectionPeriod: number;
  totalProjected: number;
}

export interface MonthlyProjection {
  month: number;
  year: number;
  date: Date;
  projectedSpending: number;
  categoryBreakdown: CategoryProjection[];
}

export interface CategoryProjection {
  category: ChargeCategory;
  projected: number;
}

// Cost Optimization
export interface CostOptimization {
  suggestions: OptimizationSuggestion[];
  totalSuggestions: number;
  potentialSavings: number;
  generatedAt: Date;
}

export interface OptimizationSuggestion {
  type: OptimizationType;
  category: string;
  message: string;
  impact: ImpactLevel;
  recommendation: string;
  potentialSavings?: number;
  currentSpending?: number;
  averageSpending?: number;
  details?: any;
}

export type OptimizationType = 'cost_reduction' | 'recurring_optimization' | 'duplicate_review';
export type ImpactLevel = 'low' | 'medium' | 'high';

// Request interfaces
export interface BudgetOverviewRequest {
  year?: number;
  month?: number;
}

export interface SpendingTrendsRequest {
  category?: ChargeCategory;
  months?: number;
}

export interface BudgetReportRequest {
  startDate: string;
  endDate: string;
  includeCategories?: boolean;
  includeComparisons?: boolean;
  format?: 'json' | 'pdf';
}

export interface PeriodComparisonRequest {
  period1Start: string;
  period1End: string;
  period2Start: string;
  period2End: string;
  compareBy?: 'category' | 'month';
}

export interface BudgetPerformanceRequest {
  year?: number;
}

export interface BudgetProjectionsRequest {
  months?: number;
}

// Constants and utilities
export const BUDGET_STATUS_COLORS: { [key in BudgetStatus]: string } = {
  safe: '#10B981',      // Green
  caution: '#F59E0B',   // Yellow
  warning: '#F97316',   // Orange
  exceeded: '#EF4444'   // Red
};

export const PERFORMANCE_STATUS_COLORS: { [key in PerformanceStatus]: string } = {
  excellent: '#10B981',  // Green
  good: '#3B82F6',      // Blue
  at_risk: '#F59E0B',   // Yellow
  over_budget: '#EF4444' // Red
};

export const ALERT_TYPE_COLORS: { [key in AlertType]: string } = {
  critical: '#EF4444',  // Red
  warning: '#F59E0B',   // Yellow
  info: '#3B82F6'       // Blue
};

export const TREND_DIRECTION_ICONS: { [key in TrendDirection]: string } = {
  increasing: '📈',
  decreasing: '📉',
  stable: '➡️'
};

export const IMPACT_LEVEL_COLORS: { [key in ImpactLevel]: string } = {
  low: '#10B981',       // Green
  medium: '#F59E0B',    // Yellow
  high: '#EF4444'       // Red
};

// Utility functions interface
export interface BudgetUtils {
  calculateBudgetStatus(spent: number, budget: number): BudgetStatus;
  calculatePerformanceStatus(efficiency: number): PerformanceStatus;
  formatCurrency(amount: number, currency?: string): string;
  getStatusColor(status: BudgetStatus | PerformanceStatus): string;
  getTrendIcon(direction: TrendDirection): string;
  calculateVariance(actual: number, budget: number): number;
  calculateEfficiency(spent: number, budget: number): number;
  getAlertSeverity(percentage: number): AlertType;
  formatPercentage(value: number): string;
}