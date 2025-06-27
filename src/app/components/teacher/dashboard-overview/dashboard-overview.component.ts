// dashboard-overview.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

interface DashboardStats {
  totalSubjects: number;
  totalClasses: number;
  totalExercises: number;
  totalStudents: number;
}

@Component({
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.css']
})
export class DashboardOverviewComponent {
  @Input() stats: DashboardStats = {
    totalSubjects: 0,
    totalClasses: 0,
    totalExercises: 0,
    totalStudents: 0
  };
  
  @Output() createExercise = new EventEmitter<void>();
  @Output() enterGrades = new EventEmitter<void>();
  @Output() viewProgress = new EventEmitter<void>();

  onCreateExercise(): void {
    this.createExercise.emit();
  }

  onEnterGrades(): void {
    this.enterGrades.emit();
  }

  onViewProgress(): void {
    this.viewProgress.emit();
  }
}