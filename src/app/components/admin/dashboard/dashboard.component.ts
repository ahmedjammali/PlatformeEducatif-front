// dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subject.service';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentAcademicYear = '2024-2025';
  
  stats: DashboardStats = {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0
  };

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  quickAction(action: string): void {
    switch (action) {
      case 'add-student':
        this.router.navigate(['/admin/users/new'], { queryParams: { role: 'student' } });
        break;
      case 'add-teacher':
        this.router.navigate(['/admin/users/new'], { queryParams: { role: 'teacher' } });
        break;
      case 'create-class':
        this.router.navigate(['/admin/classes/new']);
        break;
      case 'generate-report':
        this.router.navigate(['/admin/reports/generate']);
        break;
    }
  }

  private loadDashboardStats(): void {
    // Load students stats
    this.userService.getUsers({ role: 'student' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Student response:', response);
          this.stats.totalStudents = response.pagination?.total || response.users.length;
        },
        error: (error) => {
          console.error('Error loading students:', error);
        }
      });

    // Load teachers stats
    this.userService.getUsers({ role: 'teacher' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Teacher response:', response);
          this.stats.totalTeachers = response.pagination?.total || response.users.length;
        },
        error: (error) => {
          console.error('Error loading teachers:', error);
        }
      });

    // Load classes stats
    this.classService.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Classes response:', response);
          this.stats.totalClasses = response.pagination?.total || response.classes.length;
        },
        error: (error) => {
          console.error('Error loading classes:', error);
        }
      });

    // Load subjects stats
    this.subjectService.getSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subjects) => {
          console.log('Subjects response:', subjects);
          this.stats.totalSubjects = subjects.length;
        },
        error: (error) => {
          console.error('Error loading subjects:', error);
        }
      });
  }
}