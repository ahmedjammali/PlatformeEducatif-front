import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { SchoolService } from './services/school.service';
import { SubjectService } from './services/subject.service';
import { ClassService } from './services/class.service';
import { ExerciseService } from './services/exercise.service';
import { GradeService } from './services/grade.service';
import { ProgressService } from './services/progress.service';
import { ContactService } from './services/contact.service';
import { PaymentService } from './services/payment.service'; // Added PaymentService
import { ChargeService } from './services/charge.service';
import { SalaryService } from './services/salary.service';
import { IncomeAnalyticsService } from './services/income-analytics.service';
import { OutcomeAnalyticsService } from './services/outcome-analytics.service';
import { ExportService } from './services/export.service';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { AdminGuard } from './guards/admin.guard';
import { TeacherGuard } from './guards/teacher.guard';
import { StudentGuard } from './guards/student.guard';

// Interceptors
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ErrorInterceptor } from './interceptors/error.interceptor';

// Angular Material Modules
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';

// Additional Material Modules for Payment Features
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';

// Existing Components
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { UsersComponent } from './components/admin/users/users.component';
import { ClassesComponent } from './components/admin/classes/classes.component';
import { SubjectsComponent } from './components/admin/subjects/subjects.component';
import { ReportsComponent } from './components/admin/reports/reports.component';
import { SchoolsComponent } from './components/superadmin/schools/schools.component';
import { LayoutComponent } from './components/admin/layout/layout.component';
import { GradesComponent } from './components/admin/grades/grades.component';
import { ContactComponent } from './components/admin/contact/contact.component';
import { TeacherDashboardComponent } from './components/teacher/teacher-dashboard/teacher-dashboard.component';
import { ExerciseFormComponent } from './components/teacher/exercise-form/exercise-form.component';
import { TeacherLayoutComponent } from './components/teacher/teacher-layout/teacher-layout.component';
import { DashboardOverviewComponent } from './components/teacher/dashboard-overview/dashboard-overview.component';
import { TeacherSubjectsComponent } from './components/teacher/teacher-subjects/teacher-subjects.component';
import { TeacherExercisesComponent } from './components/teacher/teacher-exercises/teacher-exercises.component';
import { TeacherClassesComponent } from './components/teacher/teacher-classes/teacher-classes.component';
import { ToasterComponent } from './components/toaster/toaster.component';
import { TeacherGradesComponent } from './components/teacher/teacher-grades/teacher-grades.component';
import { StudentProgressComponent } from './components/teacher/student-progress/student-progress.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { StudentDashboardComponent } from './components/student/student-dashboard/student-dashboard.component';
import { StudentSubjectExercisesComponent } from './components/student/student-subject-exercises/student-subject-exercises.component';
import { StudentExerciseExecutionComponent } from './components/student/student-exercise-execution/student-exercise-execution.component';
import { StudentExerciseResultsComponent } from './components/student/student-exercise-results/student-exercise-results.component';
import { StudentNavbarComponent } from './components/student/student-navbar/student-navbar.component';
import { StudentGradesPageComponent } from './components/student/student-grades-page/student-grades-page.component';
import { StudentTeachersComponent } from './components/student/student-teachers/student-teachers.component';
import { NotificationComponent } from './components/admin/notification/notification.component';
import { TeacherNotificationsComponent } from './components/teacher/teacher-notifications/teacher-notifications.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { StudentLayoutComponent } from './components/student/student-layout/student-layout.component';
import { StudentNotificationsComponent } from './components/student/student-notifications/student-notifications.component';
import { StudentChatComponent } from './components/student/student-chat/student-chat.component';

