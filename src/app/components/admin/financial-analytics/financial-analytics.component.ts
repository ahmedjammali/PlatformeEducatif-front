// components/admin/financial-analytics/financial-analytics.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-financial-analytics',
    templateUrl: './financial-analytics.component.html',
    styleUrls: ['./financial-analytics.component.css']
})
export class FinancialAnalyticsComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Tab management
    activeTab: 'income' | 'outcome' | 'combined-export' = 'income';
    tabs: Array<{
        id: 'income' | 'outcome' | 'combined-export';
        label: string;
        icon: string;
        description: string;
        color: string;
    }> = [
            {
                id: 'income',
                label: 'Analyse des Revenus',
                icon: 'fas fa-chart-line',
                description: 'Paiements étudiants et revenus',
                color: 'success'
            },
            {
                id: 'outcome',
                label: 'Analyse des Dépenses',
                icon: 'fas fa-chart-pie',
                description: 'Charges et salaires',
                color: 'danger'
            },
            {
                id: 'combined-export',
                label: 'Export Combiné',
                icon: 'fas fa-download',
                description: 'Exportation des données financières',
                color: 'primary'
            }
        ];

    // Loading states
    isLoadingTab = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Listen to route changes to set active tab
        this.route.queryParams
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                const tab = params['tab'];
                if (tab && (tab === 'income' || tab === 'outcome' || tab === 'combined-export')) {
                    this.setActiveTab(tab, false); // false to avoid circular navigation
                }
            });

        // Set initial tab from URL or default
        const initialTab = this.route.snapshot.queryParams['tab'] || 'income';
        this.setActiveTab(initialTab, false);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Set the active tab and update URL
     */
    setActiveTab(tab: 'income' | 'outcome' | 'combined-export', updateUrl: boolean = true): void {
        if (this.activeTab === tab) return;

        this.isLoadingTab = true;
        this.activeTab = tab;

        // Update URL with tab parameter
        if (updateUrl) {
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { tab },
                queryParamsHandling: 'merge'
            });
        }

        // Simulate loading delay for smooth transition
        setTimeout(() => {
            this.isLoadingTab = false;
        }, 300);
    }

    /**
     * Get the current tab configuration
     */
    get currentTab() {
        return this.tabs.find(tab => tab.id === this.activeTab);
    }

    /**
     * Check if a tab is active
     */
    isTabActive(tabId: string): boolean {
        return this.activeTab === tabId;
    }

    /**
     * Get tab CSS classes
     */
    getTabClasses(tab: any): string {
        const baseClasses = 'nav-link tab-button';
        const activeClass = this.isTabActive(tab.id) ? 'active' : '';
        const colorClass = `tab-${tab.color}`;

        return `${baseClasses} ${activeClass} ${colorClass}`;
    }

    /**
     * Handle tab click events
     */
    onTabClick(tabId: 'income' | 'outcome' | 'combined-export', event: Event): void {
        event.preventDefault();
        this.setActiveTab(tabId);
    }

    /**
     * Handle keyboard navigation
     */
    onTabKeydown(event: KeyboardEvent, tabId: 'income' | 'outcome' | 'combined-export'): void {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.setActiveTab(tabId);
        }
    }
}
