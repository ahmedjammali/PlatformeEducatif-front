import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Contact } from '../models/contact.model';

@Injectable({
  providedIn: 'root'
})
export class ContactService {

   private apiUrl = `${environment.apiUrl}/contacts`;

  constructor(private http: HttpClient) {}

  // Create a new contact (public)
  createContact(contactData: Contact): Observable<any> {
    return this.http.post<any>(this.apiUrl, contactData);
  }

  // Get all contacts (protected)
  getAllContacts(): Observable<Contact[]> {
    return this.http.get<{data:Contact[]}>(this.apiUrl).pipe(
    map(response => response.data)
  );

  }

  getContactById(id: string): Observable<Contact> {
    return this.http.get<Contact>(`${this.apiUrl}/${id}`);
  }

  deleteContact(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }




}
