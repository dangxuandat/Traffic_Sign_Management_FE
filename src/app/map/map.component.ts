import { AfterViewInit, Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { DataService } from '../core/data.service';
import { TrafficSign } from '../core/models';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private markers = new Map<string, L.Marker>();
  private data = inject(DataService);

  private iconByType: Record<string, L.Icon> = {
    Regulatory: L.icon({ iconUrl: 'assets/icons/regulatory.svg', iconSize: [28, 28], iconAnchor: [14, 14] }),
    Warning: L.icon({ iconUrl: 'assets/icons/warning.svg', iconSize: [28, 28], iconAnchor: [14, 14] }),
    Informational: L.icon({ iconUrl: 'assets/icons/informational.svg', iconSize: [28, 28], iconAnchor: [14, 14] })
  };

  private cleanup: (() => void)[] = [];

  ngAfterViewInit() {
    this.map = L.map('tsl-map', {
      center: [this.data.centerLat(), this.data.centerLng()],
      zoom: this.data.centerZoom(),
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.renderMarkers(this.data.filteredSigns());

    this.cleanup.push(effect(() => {
      this.map!.setView([this.data.centerLat(), this.data.centerLng()], this.data.centerZoom());
    }));

    this.cleanup.push(effect(() => {
      this.renderMarkers(this.data.filteredSigns());
    }));

    this.addLocateControl();
  }

  ngOnDestroy(): void {
    this.cleanup.forEach(fn => fn());
    this.map?.remove();
  }

  private renderMarkers(signs: TrafficSign[]) {
    if (!this.map) return;
    const existingIds = new Set(this.markers.keys());
    for (const sign of signs) {
      if (!this.markers.has(sign.id)) {
        const marker = L.marker([sign.lat, sign.lng], { icon: this.iconByType[sign.type] });
        marker.bindPopup(this.popupContent(sign));
        marker.addTo(this.map);
        this.markers.set(sign.id, marker);
      } else {
        existingIds.delete(sign.id);
      }
    }
    // remove markers no longer in filtered set
    for (const id of existingIds) {
      const m = this.markers.get(id);
      if (m) {
        this.map.removeLayer(m);
        this.markers.delete(id);
      }
    }
  }

  private popupContent(sign: TrafficSign) {
    const badgeColor = sign.status === 'Verified' ? '#18a957' : '#f59e0b';
    const badgeText = sign.status;
    return `
      <div class="popup-card">
        <div class="popup-header">
          <span class="popup-type">${sign.type}</span>
          <span class="popup-status" style="background:${badgeColor};color:#fff;padding:2px 6px;border-radius:999px;font-size:11px">${badgeText}</span>
        </div>
        <img src="${sign.imageUrl}" alt="${sign.type} sign" class="popup-image"/>
      </div>
    `;
  }

  private addLocateControl() {
    if (!this.map) return;
    const locateControl = L.control({ position: 'topleft' });
    locateControl.onAdd = () => {
      const btn = L.DomUtil.create('button', 'locate-button');
      btn.title = 'Center on my location';
      btn.innerText = '◎';
      btn.onclick = (e) => {
        e.preventDefault();
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
          this.data.centerOn(pos.coords.latitude, pos.coords.longitude, 16);
        });
      };
      return btn;
    };
    locateControl.addTo(this.map);
  }
}
