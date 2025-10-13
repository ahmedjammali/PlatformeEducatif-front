import { ComponentFixture, TestBed } from '@angular/core/testing';

import { blComponent } from './bl.component';

describe('blComponent', () => {
  let component: blComponent;
  let fixture: ComponentFixture<blComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [blComponent]
    });
    fixture = TestBed.createComponent(blComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
