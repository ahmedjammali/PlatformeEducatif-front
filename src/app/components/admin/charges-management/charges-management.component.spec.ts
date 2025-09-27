import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChargesManagementComponent } from './charges-management.component';

describe('ChargesManagementComponent', () => {
  let component: ChargesManagementComponent;
  let fixture: ComponentFixture<ChargesManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChargesManagementComponent]
    });
    fixture = TestBed.createComponent(ChargesManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
