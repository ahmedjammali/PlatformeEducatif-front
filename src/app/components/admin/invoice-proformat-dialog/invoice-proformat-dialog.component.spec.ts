import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceProformatDialogComponent } from './invoice-proformat-dialog.component';

describe('InvoiceProformatDialogComponent', () => {
  let component: InvoiceProformatDialogComponent;
  let fixture: ComponentFixture<InvoiceProformatDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoiceProformatDialogComponent]
    });
    fixture = TestBed.createComponent(InvoiceProformatDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
