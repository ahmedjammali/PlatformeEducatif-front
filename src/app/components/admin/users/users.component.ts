// users-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subject.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { Class } from '../../../models/class.model';
import { Subject as SubjectModel } from '../../../models/subject.model';

interface TeachingAssignment {
  classId: string;
  subjectIds: string[];
}

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {
// Data
  users: User[] = [];
  paginatedUsers: User[] = [];
  classes: Class[] = [];
  subjects: SubjectModel[] = [];
  
  // UI State
  isLoading = false;
  isSaving = false;
  showUserModal = false;
  showPassword = false;
  editingUser: User | null = null;
  
  // Filters
  searchTerm = '';
  selectedRole = '';
  selectedClass = '';
  sortField = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  
  // Selection
  selectedUsers: string[] = [];
  
  // Stats
  totalUsers = 0;
  totalStudents = 0;
  totalTeachers = 0;
  totalAdmins = 0;
  
  // Forms
  userForm!: FormGroup;
  teachingAssignments: TeachingAssignment[] = [];
  
  // Auth
  isSuperAdmin = false;
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadInitialData();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required],
      studentClass: ['']
    });
  }

  private setupSearch(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.filterAndPaginateUsers();
      });
  }

  private loadInitialData(): void {
    this.loadUsers();
    this.loadClasses();
    this.loadSubjects();
  }

  private loadUsers(): void {
    this.isLoading = true;
    
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.users = response.users;
          this.updateStats();
          this.filterAndPaginateUsers();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.isLoading = false;
        }
      });
  }

  private loadClasses(): void {
    this.classService.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.classes = response.classes;
        },
        error: (error) => {
          console.error('Error loading classes:', error);
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

  private updateStats(): void {
    this.totalUsers = this.users.length;
    this.totalStudents = this.users.filter(u => u.role === 'student').length;
    this.totalTeachers = this.users.filter(u => u.role === 'teacher').length;
    this.totalAdmins = this.users.filter(u => u.role === 'admin').length;
  }

  filterAndPaginateUsers(): void {
    let filtered = [...this.users];
    
    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }
    
    // Apply role filter
    if (this.selectedRole) {
      filtered = filtered.filter(user => user.role === this.selectedRole);
    }
    
    // Apply class filter (for students)
    if (this.selectedClass) {
      filtered = filtered.filter(user => {
        if (user.role === 'student') {
          return typeof user.studentClass === 'string' 
            ? user.studentClass === this.selectedClass
            : user.studentClass?._id === this.selectedClass;
        }
        if (user.role === 'teacher') {
          return user.teachingClasses?.some(tc => {
            const classId = typeof tc.class === 'string' ? tc.class : tc.class._id;
            return classId === this.selectedClass;
          });
        }
        return false;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[this.sortField as keyof User];
      let bVal: any = b[this.sortField as keyof User];
      
      // Handle undefined values
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      
      if (this.sortField === 'createdAt') {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }
      
      if (this.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    // Calculate pagination
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    
    this.paginatedUsers = filtered.slice(startIndex, endIndex);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.searchSubject$.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.filterAndPaginateUsers();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedClass = '';
    this.currentPage = 1;
    this.filterAndPaginateUsers();
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.filterAndPaginateUsers();
  }

  // Modal Methods
  openCreateUserModal(): void {
    this.editingUser = null;
    this.userForm.reset();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.teachingAssignments = [{ classId: '', subjectIds: [] }];
    this.showUserModal = true;
  }

  editUser(user: User): void {
    this.editingUser = user;
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      studentClass: user.role === 'student' ? 
        (typeof user.studentClass === 'string' ? user.studentClass : user.studentClass?._id) : ''
    });
    
    // Remove password requirement for editing
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    
    // Setup teaching assignments for teachers
    if (user.role === 'teacher' && user.teachingClasses) {
      this.teachingAssignments = user.teachingClasses.map(tc => ({
        classId: typeof tc.class === 'string' ? tc.class : tc.class._id || '',
        subjectIds: tc.subjects.map(s => typeof s === 'string' ? s : s._id || '')
      }));
    } else {
      this.teachingAssignments = [{ classId: '', subjectIds: [] }];
    }
    
    this.showUserModal = true;
  }

  closeModal(): void {
    this.showUserModal = false;
    this.editingUser = null;
    this.userForm.reset();
    this.showPassword = false;
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;
    const formValue = this.userForm.value;
    
    // Prepare user data
    const userData: Partial<User> = {
      name: formValue.name,
      email: formValue.email,
      role: formValue.role
    };
    
    if (!this.editingUser && formValue.password) {
      userData.password = formValue.password;
    }
    
    if (formValue.role === 'student' && formValue.studentClass) {
      userData.studentClass = formValue.studentClass;
    }
    
    const saveObservable = this.editingUser
      ? this.userService.updateUser(this.editingUser._id!, userData)
      : this.userService.createUser(userData);
    
    saveObservable.pipe(takeUntil(this.destroy$)).subscribe({
      next: (savedUser) => {
        // Handle teacher assignments separately
        if (formValue.role === 'teacher') {
          this.saveTeacherAssignments(savedUser._id!);
        } else {
          this.onSaveSuccess();
        }
      },
      error: (error) => {
        console.error('Error saving user:', error);
        this.isSaving = false;
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
      }
    });
  }

  private saveTeacherAssignments(teacherId: string): void {
    const validAssignments = this.teachingAssignments.filter(a => a.classId && a.subjectIds.length > 0);
    
    if (validAssignments.length === 0) {
      this.onSaveSuccess();
      return;
    }
    
    // For simplicity, we'll need to make multiple API calls
    // In a real app, you might want to batch these
    let completed = 0;
    validAssignments.forEach(assignment => {
      this.classService.assignTeacher(assignment.classId, {
        teacherId: teacherId,
        subjectIds: assignment.subjectIds
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          completed++;
          if (completed === validAssignments.length) {
            this.onSaveSuccess();
          }
        },
        error: (error) => {
          console.error('Error assigning teacher:', error);
        }
      });
    });
  }

  private onSaveSuccess(): void {
    this.isSaving = false;
    this.closeModal();
    this.loadUsers();
    alert(this.editingUser ? 'Utilisateur mis à jour avec succès!' : 'Utilisateur créé avec succès!');
  }

  deleteUser(user: User): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${user.name}?`)) {
      this.userService.deleteUser(user._id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadUsers();
            alert('Utilisateur supprimé avec succès!');
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            alert('Erreur lors de la suppression. Veuillez réessayer.');
          }
        });
    }
  }

  viewUser(user: User): void {
    // TODO: Implement user details view
    console.log('View user:', user);
  }

  // Role change handling
  onRoleChange(): void {
    const role = this.userForm.get('role')?.value;
    
    if (role === 'student') {
      this.userForm.get('studentClass')?.setValidators(Validators.required);
    } else {
      this.userForm.get('studentClass')?.clearValidators();
    }
    
    this.userForm.get('studentClass')?.updateValueAndValidity();
  }

  // Teaching assignments
  addAssignment(): void {
    this.teachingAssignments.push({ classId: '', subjectIds: [] });
  }

  removeAssignment(index: number): void {
    this.teachingAssignments.splice(index, 1);
  }

  onClassChange(index: number): void {
    this.teachingAssignments[index].subjectIds = [];
  }

  toggleSubject(assignmentIndex: number, subjectId: string): void {
    const assignment = this.teachingAssignments[assignmentIndex];
    const index = assignment.subjectIds.indexOf(subjectId);
    
    if (index > -1) {
      assignment.subjectIds.splice(index, 1);
    } else {
      assignment.subjectIds.push(subjectId);
    }
  }

  // Selection methods
  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedUsers = this.paginatedUsers.map(u => u._id!);
    } else {
      this.selectedUsers = [];
    }
  }

  toggleSelect(userId: string): void {
    const index = this.selectedUsers.indexOf(userId);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(userId);
    }
  }

  isSelected(userId?: string): boolean {
    return userId ? this.selectedUsers.includes(userId) : false;
  }

  isAllSelected(): boolean {
    return this.paginatedUsers.length > 0 && 
           this.paginatedUsers.every(u => this.isSelected(u._id));
  }

  deleteSelected(): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${this.selectedUsers.length} utilisateur(s)?`)) {
      // TODO: Implement bulk delete
      console.log('Delete selected:', this.selectedUsers);
    }
  }

  exportSelected(): void {
    // TODO: Implement export functionality
    console.log('Export selected:', this.selectedUsers);
  }

  // Pagination
  goToPage(page: number): void {
    this.currentPage = page;
    this.filterAndPaginateUsers();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Utility methods
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getClassName(classRef: any): string {
    if (!classRef) return '-';
    return typeof classRef === 'string' 
      ? this.classes.find(c => c._id === classRef)?.name || classRef
      : classRef.name || '-';
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'student': 'Étudiant',
      'teacher': 'Enseignant',
      'admin': 'Administrateur',
      'superadmin': 'Super Admin'
    };
    return labels[role] || role;
  }

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#626F47', '#A4B465', '#F0BB78', '#F5ECD5',
      '#4CAF50', '#2196F3', '#FF9800', '#9C27B0'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}