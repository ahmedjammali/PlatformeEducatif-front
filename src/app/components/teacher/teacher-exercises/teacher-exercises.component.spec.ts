import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherExercisesComponent } from './teacher-exercises.component';

describe('TeacherExercisesComponent', () => {
  let component: TeacherExercisesComponent;
  let fixture: ComponentFixture<TeacherExercisesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TeacherExercisesComponent]
    });
    fixture = TestBed.createComponent(TeacherExercisesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
