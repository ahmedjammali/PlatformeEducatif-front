// chart.service.ts
import { Injectable } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  private charts: Map<string, Chart> = new Map();

  constructor() {
    Chart.register(...registerables);
  }

  createBarChart(
    canvas: HTMLCanvasElement,
    chartId: string,
    data: any,
    options?: any
  ): Chart | null {
    try {
      this.destroyChart(chartId);

      const config: ChartConfiguration = {
        type: 'bar',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            }
          },
          scales: {
            x: {
              display: true,
              grid: {
                display: false
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: {
                color: '#f0f0f0'
              }
            }
          },
          ...options
        }
      };

      const chart = new Chart(canvas, config);
      this.charts.set(chartId, chart);
      return chart;
    } catch (error) {
      console.error('Error creating bar chart:', error);
      return null;
    }
  }

  createLineChart(
    canvas: HTMLCanvasElement,
    chartId: string,
    data: any,
    options?: any
  ): Chart | null {
    try {
      this.destroyChart(chartId);

      const config: ChartConfiguration = {
        type: 'line',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            }
          },
          scales: {
            x: {
              display: true,
              grid: {
                display: false
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: {
                color: '#f0f0f0'
              }
            }
          },
          elements: {
            line: {
              tension: 0.4
            }
          },
          ...options
        }
      };

      const chart = new Chart(canvas, config);
      this.charts.set(chartId, chart);
      return chart;
    } catch (error) {
      console.error('Error creating line chart:', error);
      return null;
    }
  }

  createMixedChart(
    canvas: HTMLCanvasElement,
    chartId: string,
    data: any,
    options?: any
  ): Chart | null {
    try {
      this.destroyChart(chartId);

      const config: ChartConfiguration = {
        type: 'bar',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            }
          },
          scales: {
            x: {
              display: true,
              grid: {
                display: false
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: {
                color: '#f0f0f0'
              },
              position: 'left',
            },
            y1: {
              display: true,
              beginAtZero: true,
              position: 'right',
              grid: {
                drawOnChartArea: false,
              },
            }
          },
          ...options
        }
      };

      const chart = new Chart(canvas, config);
      this.charts.set(chartId, chart);
      return chart;
    } catch (error) {
      console.error('Error creating mixed chart:', error);
      return null;
    }
  }

  createDoughnutChart(
    canvas: HTMLCanvasElement,
    chartId: string,
    data: any,
    options?: any
  ): Chart | null {
    try {
      this.destroyChart(chartId);

      const config: ChartConfiguration = {
        type: 'doughnut',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              callbacks: {
               label: function (context) {
                      const label = context.label || '';
                      const value = context.parsed;

                      // Ensure dataset.data only includes numbers
                      const rawData = context.dataset.data as (number | null)[];
                      const total = rawData
                        .filter((v): v is number => typeof v === 'number')
                        .reduce((a, b) => a + b, 0);

                      const percentage = total ? ((value / total) * 100).toFixed(1) : '0.0';
                      return `${label}: ${value} (${percentage}%)`;
                    }
                    
              }
            }
          },
          ...options
        }
      };

      const chart = new Chart(canvas, config);
      this.charts.set(chartId, chart);
      return chart;
    } catch (error) {
      console.error('Error creating doughnut chart:', error);
      return null;
    }
  }

  updateChart(chartId: string, newData: any): void {
    const chart = this.charts.get(chartId);
    if (chart) {
      chart.data = newData;
      chart.update();
    }
  }

  destroyChart(chartId: string): void {
    const chart = this.charts.get(chartId);
    if (chart) {
      chart.destroy();
      this.charts.delete(chartId);
    }
  }

  destroyAllCharts(): void {
    this.charts.forEach((chart) => {
      chart.destroy();
    });
    this.charts.clear();
  }

  // Helper method to generate chart colors
  generateColors(count: number): string[] {
    const baseColors = [
      '#4caf50', // Primary green
      '#f0bb78', // Secondary orange
      '#2196f3', // Blue
      '#ff9800', // Orange
      '#9c27b0', // Purple
      '#607d8b', // Blue grey
      '#795548', // Brown
      '#e91e63', // Pink
      '#009688', // Teal
      '#ff5722'  // Deep orange
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }

  // Helper method to generate background colors with opacity
  generateBackgroundColors(count: number, opacity: number = 0.8): string[] {
    const colors = this.generateColors(count);
    return colors.map(color => {
      // Convert hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    });
  }
}