// dashboard.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subject.service';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
}

interface ClassStatistics {
  className: string;
  studentCount: number;
  grade: string;
}

interface SubjectStatistics {
  subjectName: string;
  teacherCount: number;
  classCount: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('studentsPerClassChart') studentsPerClassChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('teachersPerSubjectChart') teachersPerSubjectChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('classDistributionChart') classDistributionChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ratioChart') ratioChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('subjectPopularityChart') subjectPopularityChart!: ElementRef<HTMLCanvasElement>;

  currentAcademicYear = '2024-2025';
  
  stats: DashboardStats = {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0
  };

  // Data for charts
  classStatistics: ClassStatistics[] = [];
  subjectStatistics: SubjectStatistics[] = [];
  gradeDistribution: Map<string, number> = new Map();

  private destroy$ = new Subject<void>();
  private charts: Chart[] = [];

  // Chart color scheme using CSS variables
  private colors = {
    primary: '',
    primaryDark: '',
    accent: '',
    secondary: '',
    white: '',
    success: '',
    error: '',
    warning: '',
    info: '',
    multiColor: [] as string[]
  };

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeColors();
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts will be initialized after data is loaded
  }

  ngOnDestroy(): void {
    // Destroy all charts
    this.charts.forEach(chart => chart.destroy());
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeColors(): void {
    // Get CSS variables from root element
    const rootStyles = getComputedStyle(document.documentElement);
    
    this.colors = {
      primary: rootStyles.getPropertyValue('--color-primary').trim(),
      primaryDark: rootStyles.getPropertyValue('--color-primary-dark').trim(),
      accent: rootStyles.getPropertyValue('--color-accent').trim(),
      secondary: rootStyles.getPropertyValue('--color-secondary').trim(),
      white: rootStyles.getPropertyValue('--color-white').trim(),
      success: rootStyles.getPropertyValue('--color-success').trim(),
      error: rootStyles.getPropertyValue('--color-error').trim(),
      warning: rootStyles.getPropertyValue('--color-warning').trim(),
      info: rootStyles.getPropertyValue('--color-info').trim(),
      multiColor: [
        rootStyles.getPropertyValue('--color-accent').trim(),
        rootStyles.getPropertyValue('--color-primary').trim(),
        rootStyles.getPropertyValue('--color-primary-dark').trim(),
        rootStyles.getPropertyValue('--color-secondary').trim(),
        rootStyles.getPropertyValue('--color-success').trim(),
        rootStyles.getPropertyValue('--color-info').trim(),
        rootStyles.getPropertyValue('--color-warning').trim(),
        rootStyles.getPropertyValue('--color-error').trim()
      ]
    };
  }

  quickAction(action: string): void {
    switch (action) {
      case 'add-student':
        this.router.navigate(['/admin/users'], { queryParams: { action: 'new', role: 'student' } });
        break;
      case 'add-teacher':
        this.router.navigate(['/admin/users'], { queryParams: { action: 'new', role: 'teacher' } });
        break;
      case 'create-class':
        this.router.navigate(['/admin/classes'], { queryParams: { action: 'new' } });
        break;
    }
  }

  private loadDashboardData(): void {
    // Load all data in parallel
    forkJoin({
      students: this.userService.getUsers({ role: 'student' }),
      teachers: this.userService.getUsers({ role: 'teacher' }),
      classes: this.classService.getClasses(),
      subjects: this.subjectService.getSubjects()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Update stats
          this.stats.totalStudents = data.students.pagination?.total || data.students.users.length;
          this.stats.totalTeachers = data.teachers.pagination?.total || data.teachers.users.length;
          this.stats.totalClasses = data.classes.pagination?.total || data.classes.classes.length;
          this.stats.totalSubjects = data.subjects.length;

          // Process data for charts
          this.processClassData(data.classes.classes);
          this.processSubjectData(data.subjects, data.teachers.users);
          
          // Initialize charts after data is loaded
          setTimeout(() => this.initializeCharts(), 100);
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
        }
      });
  }

  private processClassData(classes: any[]): void {
    this.classStatistics = [];
    this.gradeDistribution.clear();

    classes.forEach(cls => {
      // Count students per class
      this.classStatistics.push({
        className: cls.name,
        studentCount: cls.students?.length || 0,
        grade: cls.grade
      });

      // Count classes per grade
      const gradeCount = this.gradeDistribution.get(cls.grade) || 0;
      this.gradeDistribution.set(cls.grade, gradeCount + 1);
    });

    // Sort by class name
    this.classStatistics.sort((a, b) => a.className.localeCompare(b.className));
  }

  private processSubjectData(subjects: any[], teachers: any[]): void {
    this.subjectStatistics = [];

    subjects.forEach(subject => {
      // Count teachers teaching each subject
      const teacherCount = teachers.filter(teacher => 
        teacher.teachingClasses?.some((tc: any) => 
          tc.subjects?.some((s: any) => 
            (typeof s === 'string' ? s : s._id) === subject._id
          )
        )
      ).length;

      this.subjectStatistics.push({
        subjectName: subject.name,
        teacherCount: teacherCount,
        classCount: 0 // This would need additional data from classes
      });
    });
  }

  private initializeCharts(): void {
    // Destroy existing charts
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];

    // Students per Class Chart
    if (this.studentsPerClassChart) {
      const chart1 = new Chart(this.studentsPerClassChart.nativeElement, {
        type: 'bar',
        data: {
          labels: this.classStatistics.map(cs => cs.className),
          datasets: [{
            label: 'Nombre d\'étudiants',
            data: this.classStatistics.map(cs => cs.studentCount),
            backgroundColor: this.colors.primary,
            borderColor: this.colors.primaryDark,
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: this.colors.accent,
            hoverBorderColor: this.colors.primaryDark
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: this.colors.primaryDark,
              titleColor: this.colors.white,
              bodyColor: this.colors.white,
              borderColor: this.colors.primary,
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(98, 111, 71, 0.1)' },
              ticks: { color: this.colors.primaryDark }
            },
            x: {
              grid: { display: false },
              ticks: { color: this.colors.primaryDark }
            }
          }
        }
      });
      this.charts.push(chart1);
    }

    // Teachers per Subject Chart
    if (this.teachersPerSubjectChart) {
      const topSubjects = this.subjectStatistics
        .sort((a, b) => b.teacherCount - a.teacherCount)
        .slice(0, 6);

      const chart2 = new Chart(this.teachersPerSubjectChart.nativeElement, {
        type: 'doughnut',
        data: {
          labels: topSubjects.map(s => s.subjectName),
          datasets: [{
            data: topSubjects.map(s => s.teacherCount),
            backgroundColor: this.colors.multiColor.slice(0, topSubjects.length),
            borderWidth: 2,
            borderColor: this.colors.white,
            hoverBorderWidth: 3,
            hoverBorderColor: this.colors.primaryDark
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: { size: 12 },
                color: this.colors.primaryDark,
                usePointStyle: true
              }
            },
            tooltip: {
              backgroundColor: this.colors.primaryDark,
              titleColor: this.colors.white,
              bodyColor: this.colors.white,
              borderColor: this.colors.primary,
              borderWidth: 1,
              callbacks: {
                label: (context) => {
                  return context.label + ': ' + context.parsed + ' enseignants';
                }
              }
            }
          }
        }
      });
      this.charts.push(chart2);
    }

    // Class Distribution by Grade
    if (this.classDistributionChart) {
      const grades = Array.from(this.gradeDistribution.keys()).sort();
      const classCounts = grades.map(g => this.gradeDistribution.get(g) || 0);
      
      // Calculate average students per grade
      const avgStudentsPerGrade = grades.map(grade => {
        const classesInGrade = this.classStatistics.filter(cs => cs.grade === grade);
        const totalStudents = classesInGrade.reduce((sum, cs) => sum + cs.studentCount, 0);
        return classesInGrade.length > 0 ? totalStudents / classesInGrade.length : 0;
      });

      const chart3 = new Chart(this.classDistributionChart.nativeElement, {
        type: 'line',
        data: {
          labels: grades,
          datasets: [{
            label: 'Nombre de classes',
            data: classCounts,
            borderColor: this.colors.primary,
            backgroundColor: this.colors.primary + '30',
            tension: 0.4,
            fill: true,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: this.colors.white,
            pointBorderColor: this.colors.primary,
            pointBorderWidth: 2,
            pointHoverBackgroundColor: this.colors.primary,
            pointHoverBorderColor: this.colors.white
          }, {
            label: 'Moyenne d\'étudiants par classe',
            data: avgStudentsPerGrade,
            borderColor: this.colors.accent,
            backgroundColor: this.colors.accent + '30',
            tension: 0.4,
            fill: true,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: this.colors.white,
            pointBorderColor: this.colors.accent,
            pointBorderWidth: 2,
            pointHoverBackgroundColor: this.colors.accent,
            pointHoverBorderColor: this.colors.white
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                padding: 15,
                usePointStyle: true,
                color: this.colors.primaryDark
              }
            },
            tooltip: {
              backgroundColor: this.colors.primaryDark,
              titleColor: this.colors.white,
              bodyColor: this.colors.white,
              borderColor: this.colors.primary,
              borderWidth: 1
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(98, 111, 71, 0.1)' },
              ticks: { color: this.colors.primaryDark }
            },
            x: {
              grid: { display: false },
              ticks: { color: this.colors.primaryDark }
            }
          }
        }
      });
      this.charts.push(chart3);
    }

    // Students vs Teachers Ratio
    if (this.ratioChart) {
      const ratio = this.stats.totalStudents > 0 && this.stats.totalTeachers > 0 
        ? Math.round((this.stats.totalStudents / this.stats.totalTeachers) * 10) / 10 
        : 0;

      const chart4 = new Chart(this.ratioChart.nativeElement, {
        type: 'polarArea',
        data: {
          labels: ['Étudiants', 'Enseignants', 'Ratio (Étudiants/Enseignant)'],
          datasets: [{
            data: [this.stats.totalStudents, this.stats.totalTeachers, ratio],
            backgroundColor: [
              this.colors.accent + '80',
              this.colors.primary + '80',
              this.colors.primaryDark + '80'
            ],
            borderWidth: 2,
            borderColor: this.colors.white,
            hoverBorderWidth: 3,
            hoverBorderColor: this.colors.primaryDark
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              grid: { color: 'rgba(98, 111, 71, 0.1)' },
              ticks: { color: this.colors.primaryDark }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { 
                padding: 15,
                color: this.colors.primaryDark
              }
            },
            tooltip: {
              backgroundColor: this.colors.primaryDark,
              titleColor: this.colors.white,
              bodyColor: this.colors.white,
              borderColor: this.colors.primary,
              borderWidth: 1
            }
          }
        }
      });
      this.charts.push(chart4);
    }

    // Subject Popularity Chart (placeholder data - would need exercise data)
    if (this.subjectPopularityChart) {
      const topSubjects = this.subjectStatistics
        .sort((a, b) => b.teacherCount - a.teacherCount)
        .slice(0, 6);

      const chart5 = new Chart(this.subjectPopularityChart.nativeElement, {
        type: 'radar',
        data: {
          labels: topSubjects.map(s => s.subjectName),
          datasets: [{
            label: 'Nombre d\'enseignants',
            data: topSubjects.map(s => s.teacherCount),
            borderColor: this.colors.primary,
            backgroundColor: this.colors.primary + '30',
            pointBackgroundColor: this.colors.primary,
            pointBorderColor: this.colors.white,
            pointBorderWidth: 2,
            pointHoverBackgroundColor: this.colors.white,
            pointHoverBorderColor: this.colors.primary,
            pointHoverBorderWidth: 3
          }, {
            label: 'Nombre de classes',
            data: topSubjects.map(s => Math.floor(Math.random() * 8) + 1), // Placeholder data
            borderColor: this.colors.accent,
            backgroundColor: this.colors.accent + '30',
            pointBackgroundColor: this.colors.accent,
            pointBorderColor: this.colors.white,
            pointBorderWidth: 2,
            pointHoverBackgroundColor: this.colors.white,
            pointHoverBorderColor: this.colors.accent,
            pointHoverBorderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              grid: { color: 'rgba(98, 111, 71, 0.1)' },
              ticks: { 
                color: this.colors.primaryDark,
                backdropColor: 'transparent'
              },
              pointLabels: {
                color: this.colors.primaryDark,
                font: { size: 12 }
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                padding: 15,
                usePointStyle: true,
                color: this.colors.primaryDark
              }
            },
            tooltip: {
              backgroundColor: this.colors.primaryDark,
              titleColor: this.colors.white,
              bodyColor: this.colors.white,
              borderColor: this.colors.primary,
              borderWidth: 1
            }
          }
        }
      });
      this.charts.push(chart5);
    }
  }
}