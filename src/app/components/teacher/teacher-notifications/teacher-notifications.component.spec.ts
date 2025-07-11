import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherNotificationsComponent } from './teacher-notifications.component';

describe('TeacherNotificationsComponent', () => {
  let component: TeacherNotificationsComponent;
  let fixture: ComponentFixture<TeacherNotificationsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TeacherNotificationsComponent]
    });
    fixture = TestBed.createComponent(TeacherNotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
