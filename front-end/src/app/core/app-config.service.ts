import { Injectable } from '@angular/core';

export interface AppConfig {
  API_BASE_URL: string;
}

declare global {
  interface Window { __env?: Partial<AppConfig>; }
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private cfg: AppConfig = {
    API_BASE_URL: (window.__env?.API_BASE_URL || 'http://localhost:3000')
  };

  get apiBaseUrl() {
    return this.cfg.API_BASE_URL; }
}
