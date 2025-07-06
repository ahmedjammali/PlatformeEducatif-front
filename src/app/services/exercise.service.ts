import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { Exercise, ExerciseSubmission } from '../models/exrecice.model';
import { StudentProgress } from '../models/progress.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService extends BaseService {
  private endpoint = '/exercises';

  constructor(http: HttpClient) {
    super(http);
  }

  createExercise(exercise: Partial<Exercise>): Observable<Exercise> {
    return this.http.post<{ message: string; exercise: Exercise }>(
      `${this.apiUrl}${this.endpoint}`,
      exercise
    ).pipe(map(response => response.exercise));
  }

  getExercises(filters?: { 
    classId?: string; 
    subject?: string; 
    type?: string; 
    page?: number; 
    limit?: number 
  }): Observable<{ exercises: Exercise[]; pagination: any }> {
    const params = this.buildParams(filters || {});
    return this.http.get<{ exercises: Exercise[]; pagination: any }>(
      `${this.apiUrl}${this.endpoint}`,
      { params }
    );
  }

  getExerciseById(id: string): Observable<{ exercise: Exercise; studentProgress?: StudentProgress }> {
    return this.http.get<{ exercise: Exercise; studentProgress?: StudentProgress }>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  updateExercise(id: string, updates: Partial<Exercise>): Observable<Exercise> {
    return this.http.put<{ message: string; exercise: Exercise }>(
      `${this.apiUrl}${this.endpoint}/${id}`,
      updates
    ).pipe(map(response => response.exercise));
  }

  deleteExercise(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  submitExercise(id: string, submission: ExerciseSubmission): Observable<{ message: string; progress: any }> {
    return this.http.post<{ message: string; progress: any }>(
      `${this.apiUrl}${this.endpoint}/${id}/submit`,
      submission
    );
  }

  getExerciseProgress(exerciseId: string, studentId?: string): Observable<{ progress: StudentProgress[]; totalAttempts: number }> {
    const params = studentId ? this.buildParams({ studentId }) : undefined;
    return this.http.get<{ progress: StudentProgress[]; totalAttempts: number }>(
      `${this.apiUrl}${this.endpoint}/${exerciseId}/progress`,
      { params }
    );
  }

  getExercisesBySubject(
  subjectId: string,
      filters?: { page?: number; limit?: number; difficulty?: string; status?: string }
    ): Observable<{ exercises: Exercise[]; pagination: any }> {
      const params = this.buildParams(filters || {});
      return this.http.get<{ exercises: Exercise[]; pagination: any }>(
        `${this.apiUrl}${this.endpoint}/subject/${subjectId}`,
        { params }
      );
    }



}