// contact-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ContactService } from '../../../services/contact.service';
import { Contact } from '../../../models/contact.model';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit, OnDestroy {
  // Data
  contacts: Contact[] = [];
  filteredContacts: Contact[] = [];
  paginatedContacts: Contact[] = [];
  selectedContacts: string[] = [];
  selectedContact: Contact | null = null;
  replyContact: Contact | null = null;

  // Filters
  searchTerm = '';
  selectedPeriod = '';
  startDate = '';
  endDate = '';

  // Sorting
  sortField = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // UI State
  isLoading = false;
  isSending = false;
  showViewModal = false;
  showReplyModal = false;

  // Forms
  replyForm!: FormGroup;

  // Stats
  totalContacts = 0;
  todayContacts = 0;
  weekContacts = 0;
  monthContacts = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private contactService: ContactService,
    private fb: FormBuilder
  ) {
    this.initializeReplyForm();
  }

  ngOnInit(): void {
    this.loadContacts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeReplyForm(): void {
    this.replyForm = this.fb.group({
      subject: ['', [Validators.required]],
      message: ['', [Validators.required]]
    });
  }

  private loadContacts(): void {
    this.isLoading = true;
    
    this.contactService.getAllContacts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contacts) => {
          this.contacts = contacts.sort((a, b) => 
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
          );
          this.calculateStats();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading contacts:', error);
          this.isLoading = false;
        }
      });
  }

  private calculateStats(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.totalContacts = this.contacts.length;
    this.todayContacts = this.contacts.filter(c => 
      new Date(c.createdAt!) >= today
    ).length;
    this.weekContacts = this.contacts.filter(c => 
      new Date(c.createdAt!) >= weekAgo
    ).length;
    this.monthContacts = this.contacts.filter(c => 
      new Date(c.createdAt!) >= monthAgo
    ).length;
  }

  // Search and Filter Methods
  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedPeriod = '';
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.contacts];

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(search) ||
        contact.email.toLowerCase().includes(search) ||
        contact.message.toLowerCase().includes(search)
      );
    }

    // Apply period filter
    if (this.selectedPeriod) {
      const now = new Date();
      let filterDate: Date;

      switch (this.selectedPeriod) {
        case 'today':
          filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          filterDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          filterDate = new Date(0);
      }

      filtered = filtered.filter(contact =>
        new Date(contact.createdAt!) >= filterDate
      );
    }

    // Apply custom date range filter
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date

      filtered = filtered.filter(contact => {
        const contactDate = new Date(contact.createdAt!);
        return contactDate >= start && contactDate <= end;
      });
    }

    this.filteredContacts = filtered;
    this.applySorting();
    this.updatePagination();
  }

  // Sorting Methods
  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.applySorting();
    this.updatePagination();
  }

  private applySorting(): void {
    this.filteredContacts.sort((a, b) => {
      let aValue: any = a[this.sortField as keyof Contact];
      let bValue: any = b[this.sortField as keyof Contact];

      if (this.sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return this.sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Pagination Methods
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredContacts.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedContacts = this.filteredContacts.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Selection Methods
  toggleSelect(contactId: string): void {
    const index = this.selectedContacts.indexOf(contactId);
    if (index === -1) {
      this.selectedContacts.push(contactId);
    } else {
      this.selectedContacts.splice(index, 1);
    }
  }

  isSelected(contactId: string): boolean {
    return this.selectedContacts.includes(contactId);
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedContacts = this.paginatedContacts.map(c => c._id!);
    } else {
      this.selectedContacts = [];
    }
  }

  isAllSelected(): boolean {
    return this.paginatedContacts.length > 0 && 
           this.paginatedContacts.every(c => this.isSelected(c._id!));
  }

  // Action Methods
  viewContact(contact: Contact): void {
    this.selectedContact = contact;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedContact = null;
  }

  replyToContact(contact: Contact): void {
    this.replyContact = contact;
    this.replyForm.patchValue({
      subject: `Re: Message de ${contact.name}`,
      message: `Bonjour ${contact.name},\n\nMerci pour votre message. \n\nCordialement`
    });
    this.showReplyModal = true;
    this.closeViewModal();
  }

  closeReplyModal(): void {
    this.showReplyModal = false;
    this.replyContact = null;
    this.replyForm.reset();
  }

  sendReply(): void {
    if (this.replyForm.invalid || !this.replyContact) {
      this.replyForm.markAllAsTouched();
      return;
    }

    this.isSending = true;
    const { subject, message } = this.replyForm.value;

    // Create mailto link
    const mailtoLink = `mailto:${this.replyContact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    
    // Open in new tab/window to ensure email client opens properly
    const newWindow = window.open(mailtoLink, '_blank');
    
    // Fallback if popup is blocked
    if (!newWindow) {
      window.location.href = mailtoLink;
    }
    
    // Close modal immediately after opening email client
    this.isSending = false;
    this.closeReplyModal();
  }

  // UI State for delete confirmation
  showDeleteModal = false;
  showBulkDeleteModal = false;
  contactToDelete: Contact | null = null;

  deleteContact(contact: Contact): void {
    this.contactToDelete = contact;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.contactToDelete) return;

    this.contactService.deleteContact(this.contactToDelete._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.contacts = this.contacts.filter(c => c._id !== this.contactToDelete!._id);
          this.selectedContacts = this.selectedContacts.filter(id => id !== this.contactToDelete!._id);
          this.calculateStats();
          this.applyFilters();
          this.closeDeleteModal();
        },
        error: (error) => {
          console.error('Error deleting contact:', error);
          this.showErrorMessage('Erreur lors de la suppression du contact');
        }
      });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.contactToDelete = null;
  }

  deleteSelected(): void {
    if (this.selectedContacts.length === 0) return;
    this.showBulkDeleteModal = true;
  }

  confirmBulkDelete(): void {
    if (this.selectedContacts.length === 0) return;

    const deletePromises = this.selectedContacts.map(id =>
      this.contactService.deleteContact(id).toPromise()
    );

    Promise.all(deletePromises)
      .then(() => {
        this.contacts = this.contacts.filter(c => !this.selectedContacts.includes(c._id!));
        this.selectedContacts = [];
        this.calculateStats();
        this.applyFilters();
        this.closeBulkDeleteModal();
        this.showSuccessMessage('Contacts supprimés avec succès');
      })
      .catch((error) => {
        console.error('Error deleting contacts:', error);
        this.showErrorMessage('Erreur lors de la suppression des contacts');
      });
  }

  closeBulkDeleteModal(): void {
    this.showBulkDeleteModal = false;
  }

  // Notification methods
  private showSuccessMessage(message: string): void {
    // You can replace this with a proper toast notification service
    alert(message);
  }

  private showErrorMessage(message: string): void {
    // You can replace this with a proper toast notification service
    alert(message);
  }

  exportContacts(): void {
    if (this.contacts.length === 0) return;

    const csvContent = this.generateCSV(this.filteredContacts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportSelected(): void {
    if (this.selectedContacts.length === 0) return;

    const selectedContactData = this.contacts.filter(c => this.selectedContacts.includes(c._id!));
    const csvContent = this.generateCSV(selectedContactData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_selected_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private generateCSV(contacts: Contact[]): string {
    const headers = ['Nom', 'Email', 'Téléphone', 'Message', 'Date'];
    const csvRows = [headers.join(',')];

    contacts.forEach(contact => {
      const row = [
        this.escapeCsvField(contact.name),
        this.escapeCsvField(contact.email),
        this.escapeCsvField(contact.phone?.toString() || ''),
        this.escapeCsvField(contact.message),
        this.escapeCsvField(this.formatFullDate(contact.createdAt))
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
  // Add this method to your ContactComponent class
trackByContactId(index: number, contact: Contact): string {
  return contact._id || index.toString();
}
  // Utility Methods
  getAvatarColor(name: string): string {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
      '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  truncateMessage(message: string, length: number): string {
    if (message.length <= length) {
      return message;
    }
    return message.substring(0, length) + '...';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatTime(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatFullDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Form validation helpers
  isReplyFieldInvalid(fieldName: string): boolean {
    const field = this.replyForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}