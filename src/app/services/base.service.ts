import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export abstract class BaseService {
  protected apiUrl = environment.apiUrl;

  constructor(protected http: HttpClient) {}

  protected buildParams(params: any): HttpParams {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });
    
    return httpParams;
  }
}