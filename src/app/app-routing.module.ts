import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { UsersComponent } from './components/admin/users/users.component';
import { ClassesComponent } from './components/admin/classes/classes.component';
import { SubjectsComponent } from './components/admin/subjects/subjects.component';
import { ReportsComponent } from './components/admin/reports/reports.component';
import { SchoolsComponent } from './components/superadmin/schools/schools.component';
import { ContactComponent } from './components/admin/contact/contact.component';
import { GradesComponent } from './components/admin/grades/grades.component';
import { TeacherDashboardComponent } from './components/teacher/teacher-dashboard/teacher-dashboard.component';



const routes: Routes = [
    {
    path: '',
    component: LandingPageComponent
    },
    {path: 'login', component : LoginComponent},
    {path: 'admin/dashboard', component : DashboardComponent},
    {path: 'admin/users', component : UsersComponent},
    {path: 'admin/classes', component : ClassesComponent},
    {path: 'admin/subjects', component : SubjectsComponent},
    {path: 'admin/reports', component : ReportsComponent},
    {path: 'superadmin/schools', component : SchoolsComponent},
    {path: 'admin/contact', component : ContactComponent},
    {path: 'admin/grades', component : GradesComponent},
    {path: 'teacher/dashboard', component : TeacherDashboardComponent},

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
