import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { SchoolService } from './services/school.service';
import { SubjectService } from './services/subject.service';
import { ClassService } from './services/class.service';
import { ExerciseService } from './services/exercise.service';
import { GradeService } from './services/grade.service';
import { ProgressService } from './services/progress.service';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { AdminGuard } from './guards/admin.guard';
import { TeacherGuard } from './guards/teacher.guard';
import { StudentGuard } from './guards/student.guard';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ErrorInterceptor } from './interceptors/error.interceptor';
import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatMenuModule } from '@angular/material/menu';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { ContactService } from './services/contact.service';
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
  MatMenuModule
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


  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule , 
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
