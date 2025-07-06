// teacher-subjects.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from '../../../models/subject.model';

@Component({
  selector: 'app-teacher-subjects',
  templateUrl: './teacher-subjects.component.html',
  styleUrls: ['./teacher-subjects.component.css']
})
export class TeacherSubjectsComponent {
  @Input() subjects: Subject[] = [];
  @Input() subjectStats: Map<string, { classCount: number; exerciseCount: number }> = new Map();
  @Output() subjectSelected = new EventEmitter<Subject>();
  @Output() viewDetails = new EventEmitter<Subject>();

  getSubjectGradient(subject: Subject): string {
    const gradients = [
      'linear-gradient(135deg, #A4B465, #626F47)',
      'linear-gradient(135deg, #F0BB78, #D4A574)',
      'linear-gradient(135deg, #87CEEB, #4682B4)',
      'linear-gradient(135deg, #FFB6C1, #FF69B4)',
      'linear-gradient(135deg, #DDA0DD, #9370DB)'
    ];
    
    const index = this.subjects.indexOf(subject) % gradients.length;
    return gradients[index];
  }

  getSubjectClassCount(subject: Subject): number {
    return this.subjectStats.get(subject._id!)?.classCount || 0;
  }

  getSubjectExerciseCount(subject: Subject): number {
    return this.subjectStats.get(subject._id!)?.exerciseCount || 0;
  }

  selectSubject(subject: Subject): void {
    this.subjectSelected.emit(subject);
  }

  viewSubjectDetails(subject: Subject): void {
    this.viewDetails.emit(subject);
  }
}