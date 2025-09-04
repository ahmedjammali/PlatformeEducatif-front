import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject as RxSubject, takeUntil, forkJoin, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ProgressService } from '../../../services/progress.service';
import { ExerciseService } from '../../../services/exercise.service';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { StudentProgress } from '../../../models/progress.model';
import { Exercise } from '../../../models/exrecice.model';
import { Class } from '../../../models/class.model';
import { Subject } from '../../../models/subject.model';
import { User } from '../../../models/user.model';

interface StudentProgressData {
  student: User;
  exercises: StudentProgress[]; // This matches the API where exercises are StudentProgress objects
  overallStats: {
    totalExercises: number;
    completedExercises: number;
    averageScore: number;
    totalTimeSpent: number;
  };
}

interface ExerciseAnalytics {
  exercise: {
    id: string;
    title: string;
    type: string;
    totalPoints: number;
  };
  analytics: {
    overall: {
      totalSubmissions: number;
      uniqueStudents: number;
      averageScore: number;
      averageTimeSpent: number;
    };
    questions: any[];
    submissions: any[];
  };
}

@Component({
  selector: 'app-student-progress',
  templateUrl: './student-progress.component.html',
  styleUrls: ['./student-progress.component.css']
})
export class StudentProgressComponent implements OnInit, OnDestroy {
  @Input() myClasses: Class[] = [];
  @Input() teachingSubjects: Subject[] = [];
  @Input() allExercises: Exercise[] = [];

  private destroy$ = new RxSubject<void>();
  
  // Data
  studentsProgressData: StudentProgressData[] = [];
  filteredStudentsProgressData: StudentProgressData[] = []; // For filtered display
  exerciseAnalytics: ExerciseAnalytics[] = [];
  classProgressData: any = null;
  
  // Teacher's exercises only
  teacherExercises: Exercise[] = [];
  
  // Students cache for filtering
  studentsCache: Map<string, User> = new Map();
  loadedStudents: User[] = [];
  
  // Filters
  selectedClass: string = '';
  selectedSubject: string = '';
  selectedExercise: string = '';
  selectedStudent: string = '';
  dateFrom: string = '';
  dateTo: string = '';
  
  // UI State
  isLoading = false;
  activeTab: 'overview' | 'students' | 'exercises' | 'analytics' = 'overview';
  sortBy: 'name' | 'score' | 'completedExercises' | 'timeSpent' = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Track expanded exercise details
  expandedExercises: Set<string> = new Set();
  
  // Current user
  currentUser: User | null = null;

