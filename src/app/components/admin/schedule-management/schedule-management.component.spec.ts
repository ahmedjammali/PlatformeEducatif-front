import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduleManagementComponent } from './schedule-management.component';

describe('ScheduleManagementComponent', () => {
  let component: ScheduleManagementComponent;
  let fixture: ComponentFixture<ScheduleManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ScheduleManagementComponent]
    });
    fixture = TestBed.createComponent(ScheduleManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
