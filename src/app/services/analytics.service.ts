import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private router = inject(Router);
  private initialized = false;
  private readonly measurementId = (environment as any).googleAnalyticsId || '';

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    if (this.measurementId && this.measurementId.startsWith('G-')) {
      this.injectGoogleAnalyticsScript(this.measurementId);
      this.initialized = true;
    }

    // Escuchar cambios de ruta de Angular para registrar vistas de página automáticas
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.trackPageView(event.urlAfterRedirects);
    });
  }

  private injectGoogleAnalyticsScript(id: string) {
    if (document.getElementById('ga-script')) return;

    const script = document.createElement('script');
    script.id = 'ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false // Gestionado manualmente por las rutas SPA de Angular
    });
  }

  /**
   * Registra el cambio de ruta en la aplicación (Page View)
   */
  trackPageView(url: string) {
    if (!this.initialized || !window.gtag) return;
    window.gtag('event', 'page_view', {
      page_path: url,
      page_title: document.title
    });
  }

  /**
   * Envía un evento personalizado a Google Analytics
   */
  trackEvent(eventName: string, params: Record<string, any> = {}) {
    if (!this.initialized || !window.gtag) {
      if (!environment.production) {
        console.log(`[Analytics Event: ${eventName}]`, params);
      }
      return;
    }
    window.gtag('event', eventName, params);
  }

  /**
   * Evento: Registro de nuevo usuario
   */
  trackSignup(method: 'email' | 'google' = 'email') {
    this.trackEvent('sign_up', { method });
  }

  /**
   * Evento: Inicio de sesión
   */
  trackLogin(method: 'email' | 'google' = 'email') {
    this.trackEvent('login', { method });
  }

  /**
   * Evento: Sesión Pomodoro completada con éxito
   */
  trackFocusCompleted(durationMinutes: number, coins: number, methodology: string) {
    this.trackEvent('focus_session_completed', {
      duration_minutes: durationMinutes,
      coins_earned: coins,
      methodology: methodology
    });
  }

  /**
   * Evento: Clic en adquirir Membresía Pro
   */
  trackUpgradeProClick(plan: 'monthly' | 'annual') {
    this.trackEvent('upgrade_pro_click', { plan_type: plan });
  }
}
