import { Component, OnInit } from '@angular/core';
import { IncomeAnalyticsService, IncomeFilters } from '../../../services/income-analytics.service';
import { OutcomeAnalyticsService, OutcomeFilters } from '../../../services/outcome-analytics.service';

type IncomeRow = { date: string; origin?: string; type: string; amount: number; description?: string };
type OutcomeRow = { date: string; origin?: string; category: string; amount: number; description?: string };
type OpRow = { date: string; amount: number };

@Component({
  selector: 'app-caisse',
  templateUrl: './caisse.component.html',
  styleUrls: ['./caisse.component.css']
})
export class CaisseComponent implements OnInit {
  // today values
  public dailyIncome = 0;
  public dailyOutcome = 0;
  public dailyBalance = 0;
  public transportPaymentsToday = 0;

  // transport totals since start
  public transportCaisse = 0;
  public transportStartDate = '2025-11-01';

  // accumulation (public for template)
  public caisseAccum: number = 0;      // accumulated daily (excludes transport)
  public caisseGenerale: number = 0;   // computed displayed general (accum + transport - outcome)

  // totals
  public totalIncome = 0;
  public totalOutcome = 0;

  // details modal data
  public showDetailsModal = false;
  public detailsTitle = '';
  public detailsShowOrigin = false; // show origin column only for general
  public detailsData: { income: IncomeRow[]; outcome: OutcomeRow[] } = { income: [], outcome: [] };

  // operations (versements / bank transfers) local history
  public showOperationsModal = false;
  public depositHistory: OpRow[] = [];
  public bankTransferHistory: OpRow[] = [];

  // deposit / transfer modals
  public showExternalDeposit = false;
  public showBankTransfer = false;
  public externalAmount = 0;
  public bankTransferAmount = 0;

  // local persistence keys
  private readonly KEY_ACCUM = 'caisseAccum';
  private readonly KEY_LAST_DATE = 'caisseAccumLastDate';
  private readonly KEY_DEPOSITS = 'caisseDepositHistory';
  private readonly KEY_TRANSFERS = 'caisseBankTransferHistory';

  constructor(
    private incomeService: IncomeAnalyticsService,
    private outcomeService: OutcomeAnalyticsService
  ) {}

  ngOnInit(): void {
    this.restoreLocalState();
    this.reloadAll();
  }

  private restoreLocalState(): void {
    const acc = localStorage.getItem(this.KEY_ACCUM);
    this.caisseAccum = acc ? Number(acc) : 0;
    const dep = localStorage.getItem(this.KEY_DEPOSITS);
    this.depositHistory = dep ? JSON.parse(dep) : [];
    const tr = localStorage.getItem(this.KEY_TRANSFERS);
    this.bankTransferHistory = tr ? JSON.parse(tr) : [];
  }

  private saveLocalState(): void {
    localStorage.setItem(this.KEY_ACCUM, String(this.caisseAccum));
    localStorage.setItem(this.KEY_DEPOSITS, JSON.stringify(this.depositHistory));
    localStorage.setItem(this.KEY_TRANSFERS, JSON.stringify(this.bankTransferHistory));
    localStorage.setItem(this.KEY_LAST_DATE, this.getToday());
  }

  /** Reload today's data + totals */
  public reloadAll(): void {
    const today = this.getToday();

    // 1) fetch today's income
    const incToday: IncomeFilters = { startDate: today, endDate: today };
    this.incomeService.getIncomeAnalytics(incToday).subscribe({
      next: incRes => {
        this.dailyIncome = incRes.data?.summary?.total_collecte ?? 0;
        const tComp = incRes.data?.componentAnalysis?.['transport'];
        this.transportPaymentsToday = tComp?.collecte ?? 0;

        // 2) fetch today's outcome
        const outToday: OutcomeFilters = { startDate: today, endDate: today };
        this.outcomeService.getOutcomeAnalytics(outToday).subscribe({
          next: outRes => {
            this.dailyOutcome = outRes.data?.summary?.total_outcome ?? 0;
            this.dailyBalance = this.dailyIncome - this.dailyOutcome;

            // accumulate today's daily excluding transport (only once per day)
            this.applyDailyAccumulation();
            // recompute the totals that use transport and totals outcome
            this.loadTransportAndTotals();
          },
          error: err => {
            console.error('Error loading today outcome', err);
            this.dailyOutcome = 0;
            this.dailyBalance = this.dailyIncome;
            this.applyDailyAccumulation();
            this.loadTransportAndTotals();
          }
        });
      },
      error: err => {
        console.error('Error loading today income', err);
        this.dailyIncome = 0;
        this.transportPaymentsToday = 0;
        this.dailyOutcome = 0;
        this.dailyBalance = 0;
        this.applyDailyAccumulation();
        this.loadTransportAndTotals();
      }
    });
  }

