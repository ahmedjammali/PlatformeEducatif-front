import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherFinancialComponent } from './teacher-financial.component';

describe('TeacherFinancialComponent', () => {
  let component: TeacherFinancialComponent;
  let fixture: ComponentFixture<TeacherFinancialComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TeacherFinancialComponent]
    });
    fixture = TestBed.createComponent(TeacherFinancialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
