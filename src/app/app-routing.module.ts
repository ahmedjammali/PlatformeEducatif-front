import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { TeacherGuard } from './guards/teacher.guard';
import { StudentGuard } from './guards/student.guard';

// Admin components
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { UsersComponent } from './components/admin/users/users.component';
import { ClassesComponent } from './components/admin/classes/classes.component';
import { SubjectsComponent } from './components/admin/subjects/subjects.component';
import { ReportsComponent } from './components/admin/reports/reports.component';
import { ContactComponent } from './components/admin/contact/contact.component';
import { GradesComponent } from './components/admin/grades/grades.component';
import { NotificationComponent } from './components/admin/notification/notification.component';


// Other components
import { SchoolsComponent } from './components/superadmin/schools/schools.component';
import { TeacherDashboardComponent } from './components/teacher/teacher-dashboard/teacher-dashboard.component';
import { StudentDashboardComponent } from './components/student/student-dashboard/student-dashboard.component';
import { StudentSubjectExercisesComponent } from './components/student/student-subject-exercises/student-subject-exercises.component';
import { StudentExerciseExecutionComponent } from './components/student/student-exercise-execution/student-exercise-execution.component';
import { StudentExerciseResultsComponent } from './components/student/student-exercise-results/student-exercise-results.component';
import { StudentGradesPageComponent } from './components/student/student-grades-page/student-grades-page.component';
import { StudentTeachersComponent } from './components/student/student-teachers/student-teachers.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';

const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },

  // ADMIN ROUTES WITH LAYOUT
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [AuthGuard, AdminGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'users', component: UsersComponent },
      { path: 'classes', component: ClassesComponent },
      { path: 'subjects', component: SubjectsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'notifications', component: NotificationComponent },
      { path: 'contact', component: ContactComponent },
      { path: 'grades', component: GradesComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // SUPER ADMIN ROUTE
  {
    path: 'superadmin/schools',
    component: SchoolsComponent,
    canActivate: [AuthGuard, SuperAdminGuard]
  },

  // TEACHER ROUTE
  {
    path: 'teacher/dashboard',
    component: TeacherDashboardComponent,
    canActivate: [AuthGuard, TeacherGuard]
  },

  // STUDENT ROUTES
  {
    path: 'student/dashboard',
    component: StudentDashboardComponent,
    canActivate: [AuthGuard, StudentGuard]
  },
  {
    path: 'student/exercises/:subjectId',
    component: StudentSubjectExercisesComponent,
    canActivate: [AuthGuard, StudentGuard]
  },
  {
    path: 'student/exercise/:id',
    component: StudentExerciseExecutionComponent,
    canActivate: [AuthGuard, StudentGuard]
  },
  {
    path: 'student/exercise/:id/attempt/:attemptId',
    component: StudentExerciseResultsComponent,
    canActivate: [AuthGuard, StudentGuard]
  },
  {
    path: 'student/grades',
    component: StudentGradesPageComponent,
    canActivate: [AuthGuard, StudentGuard]
  },
  {
    path: 'student/teachers',
    component: StudentTeachersComponent,
    canActivate: [AuthGuard, StudentGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
