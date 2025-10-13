import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlDialogComponent } from './bl-dialog.component';

describe('BlDialogComponent', () => {
  let component: BlDialogComponent;
  let fixture: ComponentFixture<BlDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlDialogComponent]
    });
    fixture = TestBed.createComponent(BlDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