  /** Add today's (daily excluding transport) to caisseAccum once per calendar day */
  private applyDailyAccumulation(): void {
    const today = this.getToday();
    const last = localStorage.getItem(this.KEY_LAST_DATE);
    if (last === today) return; // already applied today

    const dailyExcludingTransport = (this.dailyIncome - this.dailyOutcome) - (this.transportPaymentsToday ?? 0);
    // only add if numeric
    const toAdd = isFinite(dailyExcludingTransport) ? dailyExcludingTransport : 0;
    this.caisseAccum = (this.caisseAccum ?? 0) + toAdd;

    // persist and mark applied date
    localStorage.setItem(this.KEY_ACCUM, String(this.caisseAccum));
    localStorage.setItem(this.KEY_LAST_DATE, today);
  }

  /** Load transport total and totals outcome, then compute caisseGenerale (now includes dépense) */
  private loadTransportAndTotals(): void {
    const today = this.getToday();
    const totalsFilter: IncomeFilters = { startDate: this.transportStartDate, endDate: today };

    this.incomeService.getIncomeAnalytics(totalsFilter).subscribe({
      next: totInc => {
        this.totalIncome = totInc.data?.summary?.total_collecte ?? 0;
        this.transportCaisse = totInc.data?.componentAnalysis?.['transport']?.collecte ?? 0;

        const outFilt: OutcomeFilters = { startDate: this.transportStartDate, endDate: today };
        this.outcomeService.getOutcomeAnalytics(outFilt).subscribe({
          next: totOut => {
            this.totalOutcome = totOut.data?.summary?.total_outcome ?? 0;

            // Now include dépense in general
            this.caisseGenerale = (this.caisseAccum ?? 0) + (this.transportCaisse ?? 0);
            if (!isFinite(this.caisseGenerale)) this.caisseGenerale = 0;
          },
          error: err => {
            console.error('Error loading totals outcome', err);
            this.caisseGenerale = (this.caisseAccum ?? 0) + (this.transportCaisse ?? 0);
            if (!isFinite(this.caisseGenerale)) this.caisseGenerale = 0;
          }
        });
      },
      error: err => {
        console.error('Error loading totals income', err);
        this.caisseGenerale = (this.caisseAccum ?? 0) + (this.transportCaisse ?? 0);
        if (!isFinite(this.caisseGenerale)) this.caisseGenerale = 0;
      }
    });
  }

  /** Show details for chosen caisse type.
   * - 'daily' -> payments only for today
   * - 'transport' -> payments for transport (since transportStartDate)
   * - 'general' -> payments for full period (since transportStartDate) and shows origin column
   */
  public showDetails(type: 'daily' | 'transport' | 'general'): void {
    this.showDetailsModal = true;
    this.detailsShowOrigin = (type === 'general');
    this.detailsTitle = type === 'daily' ? 'Caisse Journalière' : type === 'transport' ? 'Caisse Transport' : 'Caisse Générale';
    this.detailsData = { income: [], outcome: [] };

    const today = this.getToday();
    if (type === 'daily') {
      this.incomeService.getIncomeAnalytics({ startDate: today, endDate: today }).subscribe({
        next: inc => {
          // extract payment-level rows, only for today
          this.detailsData.income = this.extractPaidIncomeRows(inc.data, undefined, undefined, /*onlyToday*/ true);
        },
        error: err => console.error('Error loading daily income details', err)
      });
      this.outcomeService.getOutcomeAnalytics({ startDate: today, endDate: today }).subscribe({
        next: out => {
          this.detailsData.outcome = this.extractOutcomeRows(out.data, 'Caisse Journalière', /*onlyToday*/ true);
        },
        error: err => console.error('Error loading daily outcome details', err)
      });
    } else if (type === 'transport') {
      this.incomeService.getIncomeAnalytics({ startDate: this.transportStartDate, endDate: today, component: 'transport' }).subscribe({
        next: inc => {
          this.detailsData.income = this.extractPaidIncomeRows(inc.data, 'Caisse Transport', 'transport', /*onlyToday*/ false);
        },
        error: err => console.error('Error loading transport income details', err)
      });
      this.outcomeService.getOutcomeAnalytics({ startDate: this.transportStartDate, endDate: today }).subscribe({
        next: out => {
          const charges = (out.data?.charges ?? []).filter((c: any) => (c.categorie ?? '').toLowerCase().includes('transport'));
          this.detailsData.outcome = charges.map((c: any) => ({
            date: c.date ?? this.getToday(),
            origin: 'Caisse Transport',
            category: c.categorie ?? c.description ?? 'Transport',
            amount: c.montant ?? 0,
            description: c.description ?? ''
          }));
        },
        error: err => console.error('Error loading transport outcome details', err)
      });
    } else {
      // general
      this.incomeService.getIncomeAnalytics({ startDate: this.transportStartDate, endDate: today }).subscribe({
        next: inc => {
          this.detailsData.income = this.extractPaidIncomeRows(inc.data, 'Caisse Générale', undefined, /*onlyToday*/ false);
        },
        error: err => console.error('Error loading general income details', err)
      });
      this.outcomeService.getOutcomeAnalytics({ startDate: this.transportStartDate, endDate: today }).subscribe({
        next: out => {
          this.detailsData.outcome = this.extractOutcomeRows(out.data, 'Caisse Générale', /*onlyToday*/ false);
        },
        error: err => console.error('Error loading general outcome details', err)
      });
    }
  }

