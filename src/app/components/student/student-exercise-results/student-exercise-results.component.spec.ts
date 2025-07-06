import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentExerciseResultsComponent } from './student-exercise-results.component';

describe('StudentExerciseResultsComponent', () => {
  let component: StudentExerciseResultsComponent;
  let fixture: ComponentFixture<StudentExerciseResultsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StudentExerciseResultsComponent]
    });
    fixture = TestBed.createComponent(StudentExerciseResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
