// teacher-layout.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SchoolService } from '../../../services/school.service';
import { User } from '../../../models/user.model';
import { School } from '../../../models/school.model';

interface ExtendedUser extends User {
  id?: string;
}

@Component({
  selector: 'app-teacher-layout',
  templateUrl: './teacher-layout.component.html',
  styleUrls: ['./teacher-layout.component.css']
})
export class TeacherLayoutComponent implements OnInit {
  @Input() activeSection: string = 'overview';
  @Output() activeSectionChange = new EventEmitter<string>();
  
  currentUser: ExtendedUser | null = null;
  school: School | null = null;

  constructor(
    private authService: AuthService,
    private schoolService: SchoolService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser() as ExtendedUser | null;
    if (this.currentUser && this.currentUser.role === 'teacher') {
      this.loadSchoolInfo();
    } else {
      this.router.navigate(['/login']);
    }
  }

  private loadSchoolInfo(): void {
    this.schoolService.getSchool().subscribe({
      next: (data) => {
        this.school = data.school;
      },
      error: (error) => {
        console.error('Error loading school info:', error);
      }
    });
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
    this.activeSectionChange.emit(section);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}