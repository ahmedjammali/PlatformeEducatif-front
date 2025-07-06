// teacher-classes.component.ts
import { Component, Input, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Class } from '../../../models/class.model';
import { ClassService } from '../../../services/class.service';

interface ClassDetailsResponse {
  class: Class;
  statistics: {
    totalExercises: number;
    totalStudents: number;
    totalTeachers: number;
  };
}

@Component({
  selector: 'app-teacher-classes',
  templateUrl: './teacher-classes.component.html',
  styleUrls: ['./teacher-classes.component.css']
})
export class TeacherClassesComponent implements OnDestroy {
  @Input() classes: Class[] = [];
  @Input() classSubjectsMapping: Map<string, string[]> = new Map();

  // Modal state
  showClassModal = false;
  selectedClassDetails: ClassDetailsResponse | null = null;
  loadingClassId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private classService: ClassService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getClassSubjects(classItem: Class): string[] {
    return this.classSubjectsMapping.get(classItem._id!) || [];
  }

  viewClassDetails(classItem: Class): void {
    if (!classItem._id) {
      console.error('Class ID is missing');
      return;
    }

    this.loadingClassId = classItem._id;
    
    this.classService.getClassById(classItem._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ClassDetailsResponse) => {
          this.selectedClassDetails = response;
          this.showClassModal = true;
          this.loadingClassId = null;
        },
        error: (error) => {
          console.error('Error loading class details:', error);
          this.loadingClassId = null;
          // You could show a toast notification here
          alert('Failed to load class details. Please try again.');
        }
      });
  }

  closeClassModal(): void {
    this.showClassModal = false;
    this.selectedClassDetails = null;
  }

  // Helper methods to handle union types (object | string)
  getSchoolName(school: any): string {
    if (typeof school === 'string') return school;
    return school?.name || 'Unknown School';
  }

  getCreatedByName(createdBy: any): string {
    if (typeof createdBy === 'string') return createdBy;
    return createdBy?.name || 'Unknown';
  }

  getTeacherName(teacher: any): string {
    if (typeof teacher === 'string') return teacher;
    return teacher?.name || 'Unknown Teacher';
  }

  getTeacherEmail(teacher: any): string {
    if (typeof teacher === 'string') return '';
    return teacher?.email || '';
  }

  getTeacherInitial(teacher: any): string {
    const name = this.getTeacherName(teacher);
    return name.charAt(0) || 'T';
  }

  getStudentsArray(students: any): any[] {
    if (!students) return [];
    return Array.isArray(students) ? students : [];
  }

  getStudentName(student: any): string {
    if (typeof student === 'string') return student;
    return student?.name || 'Unknown Student';
  }

  getStudentEmail(student: any): string {
    if (typeof student === 'string') return '';
    return student?.email || '';
  }

  getStudentInitial(student: any): string {
    const name = this.getStudentName(student);
    return name.charAt(0) || 'S';
  }

  getSubjectsArray(subjects: any): any[] {
    if (!subjects) return [];
    return Array.isArray(subjects) ? subjects : [];
  }

  getSubjectName(subject: any): string {
    if (typeof subject === 'string') return subject;
    return subject?.name || 'Unknown Subject';
  }

  hasTeacherSubjects(): boolean {
    return !!(this.selectedClassDetails?.class?.teacherSubjects?.length);
  }

  hasStudents(): boolean {
    if (!this.selectedClassDetails?.class?.students) return false;
    const students = this.getStudentsArray(this.selectedClassDetails.class.students);
    return students.length > 0;
  }

  getStudentsCount(): number {
    if (!this.selectedClassDetails?.class?.students) return 0;
    return this.getStudentsArray(this.selectedClassDetails.class.students).length;
  }
}