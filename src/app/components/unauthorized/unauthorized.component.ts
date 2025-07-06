import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.css']
})
export class UnauthorizedComponent implements OnInit {

  constructor(
    private router: Router,
    private location: Location,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // Log the unauthorized access attempt
    this.logUnauthorizedAccess();
    
    // Show a snackbar notification
    this.showUnauthorizedMessage();
  }

  /**
   * Navigate back to the previous page
   */
  goBack(): void {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      this.location.back();
    } else {
      // If no history, go to home
      this.goHome();
    }
  }

  /**
   * Navigate to the home page
   */
  goHome(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Contact support functionality
   */
  contactSupport(): void {
    // You can implement this based on your requirements
    // For example, open a modal, navigate to contact page, etc.
    this.snackBar.open('Redirecting to support...', 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
    
    // Example: Navigate to contact page
    // this.router.navigate(['/contact']);
    
    // Example: Open email client
    // window.location.href = 'mailto:support@example.com?subject=Access Denied - Need Help';
  }

  /**
   * Log unauthorized access attempt
   */
  private logUnauthorizedAccess(): void {
    const logData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };
    
    console.warn('Unauthorized access attempt:', logData);
    
    // Here you could send this data to your logging service
    // this.loggingService.logUnauthorizedAccess(logData);
  }

  /**
   * Show unauthorized access message
   */
  private showUnauthorizedMessage(): void {
    this.snackBar.open(
      'Access denied. You do not have permission to view this page.',
      'Dismiss',
      {
        duration: 5000,
        panelClass: ['error-snackbar'],
        verticalPosition: 'top',
        horizontalPosition: 'center'
      }
    );
  }

  /**
   * Handle retry action (if applicable)
   */
  retry(): void {
    // Refresh the current page or retry the last action
    window.location.reload();
  }

  /**
   * Navigate to help/documentation page
   */
  getHelp(): void {
    // Navigate to help page or open documentation
    this.router.navigate(['/help']);
    
    // Or open external documentation
    // window.open('https://your-docs-site.com/permissions', '_blank');
  }

  /**
   * Request access functionality
   */
  requestAccess(): void {
    this.snackBar.open(
      'Access request sent to administrator',
      'Close',
      {
        duration: 4000,
        panelClass: ['success-snackbar']
      }
    );
    
    // Here you could implement the logic to send an access request
    // this.accessRequestService.requestAccess(currentUser, requestedResource);
  }
}