// teacher-dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject as RxSubject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subject.service';
import { ExerciseService } from '../../../services/exercise.service';
import { SchoolService } from '../../../services/school.service';
import { ProgressService } from '../../../services/progress.service';
import { User } from '../../../models/user.model';
import { Class } from '../../../models/class.model';
import { Subject } from '../../../models/subject.model';
import { Exercise } from '../../../models/exrecice.model';
import { School } from '../../../models/school.model';

interface ExtendedUser extends User {
  id?: string;  // Handle API response that might have 'id' instead of '_id'
}

interface Activity {
  type: string;
  icon: string;
  description: string;
  time: string;
}

interface TeacherClassInfo {
  class: Class;
  subjects: string[];
}

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css']
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new RxSubject<void>();
  
  currentUser: ExtendedUser | null = null;
  school: School | null = null;
  teachingSubjects: Subject[] = [];
  myClasses: Class[] = [];
  allExercises: Exercise[] = [];
  filteredExercises: Exercise[] = [];
  recentActivities: Activity[] = [];
  
  // Dashboard stats
  totalClasses = 0;
  totalExercises = 0;
  totalStudents = 0;
  notifications = 0;
  
  // Active section
  activeSection: string = 'overview';
  
  // Filter states
  selectedSubjectId: string = '';
  selectedExerciseType: string = '';
  selectedClassId: string = '';
  
  // Modal states
  showCreateExerciseModal = false;
  
  // Loading states
  isLoading = false;
  
  // Teacher class mapping
  teacherClassMapping: Map<string, TeacherClassInfo> = new Map();

  constructor(
    private authService: AuthService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private exerciseService: ExerciseService,
    private schoolService: SchoolService,
    private progressService: ProgressService,
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
    
    // Get current user from auth service
        this.currentUser = this.authService.getCurrentUser() as ExtendedUser | null;
        if (this.currentUser && this.currentUser.role === 'teacher') {

          console.log('Current User set:', this.currentUser);
          this.loadTeacherData();
        } else {
          this.router.navigate(['/login']);
        }

  }

  private loadTeacherData(): void {
    forkJoin({
      school: this.schoolService.getSchool(),
      classes: this.classService.getClasses(),
      subjects: this.subjectService.getSubjects(),
      exercises: this.exerciseService.getExercises()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Set school info
          this.school = data.school.school;
          
          // Filter classes where current teacher is assigned
          this.myClasses = data.classes.classes.filter(classItem => 
            classItem.teacherSubjects.some(ts => {
              const teacherId = typeof ts.teacher === 'string' ? ts.teacher : ts.teacher._id;
              // Handle both 'id' and '_id' cases
              const currentUserId = this.currentUser?._id || this.currentUser?.id;
              return teacherId === currentUserId;
            })
          );
          
          // Build teacher class mapping and get teaching subjects
          this.buildTeacherClassMapping();
          
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
          this.filteredExercises = [...this.allExercises];
          
          // Calculate stats
          this.totalClasses = this.myClasses.length;
          this.totalExercises = this.allExercises.length;
          this.totalStudents = this.myClasses.reduce((sum, classItem) => 
            sum + (classItem.students?.length || 0), 0
          );
        
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading teacher data:', error);
          this.isLoading = false;
        }
      });
  }

  private buildTeacherClassMapping(): void {
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
        
        this.teacherClassMapping.set(classItem._id!, {
          class: classItem,
          subjects: subjectNames
        });
      }
    });
  }

  

  setActiveSection(section: string): void {
    this.activeSection = section;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Subject methods
  selectSubject(subject: Subject): void {
    this.selectedSubjectId = subject._id!;
    this.setActiveSection('exercises');
    this.filterExercises();
  }

  getSubjectGradient(subject: Subject): string {
    const gradients = [
      'linear-gradient(135deg, #A4B465, #626F47)',
      'linear-gradient(135deg, #F0BB78, #D4A574)',
      'linear-gradient(135deg, #87CEEB, #4682B4)',
      'linear-gradient(135deg, #FFB6C1, #FF69B4)',
      'linear-gradient(135deg, #DDA0DD, #9370DB)'
    ];
    
    const index = this.teachingSubjects.indexOf(subject) % gradients.length;
    return gradients[index];
  }

  getSubjectClassCount(subjectId: string): number {
    return this.myClasses.filter(classItem => {
      const teacherSubject = classItem.teacherSubjects.find(ts => {
        const teacherId = typeof ts.teacher === 'string' ? ts.teacher : ts.teacher._id;
        const currentUserId = this.currentUser?._id || this.currentUser?.id;
        return teacherId === currentUserId;
      });
      
      if (teacherSubject?.subjects) {
        return teacherSubject.subjects.some(subject => {
          const sid = typeof subject === 'string' ? subject : subject._id;
          return sid === subjectId;
        });
      }
      return false;
    }).length;
  }

  getSubjectExerciseCount(subjectId: string): number {
    return this.allExercises.filter(exercise => {
      const exerciseSubjectId = typeof exercise.subject === 'string' ? 
        exercise.subject : exercise.subject._id;
      return exerciseSubjectId === subjectId;
    }).length;
  }

  viewSubjectDetails(subject: Subject): void {
    this.selectedSubjectId = subject._id!;
    this.setActiveSection('exercises');
    this.filterExercises();
  }

  // Exercise methods
  filterExercises(): void {
    this.filteredExercises = this.allExercises.filter(exercise => {
      let matches = true;
      
      if (this.selectedSubjectId) {
        const exerciseSubjectId = typeof exercise.subject === 'string' ? 
          exercise.subject : exercise.subject._id;
        matches = matches && exerciseSubjectId === this.selectedSubjectId;
      }
      
      if (this.selectedExerciseType) {
        matches = matches && exercise.type === this.selectedExerciseType;
      }
      
      if (this.selectedClassId) {
        const exerciseClassId = typeof exercise.class === 'string' ? 
          exercise.class : exercise.class._id;
        matches = matches && exerciseClassId === this.selectedClassId;
      }
      
      return matches;
    });
  }

  getTotalPoints(exercise: Exercise): number {
    return exercise.totalPoints || 0;
  }

  getSubjectName(subjectId: string | Subject): string {
    if (typeof subjectId === 'string') {
      const subject = this.teachingSubjects.find(s => s._id === subjectId);
      return subject?.name || 'Unknown Subject';
    }
    return subjectId.name;
  }

  getClassName(classId: string | Class): string {
    if (typeof classId === 'string') {
      const classItem = this.myClasses.find(c => c._id === classId);
      return classItem?.name || 'Unknown Class';
    }
    return classId.name;
  }

  openCreateExerciseModal(): void {
    this.showCreateExerciseModal = true;
  }

  closeCreateExerciseModal(): void {
    this.showCreateExerciseModal = false;
  }

  onExerciseCreated(exercise: Exercise): void {
    this.allExercises.unshift(exercise);
    this.filterExercises();
    this.totalExercises++;
    this.closeCreateExerciseModal();
    
    // Add to recent activities
    this.recentActivities.unshift({
      type: 'exercise',
      icon: '📝',
      description: `Created new ${exercise.type === 'qcm' ? 'QCM' : 'Fill Blanks'} exercise: ${exercise.title}`,
      time: 'Just now'
    });
  }

  viewExercise(exercise: Exercise): void {
    // Navigate to exercise detail view
    this.router.navigate(['/teacher/exercises', exercise._id]);
  }

  editExercise(exercise: Exercise): void {
    // Navigate to exercise edit view
    this.router.navigate(['/teacher/exercises', exercise._id, 'edit']);
  }

  viewExerciseProgress(exercise: Exercise): void {
    // Navigate to exercise progress view
    this.router.navigate(['/teacher/exercises', exercise._id, 'progress']);
  }

  deleteExercise(exercise: Exercise): void {
    if (confirm(`Are you sure you want to delete "${exercise.title}"?`)) {
      this.exerciseService.deleteExercise(exercise._id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.allExercises = this.allExercises.filter(e => e._id !== exercise._id);
            this.filterExercises();
            this.totalExercises--;
          },
          error: (error) => {
            console.error('Error deleting exercise:', error);
            alert('Failed to delete exercise. Please try again.');
          }
        });
    }
  }

  // Class methods
  getClassSubjects(classItem: Class): string[] {
    const classInfo = this.teacherClassMapping.get(classItem._id!);
    return classInfo?.subjects || [];
  }

  viewClassDetails(classItem: Class): void {
    // Navigate to class detail view
    this.router.navigate(['/teacher/classes', classItem._id]);
  }

  viewClassProgress(classItem: Class): void {
    // Navigate to class progress view
    this.router.navigate(['/teacher/classes', classItem._id, 'progress']);
  }
}