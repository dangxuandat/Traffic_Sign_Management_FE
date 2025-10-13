import { Component, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';

@Component({
  selector: 'app-header-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  public readonly data = inject(DataService);

  query = '';
  searching = signal(false);
  suggestions = signal<{ display_name: string; lat: string; lon: string }[]>([]);

  user = this.data.getUser();

  async onSearch() {
    this.searching.set(true);
    try {
      const results = await this.data.searchAndCenter(this.query);
      this.suggestions.set(results.slice(0, 5));
    } finally {
      this.searching.set(false);
    }
  }

  onPickSuggestion(s: { display_name: string; lat: string; lon: string }) {
    this.data.centerOn(parseFloat(s.lat), parseFloat(s.lon), 15);
    this.query = s.display_name;
    this.suggestions.set([]);
  }
}
