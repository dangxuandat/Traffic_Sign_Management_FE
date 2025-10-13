import { Injectable, computed, signal } from '@angular/core';
import { TrafficSign, Submission, UserProfile, FilterState, SignType, SignStatus } from './models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly allSigns = signal<TrafficSign[]>([
    {
      id: 's1',
      lat: 40.73061,
      lng: -73.935242,
      type: 'Regulatory',
      status: 'Verified',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Stop_sign_light_red.svg/512px-Stop_sign_light_red.svg.png'
    },
    {
      id: 's2',
      lat: 40.741895,
      lng: -73.989308,
      type: 'Warning',
      status: 'Verified',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/US_warning_yellow_diamond.svg/480px-US_warning_yellow_diamond.svg.png'
    },
    {
      id: 's3',
      lat: 40.721786,
      lng: -73.999651,
      type: 'Informational',
      status: 'Pending',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Information_icon4.svg/512px-Information_icon4.svg.png'
    }
  ]);

  private readonly allSubmissions = signal<Submission[]>([
    {
      id: 'sub1',
      lat: 40.71427,
      lng: -74.00597,
      type: 'Regulatory',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Stop_sign_light_red.svg/512px-Stop_sign_light_red.svg.png',
      submittedAt: new Date().toISOString(),
      votesFor: 4,
      votesAgainst: 1
    },
    {
      id: 'sub2',
      lat: 40.758896,
      lng: -73.98513,
      type: 'Warning',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/US_warning_yellow_diamond.svg/480px-US_warning_yellow_diamond.svg.png',
      submittedAt: new Date().toISOString(),
      votesFor: 2,
      votesAgainst: 0
    }
  ]);

  private readonly user = signal<UserProfile>({ id: 'u1', name: 'Đặng Xuân Đạt', tslCoins: 240 });

  private readonly filters = signal<FilterState>({
    types: new Set<SignType>(['Regulatory', 'Warning', 'Informational']),
    statuses: new Set<SignStatus>(['Verified', 'Pending'])
  });

  // Map center state
  readonly centerLat = signal(40.73061);
  readonly centerLng = signal(-73.935242);
  readonly centerZoom = signal(12);

  readonly filteredSigns = computed(() => {
    const f = this.filters();
    return this.allSigns().filter(s => f.types.has(s.type) && f.statuses.has(s.status));
  });

  readonly stats = computed(() => {
    const signs = this.allSigns();
    const totalVerified = signs.filter(s => s.status === 'Verified').length;
    const pending = this.allSubmissions().length + signs.filter(s => s.status === 'Pending').length;
    const activeUsers = 128; // demo value
    return { totalVerified, pending, activeUsers };
  });

  getUser() {
    return this.user.asReadonly();
  }

  getFilters() {
    return this.filters.asReadonly();
  }

  updateTypeFilter(type: SignType, checked: boolean) {
    const next = new Set(this.filters().types);
    if (checked) next.add(type); else next.delete(type);
    this.filters.set({ ...this.filters(), types: next });
  }

  updateStatusFilter(status: SignStatus, checked: boolean) {
    const next = new Set(this.filters().statuses);
    if (checked) next.add(status); else next.delete(status);
    this.filters.set({ ...this.filters(), statuses: next });
  }

  getSubmissions() {
    return this.allSubmissions.asReadonly();
  }

  voteOnSubmission(id: string, approve: boolean) {
    const updated = this.allSubmissions().map(s => s.id === id ? {
      ...s,
      votesFor: approve ? s.votesFor + 1 : s.votesFor,
      votesAgainst: !approve ? s.votesAgainst + 1 : s.votesAgainst
    } : s);
    this.allSubmissions.set(updated);
  }

  approveSubmission(id: string) {
    const sub = this.allSubmissions().find(s => s.id === id);
    if (!sub) return;
    this.allSubmissions.set(this.allSubmissions().filter(s => s.id !== id));
    // add to signs as verified
    this.allSigns.set([
      ...this.allSigns(),
      {
        id: `s-${id}`,
        lat: sub.lat,
        lng: sub.lng,
        type: sub.type,
        status: 'Verified',
        imageUrl: sub.imageUrl
      }
    ]);
  }

  rejectSubmission(id: string) {
    this.allSubmissions.set(this.allSubmissions().filter(s => s.id !== id));
  }

  addNewSign(sign: Omit<TrafficSign, 'id' | 'status'> & { status?: SignStatus }) {
    const newId = `s${Date.now()}`;
    this.allSigns.set([...this.allSigns(), { id: newId, status: sign.status ?? 'Pending', ...sign }]);
  }

  // Nominatim geocoding
  async searchAndCenter(query: string) {
    if (!query.trim()) return [] as { display_name: string; lat: string; lon: string }[];
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const results = await resp.json();
    if (results && results.length) {
      const first = results[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);
      this.centerLat.set(lat);
      this.centerLng.set(lon);
      this.centerZoom.set(15);
    }
    return results as { display_name: string; lat: string; lon: string }[];
  }

  centerOn(lat: number, lng: number, zoom = 15) {
    this.centerLat.set(lat);
    this.centerLng.set(lng);
    this.centerZoom.set(zoom);
  }
}
