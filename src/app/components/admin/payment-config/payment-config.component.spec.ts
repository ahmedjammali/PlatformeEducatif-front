import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentConfigComponent } from './payment-config.component';

describe('PaymentConfigComponent', () => {
  let component: PaymentConfigComponent;
  let fixture: ComponentFixture<PaymentConfigComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PaymentConfigComponent]
    });
    fixture = TestBed.createComponent(PaymentConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
