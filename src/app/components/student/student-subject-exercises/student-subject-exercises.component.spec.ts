import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentSubjectExercisesComponent } from './student-subject-exercises.component';

describe('StudentSubjectExercisesComponent', () => {
  let component: StudentSubjectExercisesComponent;
  let fixture: ComponentFixture<StudentSubjectExercisesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StudentSubjectExercisesComponent]
    });
    fixture = TestBed.createComponent(StudentSubjectExercisesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
