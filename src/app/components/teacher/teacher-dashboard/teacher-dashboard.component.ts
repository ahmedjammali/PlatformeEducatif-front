// teacher-dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject as RxSubject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subject.service';
import { ExerciseService } from '../../../services/exercise.service';
import { SchoolService } from '../../../services/school.service';
import { User } from '../../../models/user.model';
import { Class } from '../../../models/class.model';
import { Subject } from '../../../models/subject.model';
import { Exercise } from '../../../models/exrecice.model';

interface ExtendedUser extends User {
  id?: string;
}

interface DashboardStats {
  totalSubjects: number;
  totalClasses: number;
  totalExercises: number;
  totalStudents: number;
}

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css']
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new RxSubject<void>();
  
  currentUser: ExtendedUser | null = null;
  teachingSubjects: Subject[] = [];
  myClasses: Class[] = [];
  allExercises: Exercise[] = [];
  
  // Dashboard stats
  dashboardStats: DashboardStats = {
    totalSubjects: 0,
    totalClasses: 0,
    totalExercises: 0,
    totalStudents: 0
  };
  
  // Active section
  activeSection: string = 'overview';
  
  // Loading state
  isLoading = false;
  
  // Mappings
  subjectStatsMap: Map<string, { classCount: number; exerciseCount: number }> = new Map();
  classSubjectsMapping: Map<string, string[]> = new Map();

  constructor(
    private authService: AuthService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private exerciseService: ExerciseService,
    private schoolService: SchoolService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.isLoading = true;
    this.currentUser = this.authService.getCurrentUser() as ExtendedUser | null;
    
    if (this.currentUser && this.currentUser.role === 'teacher') {
      this.loadTeacherData();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadTeacherData(): void {
    forkJoin({
      classes: this.classService.getClasses(),
      subjects: this.subjectService.getSubjects(),
      exercises: this.exerciseService.getExercises()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Filter classes where current teacher is assigned
          this.myClasses = data.classes.classes.filter(classItem => 
            classItem.teacherSubjects.some(ts => {
              const teacherId = typeof ts.teacher === 'string' ? ts.teacher : ts.teacher._id;
              const currentUserId = this.currentUser?._id || this.currentUser?.id;
              return teacherId === currentUserId;
            })
          );
          
          // Get unique subjects taught by this teacher
          const teachingSubjectIds = new Set<string>();
          this.myClasses.forEach(classItem => {
            const teacherSubject = classItem.teacherSubjects.find(ts => {
              const teacherId = typeof ts.teacher === 'string' ? ts.teacher : ts.teacher._id;
              const currentUserId = this.currentUser?._id || this.currentUser?.id;
              return teacherId === currentUserId;
            });
            
            if (teacherSubject?.subjects) {
              teacherSubject.subjects.forEach(subject => {
                const subjectId = typeof subject === 'string' ? subject : subject._id;
                if (subjectId) teachingSubjectIds.add(subjectId);
              });
            }
          });
          
          this.teachingSubjects = data.subjects.filter(subject => 
            teachingSubjectIds.has(subject._id!)
          );
          
          // Filter exercises created by this teacher
          this.allExercises = data.exercises.exercises.filter(exercise => {
            const createdById = typeof exercise.createdBy === 'string' ? 
              exercise.createdBy : exercise.createdBy._id;
            const currentUserId = this.currentUser?._id || this.currentUser?.id;
            return createdById === currentUserId;
          });
          
          // Build mappings and calculate stats
          this.buildMappings();
          this.calculateDashboardStats();
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading teacher data:', error);
          this.isLoading = false;
        }
      });
  }

  private buildMappings(): void {
    // Build subject stats mapping
    this.teachingSubjects.forEach(subject => {
      const classCount = this.myClasses.filter(classItem => {
        const teacherSubject = classItem.teacherSubjects.find(ts => {
          const teacherId = typeof ts.teacher === 'string' ? ts.teacher : ts.teacher._id;
          const currentUserId = this.currentUser?._id || this.currentUser?.id;
          return teacherId === currentUserId;
        });
        
        if (teacherSubject?.subjects) {
          return teacherSubject.subjects.some(s => {
            const sid = typeof s === 'string' ? s : s._id;
            return sid === subject._id;
          });
        }
        return false;
      }).length;

      const exerciseCount = this.allExercises.filter(exercise => {
        const exerciseSubjectId = typeof exercise.subject === 'string' ? 
          exercise.subject : exercise.subject._id;
        return exerciseSubjectId === subject._id;
      }).length;

      this.subjectStatsMap.set(subject._id!, { classCount, exerciseCount });
    });

    // Build class subjects mapping
    this.myClasses.forEach(classItem => {
      const teacherSubject = classItem.teacherSubjects.find(ts => {
        const teacherId = typeof ts.teacher === 'string' ? ts.teacher : ts.teacher._id;
        const currentUserId = this.currentUser?._id || this.currentUser?.id;
        return teacherId === currentUserId;
      });
      
      if (teacherSubject) {
        const subjectNames = teacherSubject.subjects.map(subject => {
          if (typeof subject === 'string') {
            const subjectObj = this.teachingSubjects.find(s => s._id === subject);
            return subjectObj?.name || 'Unknown Subject';
          }
          return subject.name;
        });
        
        this.classSubjectsMapping.set(classItem._id!, subjectNames);
      }
    });
  }

  private calculateDashboardStats(): void {
    this.dashboardStats = {
      totalSubjects: this.teachingSubjects.length,
      totalClasses: this.myClasses.length,
      totalExercises: this.allExercises.length,
      totalStudents: this.myClasses.reduce((sum, classItem) => 
        sum + (classItem.students?.length || 0), 0
      )
    };
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
  }

  openCreateExerciseModal(): void {
    this.setActiveSection('exercises');
  }

  onSubjectSelected(subject: Subject): void {
    this.setActiveSection('exercises');
    // The exercises component will handle filtering
  }

  onViewSubjectDetails(subject: Subject): void {
    this.setActiveSection('exercises');
    // The exercises component will handle filtering
  }

  onExerciseCreated(exercise: Exercise): void {
    // Add the new exercise to the beginning of the array
    this.allExercises = [exercise, ...this.allExercises];
    
    // Recalculate stats and mappings
    this.calculateDashboardStats();
    this.buildMappings();
    

  }

  onExerciseUpdated(exercise: Exercise): void {
    // Find and update the exercise in the array
    const index = this.allExercises.findIndex(e => e._id === exercise._id);
    if (index !== -1) {
      this.allExercises[index] = exercise;
      // Create a new array reference to trigger change detection
      this.allExercises = [...this.allExercises];
      
      // Recalculate stats and mappings in case the exercise changed subjects/classes
      this.calculateDashboardStats();
      this.buildMappings();
      
      console.log('Exercise updated in dashboard:', exercise);
    }
  }

  onExerciseDeleted(exerciseId: string): void {
    // Remove the exercise from the array
    this.allExercises = this.allExercises.filter(e => e._id !== exerciseId);
    
    // Recalculate stats and mappings
    this.calculateDashboardStats();
    this.buildMappings();
    
    console.log('Exercise deleted in dashboard:', exerciseId);
  }
}