// Payment Components (Added)
import { PaymentManagementComponent } from './components/admin/payment-management/payment-management.component';
import { PaymentDialogComponent } from './components/admin/payment-dialog/payment-dialog.component';
import { PaymentConfigComponent } from './components/admin/payment-config/payment-config.component';
import { FinancialOverviewComponent } from './components/admin/financial-overview/financial-overview.component';
import { InvoiceComponent } from './components/admin/invoice/invoice.component';
import { InvoiceDialogComponent } from './components/admin/invoice-dialog/invoice-dialog.component';
import { ChargesComponent } from './components/admin/charges/charges.component';
import { SalaryManagementComponent } from './components/admin/salary-management/salary-management.component';
import { IncomeAnalyticsComponent } from './components/admin/income-analytics/income-analytics.component';
import { OutcomeAnalyticsComponent } from './components/admin/outcome-analytics/outcome-analytics.component';
import { FinancialAnalyticsComponent } from './components/admin/financial-analytics/financial-analytics.component';
import { CombinedExportComponent } from './components/admin/combined-export/combined-export.component';
import { TimetableService } from './services/timetable.service';
import { ScheduleService } from './services/schedule.service';
import { ScheduleManagementComponent } from './components/admin/schedule-management/schedule-management.component';
import { TeacherScheduleComponent } from './components/teacher/teacher-schedule/teacher-schedule.component';
import { StudentScheduleComponent } from './components/student/student-schedule/student-schedule.component';



const MaterialModules = [
  MatSnackBarModule,
  MatDialogModule,
  MatProgressSpinnerModule,
  MatButtonModule,
  MatInputModule,
  MatFormFieldModule,
  MatIconModule,
  MatToolbarModule,
  MatCardModule,
  MatMenuModule,
  // Additional Material Modules for Payment Features
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatSelectModule,
  MatProgressBarModule,
  MatChipsModule,
  MatTooltipModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatTabsModule,
  MatBadgeModule,
  MatCheckboxModule,
  MatExpansionModule
];

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    LandingPageComponent,
    LoginComponent,
    DashboardComponent,
    UsersComponent,
    ClassesComponent,
    SubjectsComponent,
    ReportsComponent,
    SchoolsComponent,
    LayoutComponent,
    GradesComponent,
    ContactComponent,
    TeacherDashboardComponent,
    ExerciseFormComponent,
    TeacherLayoutComponent,
    DashboardOverviewComponent,
    TeacherSubjectsComponent,
    TeacherExercisesComponent,
    TeacherClassesComponent,
    ToasterComponent,
    TeacherGradesComponent,
    StudentProgressComponent,
    UnauthorizedComponent,
    StudentDashboardComponent,
    StudentSubjectExercisesComponent,
    StudentExerciseExecutionComponent,
    StudentExerciseResultsComponent,
    StudentNavbarComponent,
    StudentGradesPageComponent,
    StudentTeachersComponent,
    NotificationComponent,
    TeacherNotificationsComponent,
    AdminDashboardComponent,
    StudentLayoutComponent,
    StudentNotificationsComponent,
    StudentChatComponent,
    // Payment Components (Added)
    PaymentManagementComponent,
    PaymentDialogComponent,
    PaymentConfigComponent,
    FinancialOverviewComponent,
    InvoiceComponent,
    InvoiceDialogComponent,
    ChargesComponent,
    SalaryManagementComponent,
    IncomeAnalyticsComponent,
    OutcomeAnalyticsComponent,
    FinancialAnalyticsComponent,
    CombinedExportComponent,
    ScheduleManagementComponent,
    TeacherScheduleComponent,
    StudentScheduleComponent,

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot([]),
    // Material Modules
    ...MaterialModules
  ],
  providers: [
    // Services
    AuthService,
    UserService,
    SchoolService,
    SubjectService,
    ClassService,
    ExerciseService,
    GradeService,
    ProgressService,
    ContactService,
    PaymentService, // Added PaymentService
    ChargeService,
    SalaryService,
    IncomeAnalyticsService,
    OutcomeAnalyticsService,
    ExportService,
    TimetableService,
    ScheduleService,
    // Guards
    AuthGuard,
    RoleGuard,
    SuperAdminGuard,
    AdminGuard,
    TeacherGuard,
    StudentGuard,

    // Interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
