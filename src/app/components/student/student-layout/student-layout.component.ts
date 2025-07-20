// student-layout.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-student-layout',
  template: `
    <div class="student-layout">
      <app-student-navbar></app-student-navbar>
      <div class="student-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .student-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    
    .student-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    
    @media (max-width: 768px) {
      .student-content {
        padding: 15px;
      }
    }
  `]
})
export class StudentLayoutComponent {}