import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService} from '../../../services/reports/reports.service';

// Chart.js (installe: npm i chart.js)
import Chart from 'chart.js/auto';

type ConsumptionRow = { productId: string; productName?: string; qty: number; revenue: number; cost: number; margin: number };
type OrderRow = { date: string | Date; userEmail: string; itemsRevenue: number; itemsCost: number; margin: number };

@Component({
  selector: 'admin-reports',
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './admin-user-consumption.component.html',
  standalone: true,
  styleUrl: './admin-user-consumption.component.css'
})
export class AdminReportsComponent implements AfterViewInit {
  private api = inject(ReportsService);

  // Filtres
  userId = '';
  from = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  to   = new Date().toISOString().slice(0, 10);

  // État
  loading = signal(true);
  items   = signal<ConsumptionRow[]>([]);
  byOrder = signal<OrderRow[]>([]);
  summary = signal<{ordersCount:number; revenue:number; cost:number; margin:number} | undefined>(undefined);

  // Charts
  @ViewChild('barTopProducts', { static: false }) barTopProductsRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineMargin', { static: false }) lineMarginRef?: ElementRef<HTMLCanvasElement>;
  private barChart?: Chart;
  private lineChart?: Chart;

  ngAfterViewInit() {
    // Premier chargement
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const p = { from: this.from, to: this.to };
      const [cons, orders, sum] = await Promise.all([
        this.api.consumption({ ...p, userId: this.userId || undefined }).toPromise(),
        this.api.profitByOrder(p).toPromise(),
        this.api.profitSummary(p).toPromise(),
      ]);
      this.items.set(cons?.items || []);
      this.byOrder.set((orders?.items || []).map(r => ({ ...r, date: new Date(r.date) })));
      this.summary.set(sum);

    } finally {
      this.loading.set(false);
      requestAnimationFrame(() => this.renderCharts());
    }
  }

  async exportCsv() {
    const csv = await this.api.toCsv(this.items());
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `consommation-${this.from}_${this.to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ---------- Charts ----------
  private renderCharts() {
    this.renderBarTopProducts();
    this.renderLineMargin();
  }

  private renderBarTopProducts() {
    if (!this.barTopProductsRef?.nativeElement) return;

    // Top 10 par CA
    const top = [...this.items()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const labels = top.map(r => (r.productName || r.productId));
    const dataRevenue = top.map(r => r.revenue);
    const dataMargin  = top.map(r => r.margin);

    // cleanup
    if (this.barChart) {
      this.barChart.destroy();
    }
    this.barChart = new Chart(this.barTopProductsRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'CA (TND)',    data: dataRevenue },
          { label: 'Marge (TND)', data: dataMargin  },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
        scales: { x: { ticks: { maxRotation: 45, minRotation: 0 } }, y: { beginAtZero: true } }
      }
    });
  }

  private renderLineMargin() {
    if (!this.lineMarginRef?.nativeElement) return;

    // Tri par date asc
    const rows = [...this.byOrder()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const labels = rows.map(r => new Date(r.date).toLocaleDateString('fr-TN'));
    const margins = rows.map(r => r.margin);

    if (this.lineChart) {
      this.lineChart.destroy();
    }
    this.lineChart = new Chart(this.lineMarginRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Marge (TND)', data: margins, tension: 0.3, fill: false }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}
