import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authKey = 'isAuthenticated';
  private authState = new BehaviorSubject<boolean>(false); 

  constructor(private router: Router, private ngZone: NgZone) {
    this.loadInitialAuthState();
    this.monitorAuthStateChanges();
  }

  private loadInitialAuthState(): void {
    if (typeof localStorage !== 'undefined') {
      const isAuthenticated = localStorage.getItem(this.authKey) === 'true';
      this.authState.next(isAuthenticated); 
    }
  }

  isAuthenticated(): Observable<boolean> {
    return this.authState.asObservable().pipe(distinctUntilChanged());
  }

  login(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.authKey, 'true');
    }
    this.authState.next(true);
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.authKey, 'false');
    }
    this.authState.next(false);
    this.router.navigate(['/login']);
  }

  private monitorAuthStateChanges(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.authKey) {
        this.ngZone.run(() => {
          const isAuthenticated = event.newValue === 'true';
          this.authState.next(isAuthenticated);
          if (!isAuthenticated) {
            this.router.navigate(['/login']);
          }
        });
      }
    });

    interval(1000).subscribe(() => {
      if (typeof localStorage !== 'undefined') {
        const isAuthenticated = localStorage.getItem(this.authKey) === 'true';
        if (this.authState.getValue() !== isAuthenticated) {
          this.ngZone.run(() => {
            this.authState.next(isAuthenticated);
            if (!isAuthenticated) {
              this.router.navigate(['/login']);
            }
          });
        }
      }
    });
  }
}