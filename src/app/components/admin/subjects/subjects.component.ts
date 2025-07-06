import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject as RxSubject, takeUntil } from 'rxjs';
import { SubjectService } from '../../../services/subject.service';
import { ClassService } from '../../../services/class.service';
import { UserService } from '../../../services/user.service';
import { ToasterService } from '../../../services/toaster.service';
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
  showDeleteModal = false;
  editingSubject: SubjectModel | null = null;
  subjectToDelete: SubjectModel | null = null;
  
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
    private userService: UserService,
    private toasterService: ToasterService
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
          this.toasterService.error('Impossible de charger les matières. Veuillez réessayer.');
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
          this.toasterService.warning('Certaines données n\'ont pas pu être chargées.');
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
          this.toasterService.warning('Les données des enseignants n\'ont pas pu être chargées.');
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
        (s.description && s.description.toLowerCase().includes(term))
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
      this.toasterService.warning('Veuillez corriger les erreurs dans le formulaire.');
      return;
    }

    this.isSaving = true;
    const formValue = this.subjectForm.value;
    const isEditing = !!this.editingSubject; // Store the editing state
    
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
        
        if (isEditing) {
          this.toasterService.success('Matiere mise a jour avec succes!');
        } else {
          this.toasterService.success('Matiere creee avec succes!');
        }
      },
      error: (error) => {
        console.error('Error saving subject:', error);
        this.isSaving = false;
        this.toasterService.error('Erreur lors de l\'enregistrement. Veuillez reessayer.');
      }
    });
  }

  // Delete Modal Methods
  openDeleteModal(subject: SubjectModel): void {
    this.subjectToDelete = subject;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.subjectToDelete = null;
  }

  confirmDeleteSubject(): void {
    if (!this.subjectToDelete) return;

    const stats = this.subjectStats.get(this.subjectToDelete._id!);
    
    if (stats && (stats.teacherCount > 0 || stats.classCount > 0)) {
      this.toasterService.warning(
        `Cette matiere ne peut pas etre supprimee car elle est utilisee par ${stats.teacherCount} enseignant(s) et dans ${stats.classCount} classe(s).`,
        'Suppression impossible'
      );
      this.closeDeleteModal();
      return;
    }

    const subjectName = this.subjectToDelete.name;

    this.subjectService.deleteSubject(this.subjectToDelete._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadSubjects();
          this.toasterService.success(`"${subjectName}" a ete supprimee avec succes!`);
        },
        error: (error) => {
          console.error('Error deleting subject:', error);
          this.toasterService.error('Erreur lors de la suppression. Cette matiere est peut-etre utilisee dans des classes.');
        }
      });
  }

  deleteSubject(subject: SubjectModel): void {
    this.openDeleteModal(subject);
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

  // Helper method to check if subject can be deleted
  canDeleteSubject(subjectId?: string): boolean {
    if (!subjectId) return false;
    const stats = this.subjectStats.get(subjectId);
    return !stats || (stats.teacherCount === 0 && stats.classCount === 0);
  }

  // Helper method to get usage details for delete warning
  getSubjectUsageDetails(subject: SubjectModel): string[] {
    const details: string[] = [];
    const stats = this.subjectStats.get(subject._id!);
    
    if (stats) {
      if (stats.teacherCount > 0) {
        details.push(`${stats.teacherCount} enseignant(s) enseignent cette matière`);
      }
      if (stats.classCount > 0) {
        details.push(`${stats.classCount} classe(s) ont cette matière dans leur programme`);
      }
    }
    
    return details;
  }
}