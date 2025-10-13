import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private router = inject(Router);

  username = '';
  password = '';
  submitting = false;

  async onSubmit() {
    if (!this.username || !this.password) return;
    this.submitting = true;
    try {
      await new Promise((res) => setTimeout(res, 600));
      this.router.navigateByUrl('/');
    } finally {
      this.submitting = false;
    }
  }
}