  public closeDetails(): void {
    this.showDetailsModal = false;
    this.detailsData = { income: [], outcome: [] };
  }

  /* ---------- Extract payment-level income rows (prioritize actual payments) ---------- */
  private extractPaidIncomeRows(
    data: any,
    originLabel?: string,
    onlyComponent?: string,
    onlyToday: boolean = false
  ): IncomeRow[] {
    const rows: IncomeRow[] = [];
    if (!data) return rows;

    const todayIso = new Date().toISOString().split('T')[0];

    // 1) If backend returns explicit payment records (preferred)
    const payments = data.payments ?? data.records ?? data.transactions ?? null;
    if (Array.isArray(payments) && payments.length > 0) {
      for (const p of payments) {
        // normalize common fields
        const dateRaw = p.paidDate ?? p.date ?? p.createdAt ?? p.paymentDate ?? p.paid_at ?? null;
        const date = dateRaw ? new Date(dateRaw).toISOString() : null;
        if (!date) continue;
        if (onlyToday && date.split('T')[0] !== todayIso) continue;

        const amount = p.amount ?? p.montant ?? p.collecte ?? 0;
        const comp = p.component ?? p.type ?? p.category ?? '';
        const desc = p.description ?? p.note ?? (p.payerName ? `Paiement — ${p.payerName}` : '');
        const paidFlag = p.isPaid ?? !!date;

        if (paidFlag && amount > 0) {
          rows.push({
            date,
            origin: originLabel ?? (comp ? `Composant: ${comp}` : 'Caisse'),
            type: comp ?? 'Paiement',
            amount,
            description: desc
          });
        }
      }
      // sort desc
      rows.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));
      return rows;
    }

    // 2) If no direct payments, check studentAnalysis.paymentBreakdown where component.payments[] may exist
    const students = data.studentAnalysis ?? [];
    for (const s of students) {
      const payer = s.nom ?? s.studentId ?? 'Payer';
      const pb = s.paymentBreakdown ?? {};
      for (const compKey of Object.keys(pb)) {
        if (onlyComponent && compKey !== onlyComponent) continue;
        const comp = pb[compKey];
        if (!comp) continue;

        // if the component has a payments array, iterate those
        const compPayments = comp.payments ?? comp.transactions ?? null;
        if (Array.isArray(compPayments) && compPayments.length > 0) {
          for (const p of compPayments) {
            const dateRaw = p.paidDate ?? p.date ?? p.createdAt ?? p.paymentDate ?? p.paid_at ?? null;
            const date = dateRaw ? new Date(dateRaw).toISOString() : null;
            if (!date) continue;
            if (onlyToday && date.split('T')[0] !== todayIso) continue;

            const amount = p.amount ?? p.paid ?? p.collecte ?? 0;
            const paidFlag = p.isPaid  ?? !!date;
            if (paidFlag && amount > 0) {
              rows.push({
                date,
                origin: originLabel ?? `Caisse — ${payer}`,
                type: compKey,
                amount,
                description: p.description ?? `${compKey} — ${payer}`
              });
            }
          }
          continue; // next comp
        }

        // else try single comp-level paid fields:
        const amount = comp.collecte ?? comp.paid ?? comp.total ?? 0;
        const dateRaw = comp.paidDate ?? comp.date ?? comp.paid_at ?? s.paidDate ?? s.lastPaymentDate ?? null;
        const date = dateRaw ? new Date(dateRaw).toISOString() : null;
        const isPaid = comp.isPaid ?? !!comp.collecte;
        if (isPaid && amount > 0 && date) {
          if (onlyToday && date.split('T')[0] !== todayIso) continue;
          rows.push({
            date,
            origin: originLabel ?? `Caisse — ${payer}`,
            type: compKey,
            amount,
            description: comp.description ?? `${compKey} — ${payer}`
          });
        }
      }
    }

    // 3) fallback to componentAnalysis summary (if absolutely nothing else)
    if (rows.length === 0 && data.componentAnalysis) {
      for (const k of Object.keys(data.componentAnalysis)) {
        if (onlyComponent && k !== onlyComponent) continue;
        const c = data.componentAnalysis[k];
        const amt = c?.collecte ?? c?.total ?? 0;
        if (amt && amt > 0) {
          const date = new Date().toISOString();
          if (onlyToday && date.split('T')[0] !== todayIso) continue;
          rows.push({
            date,
            origin: originLabel ?? `Composant: ${k}`,
            type: `Composant: ${k}`,
            amount: amt,
            description: `Synthèse composant ${k}`
          });
        }
      }
    }

    // sort desc by date
    rows.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0) || b.amount - a.amount);
    return rows;
  }

  private extractOutcomeRows(data: any, originLabel: string, onlyToday: boolean = false): OutcomeRow[] {
    const rows: OutcomeRow[] = [];
    if (!data) return rows;
    const todayIso = new Date().toISOString().split('T')[0];

    const charges = data.charges ?? [];
    for (const c of charges) {
      const dateRaw = c.date ?? c.createdAt ?? null;
      const date = dateRaw ? new Date(dateRaw).toISOString() : this.getToday();
      if (onlyToday && date.split('T')[0] !== todayIso) continue;
      const amt = c.montant ?? c.amount ?? 0;
      if (amt > 0) {
        rows.push({
          date,
          origin: originLabel,
          category: c.categorie ?? c.description ?? 'Charge',
          amount: amt,
          description: c.description ?? ''
        });
      }
    }

    const salaries = data.salaries ?? [];
    for (const s of salaries) {
      const schedule = s.paymentSchedule ?? [];
      for (const it of schedule) {
        const dateRaw = it.paidDate ?? it.dueDate ?? null;
        const date = dateRaw ? new Date(dateRaw).toISOString() : this.getToday();
        if (onlyToday && date.split('T')[0] !== todayIso) continue;
        const amt = it.paidAmount ?? it.finalAmount ?? 0;
        if (amt > 0) {
          rows.push({
            date,
            origin: originLabel,
            category: `Salaire - ${s.user?.name ?? s.user?.role ?? 'Employé'}`,
            amount: amt,
            description: it.note ?? ''
          });
        }
      }
    }

    rows.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0) || b.amount - a.amount);
    return rows;
  }

  /* ---------- Operations (versements & bank transfers) ---------- */

  public showOperationsDetails(): void {
    // open the operations modal (separate from payments details)
    this.showOperationsModal = true;
  }
  public closeOperationsDetails(): void {
    this.showOperationsModal = false;
  }

  public openExternalDeposit(): void { this.externalAmount = 0; this.showExternalDeposit = true; }
  public confirmExternalDeposit(): void {
    const v = Number(this.externalAmount) || 0;
    if (v <= 0) { alert('Veuillez saisir un montant valide.'); return; }
    const now = new Date().toISOString();
    this.depositHistory.unshift({ date: now, amount: v });
    this.caisseAccum += v;
    this.saveLocalState();
    this.caisseGenerale = (this.caisseAccum ?? 0) + (this.transportCaisse ?? 0);
    this.showExternalDeposit = false;
    this.externalAmount = 0;
  }
  public cancelExternalDeposit(): void { this.showExternalDeposit = false; this.externalAmount = 0; }

  public openBankTransfer(): void { this.bankTransferAmount = 0; this.showBankTransfer = true; }
  public confirmBankTransfer(): void {
    const v = Number(this.bankTransferAmount) || 0;
    if (v <= 0) { alert('Veuillez saisir un montant valide.'); return; }
    // enforce available balance (accum + transport - outcome)
    const available = (this.caisseAccum ?? 0) + (this.transportCaisse ?? 0) - (this.totalOutcome ?? 0);
    if (v > available) { alert('Le montant dépasse le solde disponible.'); return; }
    const now = new Date().toISOString();
    this.bankTransferHistory.unshift({ date: now, amount: v });
    // prefer deducting from caisseAccum
    const deduct = Math.min(v, this.caisseAccum);
    this.caisseAccum -= deduct;
    // if still remaining, deduct from transportCaisse
    if (v > deduct) {
      const rem = v - deduct;
      this.transportCaisse = Math.max(0, (this.transportCaisse ?? 0) - rem);
    }
    this.saveLocalState();
    this.caisseGenerale = (this.caisseAccum ?? 0) + (this.transportCaisse ?? 0);
    this.showBankTransfer = false;
    this.bankTransferAmount = 0;
  }
  public cancelBankTransfer(): void { this.showBankTransfer = false; this.bankTransferAmount = 0; }

  /* ---------- helpers ---------- */

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }
}
