import { Injectable, signal, computed, Pipe, PipeTransform } from '@angular/core';
import { EN } from '../i18n/en';
import { ES } from '../i18n/es';

export type SupportedLanguage = 'en' | 'es';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private static readonly STORAGE_KEY = 'procrastina-user-language';

  // Idioma reactivo: POR DEFECTO INICIA EN INGLÉS ('en') a menos que el usuario haya guardado 'es'
  currentLang = signal<SupportedLanguage>(this.getInitialLanguage());

  // Diccionario activo
  private dictionaries: Record<SupportedLanguage, any> = {
    en: EN,
    es: ES
  };

  constructor() {}

  private getInitialLanguage(): SupportedLanguage {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(TranslationService.STORAGE_KEY) as SupportedLanguage;
      if (saved === 'en' || saved === 'es') {
        return saved;
      }
    }
    // Idioma por defecto de la plataforma: INGLÉS
    return 'en';
  }

  /**
   * Cambia el idioma de toda la plataforma de forma reactiva e instantánea.
   */
  setLanguage(lang: SupportedLanguage) {
    if (lang !== 'en' && lang !== 'es') return;
    this.currentLang.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TranslationService.STORAGE_KEY, lang);
    }
  }

  /**
   * Alterna rápidamente entre inglés y español (ideal para el botón switch del Navbar).
   */
  toggleLanguage(): SupportedLanguage {
    const nextLang: SupportedLanguage = this.currentLang() === 'en' ? 'es' : 'en';
    this.setLanguage(nextLang);
    return nextLang;
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
