import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OuvrierFinancialComponent } from './ouvrier-financial.component';

describe('OuvrierFinancialComponent', () => {
  let component: OuvrierFinancialComponent;
  let fixture: ComponentFixture<OuvrierFinancialComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OuvrierFinancialComponent]
    });
    fixture = TestBed.createComponent(OuvrierFinancialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
