import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../core/data.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  public readonly data = inject(DataService);

  stats = this.data.stats;
  filters = this.data.getFilters();
  submissions = this.data.getSubmissions();

  toggleType(type: 'Regulatory' | 'Warning' | 'Informational', ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.data.updateTypeFilter(type, checked);
  }

  toggleStatus(status: 'Verified' | 'Pending', ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.data.updateStatusFilter(status, checked);
  }

  approve(id: string) {
    this.data.approveSubmission(id);
  }

  reject(id: string) {
    this.data.rejectSubmission(id);
  }
}
