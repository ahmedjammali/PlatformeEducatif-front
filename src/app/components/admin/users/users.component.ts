// users-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, forkJoin, of } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { ClassService } from '../../../services/class.service';
import { AuthService } from '../../../services/auth.service';
import { ToasterService } from '../../../services/toaster.service';
import { User, TeachingClass } from '../../../models/user.model';
import { Class } from '../../../models/class.model';
import { Subject as SubjectModel } from '../../../models/subject.model';
import { School } from '../../../models/school.model';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit, OnDestroy {
  // Data
  users: User[] = [];
  paginatedUsers: User[] = [];
  classNamesCache: { [key: string]: string } = {}; // Cache for class names
  
  // UI State
  isLoading = false;
  isSaving = false;
  showUserModal = false;
  showViewModal = false;
  showDeleteModal = false;
  showPassword = false;
  editingUser: User | null = null;
  viewingUser: User | null = null;
  userToDelete: User | null = null;
  
  // Filters
  searchTerm = '';
  selectedRole = '';
  sortField = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 15;
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
  
  // Auth
  isSuperAdmin = false;
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private classService: ClassService,
    private authService: AuthService,
    private toasterService: ToasterService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadUsers();
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
      password: [''],
      role: ['', Validators.required],
      // Teacher-specific fields
      phoneNumber: [''],
      // Student-specific fields
      parentName: [''],
      parentCin: [''],
      parentPhoneNumber: ['']
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

  // Add this method to your UsersComponent class
  trackByUserId(index: number, user: any): string {
    return user._id || index.toString();
  }

  private loadUsers(): void {
    this.isLoading = true;
    
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.users = response.users;
          this.updateStats();
          this.loadMissingClassNames().then(() => {
            this.filterAndPaginateUsers();
            this.isLoading = false;
          });
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.isLoading = false;
          this.toasterService.error('Impossible de charger les utilisateurs. Veuillez réessayer.');
        }
      });
  }

  private async loadMissingClassNames(): Promise<void> {
    // Collect all unique class IDs that need to be loaded
    const classIdsToLoad = new Set<string>();
    
    this.users.forEach(user => {
      // Check student class
      if (user.role === 'student' && user.studentClass && typeof user.studentClass === 'string') {
        if (!this.classNamesCache[user.studentClass]) {
          classIdsToLoad.add(user.studentClass);
        }
      }
      
      // Check teaching classes
      if (user.role === 'teacher' && user.teachingClasses) {
        user.teachingClasses.forEach(tc => {
          if (typeof tc.class === 'string' && !this.classNamesCache[tc.class]) {
            classIdsToLoad.add(tc.class);
          }
        });
      }
    });

    if (classIdsToLoad.size === 0) {
      return; // No classes to load
    }

    // Load all missing classes
    const classRequests = Array.from(classIdsToLoad).map(classId =>
      this.classService.getClassById(classId).pipe(
        takeUntil(this.destroy$)
      )
    );

    try {
      const classResponses = await forkJoin(classRequests).toPromise();
      
      // Cache the class names
      classResponses?.forEach((response, index) => {
        const classId = Array.from(classIdsToLoad)[index];
        this.classNamesCache[classId] = response.class.name;
      });
    } catch (error) {
      console.error('Error loading class names:', error);
      this.toasterService.warning('Certaines informations de classe n\'ont pas pu être chargées.');
    }
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
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
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
    this.currentPage = 1;
    this.filterAndPaginateUsers();
    this.toasterService.info('Filtres réinitialisés');
  }

  // Form validation helpers - FIXED
  get formRole(): string {
    return this.userForm.get('role')?.value || '';
  }

  // FIXED: Use formRole getter consistently
  get Role(): string {
    return this.formRole;
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

shouldShowPasswordField(): boolean {
  const role = this.formRole;
  // Show password field for all roles when creating new users
  return !this.editingUser && ['admin', 'superadmin', 'teacher', 'student'].includes(role);
}


isPasswordRequired(): boolean {
  const role = this.formRole;
  // Password is now required for all roles when creating new users
  return ['admin', 'superadmin', 'teacher', 'student'].includes(role);
}

  onRoleChange(): void {
    const role = this.formRole;
    this.updateFormValidators(role);
  }

private updateFormValidators(role: string): void {
  // Clear all conditional validators first
  this.userForm.get('password')?.clearValidators();
  this.userForm.get('phoneNumber')?.clearValidators();
  this.userForm.get('parentName')?.clearValidators();
  this.userForm.get('parentCin')?.clearValidators();
  this.userForm.get('parentPhoneNumber')?.clearValidators();

  // Set password validators based on role (only for new users)
  if (!this.editingUser) {
    if (this.isPasswordRequired()) {
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    } else {
      this.userForm.get('password')?.setValidators([Validators.minLength(6)]); // Optional but min length if provided
    }
  }

  // Set role-specific validators
  if (role === 'teacher') {
    this.userForm.get('phoneNumber')?.setValidators([Validators.required]);
  } else if (role === 'student') {
    this.userForm.get('parentName')?.setValidators([Validators.required]);
    this.userForm.get('parentCin')?.setValidators([Validators.required]);
    this.userForm.get('parentPhoneNumber')?.setValidators([Validators.required]);
  }

  // Update validation status
  this.userForm.get('password')?.updateValueAndValidity();
  this.userForm.get('phoneNumber')?.updateValueAndValidity();
  this.userForm.get('parentName')?.updateValueAndValidity();
  this.userForm.get('parentCin')?.updateValueAndValidity();
  this.userForm.get('parentPhoneNumber')?.updateValueAndValidity();
}

  // Modal Methods
  openCreateUserModal(): void {
    this.editingUser = null;
    this.userForm.reset();
    this.updateFormValidators(''); // Clear validators initially
    this.showUserModal = true;
  }

  editUser(user: User): void {
    this.editingUser = user;
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber || '',
      parentName: user.parentName || '',
      parentCin: user.parentCin || '',
      parentPhoneNumber: user.parentPhoneNumber || ''
    });
    
    // For editing, password is never required
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    
    // Set role-specific validators for editing
    this.updateFormValidators(user.role);
    
    this.showUserModal = true;
  }

  editUserFromView(): void {
    if (this.viewingUser) {
      this.closeViewModal();
      this.editUser(this.viewingUser);
    }
  }

  closeModal(): void {
    this.showUserModal = false;
    this.editingUser = null;
    this.userForm.reset();
    this.showPassword = false;
  }

  viewUser(user: User): void {
    this.userService.getUserById(user._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userData) => {
          this.viewingUser = userData;
          this.showViewModal = true;
        },
        error: (error) => {
          console.error('Error loading user details:', error);
          this.toasterService.error('Impossible de charger les détails de l\'utilisateur.');
        }
      });
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewingUser = null;
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      this.toasterService.warning('Veuillez corriger les erreurs dans le formulaire.');
      return;
    }

    this.isSaving = true;
    const formValue = this.userForm.value;
    
    // Prepare user data with role-specific fields
    const userData: Partial<User> = {
      name: formValue.name,
      email: formValue.email,
      role: formValue.role
    };
    
    // Add password only if provided and it's a new user
    if (!this.editingUser && formValue.password) {
      userData.password = formValue.password;
    }

    // Add role-specific fields
    if (formValue.role === 'teacher') {
      userData.phoneNumber = formValue.phoneNumber;
    } else if (formValue.role === 'student') {
      userData.parentName = formValue.parentName;
      userData.parentCin = formValue.parentCin;
      userData.parentPhoneNumber = formValue.parentPhoneNumber;
    }
    
    const saveObservable = this.editingUser
      ? this.userService.updateUser(this.editingUser._id!, userData)
      : this.userService.createUser(userData);
    
    saveObservable.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadUsers();
        
        if (this.editingUser) {
          this.toasterService.success('Utilisateur mis à jour avec succès!');
        } else {
          this.toasterService.success('Utilisateur créé avec succès!');
        }
      },
      error: (error) => {
        console.error('Error saving user:', error);
        this.isSaving = false;
        this.toasterService.error(error.error?.message || 'Erreur lors de la sauvegarde. Veuillez réessayer.');
      }
    });
  }

  // Delete Modal Methods
  openDeleteModal(user: User): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  confirmDeleteUser(): void {
    if (!this.userToDelete) return;

    const userId = this.userToDelete._id!;
    const userName = this.userToDelete.name;

    this.userService.deleteUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadUsers();
          // Clear selection if deleted user was selected
          this.selectedUsers = this.selectedUsers.filter(id => id !== userId);
          this.toasterService.success(`${userName} a été supprimé avec succès!`);
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.toasterService.error('Erreur lors de la suppression. Veuillez réessayer.');
        }
      });
  }

  deleteUser(user: User): void {
    this.openDeleteModal(user);
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
    if (this.selectedUsers.length === 0) {
      this.toasterService.warning('Aucun utilisateur sélectionné.');
      return;
    }

    const count = this.selectedUsers.length;
    this.toasterService.warning(
      `La suppression en masse de ${count} utilisateur(s) n'est pas encore disponible.`,
      'Fonctionnalité à venir'
    );

  }

  exportSelected(): void {
    if (this.selectedUsers.length === 0) {
      this.toasterService.warning('Aucun utilisateur sélectionné pour l\'export.');
      return;
    }

    this.toasterService.info(
      `Export de ${this.selectedUsers.length} utilisateur(s) en cours...`
    );
    

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

  // Helper methods for safe property access
  getSchoolName(school: School | string | undefined): string {
    if (!school) return 'Non spécifié';
    return typeof school === 'string' ? school : school.name;
  }

  getCreatedByName(createdBy: User | string | undefined): string {
    if (!createdBy) return 'Système';
    return typeof createdBy === 'string' ? createdBy : createdBy.name;
  }

  getClassName(classRef: Class | string | undefined): string {
    if (!classRef) return 'Non assigné';
    
    if (typeof classRef === 'string') {
      // Try to get from cache first
      return this.classNamesCache[classRef] || classRef;
    }
    
    return classRef.name;
  }

  getSubjectName(subject: any): string {
    if (!subject) return '';
    return typeof subject === 'string' ? subject : subject.name;
  }

  // Helper method to safely get subjects array for template
  getSubjectsArray(subjects: SubjectModel[] | string[] | undefined): any[] {
    if (!subjects) return [];
    return Array.isArray(subjects) ? subjects : [];
  }

  // Helper method to get teaching classes display for table
  getTeachingClassesDisplay(teachingClasses: TeachingClass[] | undefined): string {
    if (!teachingClasses || teachingClasses.length === 0) {
      return 'Non assigné';
    }
    
    return teachingClasses.map(tc => this.getClassName(tc.class)).join(', ');
  }

  // Helper method to get user's assigned classes for deletion warning
  getUserAssignedClasses(user: User): string[] {
    const classes: string[] = [];
    
    if (user.role === 'student' && user.studentClass) {
      classes.push(this.getClassName(user.studentClass));
    }
    
    if (user.role === 'teacher' && user.teachingClasses) {
      user.teachingClasses.forEach(tc => {
        const className = this.getClassName(tc.class);
        if (!classes.includes(className)) {
          classes.push(className);
        }
      });
    }
    
    return classes.filter(className => className !== 'Non assigné');
  }
}