import { Component, OnInit, signal, computed, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MembershipService, AvatarItem, QualityItem, ALL_AVATARS_LIST } from '../../services/membership.service';
import { Navbar } from '../../components/navbar/navbar';
import { TranslatePipe, TranslationService } from '../../services/translation.service';

export type GuardianArchetype = 'Inicial' | 'Cualidad' | 'Cazador' | 'Alto Riesgo' | string;

export interface ComunidadAvatar {
  id: string;
  name: string;
  species: string;
  type: 'inicial' | 'cualidad' | 'especial' | 'legendario';
  tier: 'Común' | 'Raro' | 'Épico' | 'Legendario';
  archetype: GuardianArchetype;
  archetypeBadge: string;
  stars: number;
  emoji: string;
  color: string;
  role: string;
  weaponName: string;
  focusApplication: string;
  tacticalQuote: string;
  coinsPerPomodoro: number;
  pausePenaltyCoins: number;
  bossDamagePoints: number;
  bossHealPoints: number;
  passiveName: string;
  passiveAdvantage: string;
  cost: number;
  qualityId: string | null;
  qualityName?: string;
  displayName?: string;
  qualityReq?: string;
  unlockTotal?: number;
  isUnlocked?: boolean;
  quality?: QualityItem | null;
  displayReq?: string;
  hasEvolution?: boolean;
  evolutionDetail?: EvolutionDetail;
  isPremium?: boolean;
  unlockType?: 'free' | 'merit' | 'coins' | 'premium';
}

export interface EvolutionDetail {
  relicName: { es: string; en: string };
  mysteryForm: { es: string; en: string };
  icon: string;
  color: string;
  relicDesc: { es: string; en: string };
  performanceHint: { es: string; en: string };
}

export const EVOLUTION_ITEMS_MAP: Record<string, EvolutionDetail> = {
  tortuga: {
    relicName: { es: 'Núcleo Telúrico de Adamantina', en: 'Adamantine Telluric Core' },
    mysteryForm: { es: '??? [Guardián de Égida Ancestral]', en: '??? [Ancestral Aegis Guardian]' },
    icon: 'fa-solid fa-shield-halved',
    color: '#10b981',
    relicDesc: {
      es: 'Gema mineral milenaria que almacena el temple de las rachas ininterrumpidas. Resuena con una paciencia inquebrantable.',
      en: 'Ancient mineral gem storing the temper of unbroken streaks. Resonates with unshakable patience.'
    },
    performanceHint: {
      es: 'Evolucionará según el desempeño de su portador: sostén rachas prolongadas de días consecutivos y protege tu constancia.',
      en: 'Will evolve based on the bearer\'s performance: sustain prolonged daily streaks and protect your consistency.'
    }
  },
  buho: {
    relicName: { es: 'Prisma Óptico de la Razón Trascendente', en: 'Optical Prism of Transcendent Reason' },
    mysteryForm: { es: '??? [Arconte del Ojo Omnisciente]', en: '??? [Archon of the All-Seeing Eye]' },
    icon: 'fa-solid fa-eye',
    color: '#38bdf8',
    relicDesc: {
      es: 'Lente prismático capaz de refractar las metas complejas en su esencia pura 80/20. Reacciona a la claridad analítica extrema.',
      en: 'Prismatic lens decoding complex goals into pure 80/20 essence. Reacts to extreme analytical clarity.'
    },
    performanceHint: {
      es: 'Evolucionará según el desempeño de su portador: domina sesiones de hiperenfoque táctico y análisis sin titubeos.',
      en: 'Will evolve based on the bearer\'s performance: master high-demand tactical focus and analytical sessions.'
    }
  },
  zorro: {
    relicName: { es: 'Amuleto de las Siete Sombras', en: 'Amulet of the Seven Shadows' },
    mysteryForm: { es: '??? [Kitsune de las Sombras Astrales]', en: '??? [Astral Shadow Kitsune]' },
    icon: 'fa-solid fa-mask',
    color: '#f59e0b',
    relicDesc: {
      es: 'Reliquia sigilosa tejida con hilos de sombra. Canaliza el flujo de trabajo continuo esquivando cualquier interrupción externa.',
      en: 'Stealth relic woven with shadow threads. Channels continuous workflow while evading any disruption.'
    },
    performanceHint: {
      es: 'Evolucionará según el desempeño de su portador: completa sprints de enfoque veloz y respeta al segundo tus pausas.',
      en: 'Will evolve based on the bearer\'s performance: complete rapid focus sprints and strictly respect timed breaks.'
    }
  },
  dragon: {
    relicName: { es: 'Corazón de Plasma Primordial', en: 'Primordial Plasma Heart' },
    mysteryForm: { es: '??? [Dragón Soberano del Vacío]', en: '??? [Void Sovereign Dragon]' },
    icon: 'fa-solid fa-fire-flame-curved',
    color: '#ef4444',
    relicDesc: {
      es: 'Núcleo termonuclear de una estrella ancestral. Libera un calor avasallador cuando el portador entra en flujo total.',
      en: 'Thermonuclear core of an ancestral star. Releases overwhelming heat when the bearer enters total flow.'
    },
    performanceHint: {
      es: 'Evolucionará según el desempeño de su portador: asesta golpes devastadores y acumula daño crítico masivo contra el Jefe.',
      en: 'Will evolve based on the bearer\'s performance: land devastating blows and accumulate massive boss damage.'
    }
  },
  lobo: {
    relicName: { es: 'Colmillo Rúnico del Alfa Solitario', en: 'Runic Fang of the Lone Alpha' },
    mysteryForm: { es: '??? [Fenrir Hoja de Tormenta]', en: '??? [Stormblade Fenrir]' },
    icon: 'fa-solid fa-moon',
    color: '#818cf8',
    relicDesc: {
      es: 'Forjado en tundras boreales con acero lunar. Resuena con el código de honor de quien jamás se rinde a mitad de camino.',
      en: 'Forged in boreal tundras with lunar steel. Resonates with the honor code of someone who never gives up halfway.'
    },
    performanceHint: {
      es: 'Evolucionará según el desempeño de su portador: encadena bloques Pomodoro perfectos con cero pausas y cero abandonos.',
      en: 'Will evolve based on the bearer\'s performance: chain perfect Pomodoro blocks with zero pauses and zero abandonments.'
    }
  },
  rana: {
    relicName: { es: 'Loto Cuántico del Pantano Abisal', en: 'Quantum Lotus of the Abyssal Mire' },
    mysteryForm: { es: '??? [Deidad del Salto Cuántico]', en: '??? [Quantum Leap Deity]' },
    icon: 'fa-solid fa-spa',
    color: '#22c55e',
    relicDesc: {
      es: 'Flor bio-luminiscente que florece únicamente tras conquistar la tarea más temida y postergada de la jornada.',
      en: 'Bioluminescent blossom that only flowers after conquering the most dreaded, procrastinated task of the day.'
    },
    performanceHint: {
      es: 'Evolucionará según el desempeño de su portador: liquida tus objetivos prioritarios (método Sapo) al inicio del día.',
      en: 'Will evolve based on the bearer\'s performance: conquer your priority targets (Eat the Frog) first thing each day.'
    }
  },
  leon: {
    relicName: { es: 'Corona de Asedio del Emperador Solar', en: 'Siege Crown of the Solar Emperor' },
    mysteryForm: { es: '??? [Soberano de la Melena Eterna]', en: '??? [Eternal Mane Sovereign]' },
    icon: 'fa-solid fa-crown',
    color: '#eab308',
    relicDesc: {
      es: 'Insignia regia forjada en oro solar flamígero. Confiere un aura de liderazgo indiscutible ante cualquier desafío colosal.',
      en: 'Regal insignia forged in blazing solar gold. Grants an aura of undeniable leadership against any colossal challenge.'
    },
    performanceHint: {
      es: 'Evolucionará según el desempeño de su portador: lidera las tablas de productividad y asesta el golpe final al Jefe.',
      en: 'Will evolve based on the bearer\'s performance: lead the productivity leaderboards and strike the boss.'
    }
  }
};

export interface AvatarCategoryGroup {
  type: string;
  name: string;
  badge: string;
  icon: string;
  color: string;
  avatars: ComunidadAvatar[];
}

interface CountryOption {
  name: string;
  code: string;
  flag: string;
}

