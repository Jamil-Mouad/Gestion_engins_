import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styles: [`
    .logout-btn:hover { background: rgba(255,255,255,0.08) !important; }
  `],
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  currentUser = this.auth.currentUser;

  logout(): void {
    this.auth.logout().pipe(
      finalize(() => this.router.navigate(['/login']))
    ).subscribe();
  }
}