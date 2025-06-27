// classes-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ClassService } from '../../../services/class.service';
import { UserService } from '../../../services/user.service';
import { SubjectService } from '../../../services/subject.service';
import { Class, TeacherSubject } from '../../../models/class.model';
import { User } from '../../../models/user.model';
import { Subject as SubjectModel } from '../../../models/subject.model';

@Component({
  selector: 'app-classes',
  templateUrl: './classes.component.html',
  styleUrls: ['./classes.component.css']
})
export class ClassesComponent implements OnInit, OnDestroy {
  // Data
  classes: Class[] = [];
  filteredClasses: Class[] = [];
  subjects: SubjectModel[] = [];
  allStudents: User[] = [];
  availableStudents: User[] = [];
  filteredAvailableStudents: User[] = [];
  classStudents: User[] = [];
  
  // UI State
  isLoading = false;
  isSaving = false;
  showClassModal = false;
  showStudentsModal = false;
  editingClass: Class | null = null;
  selectedClass: Class | null = null;
  
  // Filters
  searchTerm = '';
  selectedGrade = '';
  selectedYear = '';
  studentSearchTerm = '';
  
  // Form
  classForm!: FormGroup;
  
  // Utility
  parseInt = parseInt;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private classService: ClassService,
    private userService: UserService,
    private subjectService: SubjectService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadClasses();
    this.loadSubjects();
    this.loadAllStudents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.classForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      grade: ['', Validators.required],
      academicYear: ['', Validators.required],
      isActive: [true]
    });
  }

  private loadClasses(): void {
    this.isLoading = true;
    
    this.classService.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Classes loaded:', response);
          this.classes = response.classes;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading classes:', error);
          this.isLoading = false;
        }
      });
  }

  private loadSubjects(): void {
    this.subjectService.getSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subjects) => {
          this.subjects = subjects;
        },
        error: (error) => {
          console.error('Error loading subjects:', error);
        }
      });
  }

  private loadAllStudents(): void {
    this.userService.getUsers({ role: 'student' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allStudents = response.users;
        },
        error: (error) => {
          console.error('Error loading students:', error);
        }
      });
  }

  // Filter Methods
  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedGrade = '';
    this.selectedYear = '';
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.classes];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(term)
      );
    }
    
    if (this.selectedGrade) {
      filtered = filtered.filter(c => c.grade === this.selectedGrade);
    }
    
    if (this.selectedYear) {
      filtered = filtered.filter(c => c.academicYear === this.selectedYear);
    }
    
    this.filteredClasses = filtered;
  }

  // Modal Methods
  openCreateClassModal(): void {
    this.editingClass = null;
    this.classForm.reset({ isActive: true });
    this.showClassModal = true;
  }

  editClass(classItem: Class): void {
    this.editingClass = classItem;
    this.classForm.patchValue({
      name: classItem.name,
      grade: classItem.grade,
      academicYear: classItem.academicYear,
      isActive: classItem.isActive
    });
    this.showClassModal = true;
  }

  closeModal(): void {
    this.showClassModal = false;
    this.editingClass = null;
    this.classForm.reset();
  }

  saveClass(): void {
    if (this.classForm.invalid) {
      Object.keys(this.classForm.controls).forEach(key => {
        this.classForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;
    const formValue = this.classForm.value;
    
    const saveObservable = this.editingClass
      ? this.classService.updateClass(this.editingClass._id!, formValue)
      : this.classService.createClass(formValue);
    
    saveObservable.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadClasses();
        alert(this.editingClass ? 'Classe mise à jour avec succès!' : 'Classe créée avec succès!');
      },
      error: (error) => {
        console.error('Error saving class:', error);
        this.isSaving = false;
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
      }
    });
  }

  viewClassDetails(classItem: Class): void {
    this.classService.getClassById(classItem._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Class details:', response);
          // TODO: Implement details view
        },
        error: (error) => {
          console.error('Error loading class details:', error);
        }
      });
  }

  // Students Management
  manageStudents(classItem: Class): void {
    this.selectedClass = classItem;
    this.loadClassStudents(classItem._id!);
    this.showStudentsModal = true;
  }

  private loadClassStudents(classId: string): void {
    this.classService.getClassStudents(classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.classStudents = response.students;
          this.updateAvailableStudents();
        },
        error: (error) => {
          console.error('Error loading class students:', error);
        }
      });
  }

  private updateAvailableStudents(): void {
    const classStudentIds = this.classStudents.map(s => s._id);
    this.availableStudents = this.allStudents.filter(s => 
      !classStudentIds.includes(s._id) && !s.studentClass
    );
    this.filterAvailableStudents();
  }

  filterAvailableStudents(): void {
    if (this.studentSearchTerm) {
      const term = this.studentSearchTerm.toLowerCase();
      this.filteredAvailableStudents = this.availableStudents.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    } else {
      this.filteredAvailableStudents = [...this.availableStudents];
    }
  }

  addStudentToClass(student: User): void {
    if (!this.selectedClass) return;
    
    this.classService.addStudent(this.selectedClass._id!, { studentId: student._id! })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.classStudents.push(student);
          this.updateAvailableStudents();
          // Update the student count in the main view
          const classIndex = this.classes.findIndex(c => c._id === this.selectedClass!._id);
          if (classIndex > -1) {
            if (!this.classes[classIndex].students) {
              this.classes[classIndex].students = [];
            }
            (this.classes[classIndex].students as string[]).push(student._id!);
            this.applyFilters();
          }
        },
        error: (error) => {
          console.error('Error adding student:', error);
          alert('Erreur lors de l\'ajout de l\'étudiant.');
        }
      });
  }

  removeStudentFromClass(student: User): void {
    if (!this.selectedClass) return;
    
    if (confirm(`Retirer ${student.name} de la classe?`)) {
      this.classService.removeStudent(this.selectedClass._id!, student._id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.classStudents = this.classStudents.filter(s => s._id !== student._id);
            this.updateAvailableStudents();
            // Update the student count in the main view
            const classIndex = this.classes.findIndex(c => c._id === this.selectedClass!._id);
            if (classIndex > -1 && this.classes[classIndex].students) {
              this.classes[classIndex].students = (this.classes[classIndex].students as string[])
                .filter(id => id !== student._id);
              this.applyFilters();
            }
          },
          error: (error) => {
            console.error('Error removing student:', error);
            alert('Erreur lors du retrait de l\'étudiant.');
          }
        });
    }
  }

  closeStudentsModal(): void {
    this.showStudentsModal = false;
    this.selectedClass = null;
    this.studentSearchTerm = '';
    this.classStudents = [];
    this.availableStudents = [];
    this.filteredAvailableStudents = [];
  }

  // Utility Methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.classForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getSubjectsForTeacher(teacherSubject: TeacherSubject): string {
    if (!teacherSubject.subjects || teacherSubject.subjects.length === 0) {
      return 'Aucune matière';
    }
    
    return teacherSubject.subjects
      .map(s => {
        if (typeof s === 'string') {
          const subject = this.subjects.find(sub => sub._id === s);
          return subject?.name || 'Matière inconnue';
        }
        return s.name;
      })
      .join(', ');
  }
}