@Component({
  selector: 'app-cualidades',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, TranslatePipe],
  template: `
    <app-navbar></app-navbar>

    <div class="profile-page-wrapper">
      <div class="profile-layout-container">
        
        <!-- ==================================================== -->
        <!-- 0. CABECERA PRINCIPAL DE LA VISTA                   -->
        <!-- ==================================================== -->
        <div class="profile-page-header">
          <h1 class="profile-page-title">{{ 'cualidades.myProfile' | translate }}</h1>
          <p class="profile-page-subtitle">{{ 'cualidades.profileSubtitle' | translate }}</p>
        </div>

        <!-- ==================================================== -->
        <!-- 1. SECCIÓN SUPERIOR: PERFIL STRATIS (PERFIL.WEBP)    -->
        <!-- ==================================================== -->
        <div class="profile-upper-container">
          
          <!-- TARJETA PRINCIPAL DE PERFIL -->
          <div class="stratis-profile-card">
            <!-- BANNER SUPERIOR CON AURA Y FONDO DINÁMICO -->
            <div class="profile-banner-cover" 
                 [style.background]="'linear-gradient(135deg, ' + activeAvatar().color + '44 0%, ' + activeAvatar().color + '18 45%, rgba(15, 23, 42, 0.95) 100%), #141928'">
              <div class="avatar-backdrop-aura" [style.background]="'radial-gradient(circle at 80px 140px, ' + activeAvatar().color + '88 0%, ' + activeAvatar().color + '22 50%, transparent 70%)'"></div>
              <div class="banner-overlay-pattern" [style.background]="'radial-gradient(circle at 85% 25%, ' + activeAvatar().color + '33 0%, transparent 65%)'"></div>
              
              <span class="plan-status-pill" [class.is-pro]="membership.isPremium()">
                {{ membership.isPremium() ? ('nav.planPro' | translate) : ('nav.planBasic' | translate) }}
              </span>
            </div>

            <!-- CUERPO DE PERFIL CON AVATAR CIRCULAR SUPERPUESTO -->
            <div class="profile-body-content">
              
              <div class="avatar-overlapping-wrapper">
                <div class="round-avatar-frame" 
                     (mousemove)="onHeaderAvatarMouseMove($event)"
                     (mouseleave)="onHeaderAvatarMouseLeave()"
                     [style.border-color]="activeAvatar().color"
                     [style.background]="'radial-gradient(circle at center, ' + activeAvatar().color + '55 0%, ' + activeAvatar().color + '1a 60%, #121620 90%)'"
                     [style.box-shadow]="'0 10px 30px rgba(0, 0, 0, 0.6), 0 0 30px ' + activeAvatar().color + '66'">
                  <div [class]="'avatar-sprite sprite-circle sprite-' + membership.selectedAvatar()"
                       [style.transform-origin]="headerAvatarZoomOrigin()"></div>
                </div>
                <button class="avatar-circle-edit-btn" 
                        (click)="toggleEditProfile()" 
                        [title]="'cualidades.editProfileTooltip' | translate"
                        [style.background]="'linear-gradient(135deg, ' + activeAvatar().color + ', ' + activeAvatar().color + 'bb)'"
                        [style.box-shadow]="'0 4px 12px rgba(0, 0, 0, 0.5), 0 0 14px ' + activeAvatar().color + '88'">
                  <i class="fa-solid fa-pencil"></i>
                </button>
              </div>

              <div class="user-details-row">
                <div class="user-primary-info">
                  <div class="user-name-title-row">
                    <h1 class="user-display-name">{{ membership.userName() }}</h1>
                  </div>

                  @if (hasCustomIdentity()) {
                    <div class="user-identity-metadata">
                      @if (membership.userProfession()) {
                        <span class="identity-chip profession-chip">
                          <i class="fa-solid fa-briefcase"></i>
                          <span>{{ getCleanProfession() }}</span>
                        </span>
                      } @else {
                        <button class="btn-add-chip" (click)="toggleEditProfile()" [title]="'cualidades.addProfession' | translate">
                          <i class="fa-solid fa-plus"></i> {{ 'cualidades.addProfession' | translate }}
                        </button>
                      }

                      @if (membership.userCountry()) {
                        <span class="identity-chip country-chip">
                          <span class="country-flag-icon">{{ getCountryFlag(membership.userCountry()) }}</span>
                          <span>{{ getCleanCountry() }}</span>
                        </span>
                      } @else {
                        <button class="btn-add-chip" (click)="toggleEditProfile()" [title]="'cualidades.addCountry' | translate">
                          <i class="fa-solid fa-plus"></i> {{ 'cualidades.addCountry' | translate }}
                        </button>
                      }
                    </div>
                  } @else {
                    <div class="user-unconfigured-cta">
                      <button class="btn-complete-profile" (click)="toggleEditProfile()">
                        <i class="fa-solid fa-wand-magic-sparkles text-accent"></i>
                        <span>{{ 'cualidades.completeProfileCta' | translate }}</span>
                      </button>
                    </div>
                  }

                  <div class="user-active-week-line">
                    <span class="active-days-chip" [title]="'cualidades.activeDaysLabel' | translate">
                      <i class="fa-regular fa-calendar-check"></i>
                      <span class="active-days-label">{{ 'cualidades.activeDaysLabel' | translate }}</span>
                      <strong class="active-days-value">{{ membership.getActiveDaysSummary() }}</strong>
                    </span>

                    <span class="last-focus-date-chip" [title]="getFormattedLastFocusText()">
                      <i class="fa-regular fa-clock"></i>
                      <span>{{ getFormattedLastFocusText() }}</span>
                    </span>
                  </div>
                </div>

                <!-- TELEMETRÍA EN LÍNEA (HISTÓRICOS) -->
                <div class="user-inline-telemetry">
                  <div class="tele-pill tomato-pill" [class.is-zero]="membership.focusTomatoes() === 0" [attr.data-tooltip]="'cualidades.totalTomatoes' | translate">
                    <span class="tele-icon">🍅</span>
                    <span class="tele-num">{{ membership.focusTomatoes() }}</span>
                  </div>

                  <div class="tele-pill objective-pill" [class.is-zero]="membership.completedObjectives() === 0" [attr.data-tooltip]="'cualidades.totalObjectives' | translate">
                    <span class="tele-icon">🎯</span>
                    <span class="tele-num">{{ membership.completedObjectives() }}</span>
                  </div>

                  <div class="tele-pill trophy-pill gold-pill" [class.is-zero]="membership.goldMedals() === 0" [attr.data-tooltip]="'cualidades.goldTrophies' | translate">
                    <span class="tele-icon"><i class="fa-solid fa-trophy"></i></span>
                    <span class="tele-num">{{ membership.goldMedals() }}</span>
                  </div>

                  <div class="tele-pill medal-pill silver-pill" [class.is-zero]="membership.silverMedals() === 0" [attr.data-tooltip]="'cualidades.silverMedals' | translate">
                    <span class="tele-icon"><i class="fa-solid fa-medal"></i></span>
                    <span class="tele-num">{{ membership.silverMedals() }}</span>
                  </div>

                  <div class="tele-pill medal-pill bronze-pill" [class.is-zero]="membership.bronzeMedals() === 0" [attr.data-tooltip]="'cualidades.bronzeMedals' | translate">
                    <span class="tele-icon"><i class="fa-solid fa-medal"></i></span>
                    <span class="tele-num">{{ membership.bronzeMedals() }}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- CARD DE CUALIDADES DE HONOR (SKILLS PILLS) -->
          <div class="stratis-skills-card">
            <div class="skills-bar-container">
              <div class="skills-lead-indicator" [title]="'cualidades.honorQualities' | translate">
                <i class="fa-solid fa-award"></i>
                <span class="skills-counter-badge">{{ getUnlockedQualitiesCount() }}/{{ membership.qualitiesCatalog().length }}</span>
              </div>

              <div class="skills-pills-matrix">
                <div 
                  *ngFor="let q of membership.qualitiesCatalog()" 
                  class="quality-skill-pill"
                  [class.is-unlocked]="q.isUnlocked"
                  [title]="q.name + (q.isUnlocked ? ' (Desbloqueada)' : ': ' + q.unlockRequirement)"
                  (click)="handleQualityPillClick(q)"
                >
                  <span class="pill-icon" *ngIf="q.isUnlocked">{{ membership.getEmoji(q.animal) }}</span>
                  <span class="pill-icon locked-icon" *ngIf="!q.isUnlocked"><i class="fa-solid fa-lock"></i></span>
                  <span class="pill-name">{{ q.name }}</span>
                  <span class="pill-status-dot" *ngIf="q.isUnlocked">✓</span>
                  <span class="pill-progress-tag" *ngIf="!q.isUnlocked">{{ q.unlockProgress }}/{{ q.unlockTotal }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ==================================================== -->
        <!-- 2. SECCIÓN: CUADRÍCULA DE AVATARES Y DETALLE         -->
        <!-- ==================================================== -->
        <div class="guardian-selection-dashboard">
          
          <!-- COLUMNA IZQUIERDA: CATÁLOGO EN CUADRÍCULA -->
          <div class="avatars-catalog-column">
            
            <div class="catalog-header-bar">
              <div class="catalog-title-group">
                <span class="catalog-subtag">{{ 'cualidades.catalogTag' | translate }}</span>
                <h2 class="catalog-main-title">{{ 'cualidades.catalogTitle' | translate }}</h2>
              </div>

              <!-- CONTROLES: FILTROS DE CATEGORÍA -->
              <div class="category-filter-chips">
                <button (click)="setFilter('todos')" [class.active]="selectedCategory() === 'todos'">{{ 'cualidades.filterAll' | translate }} ({{ allAvatars().length }})</button>
                <button (click)="setFilter('desbloqueados')" [class.active]="selectedCategory() === 'desbloqueados'">{{ 'cualidades.filterSquad' | translate }} ({{ getUnlockedAvatarsCount() }})</button>
                <button (click)="setFilter('inicial')" [class.active]="selectedCategory() === 'inicial'">{{ 'cualidades.filterInitial' | translate }}</button>
                <button (click)="setFilter('cualidad')" [class.active]="selectedCategory() === 'cualidad'">{{ 'cualidades.filterChallenges' | translate }}</button>
                <button (click)="setFilter('especial')" [class.active]="selectedCategory() === 'especial'">{{ 'cualidades.filterHunters' | translate }}</button>
                <button (click)="setFilter('legendario')" [class.active]="selectedCategory() === 'legendario'">{{ 'cualidades.filterLegendaries' | translate }}</button>
              </div>
            </div>

            <!-- GRID DE CARTAS DE AVATARES CON SEPARADOR POR CATEGORÍA -->
            <div class="avatars-catalog-scrollable">
              <div *ngFor="let group of groupedAvatars()" class="avatar-category-section">
                <!-- CABECERA DIFERENCIADORA DE CATEGORÍA -->
                <div class="avatar-category-divider">
                  <div class="category-divider-line"></div>
                  <div class="category-divider-badge" [style.--group-color]="group.color">
                    <i [class]="group.icon"></i>
                    <span class="category-divider-title">{{ group.name }}</span>
                    <span class="category-divider-count">({{ group.avatars.length }})</span>
                  </div>
                  <div class="category-divider-line"></div>
                </div>

                <!-- GRID DE CARTAS DE LA CATEGORÍA -->
                <div class="avatars-grid-container">
                  <div 
                    *ngFor="let avatar of group.avatars"
                    (click)="selectAvatar(avatar)"
                    class="vertical-hero-card"
                    [class.is-active]="inspectedAvatar().id === avatar.id"
                    [class.is-equipped]="membership.selectedAvatar() === avatar.id"
                    [class.is-locked]="!avatar.isUnlocked"
                    [class.has-evo-rail]="avatar.hasEvolution"
                    [style.--card-theme]="avatar.color"
                  >
                    <!-- LÍNEA LUMINOSA QUE RECORRE EL BORDE DE LA CARD CADA 1 MINUTO -->
                    <svg class="card-border-travel-beam" *ngIf="avatar.hasEvolution" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <rect x="0.8" y="0.6" width="98.4" height="98.8" rx="10.5" ry="7.5" pathLength="100" />
                    </svg>

                    <!-- ITEM VERTICAL DE EVOLUCIÓN (LARGO COMPLETO DE LA CARD) -->
                    <div class="card-vertical-evo-rail" *ngIf="avatar.hasEvolution" [title]="'cualidades.evoTooltip' | translate">
                      <div class="evo-rail-glow"></div>
                      <div class="evo-rail-track">
                        <i class="fa-solid fa-dna evo-rail-icon"></i>
                        <span class="evo-rail-text">EVOLUCIÓN</span>
                        <span class="evo-rail-sparkle">✦</span>
                      </div>
                    </div>

                    <!-- AURA DE FONDO -->
                    <div class="hero-card-glow" [style.background]="'radial-gradient(circle at 50% 30%, ' + avatar.color + '55 0%, transparent 75%)'"></div>
                    
                    <!-- BADGES SUPERIORES -->
                    <div class="hero-card-top-badges">
                      <div class="top-badges-left">
                        <span class="card-tier-pill" [class]="'tier-' + avatar.tier.toLowerCase()">
                          ★ {{ avatar.tier }}
                        </span>
                      </div>

                      <div class="top-badges-right">
                        <!-- BADGE TIPO DE DESBLOQUEO (PRO / MONEDAS / RETO) -->
                        <span *ngIf="avatar.unlockType === 'premium'" class="card-unlock-pill pill-premium" [class.is-unlocked]="avatar.isUnlocked" [title]="'cualidades.vipExclusive' | translate">
                          <i class="fa-solid fa-crown"></i> PRO
                        </span>
                        <span *ngIf="avatar.unlockType === 'coins'" class="card-unlock-pill pill-coins" [class.is-unlocked]="avatar.isUnlocked" [title]="avatar.cost + ' Pro Coins'">
                          <i class="fa-solid fa-coins"></i> {{ avatar.cost }}
                        </span>
                        <span *ngIf="avatar.unlockType === 'merit'" class="card-unlock-pill pill-merit" [class.is-unlocked]="avatar.isUnlocked" [title]="'cualidades.meritBadge' | translate">
                          <i class="fa-solid fa-award"></i> RETO
                        </span>
                        
                        <span class="card-state-pill" *ngIf="membership.selectedAvatar() === avatar.id" [title]="'common.active' | translate">
                          <i class="fa-solid fa-shield-check"></i>
                        </span>
                      </div>
                    </div>

                    <!-- SPRITE DEL PERSONAJE DENTRO DE LA CARTA (EN B&N / SIN COLOR) -->
                    <div class="hero-card-artwork-frame">
                      <div [class]="'avatar-sprite hero-card-sprite sprite-' + avatar.id" [class.is-locked-sprite]="!avatar.isUnlocked"></div>
                    </div>

                    <!-- OVERLAY INFERIOR CON NOMBRE Y STATUS -->
                    <div class="hero-card-footer-glass">
                      <h4 class="hero-card-name">{{ avatar.name }}</h4>
                      
                      <div class="hero-card-status-strip">
                        <span *ngIf="membership.selectedAvatar() === avatar.id" class="status-active">{{ 'cualidades.statusActive' | translate }}</span>
                        <span *ngIf="membership.selectedAvatar() !== avatar.id && avatar.isUnlocked" class="status-squad">{{ 'cualidades.statusSquad' | translate }}</span>
                        <span *ngIf="!avatar.isUnlocked" class="status-locked">{{ 'cualidades.statusLocked' | translate }}</span>
                      </div>
                    </div>

                    <!-- INDICADOR SELECCIONADO -->
                    <div class="active-card-indicator" *ngIf="inspectedAvatar().id === avatar.id">
                      <div class="indicator-glow-dot"></div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- COLUMNA DERECHA: PANEL DE DETALLE DEL AVATAR -->
          <div class="avatar-detail-column">
            
            <div class="clean-spotlight-card">
              
              <!-- 1. HERO HEADER INTEGRADO CON AVATAR DESTACADO / GIGANTE -->
              <div class="detail-hero-header">
                <!-- AURA AMBIENTAL DINÁMICA -->
                <div class="hero-ambient-glow" [style.background]="'radial-gradient(circle at 50% 38%, ' + (inspectedAvatar().isUnlocked ? inspectedAvatar().color : '#64748b') + '25 0%, transparent 70%)'"></div>

                <!-- TOP ROW CON RAREZA Y ESTADO -->
                <div class="hero-top-badges-bar">
                  <div class="hero-stars-pill" [title]="'cualidades.tierAndRarity' | translate">
                    <i *ngFor="let s of [1,2,3,4,5]" 
                       class="fa-solid fa-star" 
                       [class.is-lit]="s <= inspectedAvatar().stars"></i>
                    <span class="hero-tier-name">{{ inspectedAvatar().tier }}</span>
                  </div>

                  <span class="hero-state-pill" 
                        [class.is-active]="membership.selectedAvatar() === inspectedAvatar().id"
                        [class.is-unlocked]="inspectedAvatar().isUnlocked && membership.selectedAvatar() !== inspectedAvatar().id"
                        [class.is-locked]="!inspectedAvatar().isUnlocked">
                    <i [class]="membership.selectedAvatar() === inspectedAvatar().id ? 'fa-solid fa-circle-check' : (inspectedAvatar().isUnlocked ? 'fa-solid fa-shield-cat' : 'fa-solid fa-lock')"></i>
                    {{ membership.selectedAvatar() === inspectedAvatar().id ? ('common.active' | translate) : (inspectedAvatar().isUnlocked ? ('cualidades.filterSquad' | translate) : ('common.locked' | translate)) }}
                  </span>
                </div>

                <!-- AVATAR PORTRAIT GIGANTE DESTACADO EN EL DETALLE CON HOVER ZOOM -->
                <div class="hero-showcase-wrapper">
                  <div class="hero-portrait-frame" 
                       (mousemove)="inspectedAvatar().isUnlocked ? onPortraitMouseMove($event) : null"
                       (mouseleave)="inspectedAvatar().isUnlocked ? onPortraitMouseLeave() : null"
                       [class.is-locked-dock]="!inspectedAvatar().isUnlocked"
                       [style.border-color]="inspectedAvatar().isUnlocked ? inspectedAvatar().color : 'rgba(255,255,255,0.18)'"
                       [style.box-shadow]="'0 18px 44px rgba(0, 0, 0, 0.7), 0 0 40px ' + (inspectedAvatar().isUnlocked ? inspectedAvatar().color : '#64748b') + '55'">
                    <div [class]="'avatar-sprite hero-portrait-sprite sprite-' + inspectedAvatar().id" 
                         [style.transform-origin]="portraitZoomOrigin()"
                         [class.is-locked-sprite]="!inspectedAvatar().isUnlocked"></div>
                  </div>
                </div>

                <!-- INFORMACIÓN DE IDENTIDAD -->
                <div class="hero-identity-body">
                  <h3 class="hero-avatar-name">{{ inspectedAvatar().name }}</h3>

                  <div class="hero-quote-snippet" *ngIf="inspectedAvatar().tacticalQuote">
                    <i class="fa-solid fa-quote-left"></i>
                    <span>{{ inspectedAvatar().tacticalQuote }}</span>
                  </div>
                </div>
              </div>

              <!-- 2. SECCIÓN: ¿CÓMO CONSIGO ESTE AVATAR? -->
              <div class="how-to-get-section">
                <div class="how-to-get-header">
                  <div class="how-to-get-title-group">
                    <i class="fa-solid fa-circle-question text-cyan"></i>
                    <span class="how-to-get-heading">{{ 'cualidades.howToGet' | translate }}</span>
                  </div>
                </div>

                <div class="how-to-get-card" [class.is-card-unlocked]="inspectedAvatar().isUnlocked">
                  <div class="how-to-get-body">
                    <div class="how-to-get-header-line">
                      <i [class]="getHowToGetIcon(inspectedAvatar())" [style.color]="inspectedAvatar().color || 'var(--accent, #00f2fe)'"></i>
                      <span class="how-to-get-type-tag">{{ getHowToGetMethodTag(inspectedAvatar()) }}</span>
                    </div>
                    <div class="how-to-get-main-title">{{ getHowToGetTitle(inspectedAvatar()) }}</div>
                    <p class="how-to-get-text">{{ getHowToGetDescription(inspectedAvatar()) }}</p>

                    <!-- Barra de progreso si es de cualidad y está bloqueado -->
                    <div *ngIf="inspectedAvatar().qualityId && !inspectedAvatar().isUnlocked" class="how-to-get-progress-wrap">
                      <div class="how-to-get-progress-labels">
                        <span>{{ 'cualidades.unlockProgressLabel' | translate }}</span>
                        <strong>{{ getUnlockProgressCurrent(inspectedAvatar()) }} / {{ getUnlockProgressTotal(inspectedAvatar()) }}</strong>
                      </div>
                      <div class="how-to-get-progress-track">
                        <div 
                          class="how-to-get-progress-bar"
                          [style.width.%]="getUnlockPercent(inspectedAvatar())"
                          [style.background]="inspectedAvatar().color || 'var(--accent, #00f2fe)'"
                        ></div>
                      </div>
                    </div>

                    <!-- Indicador de monedas si es de tienda y está bloqueado -->
                    <div *ngIf="!inspectedAvatar().isUnlocked && (inspectedAvatar().unlockType === 'coins' || (!inspectedAvatar().qualityId && !inspectedAvatar().isPremium && inspectedAvatar().cost > 0))" class="how-to-get-coins-summary">
                      <div class="coins-summary-chip">
                        <i class="fa-solid fa-coins text-yellow"></i>
                        <span>{{ 'cualidades.priceLabel' | translate:{ cost: inspectedAvatar().cost } }}</span>
                      </div>
                      <div 
                        class="coins-summary-balance"
                        [class.has-enough]="membership.proCoins() >= inspectedAvatar().cost"
                      >
                        <i [class]="membership.proCoins() >= inspectedAvatar().cost ? 'fa-solid fa-circle-check text-green' : 'fa-solid fa-circle-xmark text-red'"></i>
                        <span>{{ 'cualidades.yourBalance' | translate:{ balance: membership.proCoins() } }} {{ membership.proCoins() >= inspectedAvatar().cost ? ('cualidades.canRedeem' | translate) : ('cualidades.insufficient' | translate) }}</span>
                      </div>
                    </div>

                    <!-- Banner explicativo si es Premium VIP y está bloqueado -->
                    <div *ngIf="!inspectedAvatar().isUnlocked && inspectedAvatar().unlockType === 'premium'" class="how-to-get-vip-summary">
                      <div class="vip-summary-chip">
                        <i class="fa-solid fa-crown text-yellow"></i>
                        <span>{{ 'cualidades.vipExclusive' | translate }}</span>
                      </div>
                      <p class="vip-summary-text">
                        {{ 'cualidades.howToGetDescVip' | translate }}
                      </p>
                    </div>

                    <!-- Banner si ya está desbloqueado -->
                  </div>
                </div>
              </div>

              <!-- 3. MÉTRICAS DE ENFOQUE Y COMBATE -->
              <div class="detail-section">
                <div class="section-title-bar">
                  <span class="section-title">{{ 'cualidades.sessionPerformance' | translate }}</span>
                  <span class="section-subtitle">{{ 'cualidades.pomodoroImpact' | translate }}</span>
                </div>

                <div class="tactical-metrics-grid">
                  <!-- Éxito -->
                  <div class="clean-metric-tile">
                    <div class="tile-header">
                      <i class="fa-solid fa-circle-check text-green"></i>
                      <span>{{ 'cualidades.sessionCompleted' | translate }}</span>
                    </div>
                    <div class="tile-stats-row">
                      <div class="tile-stat-item">
                        <span class="stat-value text-green">+{{ inspectedAvatar().coinsPerPomodoro }}</span>
                        <span class="stat-label">🪙 Pro Coins</span>
                      </div>
                      <div class="tile-stat-divider"></div>
                      <div class="tile-stat-item">
                        <span class="stat-value text-white">{{ inspectedAvatar().bossDamagePoints }}</span>
                        <span class="stat-label">⚔️ {{ 'cualidades.bossDamage' | translate }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Penalización -->
                  <div class="clean-metric-tile">
                    <div class="tile-header">
                      <i class="fa-solid fa-triangle-exclamation text-red"></i>
                      <span>{{ 'cualidades.pauseOrAbandon' | translate }}</span>
                    </div>
                    <div class="tile-stats-row">
                      <div class="tile-stat-item">
                        <span class="stat-value text-red">-{{ inspectedAvatar().pausePenaltyCoins }}</span>
                        <span class="stat-label">🪙 Pro Coins</span>
                      </div>
                      <div class="tile-stat-divider"></div>
                      <div class="tile-stat-item" style="text-align: center; align-items: center; justify-content: center;">
                        <span class="stat-value text-red-light" style="text-align: center;">+{{ inspectedAvatar().bossHealPoints }}</span>
                        <span class="stat-label" style="text-align: center; display: block; width: 100%; line-height: 1.25;">🩸 {{ 'cualidades.bossHeal' | translate }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 4. HABILIDADES Y ESTRATEGIA -->
              <div class="detail-section">
                <div class="section-title-bar">
                  <span class="section-title">{{ 'cualidades.skillsAndTechniques' | translate }}</span>
                  <span class="section-badge" *ngIf="inspectedAvatar().archetypeBadge">{{ inspectedAvatar().archetypeBadge }}</span>
                </div>

                <div class="clean-abilities-grid">
                  <!-- Pasiva -->
                  <div class="clean-ability-item">
                    <div class="ability-lead">
                      <span class="ability-lead-tag">{{ 'cualidades.passiveLabel' | translate }}</span>
                      <span class="ability-title-txt">{{ inspectedAvatar().passiveName }}</span>
                    </div>
                    <p class="ability-body-txt">{{ getDynamicPassiveAdvantage(inspectedAvatar()) }}</p>
                  </div>

                  <!-- Técnica Mental -->
                  <div class="clean-ability-item">
                    <div class="ability-lead">
                      <span class="ability-lead-tag">{{ 'cualidades.focusLabel' | translate }}</span>
                      <span class="ability-title-txt">{{ 'cualidades.mentalTechnique' | translate }}</span>
                    </div>
                    <p class="ability-body-txt">{{ inspectedAvatar().focusApplication }}</p>
                  </div>
                </div>
              </div>

              <!-- 5. LINAJE Y DESPERTAR EVOLUTIVO OCULTO -->
              <div class="detail-section" *ngIf="inspectedAvatar().hasEvolution">
                <div class="section-title-bar">
                  <span class="section-title text-emerald">
                    <i class="fa-solid fa-dna"></i> {{ 'cualidades.evoCardTitle' | translate }}
                  </span>
                  <span class="section-badge evo-status-pill">
                    <i class="fa-solid fa-sparkles"></i> {{ 'cualidades.evoMysteryBadge' | translate }}
                  </span>
                </div>

                <div class="clean-evolution-card">
                  <div class="evo-ambient-aura"></div>
                  <p class="evo-universal-mystery-text">
                    {{ 'cualidades.evoUniversalMysteryText' | translate }}
                  </p>
                </div>
              </div>

              <!-- 6. ACCIONES PRINCIPALES -->
              <div class="detail-actions-dock">
                <button 
                  *ngIf="membership.selectedAvatar() === inspectedAvatar().id" 
                  class="btn-clean-cta is-active-equipped" 
                  disabled
                >
                  <i class="fa-solid fa-shield-check text-green"></i> {{ 'cualidades.activeGuardianBadge' | translate }}
                </button>

                <button 
                  *ngIf="inspectedAvatar().isUnlocked && membership.selectedAvatar() !== inspectedAvatar().id" 
                  (click)="equipAvatar(inspectedAvatar())" 
                  class="btn-clean-cta is-equip-btn"
                >
                  <i class="fa-solid fa-paw"></i> {{ 'cualidades.chooseGuardian' | translate:{ name: inspectedAvatar().name } }}
                  <i class="fa-solid fa-arrow-right"></i>
                </button>

                <!-- CASO A: RETO COMPLETADO (Progreso >= Meta) -> Botón para reclamar recompensa formalmente -->
                <button 
                  *ngIf="!inspectedAvatar().isUnlocked && inspectedAvatar().qualityId && inspectedAvatar().quality && (inspectedAvatar().quality?.unlockProgress || 0) >= (inspectedAvatar().quality?.unlockTotal || 1)" 
                  (click)="claimQualityReward(inspectedAvatar().quality!)" 
                  class="btn-clean-cta is-challenge-btn"
                >
                  <i class="fa-solid fa-gift"></i> {{ 'cualidades.claimGuardian' | translate:{ name: inspectedAvatar().name } }}
                  <i class="fa-solid fa-arrow-right"></i>
                </button>

                <!-- CASO B: RETO EN PROGRESO (Progreso < Meta) -> Abre ventana indicando que aún no cuenta con los requisitos -->
                <button 
                  *ngIf="!inspectedAvatar().isUnlocked && inspectedAvatar().qualityId && inspectedAvatar().quality && (inspectedAvatar().quality?.unlockProgress || 0) < (inspectedAvatar().quality?.unlockTotal || 1)" 
                  (click)="openIncompleteQualityModal(inspectedAvatar())"
                  class="btn-clean-cta is-challenge-btn is-incomplete-btn"
                >
                  <i class="fa-solid fa-shield-halved text-amber"></i> {{ 'cualidades.proveQuality' | translate:{ name: inspectedAvatar().quality?.name } }}
                  <span class="btn-progress-badge">{{ inspectedAvatar().quality?.unlockProgress || 0 }}/{{ inspectedAvatar().quality?.unlockTotal || 1 }}</span>
                  <i class="fa-solid fa-circle-info"></i>
                </button>

                <button 
                  *ngIf="!inspectedAvatar().isUnlocked && (inspectedAvatar().unlockType === 'coins' || (!inspectedAvatar().qualityId && !inspectedAvatar().isPremium && inspectedAvatar().cost > 0))" 
                  (click)="buyAvatar(inspectedAvatar())" 
                  class="btn-clean-cta is-buy-btn"
                  [disabled]="membership.proCoins() < inspectedAvatar().cost"
                >
                  <i class="fa-solid fa-coins"></i> 
                  {{ membership.proCoins() >= inspectedAvatar().cost ? ('cualidades.redeemForCoins' | translate:{ cost: inspectedAvatar().cost }) : ('cualidades.needMoreCoins' | translate:{ diff: (inspectedAvatar().cost - membership.proCoins()) }) }}
                  <i class="fa-solid fa-arrow-right"></i>
                </button>

                <a 
                  *ngIf="!inspectedAvatar().isUnlocked && inspectedAvatar().unlockType === 'premium'" 
                  routerLink="/membership" 
                  class="btn-clean-cta is-premium-btn"
                >
                  <i class="fa-solid fa-crown text-yellow"></i> 
                  <span>{{ 'cualidades.unlockWithPremium' | translate }}</span>
                  <i class="fa-solid fa-arrow-right"></i>
                </a>
              </div>

            </div>

          </div>

        </div>

        <!-- ==================================================== -->
        <!-- 4. MODAL DE EDICIÓN FLOTANTE                        -->
        <!-- ==================================================== -->
        <div class="edit-modal-backdrop" *ngIf="isEditingProfile()" (click)="toggleEditProfile()">
          <div class="edit-modal-window" (click)="$event.stopPropagation()">
            <div class="modal-window-head">
              <h3><i class="fa-solid fa-user-pen text-cyan"></i> {{ 'cualidades.profileSettings' | translate }}</h3>
              <button class="modal-close-btn" (click)="toggleEditProfile()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-window-body">
              <div class="form-group-item">
                <label>{{ 'cualidades.usernameLabel' | translate }}</label>
                <input 
                  type="text" 
                  [value]="inputName()"
                  (input)="onUsernameInput($event)"
                  [placeholder]="'cualidades.usernamePlaceholder' | translate"
                  class="text-input-field"
                />
                <span class="form-error-msg" *ngIf="usernameError()">{{ usernameError() }}</span>
              </div>
              <div class="form-group-item">
                <label>{{ 'cualidades.professionLabel' | translate }}</label>
                <input 
                  type="text" 
                  [value]="inputProfession()"
                  (input)="onProfessionInput($event)"
                  [placeholder]="'cualidades.professionPlaceholder' | translate"
                  class="text-input-field"
                />
              </div>
              <div class="form-group-item">
                <label>{{ 'cualidades.countryLabel' | translate }}</label>
                <select [value]="selectedCountry()" (change)="onCountrySelect($event)" class="select-input-field">
                  <option value="" disabled selected>{{ 'cualidades.selectCountryPlaceholder' | translate }}</option>
                  <option *ngFor="let country of countryOptions" [value]="country.name">
                    {{ country.flag }} {{ country.name }}
                  </option>
                </select>
              </div>

              <!-- CONTROL DE SEMANA ACTIVA (CONTROL DE RACHAS) -->
              <div class="form-group-item active-week-form-section">
                <div class="active-days-header-line">
                  <label><i class="fa-regular fa-calendar-days text-green"></i> {{ 'cualidades.activeWeekLabel' | translate }}</label>
                  <span class="active-days-summary-pill">{{ getTempActiveDaysSummary() }}</span>
                </div>
                <p class="form-helper-desc">
                  {{ 'cualidades.activeWeekDesc' | translate }}
                </p>

                <!-- SELECTOR DE DÍAS (LUN A DOM) -->
                <div class="week-days-selector-grid">
                  <button 
                    *ngFor="let day of weekDaysList"
                    type="button"
                    class="btn-week-day-pill"
                    [class.is-selected]="isDaySelected(day.id)"
                    (click)="toggleActiveDay(day.id)"
                  >
                    <span class="day-short-name">{{ day.label }}</span>
                    <span class="day-check-indicator">{{ isDaySelected(day.id) ? '✓' : '+' }}</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="modal-window-foot">
              <button (click)="toggleEditProfile()" class="btn-ghost-cancel">{{ 'common.cancel' | translate }}</button>
              <button (click)="saveProfileChanges()" class="btn-save-confirm">{{ 'common.saveChanges' | translate }}</button>
            </div>
          </div>
        </div>

        <!-- PANTALLA RECOMPENSA DE DESBLOQUEO EXITOSO -->
        <div class="unlock-success-overlay" *ngIf="unlockedRewardQuality()" (click)="closeRewardFlow()">
          <div class="unlock-success-card" (click)="$event.stopPropagation()">
            <div class="success-glow"></div>
            <span class="success-badge">{{ 'cualidades.qualityProven' | translate }}</span>
            <div [class]="'avatar-sprite sprite-reward sprite-' + unlockedRewardQuality()?.animal"></div>
            <h3 class="reward-title">{{ 'cualidades.qualityUnlocked' | translate }}</h3>
            <span class="success-quality">{{ unlockedRewardQuality()?.name }}</span>
            <p class="reward-description">
              {{ 'cualidades.demonstratedQualitySuccess' | translate:{ name: unlockedRewardQuality()?.name } }}
            </p>
            <button class="btn-equip-now-action" (click)="closeRewardFlow()">{{ 'cualidades.gotIt' | translate }}</button>
          </div>
        </div>

        <!-- MODAL: REQUISITOS DE CUALIDAD PENDIENTES / AÚN NO CUMPLES LOS REQUISITOS -->
        <div class="quality-incomplete-overlay" *ngIf="inspectingIncompleteQuality()" (click)="closeIncompleteQualityModal()">
          <div class="quality-incomplete-card" (click)="$event.stopPropagation()">
            <div class="incomplete-glow"></div>
            
            <button class="modal-close-x" (click)="closeIncompleteQualityModal()" aria-label="Cerrar">
              <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="incomplete-badge">
              <i class="fa-solid fa-shield-halved text-amber"></i>
              <span>{{ 'cualidades.requirementPendingBadge' | translate }}</span>
            </div>

            <div class="incomplete-avatar-preview">
              <div [class]="'avatar-sprite incomplete-avatar-sprite sprite-' + inspectingIncompleteQuality()?.id + ' is-locked-sprite'"></div>
              <div class="incomplete-avatar-meta">
                <h3 class="incomplete-avatar-name">{{ inspectingIncompleteQuality()?.name }}</h3>
                <span class="incomplete-quality-name">
                  <i class="fa-solid fa-award text-amber"></i>
                  {{ 'cualidades.incompleteQualityTitle' | translate:{ name: inspectingIncompleteQuality()?.quality?.name } }}
                </span>
              </div>
            </div>

            <div class="incomplete-requirement-box">
              <div class="req-title-row">
                <span class="req-label">{{ 'cualidades.honorChallengeLabel' | translate }}</span>
                <span class="req-target-tag">{{ inspectingIncompleteQuality()?.quality?.unlockProgress || 0 }} / {{ inspectingIncompleteQuality()?.quality?.unlockTotal || 1 }}</span>
              </div>
              <p class="req-description">
                {{ inspectingIncompleteQuality()?.quality?.unlockRequirement }}
              </p>

              <!-- BARRA DE PROGRESO -->
              <div class="req-progress-track">
                <div class="req-progress-fill" [style.width.%]="getIncompleteQualityPercent()"></div>
              </div>

              <div class="req-hint-row">
                <i class="fa-solid fa-circle-info text-amber"></i>
                <p class="req-hint-text">
                  {{ getIncompleteQualityRemainingHint() }}
                </p>
              </div>
            </div>

            <div class="incomplete-modal-actions">
              <a 
                routerLink="/enfoque" 
                (click)="closeIncompleteQualityModal()" 
                class="btn-incomplete-cta"
              >
                <i class="fa-solid fa-fire text-amber"></i>
                <span>{{ 'cualidades.goToFocusArenaAction' | translate }}</span>
                <i class="fa-solid fa-arrow-right"></i>
              </a>

              <button 
                type="button" 
                (click)="closeIncompleteQualityModal()" 
                class="btn-incomplete-secondary"
              >
                {{ 'cualidades.gotIt' | translate }}
              </button>
            </div>

          </div>
        </div>



        <!-- TOAST FLOTANTE -->
        <div class="toast-popup-alert" *ngIf="toastMessage()">
          <i class="fa-solid fa-circle-check text-green"></i>
          <span>{{ toastMessage() }}</span>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* ==================================================== */
    /* 0. CABECERA DE LA PÁGINA (HEADER DE VISTA)          */
    /* ==================================================== */
    .profile-page-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .profile-page-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px;
      font-weight: 900;
      color: var(--text);
      letter-spacing: -0.5px;
      margin: 0;
      line-height: 1.2;
    }
    .profile-page-subtitle {
      font-size: 13.5px;
      color: var(--muted);
      margin: 0;
      line-height: 1.4;
    }

    /* ==================================================== */
    /* 1. LAYOUT PRINCIPAL Y CONTENEDORES                  */
    /* ==================================================== */
    .profile-page-wrapper {
      padding: 92px 32px 60px;
      min-height: 100vh;
      box-sizing: border-box;
      width: 100%;
    }
    .profile-layout-container {
      max-width: 1140px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    /* CONTENEDOR SUPERIOR DE PERFIL */
    .profile-upper-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }

    /* ==================================================== */
    /* 2. TARJETA STRATIS DE PERFIL (PERFIL.WEBP)           */
    /* ==================================================== */
    .stratis-profile-card {
      background: rgba(18, 22, 32, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(14px);
      position: relative;
    }

    .profile-banner-cover {
      height: 140px;
      position: relative;
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      padding: 14px 18px;
      box-sizing: border-box;
      transition: background 0.4s ease;
    }
    .avatar-backdrop-aura {
      position: absolute;
      inset: 0;
      pointer-events: none;
      transition: background 0.4s ease;
    }
    .banner-overlay-pattern {
      position: absolute;
      inset: 0;
      opacity: 0.35;
      pointer-events: none;
      transition: background 0.4s ease;
    }

    .profile-body-content {
      padding: 0 28px 22px;
      position: relative;
    }

    .avatar-overlapping-wrapper {
      position: relative;
      width: 170px;
      height: 170px;
      margin-top: -85px;
      margin-bottom: 14px;
      z-index: 10;
    }
    .round-avatar-frame {
      width: 170px;
      height: 170px;
      border-radius: 50%;
      border: 5px solid #121620;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
      transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    }
    .round-avatar-frame:hover {
      border-color: rgba(255, 255, 255, 0.4);
    }
    .sprite-circle {
      width: 158px;
      height: 158px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
      transform-origin: center center;
    }
    .round-avatar-frame:hover .sprite-circle {
      transform: scale(1.32);
    }
    .avatar-circle-edit-btn {
      position: absolute;
      bottom: 6px;
      right: 6px;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 3px solid #0f172a;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 15;
      padding: 0;
    }
    .avatar-circle-edit-btn:hover {
      transform: scale(1.15);
      filter: brightness(1.2);
    }

    .user-details-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      flex-wrap: wrap;
    }
    .user-primary-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .user-name-title-row {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }
    .user-display-name {
      font-size: 23px;
      font-weight: 850;
      color: #fff;
      margin: 0;
      letter-spacing: -0.4px;
      line-height: 1.15;
    }
    .user-identity-metadata {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin: 4px 0;
    }
    .identity-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #f1f5f9;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 3px 10px;
      border-radius: 999px;
      backdrop-filter: blur(4px);
    }
    .identity-chip i {
      color: var(--accent, #6366f1);
      font-size: 11.5px;
    }
    .identity-chip .country-flag-icon {
      font-size: 13.5px;
      line-height: 1;
    }
    .btn-add-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: 1px dashed rgba(255, 255, 255, 0.16);
      color: #64748b;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-add-chip:hover {
      border-color: var(--accent, #6366f1);
      color: var(--accent, #6366f1);
      background: rgba(99, 102, 241, 0.08);
    }
    .user-unconfigured-cta {
      margin: 4px 0;
    }
    .btn-complete-profile {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      color: #94a3b8;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12.5px;
      font-weight: 550;
      padding: 5px 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-complete-profile:hover {
      background: rgba(99, 102, 241, 0.08);
      border-color: rgba(99, 102, 241, 0.4);
      color: #fff;
      transform: translateY(-1px);
    }
    .user-active-week-line {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin: 4px 0 0;
      line-height: 1.4;
    }
    .active-days-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #94a3b8;
      background: rgba(14, 165, 233, 0.06);
      border: 1px solid rgba(14, 165, 233, 0.18);
      padding: 3px 10px;
      border-radius: 999px;
      backdrop-filter: blur(6px);
      user-select: none;
      transition: all 0.2s ease;
    }
    .active-days-chip:hover {
      background: rgba(14, 165, 233, 0.1);
      border-color: rgba(14, 165, 233, 0.32);
    }
    .active-days-chip i {
      color: #38bdf8;
      font-size: 11.5px;
    }
    .active-days-label {
      color: #94a3b8;
      font-size: 11.5px;
      font-weight: 500;
    }
    .active-days-value {
      color: #f1f5f9;
      font-weight: 700;
      font-size: 12px;
    }
    .last-focus-date-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #cbd5e1;
      background: rgba(249, 115, 22, 0.06);
      border: 1px solid rgba(249, 115, 22, 0.2);
      padding: 3px 10px;
      border-radius: 999px;
      backdrop-filter: blur(6px);
      user-select: none;
      transition: all 0.2s ease;
    }
    .last-focus-date-chip:hover {
      background: rgba(249, 115, 22, 0.1);
      border-color: rgba(249, 115, 22, 0.35);
    }
    .last-focus-date-chip i {
      color: #f97316;
      font-size: 11.5px;
    }
    .plan-status-pill {
      position: relative;
      z-index: 5;
      background: rgba(10, 14, 22, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      font-size: 8.5px;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      backdrop-filter: blur(10px);
    }
    .plan-status-pill.is-pro {
      background: rgba(99, 102, 241, 0.3);
      border-color: rgba(165, 180, 252, 0.5);
      color: #e0e7ff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
    }

    .user-inline-telemetry {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      flex-wrap: wrap;
      margin-top: auto;
    }
    .tele-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(8px);
      position: relative;
    }
    .tele-pill:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }
    .tele-icon {
      font-size: 12.5px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tele-icon i { font-size: 11.5px; }
    .tele-num {
      font-size: 13px;
      font-weight: 850;
      color: #f8fafc;
      letter-spacing: -0.2px;
      line-height: 1;
    }
    .tomato-pill .tele-num { color: #f87171; }
    .objective-pill .tele-num { color: #38bdf8; }
    .coin-pill .tele-icon i { color: #fbbf24; }
    .coin-pill .tele-num { color: #fbbf24; }
    .streak-pill .tele-icon i { color: #f97316; }
    .streak-pill .tele-num { color: #fb923c; }
    .gold-pill .tele-icon i { color: #fbbf24; }
    .gold-pill .tele-num { color: #fbbf24; }
    .silver-pill .tele-icon i { color: #cbd5e1; }
    .silver-pill .tele-num { color: #cbd5e1; }
    .bronze-pill .tele-icon i { color: #d97706; }
    .bronze-pill .tele-num { color: #d97706; }

    .tele-pill.is-zero {
      opacity: 0.38;
      border-color: rgba(255, 255, 255, 0.05);
      background: rgba(255, 255, 255, 0.015);
    }
    .tele-pill.is-zero .tele-icon {
      filter: grayscale(100%);
      opacity: 0.55;
    }
    .tele-pill.is-zero .tele-num { color: #64748b; }

    .tele-pill[data-tooltip]::before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 9px);
      left: 50%;
      transform: translate(-50%, 6px) scale(0.96);
      background: rgba(11, 15, 25, 0.95);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 6px 11px;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 11.5px;
      font-weight: 550;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      z-index: 1000;
    }
    .tele-pill[data-tooltip]::after {
      content: '';
      position: absolute;
      bottom: calc(100% + 3px);
      left: 50%;
      transform: translate(-50%, 6px) scale(0.96);
      border-width: 6px 5px 0 5px;
      border-style: solid;
      border-color: rgba(11, 15, 25, 0.95) transparent transparent transparent;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1001;
    }
    .tele-pill[data-tooltip]:hover::before,
    .tele-pill[data-tooltip]:hover::after {
      opacity: 1;
      transform: translate(-50%, 0) scale(1);
    }

    /* CARD DE SKILLS */
    .stratis-skills-card {
      background: rgba(14, 18, 28, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 9px 15px;
      backdrop-filter: blur(10px);
    }
    .skills-bar-container {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .skills-lead-indicator {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .skills-counter-badge {
      font-size: 10.5px;
      font-weight: 800;
      color: #cbd5e1;
    }
    .skills-pills-matrix {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      flex: 1;
    }
    .quality-skill-pill {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 4px 10px;
      font-size: 11px;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .quality-skill-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(245, 158, 11, 0.35);
      transform: translateY(-1px);
    }
    .quality-skill-pill.is-unlocked {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.3);
      color: #f1f5f9;
    }
    .pill-icon { font-size: 12px; }
    .pill-name { font-weight: 700; font-size: 11px; }
    .pill-status-dot { color: #10b981; font-weight: 900; font-size: 10px; }
    .pill-progress-tag { font-size: 9.5px; font-weight: 750; color: #64748b; }

    /* ==================================================== */
    /* 3. SECCIÓN: CHARACTER TO PLAY (CARRUSEL AVATAR.PNG)   */
    /* ==================================================== */
    .character-to-play-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    /* ==================================================== */
    /* 3. SECCIÓN: DASHBOARD CUADRÍCULA Y DETALLE (GRID)   */
    /* ==================================================== */
    .guardian-selection-dashboard {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(370px, 1.2fr);
      gap: 22px;
      align-items: start;
      width: 100%;
    }
    @media (max-width: 1080px) {
      .guardian-selection-dashboard {
        grid-template-columns: 1fr;
      }
      .avatar-detail-column {
        position: static !important;
      }
    }

    /* COLUMNA IZQUIERDA: CATÁLOGO EN CUADRÍCULA */
    .avatars-catalog-column {
      background: rgba(18, 22, 32, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 22px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(14px);
      box-sizing: border-box;
    }

    .catalog-header-bar {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .catalog-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .catalog-subtag {
      font-size: 9.5px;
      font-weight: 850;
      color: var(--accent, #00f2fe);
      letter-spacing: 1px;
      text-transform: uppercase;
      font-family: monospace;
    }
    .catalog-main-title {
      font-size: 21px;
      font-weight: 900;
      color: #fff;
      margin: 0;
      letter-spacing: -0.3px;
      font-family: 'Space Grotesk', sans-serif;
    }

    .category-filter-chips {
      display: flex;
      gap: 5px;
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .category-filter-chips::-webkit-scrollbar {
      display: none;
    }
    .category-filter-chips button {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .category-filter-chips button:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .category-filter-chips button.active {
      background: rgba(0, 242, 254, 0.15);
      border-color: rgba(0, 242, 254, 0.6);
      color: #00f2fe;
      box-shadow: 0 0 10px rgba(0, 242, 254, 0.25);
    }

    /* CONTENEDOR CON SCROLL DE CATEGORÍAS */
    .avatars-catalog-scrollable {
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-height: 720px;
      overflow-y: auto;
      padding: 4px 6px 12px 2px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }
    .avatars-catalog-scrollable::-webkit-scrollbar {
      width: 4px;
    }
    .avatars-catalog-scrollable::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.18);
      border-radius: 10px;
    }

    .avatar-category-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .avatar-category-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 0 2px;
      user-select: none;
    }
    .category-divider-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
    }
    .category-divider-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 3px 12px;
      background: rgba(15, 20, 32, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.4px;
      color: var(--group-color, #fff);
      text-transform: uppercase;
      font-family: 'Space Grotesk', sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(8px);
    }
    .category-divider-badge i {
      font-size: 11px;
      color: var(--group-color, var(--accent));
    }
    .category-divider-title {
      color: #f1f5f9;
    }
    .category-divider-count {
      font-size: 10px;
      color: var(--muted);
      font-weight: 700;
    }

    /* CONTENEDOR DE LA CUADRÍCULA DE CADA CATEGORÍA */
    .avatars-grid-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
      gap: 16px;
      padding: 4px 2px 8px 2px;
    }

    /* TARJETA VERTICAL HERO DENTRO DE LA CUADRÍCULA */
    .vertical-hero-card {
      width: 100%;
      height: 218px;
      border-radius: 16px;
      background: #0f1422;
      border: 1.5px solid rgba(255, 255, 255, 0.08);
      position: relative;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
      user-select: none;
      box-sizing: border-box;
    }
    .vertical-hero-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.6);
    }
    .vertical-hero-card.is-active {
      transform: translateY(-3px) scale(1.02);
      border-color: var(--card-theme, var(--accent));
      box-shadow: 0 0 16px var(--card-theme, rgba(0, 242, 254, 0.4)), 0 8px 20px rgba(0, 0, 0, 0.7);
    }
    .vertical-hero-card.is-locked {
      background: linear-gradient(180deg, rgba(16, 22, 36, 0.85) 0%, rgba(10, 14, 22, 0.9) 100%);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .vertical-hero-card.is-locked:hover {
      border-color: rgba(255, 255, 255, 0.25);
    }
    .avatar-sprite.is-locked-sprite {
      opacity: 0.95;
      filter: grayscale(100%) brightness(0.92);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .vertical-hero-card:hover .avatar-sprite.is-locked-sprite {
      opacity: 1;
      transform: scale(1.06);
    }

    .hero-card-glow {
      position: absolute;
      inset: 0;
      opacity: 0.45;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    .vertical-hero-card.is-active .hero-card-glow {
      opacity: 0.85;
    }

    .hero-card-top-badges {
      position: relative;
      z-index: 5;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 10px;
      gap: 8px;
    }
    .top-badges-left, .top-badges-right {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .card-tier-pill {
      font-size: 8.5px;
      font-weight: 900;
      padding: 2.5px 6.5px;
      border-radius: 5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      line-height: 1.1;
    }
    .card-tier-pill.tier-común { background: rgba(156, 163, 175, 0.2); color: #e2e8f0; border: 1px solid rgba(156, 163, 175, 0.3); }
    .card-tier-pill.tier-raro { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.35); }
    .card-tier-pill.tier-épico { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); }
    .card-tier-pill.tier-legendario { 
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.28), rgba(185, 28, 28, 0.2)); 
      color: #fca5a5; 
      border: 1px solid rgba(239, 68, 68, 0.65); 
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.35); 
    }

    /* 🧬 ITEM VERTICAL DE EVOLUCIÓN (LARGO COMPLETO DE LA CARD) - ESTILO CYBER-VIOLET ASCENDANT PRO */
    .card-vertical-evo-rail {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 20px;
      background: linear-gradient(180deg, #2e1065 0%, #4c1d95 25%, #6d28d9 50%, #4338ca 75%, #1e1b4b 100%);
      border-right: 1px solid rgba(192, 132, 252, 0.35);
      box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.2), inset 1px 0 0 rgba(192, 132, 252, 0.25), 3px 0 14px rgba(109, 40, 217, 0.45);
      z-index: 7;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      pointer-events: auto;
      backdrop-filter: blur(8px);
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .vertical-hero-card:hover .card-vertical-evo-rail {
      background: linear-gradient(180deg, #3b0764 0%, #581c87 25%, #7c3aed 50%, #4f46e5 75%, #312e81 100%);
      border-right-color: rgba(216, 180, 254, 0.65);
      box-shadow: inset -1px 0 1px rgba(255, 255, 255, 0.35), inset 1px 0 0 rgba(216, 180, 254, 0.4), 4px 0 20px rgba(124, 58, 237, 0.7);
    }
    .evo-rail-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 50%, rgba(216, 180, 254, 0.3) 0%, rgba(139, 92, 246, 0.12) 50%, transparent 80%);
      pointer-events: none;
      animation: evoRailPulse 3s infinite ease-in-out;
    }
    .evo-rail-track {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 5px;
      z-index: 1;
    }
    .evo-rail-icon {
      font-size: 9px;
      color: #f3e8ff;
      filter: drop-shadow(0 0 5px rgba(216, 180, 254, 0.9)) drop-shadow(0 0 8px rgba(168, 85, 247, 0.6));
      animation: evoIconFloat 2.5s ease-in-out infinite;
    }
    .evo-rail-text {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 7.2px;
      font-weight: 900;
      letter-spacing: 2.2px;
      color: #ffffff;
      text-transform: uppercase;
      text-shadow: 0 0 6px rgba(216, 180, 254, 0.8), 0 0 12px rgba(147, 51, 234, 0.5), 0 1px 2px rgba(0, 0, 0, 0.9);
      font-family: 'Space Grotesk', sans-serif;
    }
    .evo-rail-sparkle {
      font-size: 8px;
      color: #f5d0fe;
      filter: drop-shadow(0 0 4px rgba(232, 121, 249, 0.9));
    }
    @keyframes evoRailPulse {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 0.85; }
    }
    @keyframes evoIconFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }

    /* INDENTACIONES PARA LA CARD CON RAIL VERTICAL */
    .vertical-hero-card.has-evo-rail .hero-card-top-badges {
      padding-left: 24px;
    }
    .vertical-hero-card.has-evo-rail .hero-card-footer-glass {
      padding-left: 24px;
    }
    .vertical-hero-card.has-evo-rail .hero-card-artwork-frame {
      margin-left: 10px;
    }

    /* ⚡ LÍNEA LUMINOSA QUE RECORRE EL BORDE DE LA CARD CADA 1 MINUTO */
    .card-border-travel-beam {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      border-radius: 16px;
      overflow: visible;
    }
    .card-border-travel-beam rect {
      fill: none;
      stroke: #d8b4fe;
      stroke-width: 2.2px;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
      stroke-dasharray: 14 86;
      stroke-dashoffset: 0;
      filter: drop-shadow(0 0 4px #c084fc) drop-shadow(0 0 8px rgba(192, 132, 252, 0.9)) drop-shadow(0 0 14px rgba(147, 51, 234, 0.7));
      animation: borderBeamCircuit 60s linear infinite;
    }
    .vertical-hero-card:hover .card-border-travel-beam rect {
      stroke: #ffffff;
      filter: drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 12px rgba(216, 180, 254, 1)) drop-shadow(0 0 18px rgba(168, 85, 247, 0.9));
    }
    @keyframes borderBeamCircuit {
      0% {
        stroke-dashoffset: 100;
      }
      100% {
        stroke-dashoffset: 0;
      }
    }
    .card-unlock-pill {
      font-size: 8.5px;
      font-weight: 900;
      padding: 3px 8.5px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      line-height: 1.1;
    }
    .card-unlock-pill i {
      font-size: 9px;
    }
    .card-unlock-pill.pill-premium {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.15) 100%);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.55);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.25);
    }
    .card-unlock-pill.pill-coins {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.14) 100%);
      color: #fde047;
      border: 1px solid rgba(245, 158, 11, 0.5);
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
    }
    .card-unlock-pill.pill-merit {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.14) 100%);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.5);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
    }
    .card-unlock-pill.is-unlocked {
      opacity: 0.6;
      border-style: dashed;
      box-shadow: none;
    }
    .card-state-pill {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #10b981;
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 900;
    }
    .card-state-pill.is-lock {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    .hero-card-artwork-frame {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .hero-card-sprite {
      width: 124px;
      height: 124px;
      background-size: cover;
      background-position: center;
      filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.65));
      border-radius: 50%;
      transition: transform 0.3s ease;
    }
    .vertical-hero-card:hover .hero-card-sprite {
      transform: scale(1.08);
    }

    .hero-card-footer-glass {
      position: relative;
      z-index: 5;
      background: linear-gradient(180deg, transparent 0%, rgba(10, 14, 24, 0.45) 35%, rgba(8, 11, 18, 0.75) 100%);
      padding: 12px 8px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 3px;
    }
    .hero-card-name {
      font-size: 13.5px;
      font-weight: 900;
      color: #fff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      letter-spacing: -0.2px;
    }
    .hero-card-status-strip {
      margin-top: 1px;
      font-size: 8.5px;
      font-weight: 850;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #64748b;
    }
    .hero-card-status-strip .status-active {
      color: #34d399;
    }
    .hero-card-status-strip .status-squad {
      color: #38bdf8;
    }
    .hero-card-status-strip .status-locked {
      color: #64748b;
    }

    .active-card-indicator {
      position: absolute;
      bottom: 1px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
    }
    .indicator-glow-dot {
      width: 10px;
      height: 2px;
      border-radius: 4px;
      background: var(--card-theme, var(--accent));
      box-shadow: 0 0 6px var(--card-theme, var(--accent));
    }

    /* ==================================================== */
    /* 4. COLUMNA DERECHA: PANEL DE DETALLE DEL AVATAR      */
    /* ==================================================== */
    .avatar-detail-column {
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 86px;
    }

    .clean-spotlight-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: rgba(18, 22, 32, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 18px 20px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-sizing: border-box;
    }

    /* 1. HERO HEADER INTEGRADO CON AVATAR GIGANTE / DESTACADO */
    .detail-hero-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      position: relative;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 16px 18px 18px;
      overflow: hidden;
    }
    .hero-ambient-glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      transition: background 0.4s ease;
    }

    .hero-top-badges-bar {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      z-index: 5;
    }
    .hero-stars-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 9px;
    }
    .hero-stars-pill i {
      font-size: 8.5px;
      color: #475569;
    }
    .hero-stars-pill i.is-lit {
      color: #fbbf24;
    }
    .hero-tier-name {
      font-size: 9px;
      font-weight: 800;
      color: #e2e8f0;
      margin-left: 3px;
      text-transform: uppercase;
    }

    .hero-state-pill {
      font-size: 9.5px;
      font-weight: 750;
      padding: 3px 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .hero-state-pill.is-active {
      color: #34d399;
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.3);
    }
    .hero-state-pill.is-unlocked {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border-color: rgba(56, 189, 248, 0.3);
    }
    .hero-state-pill.is-locked {
      color: #f87171;
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .hero-showcase-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 8px 0 14px 0;
      z-index: 5;
    }
    .hero-portrait-frame {
      width: 270px;
      height: 270px;
      border-radius: 50%;
      background: radial-gradient(circle at center, rgba(30, 42, 65, 0.65) 0%, rgba(12, 17, 28, 0.7) 100%);
      border: 4.5px solid rgba(255, 255, 255, 0.2);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
      z-index: 2;
      overflow: hidden;
      cursor: crosshair;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .hero-portrait-frame:hover {
      border-color: rgba(255, 255, 255, 0.45);
    }
    .hero-portrait-sprite {
      width: 256px;
      height: 256px;
      background-size: cover;
      background-position: center;
      border-radius: 50%;
      filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.75));
      transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
      transform-origin: center center;
    }
    .hero-portrait-frame.is-locked-dock {
      cursor: default;
      background: radial-gradient(circle at center, rgba(30, 42, 65, 0.65) 0%, rgba(12, 17, 28, 0.7) 100%);
    }
    .hero-portrait-frame.is-locked-dock:hover {
      border-color: rgba(255, 255, 255, 0.35);
    }
    .hero-portrait-frame.is-locked-dock:hover .hero-portrait-sprite {
      transform: none !important;
    }
    .hero-portrait-frame.is-locked-dock .hero-portrait-sprite {
      filter: grayscale(100%) brightness(0.95) contrast(1.05);
      opacity: 0.95;
      transform: none;
    }

    .hero-identity-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 100%;
      z-index: 2;
    }
    .hero-avatar-name {
      font-size: 25px;
      font-weight: 900;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.4px;
      font-family: 'Space Grotesk', sans-serif;
    }
    .hero-meta-tags {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 11.5px;
      color: #94a3b8;
      font-weight: 600;
      flex-wrap: wrap;
    }
    .meta-tag.weapon-text {
      color: #cbd5e1;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-tag.weapon-text i {
      font-size: 9.5px;
      color: #00f2fe;
    }
    .meta-dot {
      color: #475569;
      font-size: 8px;
    }
    .hero-quote-snippet {
      font-size: 11px;
      font-style: italic;
      color: #94a3b8;
      margin-top: 2px;
      line-height: 1.4;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      max-width: 90%;
    }
    .hero-quote-snippet i {
      font-size: 8.5px;
      color: var(--accent, #00f2fe);
      flex-shrink: 0;
    }

    /* SECCIONES COMUNES DEL DETALLE */
    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .section-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .section-subtitle {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }
    .section-badge {
      font-size: 8.5px;
      font-weight: 750;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1.5px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    /* 2. GRID DE MÉTRICAS TÁCTICAS */
    .tactical-metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .clean-metric-tile {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .tile-header {
      font-size: 10px;
      font-weight: 750;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .tile-header i {
      font-size: 10px;
    }
    .tile-stats-row {
      display: flex;
      align-items: center;
      justify-content: space-around;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 6px 8px;
    }
    .tile-stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 2px;
      flex: 1;
    }
    .tile-stat-item .stat-value {
      font-size: 15px;
      font-weight: 850;
      font-family: 'Space Grotesk', sans-serif;
      text-align: center;
    }
    .tile-stat-item .stat-value.text-green { color: #34d399; }
    .tile-stat-item .stat-value.text-white { color: #f8fafc; }
    .tile-stat-item .stat-value.text-red { color: #f87171; }
    .tile-stat-item .stat-value.text-red-light { color: #fca5a5; }

    .tile-stat-item .stat-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      text-align: center;
      display: block;
      width: 100%;
      line-height: 1.25;
    }
    .tile-stat-divider {
      width: 1px;
      height: 20px;
      background: rgba(255, 255, 255, 0.08);
    }

    /* 3. GRID DE HABILIDADES */
    .clean-abilities-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .clean-ability-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ability-lead {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ability-lead-tag {
      font-size: 8.5px;
      font-weight: 800;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1.5px 5px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .ability-title-txt {
      font-size: 11px;
      font-weight: 800;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ability-body-txt {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
      margin: 0;
    }

    /* 4. SECCIÓN: ¿CÓMO CONSIGO ESTE AVATAR? */
    .how-to-get-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .how-to-get-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2px;
    }
    .how-to-get-title-group {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .how-to-get-title-group i {
      font-size: 13px;
    }
    .how-to-get-heading {
      font-size: 11.5px;
      font-weight: 850;
      color: #f1f5f9;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .how-to-get-status-badge {
      font-size: 9px;
      font-weight: 850;
      padding: 2.5px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .how-to-get-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.25s ease;
    }
    .how-to-get-card:hover {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.035);
    }
    .how-to-get-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }
    .how-to-get-header-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .how-to-get-header-line i {
      font-size: 10px;
    }
    .how-to-get-type-tag {
      font-size: 8.5px;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 1.5px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .how-to-get-main-title {
      font-size: 11.5px;
      font-weight: 800;
      color: #fff;
    }
    .how-to-get-text {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
      margin: 0;
    }
    .how-to-get-progress-wrap {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: rgba(0, 0, 0, 0.25);
      padding: 7px 9px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .how-to-get-progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #94a3b8;
    }
    .how-to-get-progress-labels strong {
      color: #f1f5f9;
      font-weight: 800;
    }
    .how-to-get-progress-track {
      width: 100%;
      height: 5px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
    }
    .how-to-get-progress-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.4s ease;
    }
    .how-to-get-coins-summary {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 10px;
    }
    .coins-summary-chip {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      padding: 3px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 700;
    }
    .coins-summary-balance {
      font-size: 10px;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }
    .coins-summary-balance.has-enough {
      color: #34d399;
    }
    .how-to-get-vip-summary {
      margin-top: 6px;
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 10px;
      padding: 9px 12px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .vip-summary-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 850;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .vip-summary-text {
      font-size: 11px;
      color: #e2e8f0;
      margin: 0;
      line-height: 1.4;
    }
    .how-to-get-unlocked-banner {
      margin-top: 4px;
      font-size: 10.5px;
      color: #34d399;
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
    }

    /* 4.5 SECCIÓN DE EVOLUCIÓN OCULTA */
    .text-emerald {
      color: #34d399 !important;
    }
    .section-badge.evo-status-pill {
      background: linear-gradient(135deg, rgba(76, 29, 149, 0.45) 0%, rgba(30, 27, 75, 0.7) 100%);
      color: #f8fafc;
      border: 1px solid rgba(192, 132, 252, 0.4);
      box-shadow: 0 2px 12px rgba(124, 58, 237, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      font-size: 8.5px;
      padding: 3px 9px;
      border-radius: 6px;
      text-transform: uppercase;
      font-weight: 850;
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .clean-evolution-card {
      position: relative;
      background: linear-gradient(145deg, rgba(23, 15, 42, 0.94) 0%, rgba(33, 23, 62, 0.9) 100%);
      border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55), 0 0 16px rgba(124, 58, 237, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .evo-ambient-aura {
      position: absolute;
      top: -24px;
      right: -24px;
      width: 110px;
      height: 110px;
      background: radial-gradient(circle, #c084fc 0%, transparent 70%);
      opacity: 0.22;
      pointer-events: none;
    }
    .evo-universal-mystery-text {
      font-size: 11.8px;
      line-height: 1.65;
      color: #e2e8f0;
      margin: 0;
      position: relative;
      z-index: 2;
      font-style: italic;
      letter-spacing: 0.25px;
      text-align: center;
      padding: 6px 8px;
      font-weight: 500;
      font-family: 'Space Grotesk', sans-serif;
    }

    /* 5. BOTÓN DE ACCIÓN */
    .detail-actions-dock {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 2px;
    }
    .btn-clean-cta {
      width: 100%;
      padding: 11px 18px;
      border-radius: 10px;
      font-size: 11.5px;
      font-weight: 850;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-family: inherit;
      box-sizing: border-box;
    }
    .btn-clean-cta.is-active-equipped {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      cursor: default;
    }
    .btn-clean-cta.is-equip-btn {
      background: #00f2fe;
      color: #050b14;
      box-shadow: 0 4px 16px rgba(0, 242, 254, 0.25);
    }
    .btn-clean-cta.is-equip-btn:hover {
      background: #38bdf8;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 242, 254, 0.4);
    }
    .btn-clean-cta.is-challenge-btn {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .btn-clean-cta.is-challenge-btn:hover {
      background: rgba(16, 185, 129, 0.25);
      transform: translateY(-2px);
    }
    .btn-clean-cta.is-buy-btn {
      background: #f59e0b;
      color: #0b0f19;
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.25);
    }
    .btn-clean-cta.is-buy-btn:hover:not(:disabled) {
      background: #fbbf24;
      transform: translateY(-2px);
    }
    .btn-clean-cta.is-buy-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      filter: grayscale(0.5);
    }
    .btn-clean-cta.is-premium-btn {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #0b0f19;
      box-shadow: 0 4px 18px rgba(245, 158, 11, 0.4);
      text-decoration: none;
      font-weight: 850;
    }
    .btn-clean-cta.is-premium-btn:hover {
      background: linear-gradient(135deg, #fde047 0%, #fbbf24 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(245, 158, 11, 0.55);
    }

    /* ==================================================== */
    /* 5. MODALES Y TOASTS                                  */
    /* ==================================================== */
    .edit-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: modalIn 0.2s ease-out;
    }
    @keyframes modalIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .edit-modal-window {
      background: #141926;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      width: 420px;
      max-width: 92vw;
      padding: 22px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .modal-window-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-window-head h3 {
      font-size: 15px;
      font-weight: 850;
      color: #fff;
      margin: 0;
    }
    .modal-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 16px;
      cursor: pointer;
    }
    .modal-window-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .form-group-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .form-group-item label {
      font-size: 10px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .text-input-field, .select-input-field {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-size: 13px;
      outline: none;
    }
    .text-input-field:focus, .select-input-field:focus {
      border-color: var(--accent, #00f2fe);
    }
    .form-error-msg {
      font-size: 9px;
      color: #ef4444;
    }

    .active-week-form-section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 12px 14px;
      margin-top: 4px;
    }
    .active-days-header-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .active-days-summary-pill {
      font-size: 9px;
      font-weight: 800;
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 7px;
      border-radius: 6px;
    }
    .form-helper-desc {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 8px;
      line-height: 1.35;
    }
    .week-days-selector-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }
    .btn-week-day-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 7px 4px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-week-day-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    .btn-week-day-pill.is-selected {
      background: rgba(16, 185, 129, 0.16);
      border-color: rgba(16, 185, 129, 0.45);
      color: #34d399;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
    }
    .day-short-name { font-size: 11px; font-weight: 800; }
    .day-check-indicator { font-size: 9px; font-weight: 850; }

    .modal-window-foot {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-ghost-cancel {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11.5px;
      font-weight: 750;
      cursor: pointer;
    }
    .btn-save-confirm {
      background: var(--accent, #00f2fe);
      color: #000;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 800;
      cursor: pointer;
    }

    .unlock-success-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .unlock-success-card {
      background: rgba(20, 20, 27, 0.95);
      border: 2px solid #10b981;
      border-radius: 20px;
      padding: 30px;
      width: 340px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      box-shadow: 0 0 40px rgba(16, 185, 129, 0.3);
    }
    .success-badge { font-size: 10px; font-weight: 900; color: #10b981; letter-spacing: 1px; }
    .sprite-reward {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      border: 3.5px solid #10b981;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.4);
    }
    .reward-title { font-size: 17px; font-weight: 900; color: #fff; margin: 0; }
    .success-quality { font-size: 13px; font-weight: 800; color: #10b981; }
    .reward-description { font-size: 11.5px; color: #94a3b8; margin: 0; line-height: 1.4; }
    .btn-equip-now-action {
      margin-top: 6px;
      background: #10b981;
      color: #000;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 800;
      cursor: pointer;
    }

    /* MODAL: CUALIDAD INCOMPLETA / REQUISITOS PENDIENTES */
    .quality-incomplete-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      animation: fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .quality-incomplete-card {
      position: relative;
      background: linear-gradient(145deg, rgba(22, 26, 38, 0.98) 0%, rgba(14, 16, 24, 0.98) 100%);
      border: 1.5px solid rgba(245, 158, 11, 0.5);
      border-radius: 24px;
      padding: 28px 24px 24px;
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.2);
      box-sizing: border-box;
    }

    .incomplete-glow {
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      width: 180px;
      height: 80px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(245, 158, 11, 0) 70%);
      pointer-events: none;
    }

    .modal-close-x {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }
    .modal-close-x:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      transform: scale(1.05);
    }

    .incomplete-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 10px;
      font-weight: 850;
      color: #f59e0b;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .incomplete-avatar-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .incomplete-avatar-sprite {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      border: 3px solid rgba(245, 158, 11, 0.6);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 25px rgba(245, 158, 11, 0.25);
      background-color: #11141e;
    }

    .incomplete-avatar-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .incomplete-avatar-name {
      font-size: 18px;
      font-weight: 850;
      color: #fff;
      margin: 0;
    }

    .incomplete-quality-name {
      font-size: 12.5px;
      font-weight: 750;
      color: #f59e0b;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
    }

    .incomplete-requirement-box {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-sizing: border-box;
      text-align: left;
    }

    .req-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .req-label {
      font-size: 10px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .req-target-tag {
      font-size: 11px;
      font-weight: 850;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      padding: 2px 8px;
      border-radius: 8px;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }

    .req-description {
      font-size: 12px;
      color: #e2e8f0;
      line-height: 1.45;
      margin: 0;
      font-weight: 550;
    }

    .req-progress-track {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.07);
      border-radius: 6px;
      overflow: hidden;
      margin-top: 2px;
    }

    .req-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
      border-radius: 6px;
      transition: width 0.4s ease;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
    }

    .req-hint-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding-top: 4px;
    }

    .req-hint-text {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
      margin: 0;
    }

    .incomplete-modal-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      margin-top: 4px;
    }

    .btn-incomplete-cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #0f172a;
      text-decoration: none;
      font-size: 13px;
      font-weight: 850;
      padding: 12px 18px;
      border-radius: 12px;
      cursor: pointer;
      border: none;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
      transition: all 0.2s ease;
    }
    .btn-incomplete-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(245, 158, 11, 0.45);
      color: #0f172a;
    }

    .btn-incomplete-secondary {
      background: rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 16px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 750;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-incomplete-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .is-incomplete-btn {
      background: rgba(245, 158, 11, 0.12) !important;
      border: 1px solid rgba(245, 158, 11, 0.4) !important;
      color: #fbbf24 !important;
      cursor: pointer;
    }
    .is-incomplete-btn:hover {
      background: rgba(245, 158, 11, 0.2) !important;
      border-color: rgba(245, 158, 11, 0.6) !important;
      transform: translateY(-1px);
    }
    .btn-progress-badge {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      padding: 2px 7px;
      font-size: 10.5px;
      font-weight: 850;
      color: #fbbf24;
      margin: 0 4px;
    }

    .toast-popup-alert {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(18, 20, 30, 0.96) 0%, rgba(10, 12, 18, 0.98) 100%);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: 1.5px solid rgba(16, 185, 129, 0.65);
      padding: 12px 20px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
      font-size: 12.5px;
      font-weight: 700;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(16, 185, 129, 0.25);
      z-index: 999999;
      animation: toastSlideUpBounce 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      max-width: 500px;
      width: calc(100% - 32px);
      box-sizing: border-box;
    }

    .text-green { color: #10b981; }
    .text-red { color: #ef4444; }
    .text-cyan { color: #00f2fe; }
    .text-purple { color: #c084fc; }
    .text-yellow { color: #fbbf24; }
    .text-orange { color: #f97316; }

    @media (max-width: 900px) {
      .profile-page-wrapper {
        padding: 80px 16px 40px;
      }
      .clean-spotlight-card {
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 18px;
      }
      .tactical-metrics-row {
        grid-template-columns: 1fr;
      }
      .tactical-lore-row {
        grid-template-columns: 1fr;
      }
      .hero-visual-dock {
        min-height: auto;
        padding: 18px;
      }
      .user-details-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class Cualidades implements OnInit {
  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  Math = Math;
  isEditingProfile = signal<boolean>(false);
  selectedCategory = signal<string>('todos');
  inspectedAvatarId = signal<string>('');
  inspectedAvatar = computed<ComunidadAvatar>(() => {
    const id = this.inspectedAvatarId();
    if (id) {
      const found = this.allAvatars().find(a => a.id === id);
      if (found) return found;
    }
    return this.activeAvatar() || ({} as ComunidadAvatar);
  });

  inputName = signal<string>('');
  inputProfession = signal<string>('');
  selectedCountry = signal<string>('');
  selectedActiveDays = signal<number[]>([1, 2, 3, 4, 5]);
  usernameError = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  get weekDaysList() {
    const isEn = this.translation.currentLang() === 'en';
    return [
      { id: 1, label: isEn ? 'Mon' : 'Lun', full: isEn ? 'Monday' : 'Lunes' },
      { id: 2, label: isEn ? 'Tue' : 'Mar', full: isEn ? 'Tuesday' : 'Martes' },
      { id: 3, label: isEn ? 'Wed' : 'Mié', full: isEn ? 'Wednesday' : 'Miércoles' },
      { id: 4, label: isEn ? 'Thu' : 'Jue', full: isEn ? 'Thursday' : 'Jueves' },
      { id: 5, label: isEn ? 'Fri' : 'Vie', full: isEn ? 'Friday' : 'Viernes' },
      { id: 6, label: isEn ? 'Sat' : 'Sáb', full: isEn ? 'Saturday' : 'Sábado' },
      { id: 7, label: isEn ? 'Sun' : 'Dom', full: isEn ? 'Sunday' : 'Domingo' }
    ];
  }

  unlockedRewardQuality = signal<QualityItem | null>(null);
  inspectingIncompleteQuality = signal<ComunidadAvatar | null>(null);
  portraitZoomOrigin = signal<string>('center center');
  headerAvatarZoomOrigin = signal<string>('center center');

  countryOptions: CountryOption[] = [
    { name: 'México', code: 'MX', flag: '🇲🇽' },
    { name: 'España', code: 'ES', flag: '🇪🇸' },
    { name: 'Colombia', code: 'CO', flag: '🇨🇴' },
    { name: 'Argentina', code: 'AR', flag: '🇦🇷' },
    { name: 'Chile', code: 'CL', flag: '🇨🇱' },
    { name: 'Perú', code: 'PE', flag: '🇵🇪' },
    { name: 'Estados Unidos', code: 'US', flag: '🇺🇸' },
  ];

  sidebarCollapsed!: any;

  constructor(
    public membership: MembershipService,
    public translation: TranslationService
  ) {
    this.sidebarCollapsed = this.membership.sidebarCollapsed;
  }

  allAvatars = computed(() => {
    const unlockedList = this.membership.unlockedAvatars();
    const qualities = this.membership.qualitiesCatalog();
    const dynamicCatalog = this.membership.catalogItems();
    const lang = this.membership.userLanguage();

    let dynamicList: ComunidadAvatar[] = [];

    const PREMIUM_AVATAR_IDS = new Set(['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante']);
    const COIN_AVATAR_COSTS: Record<string, number> = {
      zorro: 1250,
      panda: 1650,
      oso: 2200,
      lobo: 3200,
      dragon: 4500
    };
    const STARTER_AVATARS = new Set(['gato', 'perro', 'conejo', 'raton', 'hamster', 'loro']);
    const EVOLVING_AVATAR_IDS = new Set(['tortuga', 'buho', 'zorro', 'dragon', 'lobo', 'rana', 'leon']);

    if (dynamicCatalog && dynamicCatalog.length > 0) {
      dynamicList = dynamicCatalog
        .filter(item => item.category === 'avatar' && item.id !== 'tortuga_evolved' && item.id !== 'tortuga_phase3')
        .map(item => {
          const type: 'inicial' | 'cualidad' | 'especial' | 'legendario' = 
            item.is_initial ? 'inicial' :
            (item.tier === 'Legendario' ? 'legendario' :
            (item.required_quality_id ? 'cualidad' : 'especial'));

          const archetypeText = item.archetype?.[lang] || item.archetype?.['es'] || item.tier;
          const archetypeBadge = (archetypeText || '').toUpperCase();

          const isCoinAvatar = COIN_AVATAR_COSTS[item.id] !== undefined;
          const isPremium = !isCoinAvatar && (PREMIUM_AVATAR_IDS.has(item.id) || (item.is_premium ?? false));
          const calibratedCost = COIN_AVATAR_COSTS[item.id] ?? (isPremium ? 0 : (item.cost_coins || 0));

          let unlockType: 'free' | 'merit' | 'coins' | 'premium' = 'free';
          if (item.required_quality_id) {
            unlockType = 'merit';
          } else if (isPremium) {
            unlockType = 'premium';
          } else if (calibratedCost > 0) {
            unlockType = 'coins';
          } else {
            unlockType = 'free';
          }

          const hasEvolution = EVOLVING_AVATAR_IDS.has(item.id);

          return {
            id: item.id,
            name: item.name?.[lang] || item.name?.['es'] || item.id,
            species: item.species?.[lang] || item.species?.['es'] || '',
            type,
            tier: item.tier,
            archetype: archetypeText,
            archetypeBadge: archetypeBadge,
            stars: item.stars,
            emoji: item.emoji,
            color: item.color,
            role: item.role?.[lang] || item.role?.['es'] || '',
            weaponName: item.weapon_name?.[lang] || item.weapon_name?.['es'] || '',
            focusApplication: item.focus_application?.[lang] || item.focus_application?.['es'] || '',
            tacticalQuote: item.tactical_quote?.[lang] || item.tactical_quote?.['es'] || '',
            coinsPerPomodoro: item.coins_per_pomodoro ?? this.membership.getAvatarCoinsPerPomodoro(item.id),
            pausePenaltyCoins: item.pause_penalty_coins ?? this.membership.getAvatarPausePenalty(item.id),
            bossDamagePoints: item.boss_damage_points ?? this.membership.getAvatarDamagePoints(item.id),
            bossHealPoints: item.boss_heal_points ?? this.membership.getAvatarHealPoints(item.id),
            passiveName: item.passive_name?.[lang] || item.passive_name?.['es'] || '',
            passiveAdvantage: this.formatPassiveAdvantage(
              item.passive_advantage?.[lang] || item.passive_advantage?.['es'] || '',
              item.coins_per_pomodoro ?? this.membership.getAvatarCoinsPerPomodoro(item.id),
              item.boss_damage_points ?? this.membership.getAvatarDamagePoints(item.id),
              lang
            ),
            cost: calibratedCost,
            isPremium,
            unlockType,
            qualityId: item.required_quality_id || null,
            qualityName: item.quality_name?.[lang] || item.quality_name?.['es'] || undefined,
            qualityReq: item.quality_req?.[lang] || item.quality_req?.['es'] || undefined,
            unlockTotal: qualities.find(q => q.id === item.required_quality_id)?.unlockTotal ??
                         (item.required_quality_id === 'constancia' ? 10 :
                         (item.required_quality_id === 'disciplina' ? 35 : 5)),
            hasEvolution,
            evolutionDetail: hasEvolution ? EVOLUTION_ITEMS_MAP[item.id] : undefined
          };
        });
    }

    const mapped = dynamicList.map(item => {
      let isUnlocked = false;
      const quality = item.qualityId ? qualities.find(q => q.id === item.qualityId) : null;
      let displayReq = item.qualityReq || '';

      if (item.qualityId && quality) {
        // STRICTLY MERIT: Retos de Honor nunca se desbloquean con membresía ni monedas
        const total = item.unlockTotal || quality.unlockTotal || 0;
        const progress = quality.unlockProgress || 0;

        if (unlockedList.includes(item.id)) {
          isUnlocked = true;
        }

        displayReq = item.qualityReq || `Demuestra la cualidad de ${quality.name}: ${quality.unlockRequirement} (Progreso: ${progress}/${total}).`;
      } else if (item.isPremium) {
        // Exclusivo VIP: Desbloqueado única y exclusivamente si el usuario cuenta con membresía o prueba activa de COFU Pro
        isUnlocked = this.membership.isPremium();
      } else if (item.type === 'inicial' || STARTER_AVATARS.has(item.id)) {
        isUnlocked = true;
      } else if (item.cost > 0) {
        isUnlocked = unlockedList.includes(item.id);
      } else {
        isUnlocked = unlockedList.includes(item.id);
      }

      return {
        ...item,
        isUnlocked,
        quality,
        displayName: item.qualityId && quality ? quality.name : (item.qualityName || ''),
        displayReq
      };
    });

    const typeWeight: Record<string, number> = {
      'inicial': 1,
      'cualidad': 2,
      'especial': 3,
      'legendario': 4
    };

    return mapped.sort((a, b) => {
      // 1. Disponibles / Desbloqueados primero (isUnlocked true antes de false)
      if (a.isUnlocked !== b.isUnlocked) {
        return a.isUnlocked ? -1 : 1;
      }
      // 2. Clasificación agrupada por Tipo (Iniciales -> Retos -> Cazadores -> Legendarios)
      const weightA = typeWeight[a.type] || 99;
      const weightB = typeWeight[b.type] || 99;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      // 3. Orden canónico dentro del grupo
      const indexA = ALL_AVATARS_LIST.indexOf(a.id);
      const indexB = ALL_AVATARS_LIST.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      return (a.cost || 0) - (b.cost || 0);
    });
  });

  activeAvatar = computed(() => {
    const currentId = this.membership.selectedAvatar();
    const found = this.allAvatars().find(a => a.id === currentId);
    return found || this.allAvatars()[0] || ({} as ComunidadAvatar);
  });

  visibleAvatars = computed(() => {
    const cat = this.selectedCategory();
    const list = this.allAvatars();
    if (cat === 'todos') return list;
    if (cat === 'desbloqueados') return list.filter(a => a.isUnlocked);
    return list.filter(a => a.type === cat);
  });

  groupedAvatars = computed<AvatarCategoryGroup[]>(() => {
    const cat = this.selectedCategory();
    const all = this.allAvatars();
    const pool = cat === 'desbloqueados' ? all.filter(a => a.isUnlocked) : (cat === 'todos' ? all : all.filter(a => a.type === cat));
    const isEn = this.translation.currentLang() === 'en';

    const categoryMeta: { type: string; name: string; badge: string; icon: string; color: string }[] = [
      { type: 'inicial', name: isEn ? 'Commons (Starters)' : 'Comunes (Iniciales)', badge: isEn ? 'Commons' : 'Comunes', icon: 'fa-solid fa-shield-cat', color: '#94a3b8' },
      { type: 'cualidad', name: isEn ? 'Quality Challenges' : 'Retos de Cualidad', badge: isEn ? 'Challenges' : 'Retos', icon: 'fa-solid fa-award', color: '#10b981' },
      { type: 'especial', name: isEn ? 'Special Hunters' : 'Cazadores Especiales', badge: isEn ? 'Hunters' : 'Cazadores', icon: 'fa-solid fa-paw', color: '#f59e0b' },
      { type: 'legendario', name: isEn ? 'Legendary Guardians' : 'Guardianes Legendarios', badge: isEn ? 'Legendaries' : 'Legendarios', icon: 'fa-solid fa-dragon', color: '#ef4444' }
    ];

    const groups: AvatarCategoryGroup[] = [];
    for (const meta of categoryMeta) {
      const groupAvatars = pool.filter(a => a.type === meta.type);
      if (groupAvatars.length > 0) {
        groups.push({
          ...meta,
          avatars: groupAvatars
        });
      }
    }
    return groups;
  });

  userLevel = computed(() => {
    const pomodoros = this.membership.focusTomatoes();
    return Math.floor(pomodoros / 4) + 1;
  });

  userRankTitle = computed(() => {
    const lvl = this.userLevel();
    const isEn = this.translation.currentLang() === 'en';
    if (lvl >= 30) return isEn ? 'Supreme Commander' : 'Comandante Supremo';
    if (lvl >= 20) return isEn ? 'Grand Master' : 'Gran Maestro';
    if (lvl >= 15) return isEn ? 'Elite Strategist' : 'Estratega Élite';
    if (lvl >= 10) return isEn ? 'Veteran Warrior' : 'Guerrero Veterano';
    if (lvl >= 5) return isEn ? 'Sentinel' : 'Centinela';
    return isEn ? 'Focus Recruit' : 'Recluta de Enfoque';
  });

  userHoursFocused = computed(() => {
    return (this.membership.focusTomatoes() * 0.42).toFixed(1);
  });

  hasCustomIdentity(): boolean {
    const prof = this.membership.userProfession();
    const country = this.membership.userCountry();
    return !!((prof && prof.trim()) || (country && country.trim()));
  }

  ngOnInit() {
    this.membership.loadMasterQualitiesFromSupabase();
    this.membership.syncProfileFromSupabase().then(() => {
      this.membership.syncUnlockedAvatarUrls();
    });
    this.membership.syncUnlockedAvatarUrls();
    this.inputName.set(this.membership.userName());
    this.inputProfession.set(this.membership.userProfession() || '');
    this.selectedCountry.set(this.membership.userCountry() || '');
    this.selectedActiveDays.set([...(this.membership.userActiveDays() || [1, 2, 3, 4, 5])]);
  }

  scrollCarousel(direction: 'left' | 'right') {
    if (this.carouselTrack?.nativeElement) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      this.carouselTrack.nativeElement.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  setFilter(category: string) {
    this.selectedCategory.set(category);
  }

  selectAvatar(avatar: ComunidadAvatar) {
    this.inspectedAvatarId.set(avatar.id);
    if (avatar.isUnlocked) {
      this.membership.ensureAvatarLoaded(avatar.id);
    }
  }

  equipAvatar(avatar: ComunidadAvatar) {
    if (avatar.isUnlocked) {
      this.membership.equipAvatar(avatar.id);
      const isEn = this.translation.currentLang() === 'en';
      this.showToast(isEn ? `You have chosen ${avatar.name} as your active guardian!` : `¡Has elegido a ${avatar.name} como tu guardián activo!`);
    }
  }

  getUnlockedAvatarsCount(): number {
    return this.allAvatars().filter(a => a.isUnlocked).length;
  }

  getUnlockedQualitiesCount(): number {
    return this.membership.qualitiesCatalog().filter(q => q.isUnlocked).length;
  }

  getCollectionPercent(): number {
    const total = this.allAvatars().length;
    if (!total) return 0;
    return Math.round((this.getUnlockedAvatarsCount() / total) * 100);
  }

  getHowToGetIcon(avatar?: ComunidadAvatar): string {
    if (!avatar || !avatar.id) return 'fa-solid fa-circle-question';
    if (avatar.unlockType === 'premium') return 'fa-solid fa-crown';
    if (avatar.unlockType === 'merit' || avatar.qualityId) return 'fa-solid fa-award';
    if (avatar.unlockType === 'coins' || avatar.cost > 0) return 'fa-solid fa-coins';
    return 'fa-solid fa-gift';
  }

  getHowToGetMethodTag(avatar?: ComunidadAvatar): string {
    const isEn = this.translation.currentLang() === 'en';
    if (!avatar || !avatar.id) return isEn ? 'Unlock Requirement' : 'Requisito de Obtención';
    if (avatar.unlockType === 'premium') return this.translation.t('cualidades.howToGetVipTag');
    if (avatar.unlockType === 'merit' || avatar.qualityId) {
      const qName = avatar.displayName || avatar.qualityName || (avatar.quality?.name) || (isEn ? 'Quality' : 'Cualidad');
      return this.translation.t('cualidades.howToGetChallenge', { name: qName });
    }
    if (avatar.unlockType === 'coins' || avatar.cost > 0) return this.translation.t('cualidades.howToGetStore');
    return this.translation.t('cualidades.howToGetInitial');
  }

  getHowToGetTitle(avatar?: ComunidadAvatar): string {
    const isEn = this.translation.currentLang() === 'en';
    if (!avatar || !avatar.id) return isEn ? 'Guardian Acquisition' : 'Obtención del Guardián';
    if (avatar.unlockType === 'premium') return this.translation.t('cualidades.howToGetTitleVip');
    if (avatar.unlockType === 'merit' || avatar.qualityId) {
      const qName = avatar.displayName || avatar.qualityName || (avatar.quality?.name) || (isEn ? 'Quality' : 'Cualidad');
      return this.translation.t('cualidades.howToGetTitleQuality', { name: qName });
    }
    if (avatar.unlockType === 'coins' || avatar.cost > 0) return this.translation.t('cualidades.howToGetTitleCost', { cost: avatar.cost }) + ' 🪙';
    return this.translation.t('cualidades.howToGetTitleInitial');
  }

  getHowToGetDescription(avatar?: ComunidadAvatar): string {
    const isEn = this.translation.currentLang() === 'en';
    if (!avatar || !avatar.id) return '';
    if (avatar.unlockType === 'premium') {
      return this.translation.t('cualidades.howToGetDescVip');
    }
    if (avatar.type === 'inicial' || avatar.unlockType === 'free') {
      return this.translation.t('cualidades.howToGetDescInitial');
    }
    if (avatar.qualityId) {
      if (avatar.displayReq) return avatar.displayReq;
      if (avatar.quality?.unlockRequirement) return avatar.quality.unlockRequirement;
      const qName = avatar.displayName || avatar.qualityName || (isEn ? 'quality' : 'cualidad');
      return this.translation.t('cualidades.howToGetDescQuality', { name: qName });
    }
    if (avatar.cost > 0) {
      return isEn 
        ? 'Accumulate Pro Coins by completing 25-minute Pomodoro sessions without pauses or distractions. Redeem it when you have enough coins!'
        : 'Acumula Pro Coins completando bloques Pomodoro de 25 minutos sin pausas ni distracciones. ¡Canjéalo cuando alcances las monedas requeridas!';
    }
    return isEn 
      ? 'Complete your daily productivity targets to unlock this avatar.'
      : 'Completa tus metas de productividad diaria para desbloquear este avatar.';
  }

  /**
   * Formatea dinámicamente la leyenda de la habilidad pasiva del avatar,
   * actualizando el número de Pro Coins para que refleje de forma reactiva el valor real.
   */
  formatPassiveAdvantage(raw: string | undefined | null, coins: number, bossDamage?: number, lang: string = 'es'): string {
    const isEn = lang === 'en';
    const coinsValue = coins ?? 10;
    
    if (!raw || raw.trim() === '') {
      return isEn 
        ? `Generates +${coinsValue} Pro Coins per pomodoro session.`
        : `Genera +${coinsValue} Pro Coins por bloque pomodoro.`;
    }

    let text = raw;

    // 1. Reemplazar "+10 Pro Coins", "+18 Pro Coins", "+26 Coins", "+60 Coins", "+10 monedas", etc.
    text = text.replace(/\+(\d+)\s*(Pro\s*Coins?|Coins?|monedas)/gi, (match, prevNum, unit) => {
      return `+${coinsValue} ${unit}`;
    });

    // 2. Reemplazar "con +30 monedas", "de +30 monedas", "with +30 coins"
    text = text.replace(/(\b(?:con|de|with)\s*\+?)(\d+)\s*(monedas|coins|Pro\s*Coins)/gi, (match, prefix, prevNum, unit) => {
      return `${prefix}${coinsValue} ${unit}`;
    });

    // 3. Reemplazar "Genera +12 Pro Coins", "Generates +12 Pro Coins" si no coincide con los anteriores
    text = text.replace(/(\b(?:genera|generates)\s*\+?)(\d+)\s*(Pro\s*Coins?|Coins?|monedas)/gi, (match, prefix, prevNum, unit) => {
      return `${prefix}${coinsValue} ${unit}`;
    });

    // 4. Si se especifica daño al boss, actualizar dinámicamente también el daño al jefe para consistencia
    if (bossDamage !== undefined && bossDamage !== null && bossDamage > 0) {
      text = text.replace(/\+(\d+)\s*(boss\s*damage|de\s*daño\s*al\s*jefe|de\s*daño|daño\s*al\s*jefe|daño\s*directo|daño\s*constante|daño\s*masivo|daño|damage|Pts\s*al\s*Jefe|Puntos\s*de\s*daño|Daño\s*Primordial|Daño\s*Solar|Daño\s*Astral|Daño\s*fulminante)/gi, (match, prevNum, unit) => {
        return `+${bossDamage} ${unit}`;
      });
    }

    return text;
  }

  /**
   * Obtiene la leyenda pasiva formateada dinámicamente para el avatar inspeccionado.
   */
  getDynamicPassiveAdvantage(avatar?: ComunidadAvatar): string {
    if (!avatar || !avatar.id) return '';
    const lang = this.membership.userLanguage();
    const coins = avatar.coinsPerPomodoro ?? this.membership.getAvatarCoinsPerPomodoro(avatar.id);
    const bossDmg = avatar.bossDamagePoints ?? this.membership.getAvatarDamagePoints(avatar.id);
    return this.formatPassiveAdvantage(avatar.passiveAdvantage, coins, bossDmg, lang);
  }

  getUnlockProgressCurrent(avatar?: ComunidadAvatar): number {
    if (!avatar || !avatar.qualityId) return 0;
    return avatar.quality?.unlockProgress || 0;
  }

  getUnlockProgressTotal(avatar?: ComunidadAvatar): number {
    if (!avatar) return 1;
    return avatar.unlockTotal || avatar.quality?.unlockTotal || 1;
  }

  getUnlockPercent(avatar?: ComunidadAvatar): number {
    if (!avatar) return 0;
    const total = this.getUnlockProgressTotal(avatar);
    if (!total || total <= 0) return 0;
    const cur = this.getUnlockProgressCurrent(avatar);
    return Math.min(100, Math.max(0, Math.round((cur / total) * 100)));
  }

  getEvolutionRelicName(avatar?: ComunidadAvatar): string {
    if (!avatar?.evolutionDetail) return '';
    const lang = this.membership.userLanguage();
    return avatar.evolutionDetail.relicName[lang === 'en' ? 'en' : 'es'] || avatar.evolutionDetail.relicName.es;
  }

  getMysteryFormTitle(avatar?: ComunidadAvatar): string {
    if (!avatar?.evolutionDetail) return '';
    const lang = this.membership.userLanguage();
    return avatar.evolutionDetail.mysteryForm[lang === 'en' ? 'en' : 'es'] || avatar.evolutionDetail.mysteryForm.es;
  }

  getEvolutionRelicDesc(avatar?: ComunidadAvatar): string {
    if (!avatar?.evolutionDetail) return '';
    const lang = this.membership.userLanguage();
    return avatar.evolutionDetail.relicDesc[lang === 'en' ? 'en' : 'es'] || avatar.evolutionDetail.relicDesc.es;
  }

  getEvolutionPerformanceHint(avatar?: ComunidadAvatar): string {
    if (!avatar?.evolutionDetail) return '';
    const lang = this.membership.userLanguage();
    return avatar.evolutionDetail.performanceHint[lang === 'en' ? 'en' : 'es'] || avatar.evolutionDetail.performanceHint.es;
  }

  getCountryFlag(countryName: string): string {
    const raw = (countryName || '').trim();
    if (!raw) return '📍';
    const opt = this.countryOptions.find(c => 
      c.name.toLowerCase() === raw.toLowerCase() ||
      c.code.toLowerCase() === raw.toLowerCase() ||
      raw.toLowerCase().startsWith(c.name.toLowerCase())
    );
    return opt ? opt.flag : '🌐';
  }

  getFormattedLastFocusText(): string {
    const raw = this.membership.lastFocusDate();
    if (!raw) return this.translation.t('cualidades.noPomodorosYet');
    
    const today = this.membership.getLocalDateKey(new Date());
    if (raw === today) return this.translation.t('cualidades.lastPomodoroToday');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = this.membership.getLocalDateKey(yesterday);
    if (raw === yestStr) return this.translation.t('cualidades.lastPomodoroYesterday');

    return this.translation.t('cualidades.lastPomodoroOn', { date: this.formatLastFocusDate(raw) });
  }

  formatLastFocusDate(rawDateStr?: string): string {
    const raw = rawDateStr || this.membership.lastFocusDate();
    if (!raw) return this.translation.currentLang() === 'en' ? 'No registered date' : 'Sin fecha registrada';
    const parts = raw.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const locale = this.translation.currentLang() === 'en' ? 'en-US' : 'es-ES';
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    }
    return raw;
  }

  getCleanCountry(): string {
    const raw = (this.membership.userCountry() || '').trim();
    if (!raw) return '';
    const opt = this.countryOptions.find(c => 
      c.name.toLowerCase() === raw.toLowerCase() ||
      c.code.toLowerCase() === raw.toLowerCase() ||
      raw.toLowerCase().startsWith(c.name.toLowerCase())
    );
    if (opt) return opt.name;
    return raw.replace(/\s*\([A-Za-z]{2,3}\)/g, '')
              .replace(/[\-,]\s*[A-Za-z]{2,3}$/g, '')
              .replace(/\b[A-Z]{2}\b/g, '')
              .replace(/["'\\]+/g, '')
              .replace(/\s+/g, ' ')
              .trim();
  }

  getCleanProfession(): string {
    const raw = this.membership.userProfession() || '';
    if (!raw.trim()) return '';
    let str = String(raw).trim();
    while (
      (str.startsWith('"') && str.endsWith('"') && str.length >= 2) ||
      (str.startsWith("'") && str.endsWith("'") && str.length >= 2) ||
      (str.startsWith('\\"') && str.endsWith('\\"')) ||
      (str.startsWith('\\') && str.length > 1)
    ) {
      if (str.startsWith('\\"') && str.endsWith('\\"')) {
        str = str.slice(2, -2).trim();
      } else if (
        (str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))
      ) {
        str = str.slice(1, -1).trim();
      } else if (str.startsWith('\\')) {
        str = str.replace(/^\\+|\\+$/g, '').trim();
      }
    }
    return str.replace(/["'\\]+/g, '').replace(/[\/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  toggleEditProfile() {
    this.isEditingProfile.set(!this.isEditingProfile());
    if (this.isEditingProfile()) {
      this.inputName.set(this.membership.userName());
      this.inputProfession.set(this.membership.userProfession() || '');
      this.selectedCountry.set(this.membership.userCountry() || '');
      this.selectedActiveDays.set([...(this.membership.userActiveDays() || [1, 2, 3, 4, 5])]);
      this.usernameError.set(null);
    }
  }

  isDaySelected(dayId: number): boolean {
    return this.selectedActiveDays().includes(dayId);
  }

  toggleActiveDay(dayId: number) {
    const current = [...this.selectedActiveDays()];
    if (current.includes(dayId)) {
      if (current.length <= 1) return;
      this.selectedActiveDays.set(current.filter(d => d !== dayId).sort((a, b) => a - b));
    } else {
      this.selectedActiveDays.set([...current, dayId].sort((a, b) => a - b));
    }
  }

  getTempActiveDaysSummary(): string {
    const isEn = this.translation.currentLang() === 'en';
    const raw = this.selectedActiveDays() || [];
    const days = [...raw].sort((a, b) => a - b);
    if (days.length === 0) return isEn ? 'No days selected' : 'Sin días seleccionados';
    if (days.length === 7) return isEn ? 'Monday to Sunday' : 'Lunes a Domingo';
    if (days.length === 5 && days[0] === 1 && days[1] === 2 && days[2] === 3 && days[3] === 4 && days[4] === 5) {
      return isEn ? 'Monday to Friday' : 'Lunes a Viernes';
    }
    if (days.length === 6 && days[0] === 1 && days[1] === 2 && days[2] === 3 && days[3] === 4 && days[4] === 5 && days[5] === 6) {
      return isEn ? 'Monday to Saturday' : 'Lunes a Sábado';
    }
    if (days.length === 2 && days.includes(6) && days.includes(7)) {
      return isEn ? 'Saturday and Sunday' : 'Sábado y Domingo';
    }
    const dayNames: { [k: number]: string } = isEn ? {
      1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun'
    } : {
      1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
    };
    return days.map(d => dayNames[d]).filter(Boolean).join(', ');
  }

  onUsernameInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.inputName.set(val);
    this.validateUsername(val);
  }

  onProfessionInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.inputProfession.set(val);
  }

  onCountrySelect(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCountry.set(val);
  }

  validateUsername(name: string) {
    const isEn = this.translation.currentLang() === 'en';
    const cleaned = name.trim();
    if (!cleaned) {
      this.usernameError.set(isEn ? 'Username cannot be empty.' : 'El nombre no puede estar vacío.');
      return;
    }
    if (cleaned.length > 22) {
      this.usernameError.set(isEn ? 'Maximum 22 characters.' : 'Máximo 22 caracteres.');
      return;
    }
    this.usernameError.set(null);
  }

  async saveProfileChanges() {
    const cleaned = this.inputName().trim();
    this.validateUsername(cleaned);
    if (this.usernameError()) return;

    let prof = (this.inputProfession() || '').replace(/["'\\]+/g, '').replace(/[\/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
    const activeDays = this.selectedActiveDays();
    this.membership.userName.set(cleaned);
    this.membership.userProfession.set(prof);
    this.membership.userCountry.set(this.selectedCountry());
    this.membership.userActiveDays.set(activeDays);
    await this.membership.saveSupabaseProfile(cleaned, this.membership.selectedAvatar(), this.selectedCountry(), undefined, prof, activeDays);
    this.isEditingProfile.set(false);
    this.showToast(this.translation.currentLang() === 'en' ? 'Profile updated successfully.' : 'Perfil actualizado correctamente.');
  }

  openIncompleteQualityModal(avatar: ComunidadAvatar) {
    this.inspectingIncompleteQuality.set(avatar);
  }

  openIncompleteQualityModalByQuality(quality: QualityItem) {
    const avatar = this.allAvatars().find(a => a.qualityId === quality.id) || null;
    if (avatar) {
      this.inspectedAvatarId.set(avatar.id);
      this.inspectingIncompleteQuality.set(avatar);
    }
  }

  closeIncompleteQualityModal() {
    this.inspectingIncompleteQuality.set(null);
  }

  handleQualityPillClick(q: QualityItem) {
    const relatedAvatar = this.allAvatars().find(a => a.qualityId === q.id);
    if (relatedAvatar) {
      this.inspectedAvatarId.set(relatedAvatar.id);
    }
    if (!q.isUnlocked) {
      if (relatedAvatar) {
        this.openIncompleteQualityModal(relatedAvatar);
      }
    }
  }

  getIncompleteQualityPercent(): number {
    const avatar = this.inspectingIncompleteQuality();
    if (!avatar || !avatar.quality) return 0;
    const current = avatar.quality.unlockProgress || 0;
    const total = avatar.quality.unlockTotal || 1;
    return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
  }

  getIncompleteQualityRemainingHint(): string {
    const avatar = this.inspectingIncompleteQuality();
    if (!avatar || !avatar.quality) return '';
    const current = avatar.quality.unlockProgress || 0;
    const total = avatar.quality.unlockTotal || 1;
    const remaining = Math.max(0, total - current);
    const isEn = this.translation.currentLang() === 'en';

    const isStreak = avatar.quality.id === 'constancia' || avatar.id === 'tortuga';
    if (isStreak) {
      if (isEn) {
        return `You need ${remaining} more consecutive active streak ${remaining === 1 ? 'day' : 'days'} to demonstrate your ${avatar.quality.name} and unlock this guardian in full color.`;
      }
      return `Te faltan ${remaining} ${remaining === 1 ? 'día' : 'días'} más de racha activa consecutiva para demostrar tu ${avatar.quality.name} y desbloquear este guardián a todo color.`;
    } else {
      if (isEn) {
        return `You need ${remaining} more completed focus ${remaining === 1 ? 'session' : 'sessions'} in the Focus Arena to demonstrate your ${avatar.quality.name} and unlock this guardian in full color.`;
      }
      return `Te faltan ${remaining} ${remaining === 1 ? 'sesión' : 'sesiones'} más de enfoque completadas en la Arena para demostrar tu ${avatar.quality.name} y desbloquear este guardián a todo color.`;
    }
  }

  claimQualityReward(quality: QualityItem) {
    const current = quality.unlockProgress || 0;
    const total = quality.unlockTotal || 1;
    if (current < total) {
      const avatar = this.allAvatars().find(a => a.qualityId === quality.id);
      if (avatar) {
        this.openIncompleteQualityModal(avatar);
      }
      return;
    }
    this.unlockedRewardQuality.set(quality);
  }

  simulateUnlockQuality(quality: QualityItem) {
    this.claimQualityReward(quality);
  }

  async closeRewardFlow() {
    const quality = this.unlockedRewardQuality();
    if (quality) {
      let maxTotal = quality.unlockTotal;
      this.membership.qualitiesCatalog.update(list => {
        return list.map(q => {
          if (q.id === quality.id) {
            const relatedAvatars = this.allAvatars().filter(a => a.qualityId === q.id);
            maxTotal = relatedAvatars.reduce((max, a) => Math.max(max, a.unlockTotal || 0), q.unlockTotal);
            const locale = this.translation.currentLang() === 'en' ? 'en-US' : 'es-ES';
            return {
              ...q,
              isUnlocked: true,
              unlockProgress: maxTotal,
              unlockedAt: new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
            };
          }
          return q;
        });
      });
      
      const relatedAvatars = this.allAvatars().filter(a => a.qualityId === quality.id);
      const unlockedIds = this.membership.unlockedAvatars();
      const newlyUnlocked = relatedAvatars
        .filter(a => (a.unlockTotal || 0) <= maxTotal && !unlockedIds.includes(a.id))
        .map(a => a.id);

      if (newlyUnlocked.length > 0) {
        this.membership.unlockedAvatars.update(list => [...list, ...newlyUnlocked]);

        // 1. Persistir avance en Supabase (RPC advance_user_quality_progress adjudica en user_unlocked_items)
        try {
          await this.membership.advanceQuality(quality.id, maxTotal);
        } catch (e) {
          console.warn('[Cualidades] Error persistiendo avance en Supabase:', e);
        }

        // 2. Ahora que ya está en user_unlocked_items, cargar la URL firmada del bucket privado
        await Promise.all(newlyUnlocked.map(id => this.membership.ensureAvatarLoaded(id)));
        this.membership.saveConsolidatedUserData();
      }
      const isEn = this.translation.currentLang() === 'en';
      this.showToast(isEn ? `Quality ${quality.name} proven!` : `¡Cualidad ${quality.name} demostrada!`);
    }
    this.unlockedRewardQuality.set(null);
  }

  async buyAvatar(avatar: ComunidadAvatar) {
    if (this.membership.proCoins() >= avatar.cost) {
      const res = await this.membership.unlockAvatar(avatar.id, avatar.cost);
      if (res.success) {
        this.selectAvatar({ ...avatar, isUnlocked: true });
        const isEn = this.translation.currentLang() === 'en';
        this.showToast(isEn ? `${avatar.name} successfully unlocked!` : `¡${avatar.name} desbloqueado exitosamente!`);
      } else {
        const errorMsg = res.error === 'Monedas insuficientes'
          ? 'No tienes suficientes Pro Coins registradas en Supabase.'
          : (res.error || 'Error al procesar la compra en el servidor.');
        this.showToast(`❌ ${errorMsg}`);
      }
    }
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  onPortraitMouseMove(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    this.portraitZoomOrigin.set(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }

  onPortraitMouseLeave() {
    this.portraitZoomOrigin.set('center center');
  }

  onHeaderAvatarMouseMove(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    this.headerAvatarZoomOrigin.set(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }

  onHeaderAvatarMouseLeave() {
    this.headerAvatarZoomOrigin.set('center center');
  }
}
