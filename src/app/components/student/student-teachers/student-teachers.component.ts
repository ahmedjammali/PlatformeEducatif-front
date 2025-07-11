import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { ClassService } from '../../../services/class.service';
import { User } from '../../../models/user.model';

interface TeacherWithSubjects {
  teacher: {
    _id: string;
    email: string;
    name: string;
  };
  subjects: {
    _id: string;
    name: string;
  }[];
}

interface StudentClass {
  class: any;
  subjects: any[];
}

@Component({
  selector: 'app-student-teachers',
  templateUrl: './student-teachers.component.html',
  styleUrls: ['./student-teachers.component.css']
})
export class StudentTeachersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  studentClass: any = null;
  teachers: TeacherWithSubjects[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private classService: ClassService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadStudentTeachers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStudentTeachers(): void {
    this.loading = true;
    this.error = null;

    // First, get the student's class
    this.classService.getStudentClass()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (classData: StudentClass) => {
          this.studentClass = classData.class;
          if (this.studentClass?._id) {
            this.loadClassTeachers(this.studentClass._id);
          } else {
            this.error = 'Aucune classe trouvée pour cet étudiant.';
          }
        },
        error: (error) => {
          console.error('Error loading student class:', error);
          this.error = 'Erreur lors du chargement de la classe de l\'étudiant.';
        }
      });
  }

  private loadClassTeachers(classId: string): void {
    this.classService.getClassTeachers(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.teachers = response.teachers || [];
        },
        error: (error) => {
          console.error('Error loading class teachers:', error);
          this.error = 'Erreur lors du chargement des enseignants.';
        }
      });
  }

  getTeacherInitials(teacherName: string): string {
    if (!teacherName) return '??';
    
    const names = teacherName.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  getSubjectsList(subjects: any[]): string {
    if (!subjects || subjects.length === 0) return 'Aucune matière';
    return subjects.map(subject => subject.name).join(', ');
  }

  retryLoading(): void {
    this.loadStudentTeachers();
  }

  getTotalTeachers(): number {
    return this.teachers.length;
  }

  getTotalSubjects(): number {
    const allSubjects = this.teachers.reduce((acc, teacher) => {
      teacher.subjects.forEach(subject => {
        if (!acc.includes(subject._id)) {
          acc.push(subject._id);
        }
      });
      return acc;
    }, [] as string[]);
    return allSubjects.length;
  }
}