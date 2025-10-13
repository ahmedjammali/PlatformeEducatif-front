import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceProformatComponent } from './invoice-proformat.component';

describe('InvoiceProformatComponent', () => {
  let component: InvoiceProformatComponent;
  let fixture: ComponentFixture<InvoiceProformatComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoiceProformatComponent]
    });
    fixture = TestBed.createComponent(InvoiceProformatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
