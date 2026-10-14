import { Injectable, signal, computed, Pipe, PipeTransform } from '@angular/core';
import { EN } from '../i18n/en';
import { ES } from '../i18n/es';

export type SupportedLanguage = 'en' | 'es';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  public static readonly STORAGE_KEY = 'procrastina-user-language';
  public static readonly MANUAL_CHOICE_KEY = 'procrastina-manual-language-choice';

  // Idioma reactivo: detecta navegador o inicia en español ('es') a menos que el usuario haya seleccionado otro
  currentLang = signal<SupportedLanguage>(this.getInitialLanguage());

  // Diccionario activo
  private dictionaries: Record<SupportedLanguage, any> = {
    en: EN,
    es: ES
  };

  constructor() {}

  /**
   * Detecta y retorna estrictamente el idioma del navegador ('es' o 'en').
   * Si el navegador está configurado en español (es, es-MX, es-ES, es-419, etc.) -> 'es'
   * Si el navegador está en inglés (en, en-US, etc.) -> 'en'
   * Por defecto -> 'es'
   */
  getBrowserLanguage(): SupportedLanguage {
    if (typeof navigator !== 'undefined') {
      const navLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
      if (navLang.startsWith('en')) {
        return 'en';
      }
      if (navLang.startsWith('es')) {
        return 'es';
      }
    }
    return 'es';
  }

  private getInitialLanguage(): SupportedLanguage {
    if (typeof localStorage !== 'undefined') {
      const manual = localStorage.getItem(TranslationService.MANUAL_CHOICE_KEY) as SupportedLanguage;
      if (manual === 'en' || manual === 'es') {
        return manual;
      }
      const saved = localStorage.getItem(TranslationService.STORAGE_KEY) as SupportedLanguage;
      if (saved === 'en' || saved === 'es') {
        return saved;
      }
    }
    return this.getBrowserLanguage();
  }

  /**
   * Cambia el idioma de toda la plataforma de forma reactiva e instantánea.
   */
  setLanguage(lang: SupportedLanguage, isManual: boolean = false) {
    if (lang !== 'en' && lang !== 'es') return;
    this.currentLang.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TranslationService.STORAGE_KEY, lang);
      if (isManual) {
        localStorage.setItem(TranslationService.MANUAL_CHOICE_KEY, lang);
      }
    }
  }

  /**
   * Alterna rápidamente entre inglés y español (ideal para el botón switch del Navbar).
   */
  toggleLanguage(): SupportedLanguage {
    const nextLang: SupportedLanguage = this.currentLang() === 'en' ? 'es' : 'en';
    this.setLanguage(nextLang, true);
    return nextLang;
  }

  /**
   * Aplica y fuerza el idioma según el navegador (usado estrictamente en login/registro).
   */
  applyBrowserLanguage(): SupportedLanguage {
    const browserLang = this.getBrowserLanguage();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TranslationService.MANUAL_CHOICE_KEY);
    }
    this.setLanguage(browserLang, false);
    return browserLang;
  }

  /**
   * Obtiene la traducción de una clave anidada (ej. 'nav.focus', 'common.save').
   */
  t(path: string, params?: Record<string, any>): string {
    const lang = this.currentLang();
    const dict = this.dictionaries[lang] || EN;
    const fallbackDict = EN;

    const resolve = (d: any) => {
      const parts = path.split('.');
      let current = d;
      for (const part of parts) {
        if (!current || typeof current !== 'object') return null;
        current = current[part];
      }
      return typeof current === 'string' ? current : null;
    };

    let text = resolve(dict) || resolve(fallbackDict) || path;

    if (params) {
      for (const [key, val] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${key}}`, 'g'), String(val));
      }
    }

    return text;
  }
}

/**
 * Pipe standalone para usar en plantillas HTML de Angular:
 * {{ 'nav.focus' | translate }}
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Pure false para reevaluar reactivamente al cambiar la señal de idioma
})
export class TranslatePipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  transform(key: string, params?: Record<string, any>): string {
    if (!key) return '';
    return this.translationService.t(key, params);
  }
}
