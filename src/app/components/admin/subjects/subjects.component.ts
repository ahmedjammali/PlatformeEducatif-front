// subjects-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject as RxSubject, takeUntil } from 'rxjs';
import { SubjectService } from '../../../services/subject.service';
import { ClassService } from '../../../services/class.service';
import { UserService } from '../../../services/user.service';
import { Subject as SubjectModel } from '../../../models/subject.model';
import { Class } from '../../../models/class.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-subjects',
  templateUrl: './subjects.component.html',
  styleUrls: ['./subjects.component.css']
})
export class SubjectsComponent implements OnInit, OnDestroy {
  // Data
  subjects: SubjectModel[] = [];
  filteredSubjects: SubjectModel[] = [];
  classes: Class[] = [];
  teachers: User[] = [];
  
  // UI State
  isLoading = false;
  isSaving = false;
  showSubjectModal = false;
  editingSubject: SubjectModel | null = null;
  
  // Search
  searchTerm = '';
  
  // Form
  subjectForm!: FormGroup;
  
  // Stats cache
  subjectStats: Map<string, { teacherCount: number; classCount: number }> = new Map();
  
  private destroy$ = new RxSubject<void>();

  constructor(
    private fb: FormBuilder,
    private subjectService: SubjectService,
    private classService: ClassService,
    private userService: UserService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadSubjects();
    this.loadRelatedData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.subjectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      imagePath: ['']
    });
  }

  private loadSubjects(): void {
    this.isLoading = true;
    
    this.subjectService.getSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subjects) => {
          this.subjects = subjects;
          this.filterSubjects();
          this.calculateStats();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading subjects:', error);
          this.isLoading = false;
        }
      });
  }

  private loadRelatedData(): void {
    // Load classes to calculate stats
    this.classService.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.classes = response.classes;
          this.calculateStats();
        },
        error: (error) => {
          console.error('Error loading classes:', error);
        }
      });

    // Load teachers
    this.userService.getUsers({ role: 'teacher' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.teachers = response.users;
          this.calculateStats();
        },
        error: (error) => {
          console.error('Error loading teachers:', error);
        }
      });
  }

  private calculateStats(): void {
    this.subjectStats.clear();
    
    this.subjects.forEach(subject => {
      let teacherCount = 0;
      let classCount = 0;
      
      // Count classes where this subject is taught
      this.classes.forEach(classItem => {
        const hasSubject = classItem.teacherSubjects?.some(ts => 
          ts.subjects.some(s => {
            const subjectId = typeof s === 'string' ? s : s._id;
            return subjectId == subject._id;
          })
        );
        
        if (hasSubject) {
          classCount++;
        }
      });
      
      // Count teachers who teach this subject
      this.teachers.forEach(teacher => {
        const teachesSubject = teacher.teachingClasses?.some(tc => 
          tc.subjects.some(s => {
            const subjectId = typeof s === 'string' ? s : s._id;
            return subjectId == subject._id;
          })
        );
        
        if (teachesSubject) {
          teacherCount++;
        }
      });
      
      this.subjectStats.set(subject._id!, { teacherCount, classCount });
    });
  }

  filterSubjects(): void {
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      this.filteredSubjects = this.subjects.filter(s => 
        s.name.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term)
      );
    } else {
      this.filteredSubjects = [...this.subjects];
    }
  }

  // Modal Methods
  openCreateSubjectModal(): void {
    this.editingSubject = null;
    this.subjectForm.reset();
    this.showSubjectModal = true;
  }

  editSubject(subject: SubjectModel): void {
    this.editingSubject = subject;
    this.subjectForm.patchValue({
      name: subject.name,
      description: subject.description || '',
      imagePath: subject.imagePath || ''
    });
    this.showSubjectModal = true;
  }

  closeModal(): void {
    this.showSubjectModal = false;
    this.editingSubject = null;
    this.subjectForm.reset();
  }

  saveSubject(): void {
    if (this.subjectForm.invalid) {
      Object.keys(this.subjectForm.controls).forEach(key => {
        this.subjectForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;
    const formValue = this.subjectForm.value;
    
    // Clean up empty fields
    if (!formValue.description) {
      delete formValue.description;
    }
    if (!formValue.imagePath) {
      delete formValue.imagePath;
    }
    
    const saveObservable = this.editingSubject
      ? this.subjectService.updateSubject(this.editingSubject._id!, formValue)
      : this.subjectService.createSubject(formValue);
    
    saveObservable.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadSubjects();
        alert(this.editingSubject ? 'Matière mise à jour avec succès!' : 'Matière créée avec succès!');
      },
      error: (error) => {
        console.error('Error saving subject:', error);
        this.isSaving = false;
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
      }
    });
  }

  deleteSubject(subject: SubjectModel): void {
    const stats = this.subjectStats.get(subject._id!);
    
    if (stats && (stats.teacherCount > 0 || stats.classCount > 0)) {
      alert(`Cette matière ne peut pas être supprimée car elle est utilisée par ${stats.teacherCount} enseignant(s) et dans ${stats.classCount} classe(s).`);
      return;
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer la matière "${subject.name}"?`)) {
      this.subjectService.deleteSubject(subject._id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadSubjects();
            alert('Matière supprimée avec succès!');
          },
          error: (error) => {
            console.error('Error deleting subject:', error);
            alert('Erreur lors de la suppression. Cette matière est peut-être utilisée dans des classes.');
          }
        });
    }
  }

  // Utility Methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.subjectForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getTeacherCount(subjectId?: string): number {
    if (!subjectId) return 0;
    return this.subjectStats.get(subjectId)?.teacherCount || 0;
  }

  getClassCount(subjectId?: string): number {
    if (!subjectId) return 0;
    return this.subjectStats.get(subjectId)?.classCount || 0;
  }
}