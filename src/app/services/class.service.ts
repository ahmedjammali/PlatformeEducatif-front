import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { Class, AssignTeacherRequest, AddStudentRequest } from '../models/class.model';
import { User } from '../models/user.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ClassService extends BaseService {
  private endpoint = '/classes';

  constructor(http: HttpClient) {
    super(http);
  }

  createClass(classData: Partial<Class>): Observable<Class> {
    return this.http.post<{ message: string; class: Class }>(
      `${this.apiUrl}${this.endpoint}`,
      classData
    ).pipe(map(response => response.class));
  }

  getClasses(filters?: { grade?: string; academicYear?: string; page?: number; limit?: number }): Observable<{ classes: Class[]; pagination: any }> {
    const params = this.buildParams(filters || {});
    return this.http.get<{ classes: Class[]; pagination: any }>(
      `${this.apiUrl}${this.endpoint}`,
      { params }
    );
  }

  getClassById(id: string): Observable<{ class: Class; statistics: any }> {
    return this.http.get<{ class: Class; statistics: any }>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  updateClass(id: string, updates: Partial<Class>): Observable<Class> {
    return this.http.put<{ message: string; class: Class }>(
      `${this.apiUrl}${this.endpoint}/${id}`,
      updates
    ).pipe(map(response => response.class));
  }

  deleteClass(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  assignTeacher(classId: string, request: AssignTeacherRequest): Observable<Class> {
    return this.http.post<{ message: string; class: Class }>(
      `${this.apiUrl}${this.endpoint}/${classId}/teachers`,
      request
    ).pipe(map(response => response.class));
  }

  removeTeacher(classId: string, teacherId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}${this.endpoint}/${classId}/teachers/${teacherId}`
    );
  }

  addStudent(classId: string, request: AddStudentRequest): Observable<Class> {
    return this.http.post<{ message: string; class: Class }>(
      `${this.apiUrl}${this.endpoint}/${classId}/students`,
      request
    ).pipe(map(response => response.class));
  }

  removeStudent(classId: string, studentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}${this.endpoint}/${classId}/students/${studentId}`
    );
  }

  getClassStudents(classId: string, page = 1, limit = 50): Observable<{ students: User[]; pagination: any }> {
    const params = this.buildParams({ page, limit });
    return this.http.get<{ students: User[]; pagination: any }>(
      `${this.apiUrl}${this.endpoint}/${classId}/students`,
      { params }
    );
  }

  getClassTeachers(classId: string): Observable<{ teachers: any[] }> {
    return this.http.get<{ teachers: any[] }>(
      `${this.apiUrl}${this.endpoint}/${classId}/teachers`
    );
  }


  getStudentClass(): Observable<{ class: any; subjects: any[] }> {
    return this.http.get<{ class: any; subjects: any[] }>(
      `${this.apiUrl}${this.endpoint}/student/my-class`
    );
  }

}
