import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentExerciseExecutionComponent } from './student-exercise-execution.component';

describe('StudentExerciseExecutionComponent', () => {
  let component: StudentExerciseExecutionComponent;
  let fixture: ComponentFixture<StudentExerciseExecutionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StudentExerciseExecutionComponent]
    });
    fixture = TestBed.createComponent(StudentExerciseExecutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