  constructor(
    private progressService: ProgressService,
    private exerciseService: ExerciseService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    
    this.initializeDates();
    this.filterTeacherExercises();
    this.loadStudentsForClasses();
    this.loadProgressData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeDates(): void {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    this.dateFrom = startOfYear.toISOString().split('T')[0];
    this.dateTo = now.toISOString().split('T')[0];
  }

  // Filter exercises to show only those created by the current teacher
  private filterTeacherExercises(): void {

    if (!this.currentUser) {
      console.error('No current user found!');
      return;
    }
    

    
  
    
    this.teacherExercises = this.allExercises.filter(exercise => {
      // Check different possible fields for the creator
      let creatorId = null;
      
      // Check createdBy field
      if (exercise.createdBy) {
        creatorId = typeof exercise.createdBy === 'string' ? 
          exercise.createdBy : exercise.createdBy?._id;
      }
      // Check creator field (alternative naming)
      else if ((exercise as any).creator) {
        creatorId = typeof (exercise as any).creator === 'string' ? 
          (exercise as any).creator : (exercise as any).creator?._id;
      }
      // Check teacher field (another alternative)
      else if ((exercise as any).teacher) {
        creatorId = typeof (exercise as any).teacher === 'string' ? 
          (exercise as any).teacher : (exercise as any).teacher?._id;
      }
      
      console.log(`Exercise "${exercise.title}" (ID: ${exercise._id}):`, {
        createdBy: exercise.createdBy,
        creator: (exercise as any).creator,
        teacher: (exercise as any).teacher,
        creatorId: creatorId,
        isTeacherExercise: creatorId === this.currentUser!._id
      });
      
      // If no creator field found, check if the exercise belongs to teacher's classes
      if (!creatorId) {
        console.warn(`No creator field found for exercise "${exercise.title}". Checking class ownership...`);
        // Check if the exercise belongs to one of the teacher's classes
        const exerciseClassId = typeof exercise.class === 'string' ? 
          exercise.class : exercise.class?._id;
        const belongsToTeacherClass = this.myClasses.some(c => c._id === exerciseClassId);

        
        // If we can't determine creator, include exercises from teacher's classes
        return belongsToTeacherClass;
      }
      
      return creatorId === this.currentUser!._id;
    });
    
    console.log(`\nFiltered ${this.teacherExercises.length} exercises for teacher ${this.currentUser.name}`);
    console.log('Teacher exercises:', this.teacherExercises.map(e => ({
      id: e._id,
      title: e.title,
      class: e.class,
      subject: e.subject,
      createdBy: e.createdBy
    })));
    
    // If no exercises found with createdBy, show all exercises from teacher's classes
    if (this.teacherExercises.length === 0 && this.allExercises.length > 0) {
      console.warn('No exercises found with createdBy field. Showing all exercises from teacher\'s classes...');
      this.teacherExercises = this.allExercises.filter(exercise => {
        const exerciseClassId = typeof exercise.class === 'string' ? 
          exercise.class : exercise.class?._id;
        return this.myClasses.some(c => c._id === exerciseClassId);
      });
      console.log(`Found ${this.teacherExercises.length} exercises in teacher's classes`);
    }
  }

  // Load student details for all classes
  private loadStudentsForClasses(): void {
    if (this.myClasses.length === 0) return;

    console.log('Loading students for classes...');
    
    // Get all unique student IDs from all classes
    const allStudentIds = new Set<string>();
    this.myClasses.forEach(classItem => {
      if (classItem.students) {
        classItem.students.forEach(student => {
          if (typeof student === 'string') {
            allStudentIds.add(student);
          } else if (student._id) {
            allStudentIds.add(student._id);
          }
        });
      }
    });

    console.log('Found student IDs:', Array.from(allStudentIds));

    // Load student details for all unique IDs
    const studentRequests = Array.from(allStudentIds).map(studentId => 
      this.userService.getUserById(studentId).pipe(
        tap(user => {
          this.studentsCache.set(studentId, user);
          console.log('Loaded student:', user.name);
        }),
        catchError(error => {
          console.error('Error loading student:', studentId, error);
          // Return placeholder student on error
          const placeholderStudent: User = {
            _id: studentId,
            name: `Student (${studentId.slice(-4)})`,
            email: `student@example.com`,
            role: 'student'
          };
          this.studentsCache.set(studentId, placeholderStudent);
          return of(placeholderStudent);
        })
      )
    );

    if (studentRequests.length > 0) {
      forkJoin(studentRequests).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (students) => {
            this.loadedStudents = students.filter(student => student !== null) as User[];
            console.log('All students loaded:', this.loadedStudents.map(s => s.name));
          },
          error: (error) => {
            console.error('Error loading students:', error);
            // Fallback: create placeholder students
            this.createPlaceholderStudents(Array.from(allStudentIds));
          }
        });
    }
  }

  private createPlaceholderStudents(studentIds: string[]): void {
    console.log('Creating placeholder students...');
    studentIds.forEach((studentId, index) => {
      const placeholderStudent: User = {
        _id: studentId,
        name: `Student ${index + 1}`,
        email: `student${index + 1}@example.com`,
        role: 'student'
      };
      this.studentsCache.set(studentId, placeholderStudent);
      this.loadedStudents.push(placeholderStudent);
    });
    console.log('Placeholder students created:', this.loadedStudents.map(s => s.name));
  }

  loadProgressData(): void {
    console.log('=== LOADING PROGRESS DATA ===');
    if (this.myClasses.length === 0) {
      console.log('No classes found');
      return;
    }
    
    if (this.teacherExercises.length === 0) {
      console.warn('No teacher exercises found! This might be why no progress is shown.');
    }
    
    this.isLoading = true;
    console.log('Loading progress data for classes:', this.myClasses.map(c => ({
      id: c._id,
      name: c.name,
      studentCount: c.students?.length || 0
    })));
    
    // Load class progress for all classes
    const classProgressRequests = this.myClasses.map((classItem, index) => {
      const filters = {
        ...(this.selectedSubject && { subject: this.selectedSubject }),
        ...(this.selectedExercise && { exerciseId: this.selectedExercise }),
      };
      
      console.log(`\nPreparing API call ${index} for class "${classItem.name}" (ID: ${classItem._id})`);
      console.log('Filters:', filters);
      
      return this.progressService.getClassProgress(classItem._id!, filters).pipe(
        tap(result => {
          console.log(`\n=== API RESPONSE for class "${classItem.name}" ===`);
          console.log('Full response:', result);
          if (result.classProgress && Array.isArray(result.classProgress)) {
            console.log(`Number of students with progress: ${result.classProgress.length}`);
            result.classProgress.forEach((student: any, idx: number) => {
              console.log(`Student ${idx}:`, {
                id: student.student?._id,
                name: student.student?.name,
                exercisesCount: student.exercises?.length || 0,
                exercises: student.exercises?.map((e: any) => ({
                  exerciseId: typeof e.exercise === 'string' ? e.exercise : e.exercise?._id,
                  exerciseTitle: e.exercise?.title,
                  score: e.accuracyPercentage
                }))
              });
            });
          }
        }),
        catchError(error => {
          console.error(`ERROR loading progress for class ${classItem.name}:`, error);
          return of({ classProgress: [], totalStudents: 0, totalExercisesCompleted: 0 });
        })
      );
    });

    forkJoin(classProgressRequests).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (classProgressResults) => {
          console.log('\n=== ALL CLASS PROGRESS RESULTS RECEIVED ===');
          console.log('Number of results:', classProgressResults.length);
          this.processClassProgressData(classProgressResults);
          this.loadExerciseAnalytics();
        },
        error: (error) => {
          console.error('ERROR in forkJoin loading progress data:', error);
          this.isLoading = false;
        }
      });
  }

  private processClassProgressData(classProgressResults: any[]): void {
    console.log('=== PROCESSING CLASS PROGRESS DATA ===');
    console.log('Class progress results:', classProgressResults);
    this.studentsProgressData = [];
    
    // Process each class progress result
    classProgressResults.forEach((result, index) => {
      console.log(`\n--- Processing result for class ${index} ---`);
      console.log('Result structure:', result);
      
      // Check if the result has the expected structure
      if (result && result.classProgress && Array.isArray(result.classProgress)) {
        console.log(`Found ${result.classProgress.length} students in class ${index}`);
        
        result.classProgress.forEach((studentData: any, studentIndex: number) => {
          console.log(`\n  Processing student ${studentIndex}:`, {
            studentId: studentData.student?._id,
            studentName: studentData.student?.name,
            totalExercises: studentData.exercises?.length || 0,
            exercises: studentData.exercises
          });
          
          // Ensure we have valid student data
          if (studentData && studentData.student) {
            // Get teacher exercise IDs
            const teacherExerciseIds = this.teacherExercises.map(e => e._id);
            console.log('  Teacher exercise IDs:', teacherExerciseIds);
            
            // Filter exercises to only include those created by the teacher
            const filteredExercises = (studentData.exercises || []).filter((exercise: any) => {
              const exerciseId = typeof exercise.exercise === 'string' ? 
                exercise.exercise : exercise.exercise?._id;
              
              const isTeacherExercise = teacherExerciseIds.includes(exerciseId);
              console.log(`    Exercise ${exerciseId} is teacher exercise: ${isTeacherExercise}`);
              
              return isTeacherExercise;
            });
            
            console.log(`  Filtered exercises for student ${studentData.student.name}:`, filteredExercises.length);
            
            const progressData: StudentProgressData = {
              student: studentData.student,
              exercises: filteredExercises,
              overallStats: {
                totalExercises: this.teacherExercises.length, // Total teacher exercises
                completedExercises: filteredExercises.length,
                averageScore: this.calculateAverageScore(filteredExercises),
                totalTimeSpent: this.calculateTotalTimeSpent(filteredExercises)
              }
            };
            
            console.log('  Created progress data:', progressData);
            this.studentsProgressData.push(progressData);
          } else {
            console.warn('  Invalid student data at index', studentIndex, studentData);
          }
        });
      } else {
        console.warn('Invalid result structure at index', index, result);
      }
    });
    
    console.log('\n=== FINAL PROCESSING RESULTS ===');
    console.log('Total students processed:', this.studentsProgressData.length);
    console.log('Students progress data:', this.studentsProgressData);
    
    // Apply filters after processing
    this.applyStudentFilter();
    this.sortStudentsData();
    this.isLoading = false;
  }

  private calculateAverageScore(exercises: any[]): number {
    if (exercises.length === 0) return 0;
    const totalScore = exercises.reduce((sum, exercise) => 
      sum + (exercise.accuracyPercentage || 0), 0);
    return totalScore / exercises.length;
  }

  private calculateTotalTimeSpent(exercises: any[]): number {
    return exercises.reduce((total, exercise) => total + (exercise.timeSpent || 0), 0);
  }

  private loadExerciseAnalytics(): void {
    if (this.teacherExercises.length === 0) {
      this.isLoading = false;
      return;
    }
    
    const analyticsRequests = this.teacherExercises.map(exercise => 
      this.progressService.getExerciseAnalytics(exercise._id!)
    );

    forkJoin(analyticsRequests).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (analyticsResults) => {
          console.log('Exercise analytics results:', analyticsResults);
          this.exerciseAnalytics = analyticsResults.filter(result => result && result.exercise && result.analytics);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading exercise analytics:', error);
          this.exerciseAnalytics = []; // Set empty array on error
          this.isLoading = false;
        }
      });
  }

  // Apply student filter
  private applyStudentFilter(): void {
    if (!this.selectedStudent) {
      this.filteredStudentsProgressData = [...this.studentsProgressData];
    } else {
      this.filteredStudentsProgressData = this.studentsProgressData.filter(
        studentData => studentData.student._id === this.selectedStudent
      );
    }
    console.log('Applied student filter:', this.filteredStudentsProgressData.length, 'students shown');
  }

  // Filter and Sort Methods
  applyFilters(): void {
    // Reset student filter when class changes
    if (this.selectedClass) {
      this.selectedStudent = '';
    }
    // Don't include date filters for now since they cause API issues
    this.loadProgressData();
  }

  onClassFilterChange(): void {
    // Reset student filter when class changes
    this.selectedStudent = '';
    this.applyFilters();
  }

  onStudentFilterChange(): void {
    // Just apply the filter without reloading data
    this.applyStudentFilter();
    this.sortStudentsData();
  }

  clearFilters(): void {
    this.selectedClass = '';
    this.selectedSubject = '';
    this.selectedExercise = '';
    this.selectedStudent = '';
    // Keep the date fields but don't use them in API calls yet
    this.initializeDates();
    this.loadProgressData();
  }

  sortStudentsData(): void {
    this.filteredStudentsProgressData.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.sortBy) {
        case 'name':
          aValue = a.student.name.toLowerCase();
          bValue = b.student.name.toLowerCase();
          break;
        case 'score':
          aValue = a.overallStats.averageScore;
          bValue = b.overallStats.averageScore;
          break;
        case 'completedExercises':
          aValue = a.overallStats.completedExercises;
          bValue = b.overallStats.completedExercises;
          break;
        case 'timeSpent':
          aValue = a.overallStats.totalTimeSpent;
          bValue = b.overallStats.totalTimeSpent;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  setSortBy(sortBy: typeof this.sortBy): void {
    if (this.sortBy === sortBy) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'asc';
    }
    this.sortStudentsData();
  }

  // Utility Methods
  getSubjectName(subjectId: string): string {
    if (!subjectId) return 'Unknown Subject';
    const subject = this.teachingSubjects.find(s => s._id === subjectId);
    return subject?.name || 'Unknown Subject';
  }

  getClassName(classId: string): string {
    if (!classId) return 'Unknown Class';
    const classItem = this.myClasses.find(c => c._id === classId);
    return classItem?.name || 'Unknown Class';
  }

  getFilteredStudents(): User[] {
    if (!this.selectedClass) return this.loadedStudents;
    
    const classItem = this.myClasses.find(c => c._id === this.selectedClass);
    if (!classItem?.students) return [];
    
    // Get student IDs for the selected class
    const classStudentIds = classItem.students.map(student => 
      typeof student === 'string' ? student : student._id
    ).filter(id => id) as string[];
    
    // Return students from cache that belong to this class
    return this.loadedStudents.filter(student => 
      classStudentIds.includes(student._id!)
    );
  }

  getFilteredExercises(): Exercise[] {
    return this.teacherExercises.filter(exercise => {
      if (this.selectedClass) {
        const exerciseClassId = typeof exercise.class === 'string' ? 
          exercise.class : exercise.class?._id;
        if (exerciseClassId !== this.selectedClass) return false;
      }
      
      if (this.selectedSubject) {
        const exerciseSubjectId = typeof exercise.subject === 'string' ? 
          exercise.subject : exercise.subject?._id;
        if (exerciseSubjectId !== this.selectedSubject) return false;
      }
      
      return true;
    });
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  getCompletionRate(completed: number, total: number): number {
    return total > 0 ? (completed / total) * 100 : 0;
  }

  // Getter methods for template calculations
  get averageCompletionRate(): number {
    if (this.filteredStudentsProgressData.length === 0) return 0;
    const totalRate = this.filteredStudentsProgressData.reduce((sum, s) => 
      sum + this.getCompletionRate(s.overallStats.completedExercises, s.overallStats.totalExercises), 0);
    return totalRate / this.filteredStudentsProgressData.length;
  }

  get averageScore(): number {
    if (this.filteredStudentsProgressData.length === 0) return 0;
    const totalScore = this.filteredStudentsProgressData.reduce((sum, s) => sum + s.overallStats.averageScore, 0);
    return totalScore / this.filteredStudentsProgressData.length;
  }

  getExerciseCountForClass(classId: string): number {
    if (!classId) return 0;
    return this.teacherExercises.filter(e => {
      const exerciseClassId = typeof e.class === 'string' ? e.class : e.class?._id;
      return exerciseClassId === classId;
    }).length;
  }

  getExerciseSubjectName(exercise: Exercise): string {
    if (!exercise?.subject) return 'Unknown Subject';
    const subjectId = typeof exercise.subject === 'string' ? exercise.subject : exercise.subject._id;
    return this.getSubjectName(subjectId || '');
  }

  getExerciseClassName(exercise: Exercise): string {
    if (!exercise?.class) return 'Unknown Class';
    const classId = typeof exercise.class === 'string' ? exercise.class : exercise.class._id;
    return this.getClassName(classId || '');
  }

  toTitleCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // Method to toggle exercise details expansion
  toggleExerciseDetails(exerciseId: string): void {
    if (this.expandedExercises.has(exerciseId)) {
      this.expandedExercises.delete(exerciseId);
    } else {
      this.expandedExercises.add(exerciseId);
    }
  }

  isExerciseExpanded(exerciseId: string): boolean {
    return this.expandedExercises.has(exerciseId);
  }

  // Helper methods to safely access exercise properties
  getExerciseTitle(progress: any): string {
    // For the API response structure where exercise is nested
    if (progress.exercise && typeof progress.exercise === 'object') {
      return progress.exercise.title || 'Unknown Exercise';
    }
    
    // Fallback: try to find in teacherExercises if it's just an ID
    if (typeof progress.exercise === 'string') {
      const exercise = this.teacherExercises.find(e => e._id === progress.exercise);
      return exercise?.title || 'Unknown Exercise';
    }
    
    return 'Unknown Exercise';
  }

  getExerciseType(progress: any): string {
    // For the API response structure where exercise is nested
    if (progress.exercise && typeof progress.exercise === 'object') {
      return progress.exercise.type || 'unknown';
    }
    
    // Fallback: try to find in teacherExercises if it's just an ID
    if (typeof progress.exercise === 'string') {
      const exercise = this.teacherExercises.find(e => e._id === progress.exercise);
      return exercise?.type || 'unknown';
    }
    
    return 'unknown';
  }

  // Method to get detailed exercise information for analytics
  getDetailedExerciseInfo(exerciseId: string): void {
    this.exerciseService.getExerciseById(exerciseId).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Detailed exercise info:', response);
          // You can store this information or use it for display
        },
        error: (error) => {
          console.error('Error loading detailed exercise info:', error);
        }
      });
  }
}