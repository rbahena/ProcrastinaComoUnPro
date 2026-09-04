import { Component, OnInit, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MembershipService, AvatarItem, QualityItem } from '../../services/membership.service';
import { Navbar } from '../../components/navbar/navbar';

export type GuardianArchetype = 'Inicial' | 'Cualidad' | 'Cazador' | 'Alto Riesgo';

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
  lore: string;
  weaponName: string;
  weaponDesc: string;
  focusApplication: string;
  tacticalQuote: string;
  coinsPerPomodoro: number;
  pausePenaltyCoins: number;
  bossDamagePoints: number;
  bossHealPoints: number;
  passiveName: string;
  passiveAdvantage: string;
  passiveCondition: string;
  passiveBestFor: string;
  cost: number;
  qualityId: string | null;
  qualityName?: string;
  qualityReq?: string;
  unlockTotal?: number;
  isUnlocked?: boolean;
  quality?: QualityItem | null;
  displayReq?: string;
  hasEvolution?: boolean;
}

interface CountryOption {
  name: string;
  code: string;
  flag: string;
}

@Component({
  selector: 'app-cualidades',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar],
  template: `
    <app-navbar></app-navbar>

    <div class="profile-page-wrapper">
      <div class="profile-layout-container">
        
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
                {{ membership.isPremium() ? 'Plan Pro ✦' : 'Plan Básico' }}
              </span>
            </div>

            <!-- CUERPO DE PERFIL CON AVATAR CIRCULAR SUPERPUESTO -->
            <div class="profile-body-content">
              
              <div class="avatar-overlapping-wrapper">
                <div class="round-avatar-frame" 
                     (click)="toggleEditProfile()"
                     title="Cambiar Avatar / Editar Perfil"
                     [style.border-color]="activeAvatar().color"
                     [style.background]="'radial-gradient(circle at center, ' + activeAvatar().color + '55 0%, ' + activeAvatar().color + '1a 60%, #121620 90%)'"
                     [style.box-shadow]="'0 8px 24px rgba(0, 0, 0, 0.55), 0 0 25px ' + activeAvatar().color + '66'">
                  <div [class]="'avatar-sprite sprite-circle sprite-' + membership.selectedAvatar()"></div>
                </div>
                <button class="avatar-circle-edit-btn" 
                        (click)="toggleEditProfile()" 
                        title="Editar Avatar y Perfil"
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

                  <p class="user-profession-line">
                    <span class="user-profession-txt">{{ getCleanProfession() }}</span>
                  </p>

                  <p class="user-location-line">
                    <span class="country-flag-icon">{{ getCountryFlag(membership.userCountry()) }}</span>
                    <span class="country-name-txt">{{ getCleanCountry() }}</span>
                  </p>

                  <p class="user-active-week-line">
                    <span class="active-week-txt" title="Días activos para el control de rachas">
                      <strong class="week-summary-highlight">{{ membership.getActiveDaysSummary() }}</strong>
                    </span>
                  </p>
                </div>

                <!-- TELEMETRÍA EN LÍNEA -->
                <div class="user-inline-telemetry">
                  <div class="tele-pill tomato-pill" [class.is-zero]="membership.focusTomatoes() === 0" data-tooltip="1 tomate por cada sesión completada">
                    <span class="tele-icon">🍅</span>
                    <span class="tele-num">{{ membership.focusTomatoes() }}</span>
                  </div>

                  <div class="tele-pill coin-pill" data-tooltip="Monedas de concentración obtenidas">
                    <span class="tele-icon"><i class="fa-solid fa-coins"></i></span>
                    <span class="tele-num">{{ membership.proCoins() }}</span>
                  </div>

                  <div class="tele-pill streak-pill" data-tooltip="Días consecutivos enfocándote">
                    <span class="tele-icon"><i class="fa-solid fa-fire"></i></span>
                    <span class="tele-num">{{ membership.streak() }}</span>
                  </div>

                  <div class="tele-pill trophy-pill gold-pill" [class.is-zero]="membership.goldMedals() === 0" data-tooltip="Trofeos de oro ganados">
                    <span class="tele-icon"><i class="fa-solid fa-trophy"></i></span>
                    <span class="tele-num">{{ membership.goldMedals() }}</span>
                  </div>

                  <div class="tele-pill medal-pill silver-pill" [class.is-zero]="membership.silverMedals() === 0" data-tooltip="Medallas de plata ganadas">
                    <span class="tele-icon"><i class="fa-solid fa-medal"></i></span>
                    <span class="tele-num">{{ membership.silverMedals() }}</span>
                  </div>

                  <div class="tele-pill medal-pill bronze-pill" [class.is-zero]="membership.bronzeMedals() === 0" data-tooltip="Medallas de bronce ganadas">
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
              <div class="skills-lead-indicator" title="Cualidades de Honor">
                <i class="fa-solid fa-award"></i>
                <span class="skills-counter-badge">{{ getUnlockedQualitiesCount() }}/{{ membership.qualitiesCatalog().length }}</span>
              </div>

              <div class="skills-pills-matrix">
                <div 
                  *ngFor="let q of membership.qualitiesCatalog()" 
                  class="quality-skill-pill"
                  [class.is-unlocked]="q.isUnlocked"
                  [title]="q.name + (q.isUnlocked ? ' (Desbloqueada)' : ': ' + q.unlockRequirement)"
                >
                  <span class="pill-icon">{{ membership.getEmoji(q.animal) }}</span>
                  <span class="pill-name">{{ q.name }}</span>
                  <span class="pill-status-dot" *ngIf="q.isUnlocked">✓</span>
                  <span class="pill-progress-tag" *ngIf="!q.isUnlocked">{{ q.unlockProgress }}/{{ q.unlockTotal }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ==================================================== -->
        <!-- 2. SECCIÓN: CHARACTER TO PLAY (CARRUSEL AVATAR.PNG)   -->
        <!-- ==================================================== -->
        <div class="character-to-play-section">
          
          <div class="carousel-header-bar">
            <div class="carousel-title-group">
              <span class="carousel-subtag">// ROSTER SELECTION</span>
              <h2 class="carousel-main-title">Character to play</h2>
            </div>

            <!-- CONTROLES: FILTROS Y FLECHAS DE NAVEGACIÓN -->
            <div class="carousel-controls-group">
              <div class="category-filter-chips">
                <button (click)="setFilter('todos')" [class.active]="selectedCategory() === 'todos'">Todos ({{ allAvatars().length }})</button>
                <button (click)="setFilter('desbloqueados')" [class.active]="selectedCategory() === 'desbloqueados'">En Escuadra ({{ getUnlockedAvatarsCount() }})</button>
                <button (click)="setFilter('inicial')" [class.active]="selectedCategory() === 'inicial'">Comunes</button>
                <button (click)="setFilter('cualidad')" [class.active]="selectedCategory() === 'cualidad'">🛡️ Retos</button>
                <button (click)="setFilter('especial')" [class.active]="selectedCategory() === 'especial'">🎯 Cazadores</button>
                <button (click)="setFilter('legendario')" [class.active]="selectedCategory() === 'legendario'">🔥 Legendarios</button>
              </div>

              <div class="carousel-nav-arrows">
                <button class="btn-carousel-arrow" (click)="scrollCarousel('left')" title="Anterior">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button class="btn-carousel-arrow" (click)="scrollCarousel('right')" title="Siguiente">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- REEL DE CARTAS VERTICALES TIPO TRADING CARD (INSPIRADO EN AVATAR.PNG) -->
          <div class="carousel-deck-wrapper">
            <div class="carousel-cards-track" #carouselTrack>
              
              <div 
                *ngFor="let avatar of visibleAvatars()"
                (click)="selectAvatar(avatar)"
                class="vertical-hero-card"
                [class.is-active]="inspectedAvatar().id === avatar.id"
                [class.is-equipped]="membership.selectedAvatar() === avatar.id"
                [class.is-locked]="!avatar.isUnlocked"
                [style.--card-theme]="avatar.color"
              >
                <!-- AURA DE FONDO -->
                <div class="hero-card-glow" [style.background]="'radial-gradient(circle at 50% 30%, ' + avatar.color + '55 0%, transparent 75%)'"></div>
                
                <!-- BADGES SUPERIORES -->
                <div class="hero-card-top-badges">
                  <span class="card-tier-pill" [class]="'tier-' + avatar.tier.toLowerCase()">
                    ★ {{ avatar.tier }}
                  </span>
                  <span class="card-evo-badge" *ngIf="avatar.hasEvolution">🧬 EVO</span>
                  
                  <span class="card-state-pill" *ngIf="membership.selectedAvatar() === avatar.id" title="Activo">
                    <i class="fa-solid fa-shield-check"></i>
                  </span>
                  <span class="card-state-pill is-lock" *ngIf="!avatar.isUnlocked" title="Bloqueado">
                    <i class="fa-solid fa-lock"></i>
                  </span>
                </div>

                <!-- SPRITE DEL PERSONAJE DENTRO DE LA CARTA -->
                <div class="hero-card-artwork-frame">
                  <div [class]="'avatar-sprite hero-card-sprite sprite-' + avatar.id"></div>
                </div>

                <!-- OVERLAY INFERIOR CON NOMBRE Y SUBTÍTULO -->
                <div class="hero-card-footer-glass">
                  <h4 class="hero-card-name">{{ avatar.name }}</h4>
                  <span class="hero-card-role-sub">as {{ avatar.role }}</span>
                  
                  <div class="hero-card-status-strip" [class.unlocked]="avatar.isUnlocked">
                    <span *ngIf="membership.selectedAvatar() === avatar.id">ACTIVO EN PERFIL</span>
                    <span *ngIf="membership.selectedAvatar() !== avatar.id && avatar.isUnlocked">EN TU ESCUADRA</span>
                    <span *ngIf="!avatar.isUnlocked">BLOQUEADO</span>
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

        <!-- ==================================================== -->
        <!-- 3. SECCIÓN: CHARACTER SELECT & DOSSIER (AVATAR.PNG & CARD.PNG) -->
        <!-- ==================================================== -->
        <div class="character-select-spotlight-section" [style.--accent-color]="inspectedAvatar().color">
          
          <div class="spotlight-cinematic-container">
            
            <!-- COLUMNA IZQUIERDA: DOSSIER TÁCTICO, LORE & PROTOCOLOS -->
            <div class="spotlight-left-dossier">
              
              <div class="dossier-header-box">
                <span class="dossier-specimen-subtag">// SPECIMEN ARCHIVE & TACTICAL DOSSIER</span>
                <h3 class="dossier-character-title">{{ inspectedAvatar().name | uppercase }}</h3>
                <p class="dossier-species-desc">{{ inspectedAvatar().species }} — <strong>{{ inspectedAvatar().role }}</strong></p>
                
                <div class="dossier-badges-list">
                  <span class="dossier-badge-pill" [class]="'tier-' + inspectedAvatar().tier.toLowerCase()">
                    ★ RANGO {{ inspectedAvatar().tier | uppercase }}
                  </span>
                  <span class="dossier-badge-pill archetype-pill">
                    {{ inspectedAvatar().archetypeBadge }}
                  </span>
                  <span class="dossier-badge-pill squad-pill" [class.is-unlocked]="inspectedAvatar().isUnlocked">
                    <i [class]="inspectedAvatar().isUnlocked ? 'fa-solid fa-shield-check' : 'fa-solid fa-lock'"></i>
                    {{ inspectedAvatar().isUnlocked ? 'EN TU ESCUADRA' : 'BLOQUEADO' }}
                  </span>
                </div>
              </div>

              <!-- LORE NARRATIVO DEL PERSONAJE -->
              <div class="dossier-lore-box">
                <p class="lore-text-paragraph">{{ inspectedAvatar().lore }}</p>
              </div>

              <!-- PROTOCOLO PSICOLÓGICO / HACK ANTI-PROCRASTINACIÓN -->
              <div class="dossier-psych-card">
                <div class="psych-card-head">
                  <i class="fa-solid fa-brain text-purple"></i>
                  <span>PROTOCOLO PSICOLÓGICO // HACK ANTI-PROCRASTINACIÓN</span>
                </div>
                <p class="psych-card-body">{{ inspectedAvatar().focusApplication }}</p>
              </div>

              <!-- DUAL COMBAT HUD (SI COMPLETAS / SI ABANDONAS) -->
              <div class="dossier-combat-hud-grid">
                <div class="combat-pill win-combat-pill">
                  <span class="combat-tag text-green"><i class="fa-solid fa-circle-check"></i> SI COMPLETAS</span>
                  <div class="combat-values">
                    <strong class="text-green">+{{ inspectedAvatar().coinsPerPomodoro }} 🪙 Coins</strong>
                    <small>⚔️ {{ inspectedAvatar().bossDamagePoints }} Pts Daño al Jefe</small>
                  </div>
                </div>

                <div class="combat-pill fail-combat-pill">
                  <span class="combat-tag text-red"><i class="fa-solid fa-circle-xmark"></i> SI ABANDONAS</span>
                  <div class="combat-values">
                    <strong class="text-red">-{{ inspectedAvatar().pausePenaltyCoins }} 🪙 Coins</strong>
                    <small class="text-red">🩸 +{{ inspectedAvatar().bossHealPoints }} HP Jefe</small>
                  </div>
                </div>
              </div>

              <!-- MATRIZ DE PASIVA TÁCTICA -->
              <div class="dossier-passive-panel">
                <div class="passive-panel-head">
                  <i class="fa-solid fa-bolt text-cyan"></i>
                  <span class="passive-panel-title">EFECTO TÁCTICO // HABILIDAD PASIVA:</span>
                  <strong class="passive-name-strong">{{ inspectedAvatar().passiveName }}</strong>
                </div>

                <div class="passive-details-triad">
                  <div class="triad-item">
                    <span class="triad-label text-green"><i class="fa-solid fa-plus"></i> Ventaja:</span>
                    <p>{{ inspectedAvatar().passiveAdvantage }}</p>
                  </div>
                  <div class="triad-item">
                    <span class="triad-label text-red"><i class="fa-solid fa-minus"></i> Riesgo:</span>
                    <p>{{ inspectedAvatar().passiveCondition }}</p>
                  </div>
                  <div class="triad-item">
                    <span class="triad-label text-cyan"><i class="fa-solid fa-crosshairs"></i> Momento Ideal:</span>
                    <p>{{ inspectedAvatar().passiveBestFor }}</p>
                  </div>
                </div>
              </div>

              <!-- BOTÓN DE ACCIÓN Y CITA TÁCTICA -->
              <div class="dossier-action-footer">
                <div class="action-cta-wrap">
                  <button 
                    *ngIf="membership.selectedAvatar() === inspectedAvatar().id" 
                    class="btn-dossier-cta is-active-equipped" 
                    disabled
                  >
                    <i class="fa-solid fa-shield-halved"></i> GUARDIÁN ACTIVO EN TU PERFIL ✓
                  </button>

                  <button 
                    *ngIf="inspectedAvatar().isUnlocked && membership.selectedAvatar() !== inspectedAvatar().id" 
                    (click)="equipAvatar(inspectedAvatar())" 
                    class="btn-dossier-cta is-equip-btn"
                  >
                    <i class="fa-solid fa-paw"></i> DESPLEGAR Y EQUIPAR GUARDIÁN
                    <i class="fa-solid fa-arrow-right"></i>
                  </button>

                  <button 
                    *ngIf="!inspectedAvatar().isUnlocked && inspectedAvatar().qualityId && inspectedAvatar().quality" 
                    (click)="simulateUnlockQuality(inspectedAvatar().quality!)" 
                    class="btn-dossier-cta is-challenge-btn"
                  >
                    <i class="fa-solid fa-wand-magic-sparkles"></i> DEMOSTRAR CUALIDAD (TEST)
                    <i class="fa-solid fa-arrow-right"></i>
                  </button>

                  <button 
                    *ngIf="!inspectedAvatar().isUnlocked && !inspectedAvatar().qualityId && inspectedAvatar().cost > 0" 
                    (click)="buyAvatar(inspectedAvatar())" 
                    class="btn-dossier-cta is-buy-btn"
                    [disabled]="membership.proCoins() < inspectedAvatar().cost"
                  >
                    <i class="fa-solid fa-coins"></i> 
                    {{ membership.proCoins() >= inspectedAvatar().cost ? 'CANJEAR POR ' + inspectedAvatar().cost + ' PRO COINS' : 'FALTAN ' + (inspectedAvatar().cost - membership.proCoins()) + ' COINS' }}
                    <i class="fa-solid fa-arrow-right"></i>
                  </button>
                </div>

                <div class="dossier-quote-box">
                  <i class="fa-solid fa-quote-left quote-icon text-cyan"></i>
                  <p class="quote-text">“{{ inspectedAvatar().tacticalQuote }}”</p>
                </div>
              </div>

            </div>

            <!-- COLUMNA DERECHA: ESCENARIO CINEMÁTICO CON CALLOUTS (AVATAR.PNG) -->
            <div class="spotlight-right-stage">
              
              <div class="cinematic-stage-card"
                   [style.background]="'radial-gradient(ellipse at 50% 50%, ' + inspectedAvatar().color + '33 0%, ' + inspectedAvatar().color + '10 40%, rgba(10, 14, 22, 0.95) 85%)'">
                
                <!-- AURA DE ENERGÍA CÓSMICA -->
                <div class="stage-energy-aura" [style.background]="'radial-gradient(circle at 50% 50%, ' + inspectedAvatar().color + '77 0%, transparent 65%)'"></div>
                
                <!-- TÍTULO SUPERIOR CHARACTER SELECT -->
                <div class="stage-header-title">
                  <span class="stage-select-sub">// FOCUS GUARDIAN</span>
                  <h2 class="stage-select-main">CHARACTER SELECT</h2>
                </div>

                <!-- CONTENEDOR DEL HERO Y LOS PUNTEROS INTERACTIVOS (CALLOUTS) -->
                <div class="stage-hero-center-dock">
                  
                  <!-- PUNTERO 1: ARMA / HERRAMIENTA TÁCTICA -->
                  <div class="annotation-callout callout-weapon">
                    <div class="callout-card">
                      <div class="callout-header">
                        <i class="fa-solid fa-wand-magic text-cyan"></i>
                        <strong>{{ inspectedAvatar().weaponName }}</strong>
                      </div>
                      <p class="callout-desc">{{ inspectedAvatar().weaponDesc }}</p>
                    </div>
                    <div class="callout-pointer-line">
                      <div class="pointer-dot"></div>
                      <div class="pointer-arm"></div>
                    </div>
                  </div>

                  <!-- PERSONAJE FLOTANTE EN SU PLATAFORMA HOLOGRÁFICA -->
                  <div class="hero-character-floating-wrap">
                    <div [class]="'avatar-sprite frameless-hero-sprite sprite-' + inspectedAvatar().id"></div>
                    <div class="hologram-disk-platform" [style.--glow-color]="inspectedAvatar().color"></div>
                  </div>

                  <!-- PUNTERO 2: HABILIDAD PASIVA / EFECTO -->
                  <div class="annotation-callout callout-passive">
                    <div class="callout-pointer-line">
                      <div class="pointer-dot"></div>
                      <div class="pointer-arm"></div>
                    </div>
                    <div class="callout-card">
                      <div class="callout-header">
                        <i class="fa-solid fa-bolt text-yellow"></i>
                        <strong>{{ inspectedAvatar().passiveName }}</strong>
                      </div>
                      <p class="callout-desc">{{ inspectedAvatar().passiveAdvantage }}</p>
                    </div>
                  </div>

                  <!-- PUNTERO 3: RATING Y PODER (ESTRELLAS) -->
                  <div class="annotation-callout callout-rating">
                    <div class="callout-card">
                      <div class="rating-row">
                        <span class="rating-label">Rate :</span>
                        <div class="rating-stars-list">
                          <i *ngFor="let s of [1,2,3,4,5]" 
                             class="fa-solid fa-star" 
                             [class.is-lit]="s <= inspectedAvatar().stars"></i>
                        </div>
                      </div>
                      <span class="rating-archetype-sub">{{ inspectedAvatar().archetype }} • {{ inspectedAvatar().tier }}</span>
                    </div>
                  </div>

                </div>

                <!-- NOMBRE GRANDE INFERIOR ESTILO CINEMÁTICO -->
                <div class="stage-footer-character-name">
                  <span class="cinematic-name-glow">{{ inspectedAvatar().name | uppercase }}</span>
                </div>

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
              <h3><i class="fa-solid fa-user-pen text-cyan"></i> Ajustes de Perfil</h3>
              <button class="modal-close-btn" (click)="toggleEditProfile()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-window-body">
              <div class="form-group-item">
                <label>Nombre de Usuario</label>
                <input 
                  type="text" 
                  [value]="inputName()"
                  (input)="onUsernameInput($event)"
                  placeholder="Tu nombre de usuario"
                  class="text-input-field"
                />
                <span class="form-error-msg" *ngIf="usernameError()">{{ usernameError() }}</span>
              </div>
              <div class="form-group-item">
                <label>Profesión</label>
                <input 
                  type="text" 
                  [value]="inputProfession()"
                  (input)="onProfessionInput($event)"
                  placeholder="Tu profesión o actividad"
                  class="text-input-field"
                />
              </div>
              <div class="form-group-item">
                <label>País</label>
                <select [value]="selectedCountry()" (change)="onCountrySelect($event)" class="select-input-field">
                  <option *ngFor="let country of countryOptions" [value]="country.name">
                    {{ country.flag }} {{ country.name }}
                  </option>
                </select>
              </div>

              <!-- CONTROL DE SEMANA ACTIVA (CONTROL DE RACHAS) -->
              <div class="form-group-item active-week-form-section">
                <div class="active-days-header-line">
                  <label><i class="fa-regular fa-calendar-days text-green"></i> Semana Activa</label>
                  <span class="active-days-summary-pill">{{ getTempActiveDaysSummary() }}</span>
                </div>
                <p class="form-helper-desc">
                  Elige los días de la semana en que te enfocarás. En los días desactivados tu racha estará protegida y no se reiniciará.
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
              <button (click)="toggleEditProfile()" class="btn-ghost-cancel">Cancelar</button>
              <button (click)="saveProfileChanges()" class="btn-save-confirm">Guardar Cambios</button>
            </div>
          </div>
        </div>

        <!-- PANTALLA RECOMPENSA DE DESBLOQUEO EXITOSO -->
        <div class="unlock-success-overlay" *ngIf="unlockedRewardQuality()" (click)="closeRewardFlow()">
          <div class="unlock-success-card" (click)="$event.stopPropagation()">
            <div class="success-glow"></div>
            <span class="success-badge">¡CUALIDAD DEMOSTRADA!</span>
            <div [class]="'avatar-sprite sprite-reward sprite-' + unlockedRewardQuality()?.animal"></div>
            <h3 class="reward-title">Cualidad Desbloqueada</h3>
            <span class="success-quality">{{ unlockedRewardQuality()?.name }}</span>
            <p class="reward-description">
              Has demostrado la cualidad de <strong>{{ unlockedRewardQuality()?.name }}</strong>. El guardián correspondiente ahora está disponible en tu colección.
            </p>
            <button (click)="closeRewardFlow()" class="btn-equip-now-action">
              Continuar <i class="fa-solid fa-circle-check"></i>
            </button>
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
      gap: 26px;
    }

    /* CONTENEDOR SUPERIOR DE PERFIL */
    .profile-upper-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
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
      height: 135px;
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
      padding: 0 28px 24px;
      position: relative;
    }

    .avatar-overlapping-wrapper {
      position: relative;
      width: 105px;
      height: 105px;
      margin-top: -52px;
      margin-bottom: 12px;
      z-index: 10;
    }
    .round-avatar-frame {
      width: 105px;
      height: 105px;
      border-radius: 50%;
      border: 4px solid #121620;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
      transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease, transform 0.2s ease;
    }
    .round-avatar-frame:hover {
      transform: scale(1.03);
    }
    .sprite-circle {
      width: 98px;
      height: 98px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
    }
    .avatar-circle-edit-btn {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid #0f172a;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
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
      gap: 4px;
      min-width: 0;
    }
    .user-name-title-row {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }
    .user-display-name {
      font-size: 24px;
      font-weight: 850;
      color: #fff;
      margin: 0;
      letter-spacing: -0.4px;
      line-height: 1.15;
    }
    .user-profession-line {
      display: flex;
      align-items: center;
      margin: 2px 0 1px;
      line-height: 1.4;
    }
    .user-profession-txt {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 14.5px;
      font-weight: 650;
      color: #f1f5f9;
      letter-spacing: -0.2px;
    }
    .user-location-line {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 1px 0;
      line-height: 1.4;
    }
    .country-flag-icon {
      font-size: 14.5px;
      line-height: 1;
    }
    .country-name-txt {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
      letter-spacing: -0.1px;
    }
    .user-active-week-line {
      display: flex;
      align-items: center;
      margin: 2px 0 0;
      line-height: 1.4;
    }
    .active-week-txt {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
    }
    .week-summary-highlight {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11.5px;
      font-weight: 550;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1.5px 7px;
      border-radius: 6px;
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
    .tele-icon i {
      font-size: 11.5px;
    }
    .tele-num {
      font-size: 13px;
      font-weight: 850;
      color: #f8fafc;
      letter-spacing: -0.2px;
      line-height: 1;
    }
    .tomato-pill .tele-num { color: #f87171; }
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
    .tele-pill.is-zero .tele-num {
      color: #64748b;
    }

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
      padding: 10px 16px;
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
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .quality-skill-pill:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
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
      gap: 14px;
      width: 100%;
    }

    .carousel-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }
    .carousel-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .carousel-subtag {
      font-size: 9.5px;
      font-weight: 800;
      color: var(--accent, #00f2fe);
      letter-spacing: 1px;
      font-family: monospace;
    }
    .carousel-main-title {
      font-size: 22px;
      font-weight: 900;
      color: #fff;
      margin: 0;
      letter-spacing: -0.3px;
      font-family: 'Space Grotesk', sans-serif;
    }

    .carousel-controls-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .category-filter-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .category-filter-chips button {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      padding: 6px 13px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 750;
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
      box-shadow: 0 0 12px rgba(0, 242, 254, 0.2);
    }

    .carousel-nav-arrows {
      display: flex;
      gap: 6px;
    }
    .btn-carousel-arrow {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-carousel-arrow:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.25);
    }

    /* DECK DE CARTAS VERTICALES */
    .carousel-deck-wrapper {
      position: relative;
      width: 100%;
      overflow: hidden;
      padding: 10px 4px 18px;
    }
    .carousel-cards-track {
      display: flex;
      gap: 14px;
      overflow-x: auto;
      scroll-behavior: smooth;
      padding-bottom: 8px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }
    .carousel-cards-track::-webkit-scrollbar {
      height: 5px;
    }
    .carousel-cards-track::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 10px;
    }

    /* TARJETA VERTICAL HERO (AVATAR.PNG) */
    .vertical-hero-card {
      flex: 0 0 156px;
      height: 228px;
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
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      user-select: none;
    }
    .vertical-hero-card:hover {
      transform: translateY(-6px);
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.6);
    }
    .vertical-hero-card.is-active {
      transform: translateY(-9px) scale(1.03);
      border-color: var(--card-theme, var(--accent));
      box-shadow: 0 0 24px var(--card-theme, rgba(0, 242, 254, 0.4)), 0 16px 36px rgba(0, 0, 0, 0.7);
    }
    .vertical-hero-card.is-locked {
      opacity: 0.65;
    }
    .vertical-hero-card.is-locked .hero-card-sprite {
      filter: grayscale(1) brightness(0.6);
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
      padding: 8px 10px;
    }
    .card-tier-pill {
      font-size: 8px;
      font-weight: 900;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .card-tier-pill.tier-común { background: rgba(156, 163, 175, 0.2); color: #e2e8f0; border: 1px solid rgba(156, 163, 175, 0.3); }
    .card-tier-pill.tier-raro { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.35); }
    .card-tier-pill.tier-épico { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); }
    .card-tier-pill.tier-legendario { background: rgba(251, 191, 36, 0.2); color: #fde047; border: 1px solid rgba(251, 191, 36, 0.5); }

    .card-evo-badge {
      font-size: 7.5px;
      font-weight: 900;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.4);
      padding: 1.5px 5px;
      border-radius: 4px;
    }
    .card-state-pill {
      width: 18px;
      height: 18px;
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
      width: 130px;
      height: 130px;
      background-size: cover;
      background-position: center;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
      border-radius: 50%;
      transition: transform 0.3s ease;
    }
    .vertical-hero-card:hover .hero-card-sprite {
      transform: scale(1.08);
    }

    .hero-card-footer-glass {
      position: relative;
      z-index: 5;
      background: linear-gradient(180deg, transparent 0%, rgba(10, 14, 24, 0.92) 30%, rgba(8, 11, 18, 0.98) 100%);
      padding: 24px 10px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 2px;
    }
    .hero-card-name {
      font-size: 12px;
      font-weight: 850;
      color: #fff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .hero-card-role-sub {
      font-size: 9px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .hero-card-status-strip {
      margin-top: 4px;
      font-size: 7.5px;
      font-weight: 850;
      letter-spacing: 0.5px;
      color: #64748b;
      text-transform: uppercase;
    }
    .hero-card-status-strip.unlocked {
      color: var(--card-theme, var(--green));
    }

    .active-card-indicator {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
    }
    .indicator-glow-dot {
      width: 14px;
      height: 3px;
      border-radius: 4px;
      background: var(--card-theme, var(--accent));
      box-shadow: 0 0 8px var(--card-theme, var(--accent));
    }

    /* ==================================================== */
    /* 4. SPOTLIGHT: CHARACTER SELECT & DOSSIER             */
    /* ==================================================== */
    .character-select-spotlight-section {
      width: 100%;
      margin-top: 6px;
    }
    .spotlight-cinematic-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22px;
      background: linear-gradient(145deg, rgba(14, 18, 28, 0.95) 0%, rgba(8, 11, 17, 0.98) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-left: 3px solid var(--accent-color, #00f2fe);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px var(--accent-color, rgba(0, 242, 254, 0.08));
      position: relative;
      overflow: hidden;
      transition: border-color 0.4s ease, box-shadow 0.4s ease;
    }

    /* COLUMNA IZQUIERDA: DOSSIER TÁCTICO */
    .spotlight-left-dossier {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }

    .dossier-header-box {
      display: flex;
      flex-direction: column;
      gap: 3px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 10px;
    }
    .dossier-specimen-subtag {
      font-size: 8.5px;
      font-weight: 850;
      color: #64748b;
      letter-spacing: 0.8px;
      font-family: monospace;
    }
    .dossier-character-title {
      font-size: 24px;
      font-weight: 900;
      color: #fff;
      margin: 0;
      letter-spacing: -0.3px;
      font-family: 'Space Grotesk', sans-serif;
    }
    .dossier-species-desc {
      font-size: 11.5px;
      color: #94a3b8;
      margin: 0;
    }
    .dossier-species-desc strong {
      color: #e2e8f0;
    }

    .dossier-badges-list {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .dossier-badge-pill {
      font-size: 8.5px;
      font-weight: 850;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .dossier-badge-pill.tier-común { background: rgba(156, 163, 175, 0.15); color: #d1d5db; border: 1px solid rgba(156, 163, 175, 0.3); }
    .dossier-badge-pill.tier-raro { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .dossier-badge-pill.tier-épico { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .dossier-badge-pill.tier-legendario { background: rgba(251, 191, 36, 0.15); color: #fde047; border: 1px solid rgba(251, 191, 36, 0.4); }
    .archetype-pill { background: rgba(255, 255, 255, 0.04); color: #94a3b8; }
    .squad-pill { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .squad-pill.is-unlocked { background: rgba(16, 185, 129, 0.12); color: #34d399; border-color: rgba(16, 185, 129, 0.35); }

    .dossier-lore-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 10px 14px;
    }
    .lore-text-paragraph {
      margin: 0;
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.45;
      font-style: italic;
    }

    /* PROTOCOLO PSICOLÓGICO */
    .dossier-psych-card {
      background: rgba(168, 85, 247, 0.06);
      border: 1px solid rgba(168, 85, 247, 0.2);
      border-radius: 10px;
      padding: 9px 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .psych-card-head {
      font-size: 9px;
      font-weight: 850;
      color: #c084fc;
      display: flex;
      align-items: center;
      gap: 6px;
      letter-spacing: 0.4px;
    }
    .psych-card-body {
      margin: 0;
      font-size: 10.5px;
      color: #f1f5f9;
      line-height: 1.35;
    }

    /* DUAL HUD COMBATE */
    .dossier-combat-hud-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .combat-pill {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .combat-pill.win-combat-pill { border-left: 3px solid #10b981; }
    .combat-pill.fail-combat-pill { border-left: 3px solid #ef4444; }
    .combat-tag {
      font-size: 8.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .combat-values strong {
      font-size: 12px;
      font-weight: 850;
      display: block;
    }
    .combat-values small {
      font-size: 9.5px;
      color: #94a3b8;
    }

    /* MATRIZ DE PASIVA */
    .dossier-passive-panel {
      background: rgba(0, 0, 0, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 9px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .passive-panel-head {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
    }
    .passive-panel-title {
      font-size: 9px;
      font-weight: 800;
      color: #94a3b8;
    }
    .passive-name-strong {
      color: #fff;
      font-weight: 850;
    }
    .passive-details-triad {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }
    .triad-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .triad-label {
      font-size: 8.5px;
      font-weight: 850;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .triad-item p {
      margin: 0;
      font-size: 9.5px;
      color: #cbd5e1;
      line-height: 1.25;
    }

    /* FOOTER DE ACCIONES */
    .dossier-action-footer {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }
    .action-cta-wrap {
      display: flex;
      gap: 8px;
    }
    .btn-dossier-cta {
      flex: 1;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .btn-dossier-cta.is-active-equipped {
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
      cursor: default;
    }
    .btn-dossier-cta.is-equip-btn {
      background: var(--accent-color, #00f2fe);
      color: #000;
      box-shadow: 0 4px 16px var(--accent-color, rgba(0, 242, 254, 0.3));
    }
    .btn-dossier-cta.is-equip-btn:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }
    .btn-dossier-cta.is-challenge-btn {
      background: rgba(16, 185, 129, 0.15);
      border: 1.5px solid #10b981;
      color: #10b981;
    }
    .btn-dossier-cta.is-challenge-btn:hover {
      background: rgba(16, 185, 129, 0.25);
    }
    .btn-dossier-cta.is-buy-btn {
      background: #fbbf24;
      color: #000;
      box-shadow: 0 4px 16px rgba(251, 191, 36, 0.3);
    }
    .btn-dossier-cta.is-buy-btn:hover:not(:disabled) {
      filter: brightness(1.1);
    }
    .btn-dossier-cta.is-buy-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dossier-quote-box {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
      padding: 0 4px;
    }
    .quote-icon { font-size: 11px; opacity: 0.8; }
    .quote-text { margin: 0; }

    /* ==================================================== */
    /* 5. COLUMNA DERECHA: CINEMATIC STAGE (AVATAR.PNG)     */
    /* ==================================================== */
    .spotlight-right-stage {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }
    .cinematic-stage-card {
      flex: 1;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px;
      min-height: 480px;
      box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.7);
    }

    .stage-energy-aura {
      position: absolute;
      inset: 0;
      opacity: 0.5;
      pointer-events: none;
      transition: background 0.4s ease;
    }

    .stage-header-title {
      position: relative;
      z-index: 5;
      display: flex;
      flex-direction: column;
    }
    .stage-select-sub {
      font-size: 8.5px;
      font-weight: 800;
      color: var(--accent-color, #00f2fe);
      letter-spacing: 1px;
      font-family: monospace;
    }
    .stage-select-main {
      font-size: 18px;
      font-weight: 900;
      color: #fff;
      margin: 0;
      letter-spacing: 1px;
      font-family: 'Space Grotesk', sans-serif;
    }

    /* HEROCENTER CON PLATAFORMA Y CALLOUTS */
    .stage-hero-center-dock {
      position: relative;
      z-index: 5;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 320px;
    }

    .hero-character-floating-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
      animation: floatHero 4s ease-in-out infinite alternate;
    }
    @keyframes floatHero {
      0% { transform: translateY(0px); }
      100% { transform: translateY(-10px); }
    }

    .frameless-hero-sprite {
      width: 200px;
      height: 200px;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      border-radius: 50%;
      border: 3px solid var(--accent-color, rgba(0, 242, 254, 0.4));
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 30px var(--accent-color, rgba(0, 242, 254, 0.35));
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .frameless-hero-sprite:hover {
      transform: scale(1.05);
    }

    .hologram-disk-platform {
      width: 170px;
      height: 26px;
      border-radius: 50%;
      background: radial-gradient(ellipse at center, var(--glow-color, #00f2fe) 0%, transparent 70%);
      border: 1.5px solid var(--glow-color, #00f2fe);
      opacity: 0.55;
      transform: perspective(200px) rotateX(65deg);
      margin-top: -12px;
      box-shadow: 0 0 20px var(--glow-color, rgba(0, 242, 254, 0.6));
    }

    /* CALLOUTS / PUNTEROS TÁCTICOS (INSPIRADOS EN AVATAR.PNG) */
    .annotation-callout {
      position: absolute;
      z-index: 20;
      display: flex;
      align-items: center;
      max-width: 170px;
      pointer-events: auto;
    }

    .annotation-callout .callout-card {
      background: rgba(10, 14, 24, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      padding: 7px 10px;
      border-radius: 8px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .callout-header {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: #fff;
    }
    .callout-desc {
      margin: 0;
      font-size: 8.5px;
      color: #94a3b8;
      line-height: 1.25;
    }

    /* POSICIONAMIENTO DE PUNTEROS */
    .callout-weapon {
      top: 15px;
      left: 10px;
    }
    .callout-weapon .callout-pointer-line {
      display: flex;
      align-items: center;
    }
    .callout-passive {
      top: 35px;
      right: 10px;
    }
    .callout-rating {
      bottom: 20px;
      right: 15px;
    }

    .rating-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .rating-label {
      font-size: 9.5px;
      font-weight: 800;
      color: #cbd5e1;
    }
    .rating-stars-list {
      display: flex;
      gap: 2px;
      font-size: 9px;
      color: #475569;
    }
    .rating-stars-list i.is-lit {
      color: #fbbf24;
      text-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
    }
    .rating-archetype-sub {
      font-size: 8px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .stage-footer-character-name {
      position: relative;
      z-index: 5;
      text-align: center;
      padding-top: 6px;
    }
    .cinematic-name-glow {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #fff;
      text-shadow: 0 0 12px var(--accent-color, rgba(0, 242, 254, 0.6));
      font-family: 'Space Grotesk', sans-serif;
    }

    /* ==================================================== */
    /* 6. MODALES Y TOASTS                                  */
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
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      border: 3px solid #10b981;
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

    .toast-popup-alert {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #121622;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-left: 3px solid #10b981;
      padding: 10px 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fff;
      font-size: 11.5px;
      font-weight: 700;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      z-index: 2000;
    }

    .text-green { color: #10b981; }
    .text-red { color: #ef4444; }
    .text-cyan { color: #00f2fe; }
    .text-purple { color: #c084fc; }
    .text-yellow { color: #fbbf24; }
    .text-orange { color: #f97316; }

    @media (max-width: 1024px) {
      .spotlight-cinematic-container {
        grid-template-columns: 1fr;
      }
      .annotation-callout {
        position: static;
        max-width: 100%;
        margin: 6px 0;
      }
      .stage-hero-center-dock {
        flex-direction: column;
        gap: 12px;
      }
    }
    @media (max-width: 900px) {
      .profile-page-wrapper {
        padding: 80px 16px 40px;
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
  inspectedAvatar = signal<ComunidadAvatar>({} as ComunidadAvatar);

  inputName = signal<string>('');
  inputProfession = signal<string>('');
  selectedCountry = signal<string>('México');
  selectedActiveDays = signal<number[]>([1, 2, 3, 4, 5]);
  usernameError = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  weekDaysList = [
    { id: 1, label: 'Lun', full: 'Lunes' },
    { id: 2, label: 'Mar', full: 'Martes' },
    { id: 3, label: 'Mié', full: 'Miércoles' },
    { id: 4, label: 'Jue', full: 'Jueves' },
    { id: 5, label: 'Vie', full: 'Viernes' },
    { id: 6, label: 'Sáb', full: 'Sábado' },
    { id: 7, label: 'Dom', full: 'Domingo' }
  ];

  unlockedRewardQuality = signal<QualityItem | null>(null);

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

  constructor(public membership: MembershipService) {
    this.sidebarCollapsed = this.membership.sidebarCollapsed;
  }

  allAvatars = computed(() => {
    const unlockedList = this.membership.unlockedAvatars();
    const qualities = this.membership.qualitiesCatalog();

    const list: ComunidadAvatar[] = [
      // 1. INICIALES
      { 
        id: 'gato', 
        name: 'Gato Lancero', 
        species: 'Felino Sigiloso',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'EQUILIBRADO',
        stars: 1,
        emoji: '🐱', 
        color: '#10b981', 
        role: 'Centinela de la Comunidad',
        lore: 'El Gato Lancero posee una compostura ágil y serena. Simboliza la habilidad de dar el primer paso sin titubear, rompiendo la parálisis por análisis al instante.',
        weaponName: 'Lanza de Bambú Sagrado',
        weaponDesc: 'Forjada con madera flexible de cañaveral ancestral para disolver la inercia mental al arrancar cada sesión.',
        focusApplication: 'Usa la técnica de los 2 minutos: empieza sin pensar en la meta final para romper la inercia mental.',
        tacticalQuote: 'Un zarpazo certero a la vez disuelve cualquier muralla.',
        coinsPerPomodoro: 5,
        pausePenaltyCoins: 2,
        bossDamagePoints: 10,
        bossHealPoints: 5,
        passiveName: 'Paso Ligero',
        passiveAdvantage: 'Ritmo estable con penalización mínima ante distracciones.',
        passiveCondition: 'Recompensa estándar sin multiplicadores de daño.',
        passiveBestFor: 'Arranques de jornada y tareas de baja a mediana complejidad.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'perro', 
        name: 'Borek el Guardián', 
        species: 'Canino Leal',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'RESISTENCIA',
        stars: 1,
        emoji: '🐶', 
        color: '#3a86f0', 
        role: 'Guardia de la Comunidad',
        lore: 'Borek es el compañero leal por excelencia. Su presencia infunde devoción inquebrantable a una sola tarea hasta que el temporizador llegue a cero.',
        weaponName: 'Lanza de Acero & Escudo Canino',
        weaponDesc: 'Forjada en aleación templada para custodiar la mesa de trabajo contra notificaciones e interrupciones.',
        focusApplication: 'Protege tu espacio de trabajo: aleja el teléfono móvil antes de encender el temporizador.',
        tacticalQuote: 'La fidelidad a tu propósito vence al impulso pasajero.',
        coinsPerPomodoro: 6,
        pausePenaltyCoins: 2,
        bossDamagePoints: 12,
        bossHealPoints: 5,
        passiveName: 'Guardia Firme',
        passiveAdvantage: 'Generación consistente de monedas en sesiones consecutivas.',
        passiveCondition: 'Penalización base si se interrumpe la sesión.',
        passiveBestFor: 'Estudio matutino y lecturas de preparación.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'conejo', 
        name: 'Conejo Explorador', 
        species: 'Liebre Veloz',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'VELOCIDAD',
        stars: 1,
        emoji: '🐰', 
        color: '#9ca3af', 
        role: 'Explorador de la Comunidad',
        lore: 'El Explorador veloz no teme a los retos desconocidos; abre caminos rápidos y despeja tareas pendientes en tiempo récord.',
        weaponName: 'Dagas Gemelas de Impulso',
        weaponDesc: 'Hojas ultraligeras diseñadas para sprints de alta velocidad de 15 minutos sin agotamiento.',
        focusApplication: 'Aplica sprints cortos de 15 minutos cuando sientas apatía o bloqueo creativo.',
        tacticalQuote: 'La agilidad supera al titubeo.',
        coinsPerPomodoro: 5,
        pausePenaltyCoins: 3,
        bossDamagePoints: 11,
        bossHealPoints: 6,
        passiveName: 'Salto Rápido',
        passiveAdvantage: 'Facilita la entrada en flujo inmediato.',
        passiveCondition: 'Penalización algo mayor si te desconectas a mitad del sprint.',
        passiveBestFor: 'Revisiones rápidas, redacción de correos y limpieza de bandeja.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'loro', 
        name: 'Loro Centinela', 
        species: 'Ave Vigía',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'ALERTA',
        stars: 1,
        emoji: '🦜', 
        color: '#fbbf24', 
        role: 'Centinela Alado',
        lore: 'Vigía alado de aguda percepción. Demuestra que quien es capaz de articular una idea en voz alta domina completamente la materia.',
        weaponName: 'Báculo de Resonancia Feynman',
        weaponDesc: 'Canaliza frecuencias vocales que estructuran conceptos abstractos en explicaciones simples.',
        focusApplication: 'Explica en voz alta lo que vas a aprender o resolver (Efecto Feynman).',
        tacticalQuote: 'La claridad vocal ahuyenta la niebla mental.',
        coinsPerPomodoro: 6,
        pausePenaltyCoins: 2,
        bossDamagePoints: 12,
        bossHealPoints: 5,
        passiveName: 'Voz Guía',
        passiveAdvantage: 'Mayor retención conceptual y ritmo claro.',
        passiveCondition: 'Requiere entorno donde puedas articular tus metas.',
        passiveBestFor: 'Estudio de conceptos abstractos y memorización activa.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'hamster', 
        name: 'Hámster Veloz', 
        species: 'Roedor Dinámico',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'DINAMISMO',
        stars: 1,
        emoji: '🐹', 
        color: '#f97316', 
        role: 'Guardián Veloz',
        lore: 'Inspirador del movimiento perpetuo: demuestra que pequeñas victorias acumuladas derrotan a cualquier montaña de pendientes.',
        weaponName: 'Esferas Cinemáticas de Momentum',
        weaponDesc: 'Orbes giratorios que convierten micrometas de 10 minutos en una inercia de trabajo constante e imparable.',
        focusApplication: 'Divide metas titánicas en micrometas de 10 minutos para mantener el impulso.',
        tacticalQuote: 'El movimiento continuo acumula victorias colosales.',
        coinsPerPomodoro: 5,
        pausePenaltyCoins: 2,
        bossDamagePoints: 10,
        bossHealPoints: 4,
        passiveName: 'Rueda Constante',
        passiveAdvantage: 'Bajo costo de fallo y gran facilidad de repetición.',
        passiveCondition: 'Daño moderado por sesión.',
        passiveBestFor: 'Tareas administrativas y procesamiento de datos.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'raton', 
        name: 'Ratón Sigiloso', 
        species: 'Roedor Táctico',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'SIGILO',
        stars: 1,
        emoji: '🐭', 
        color: '#ec4899', 
        role: 'Explorador Sigiloso',
        lore: 'Maestro del sigilo táctico: opera en las horas silenciosas donde nadie interrumpe y el flujo de trabajo alcanza su máxima pureza.',
        weaponName: 'Daga Sombría de Aislamiento',
        weaponDesc: 'Corta el ruido ambiental y la tentación digital para sumergirte en un silencio absoluto de alta concentración.',
        focusApplication: 'Apaga todas las notificaciones antes de arrancar. El silencio es tu mejor aliado.',
        tacticalQuote: 'En la quietud absoluta el trabajo avanza sin resistencia.',
        coinsPerPomodoro: 6,
        pausePenaltyCoins: 2,
        bossDamagePoints: 11,
        bossHealPoints: 5,
        passiveName: 'Infiltración',
        passiveAdvantage: 'Evita distracciones externas con facilidad.',
        passiveCondition: 'Sensible a interrupciones no programadas.',
        passiveBestFor: 'Trabajo silencioso nocturno o de primera hora.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },

      // 2. RETOS DE CUALIDADES
      { 
        id: 'tortuga', 
        name: 'Tortuga Sabia', 
        species: 'Reptil Ancestral',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'CONSTANCIA',
        stars: 2,
        emoji: '🐢', 
        color: '#22c55e', 
        role: 'Sabio Paciente',
        lore: 'La Tortuga Ancestral comprende que la constancia supera a la velocidad efímera. Su caparazón resiste cualquier tempestad de distracciones.',
        weaponName: 'Caparazón Rúnico Ancestral',
        weaponDesc: 'Placa grabada con glifos de resistencia que protege contra la fatiga en sesiones densas de lectura y código.',
        focusApplication: 'Acepta el avance milimétrico. No busques rapidez, busca no detenerte.',
        tacticalQuote: 'Lento pero implacable, el caparazón resiste cualquier tormenta.',
        coinsPerPomodoro: 12,
        pausePenaltyCoins: 4,
        bossDamagePoints: 24,
        bossHealPoints: 8,
        passiveName: 'Caparazón Imperturbable',
        passiveAdvantage: '+100% de daño sostenido al jefe si encadenas tus pomodoros.',
        passiveCondition: 'Si abandonas pierdes 4 monedas y curas 8 HP al Jefe.',
        passiveBestFor: 'Sesiones largas de lectura densa y programación profunda.',
        cost: 50, 
        qualityId: 'constancia', 
        unlockTotal: 7,
        hasEvolution: true
      },
      { 
        id: 'hormiga', 
        name: 'Hormiga Guerrera', 
        species: 'Himenóptero',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'DISCIPLINA',
        stars: 2,
        emoji: '🐜', 
        color: '#78350f', 
        role: 'Esfuerzo Diario',
        lore: 'Símbolo del esfuerzo disciplinado e incansable: no se detiene ante la magnitud del trabajo, solo ejecuta el siguiente bloque.',
        weaponName: 'Mandíbula de Asedio Titánico',
        weaponDesc: 'Herramienta de agarre indestructible, diseñada para fragmentar tareas colosales en granos manejables.',
        focusApplication: 'Carga una sola roca a la vez. No mires toda la montaña, solo tu bloque actual.',
        tacticalQuote: 'La fuerza no radica en el tamaño, sino en la repetición inquebrantable.',
        coinsPerPomodoro: 14,
        pausePenaltyCoins: 5,
        bossDamagePoints: 28,
        bossHealPoints: 10,
        passiveName: 'Carga Titánica',
        passiveAdvantage: 'Duplica el impacto en la salud del Jefe comunitario.',
        passiveCondition: 'Castigo moderado si te rindes ante la fatiga.',
        passiveBestFor: 'Jornadas de estudio intenso y preparación de exámenes.',
        cost: 60, 
        qualityId: 'disciplina', 
        unlockTotal: 15,
        hasEvolution: false
      },
      { 
        id: 'buho', 
        name: 'Búho Erudito', 
        species: 'Rapaz Nocturna',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'SABIDURÍA (80/20)',
        stars: 2,
        emoji: '🦉', 
        color: '#6366f1', 
        role: 'Estratega Sabio',
        lore: 'Estratega nocturno de mirada penetrante: ahorra horas de esfuerzo ciego aplicando discernimiento agudo y priorización táctica.',
        weaponName: 'Orbe Ocular de Atenea (80/20)',
        weaponDesc: 'Lente óptico que filtra el ruido secundario para iluminar el 20% de tareas críticas que producen el 80% de impacto.',
        focusApplication: 'Identifica el 20% de tareas que producirá el 80% del resultado antes de trabajar.',
        tacticalQuote: 'La mirada aguda ahorra horas de vuelo inútil.',
        coinsPerPomodoro: 16,
        pausePenaltyCoins: 6,
        bossDamagePoints: 32,
        bossHealPoints: 12,
        passiveName: 'Visión Nocturna 80/20',
        passiveAdvantage: '+32 Puntos de daño por cada sesión de alto impacto completada.',
        passiveCondition: 'Penalización de 6 monedas si interrumpes el análisis.',
        passiveBestFor: 'Planificación estratégica y resolución de problemas complejos.',
        cost: 120, 
        qualityId: 'sabiduria', 
        unlockTotal: 5,
        hasEvolution: false
      },
      { 
        id: 'rana', 
        name: 'Rana Cazadora', 
        species: 'Anfibio Táctico',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'SUPERACIÓN (SAPO)',
        stars: 2,
        emoji: '🐸', 
        color: '#10b981', 
        role: 'Saltarina Cazadora',
        lore: 'Cazadora intrépida que salta sin dudar al desafío más amargo. Vence la tarea difícil al inicio y el resto de la jornada fluye con liviandad.',
        weaponName: 'Arpón Traga-Sapos',
        weaponDesc: 'Lanza de captura instantánea afinada para embestir la tarea más temida e intimidante a primera hora de la mañana.',
        focusApplication: 'Trágate ese sapo: ejecuta tu tarea más difícil e intimidante a primera hora.',
        tacticalQuote: 'Vence lo peor primero y el resto del día será un paseo.',
        coinsPerPomodoro: 18,
        pausePenaltyCoins: 7,
        bossDamagePoints: 36,
        bossHealPoints: 14,
        passiveName: 'Salto al Abismo',
        passiveAdvantage: 'Recompensa premium al vencer tareas procrastinadas.',
        passiveCondition: 'Penalización severa de 7 monedas si pospones la tarea.',
        passiveBestFor: 'La primera sesión de la mañana enfrentando la tarea más temida.',
        cost: 50, 
        qualityId: 'superacion', 
        unlockTotal: 5,
        hasEvolution: false
      },
      { 
        id: 'aguila', 
        name: 'Águila Imperial', 
        species: 'Rapaz Soberana',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'VISIÓN',
        stars: 3,
        emoji: '🦅', 
        color: '#3b82f6', 
        role: 'Ojo de Halcón',
        lore: 'Soberana de las alturas: vuela por encima de las contingencias menores manteniendo la vista clavada en la meta suprema.',
        weaponName: 'Arco de Precisión Telemetría',
        weaponDesc: 'Arco compuesto de largo alcance con mira prismática, enfocado en el objetivo final sin desviar la mirada.',
        focusApplication: 'Mantén los ojos en el objetivo final. Los obstáculos son lo que ves cuando desvías la mirada.',
        tacticalQuote: 'Desde las alturas ningún laberinto tiene secretos.',
        coinsPerPomodoro: 20,
        pausePenaltyCoins: 8,
        bossDamagePoints: 40,
        bossHealPoints: 16,
        passiveName: 'Foco Telemetría',
        passiveAdvantage: 'Máxima generación de daño y monedas en su categoría.',
        passiveCondition: '8 monedas y +16 HP curados al jefe si abandonas.',
        passiveBestFor: 'Redacción de informes finales y proyectos cruciales.',
        cost: 200, 
        qualityId: 'vision', 
        unlockTotal: 5,
        hasEvolution: false
      },
      { 
        id: 'abeja', 
        name: 'Abeja Obrera', 
        species: 'Antófilo Incansable',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'COLABORACIÓN',
        stars: 2,
        emoji: '🐝', 
        color: '#eab308', 
        role: 'Obrero Incansable',
        lore: 'Espíritu de trabajo en equipo y armonía: cada gota de enfoque individual fortalece la colmena y multiplica el progreso.',
        weaponName: 'Aguijón de Resonancia Colectiva',
        weaponDesc: 'Canalizador de sincronía que potencia la concentración y disciplina compartida en salas comunitarias.',
        focusApplication: 'Sincroniza tu sesión con otros miembros de la comunidad para potenciar la disciplina colectiva.',
        tacticalQuote: 'La colmena edifica imperios flor a flor.',
        coinsPerPomodoro: 15,
        pausePenaltyCoins: 5,
        bossDamagePoints: 30,
        bossHealPoints: 10,
        passiveName: 'Zumbido de Enjambre',
        passiveAdvantage: 'Excelente bonificación en salas comunitarias.',
        passiveCondition: 'Penalización moderada al salir prematuramente.',
        passiveBestFor: 'Sesiones de estudio grupal y trabajo colaborativo.',
        cost: 70, 
        qualityId: 'colaboracion', 
        unlockTotal: 5,
        hasEvolution: false
      },
      { 
        id: 'castor', 
        name: 'Castor Ingeniero', 
        species: 'Roedor Constructor',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'CONSTRUCCIÓN',
        stars: 2,
        emoji: '🦫', 
        color: '#b45309', 
        role: 'Constructor Feroz',
        lore: 'Ingeniero incansable de la naturaleza: no concluye el día sin haber dejado una estructura firme y un entregable tangible.',
        weaponName: 'Hacha de Construcción Sólida',
        weaponDesc: 'Herramienta pesada para edificar proyectos complejos leño a leño sin dejar cabos sueltos.',
        focusApplication: 'Coloca cada leño con precisión: no cierres el día sin haber entregado una parte tangible.',
        tacticalQuote: 'Tronco a tronco se desvía el cauce del río.',
        coinsPerPomodoro: 16,
        pausePenaltyCoins: 6,
        bossDamagePoints: 32,
        bossHealPoints: 12,
        passiveName: 'Dique Inexpugnable',
        passiveAdvantage: 'Gran rendimiento en bloques de 3 pomodoros consecutivos.',
        passiveCondition: 'Riesgo medio de penalización si se interrumpe la racha.',
        passiveBestFor: 'Proyectos de desarrollo, arquitectura y diseño estructural.',
        cost: 80, 
        qualityId: 'construccion', 
        unlockTotal: 3,
        hasEvolution: false
      },

      // 3. CAZADORES
      { 
        id: 'zorro', 
        name: 'Zorro Astuto', 
        species: 'Cánido Táctico',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'CAZADOR ÁGIL',
        stars: 3,
        emoji: '🦊', 
        color: '#f97316', 
        role: 'Espía de Sombras',
        lore: 'Estratega ágil de reflejos agudos: cuando la procrastinación bloquea el camino habitual, el zorro encuentra un sendero alterno.',
        weaponName: 'Kopis Fantasma de Infiltración',
        weaponDesc: 'Hoja curva diseñada para flanquear bloqueos creativos y maniobrar en entornos cambiantes.',
        focusApplication: 'Cambia de entorno de trabajo si notas que la procrastinación se ha arraigado en tu mesa.',
        tacticalQuote: 'La astucia rodea la trampa antes de que se active.',
        coinsPerPomodoro: 22,
        pausePenaltyCoins: 9,
        bossDamagePoints: 44,
        bossHealPoints: 18,
        passiveName: 'Paso Fantasma',
        passiveAdvantage: '+22 Coins directas con alto daño de asedio.',
        passiveCondition: 'Pérdida de 9 coins y +18 HP al jefe si abandonas.',
        passiveBestFor: 'Romper bloqueos creativos y sesiones dinámicas.',
        cost: 100, 
        qualityId: null, 
        qualityName: 'Astucia', 
        qualityReq: 'Canjéalo por 100 Pro Coins 🪙 aplicando inteligencia y estrategia.',
        hasEvolution: false
      },
      { 
        id: 'lince', 
        name: 'Lince Cazador', 
        species: 'Felino Boreal',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'ALTA PRECISIÓN',
        stars: 3,
        emoji: '🐱', 
        color: '#a855f7', 
        role: 'Felino Sigiloso',
        lore: 'Depredador de la nieve: espera pacientemente en quietud absoluta hasta ejecutar el zarpazo perfecto en el momento exacto.',
        weaponName: 'Garras de Cuarzo Boreal',
        weaponDesc: 'Cuchillas de cristal de alta precisión, calibradas para tareas críticas con tolerancia cero a errores.',
        focusApplication: 'Mira fijo a un solo objetivo. Elimina cualquier pestaña o libro secundario de tu campo visual.',
        tacticalQuote: 'La mirada congelada antes del zarpazo infalible.',
        coinsPerPomodoro: 26,
        pausePenaltyCoins: 11,
        bossDamagePoints: 52,
        bossHealPoints: 22,
        passiveName: 'Enfoque Puntería',
        passiveAdvantage: 'Altísimo multiplicador de daño (+52 Pts al Jefe).',
        passiveCondition: 'Penalización de 11 monedas si cedes ante la tentación.',
        passiveBestFor: 'Tareas críticas que requieren 0% margen de error.',
        cost: 180, 
        qualityId: null, 
        qualityName: 'Precisión', 
        qualityReq: 'Canjéalo por 180 Pro Coins 🪙 entrenando tu puntería mental.',
        hasEvolution: false
      },
      { 
        id: 'panda', 
        name: 'Panda Maestro', 
        species: 'Úrsido Zen',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'SERENIDAD ZEN',
        stars: 3,
        emoji: '🐼', 
        color: '#6b7280', 
        role: 'Maestro Zen',
        lore: 'Maestro de la serenidad interior: enseña que la mente en calma es un refugio impenetrable ante la ansiedad por entregas.',
        weaponName: 'Vara Zen de Bambú Cósmico',
        weaponDesc: 'Báculo equilibrador que disipa el cortisol y ralentiza el pulso para mantener la lucidez bajo presión.',
        focusApplication: 'Inhala profundamente 4 segundos y exhala en 6 antes de iniciar: calma el cortisol.',
        tacticalQuote: 'La mente en paz es un escudo impermeable.',
        coinsPerPomodoro: 24,
        pausePenaltyCoins: 8,
        bossDamagePoints: 48,
        bossHealPoints: 16,
        passiveName: 'Paz de Bambú',
        passiveAdvantage: 'Protección equilibrada con gran rendimiento de monedas.',
        passiveCondition: 'Penalización controlada si necesitas pausar.',
        passiveBestFor: 'Momentos de alta presión, estrés o ansiedad por entregas.',
        cost: 150, 
        qualityId: null, 
        qualityName: 'Serenidad', 
        qualityReq: 'Canjéalo por 150 Pro Coins 🪙 manteniendo el enfoque y la calma.',
        hasEvolution: false
      },
      { 
        id: 'oso', 
        name: 'Oso Implacable', 
        species: 'Úrsido Titánico',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'FUERZA PURA',
        stars: 3,
        emoji: '🐻', 
        color: '#78350f', 
        role: 'Fuerza Inquebrantable',
        lore: 'Titán de la fuerza bruta y la resistencia: se planta como una montaña inamovible frente a cualquier impulso de evasión.',
        weaponName: 'Maza de Roca Telúrica',
        weaponDesc: 'Arma pesada forjada en granito, ideal para anclar al usuario a su estación durante 50 minutos de hiperfoco.',
        focusApplication: 'Planta tus pies en el suelo y no te levantes de la silla hasta que el cronómetro llegue a cero.',
        tacticalQuote: 'La montaña no se inmuta ante el aullido del viento.',
        coinsPerPomodoro: 28,
        pausePenaltyCoins: 12,
        bossDamagePoints: 56,
        bossHealPoints: 24,
        passiveName: 'Zarpazo Telúrico',
        passiveAdvantage: 'Golpes masivos a la barra de vida del Jefe (+56 Pts).',
        passiveCondition: 'Penalización de 12 coins y +24 HP al jefe si desistes.',
        passiveBestFor: 'Bloques largos de 45 o 50 minutos de hiperfoco.',
        cost: 200, 
        qualityId: null, 
        qualityName: 'Resistencia', 
        qualityReq: 'Canjéalo por 200 Pro Coins 🪙 resistiendo a los distractores.',
        hasEvolution: false
      },
      { 
        id: 'elefante', 
        name: 'Elefante Titán', 
        species: 'Proboscídeo Ancestral',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'MEMORIA',
        stars: 3,
        emoji: '🐘', 
        color: '#6b7280', 
        role: 'Memoria Ancestral',
        lore: 'Custodio de la sabiduría acumulada: sus pasos firmes construyen una base de conocimiento profunda y duradera.',
        weaponName: 'Colmillos de Registro Ancestral',
        weaponDesc: 'Pilares rúnicos que fijan conceptos en la memoria de largo plazo mediante bitácoras de aprendizaje.',
        focusApplication: 'Registra tus aprendizajes en tu bitácora al final de cada bloque para consolidar memoria.',
        tacticalQuote: 'Los pasos firmes del gigante dejan huellas imborrables.',
        coinsPerPomodoro: 30,
        pausePenaltyCoins: 14,
        bossDamagePoints: 60,
        bossHealPoints: 26,
        passiveName: 'Memoria de Roca',
        passiveAdvantage: 'Recompensa de élite con +30 monedas por sesión completada.',
        passiveCondition: 'Penalización rigurosa de 14 monedas por interrupción.',
        passiveBestFor: 'Estudio de leyes, medicina y repaso de temarios densos.',
        cost: 220, 
        qualityId: null, 
        qualityName: 'Estabilidad', 
        qualityReq: 'Canjéalo por 220 Pro Coins 🪙 sosteniendo tu esfuerzo continuo.',
        hasEvolution: false
      },
      { 
        id: 'leon', 
        name: 'León Monarca', 
        species: 'Felino Real',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'LIDERAZGO',
        stars: 3,
        emoji: '🦁', 
        color: '#fbbf24', 
        role: 'Rey de la Comunidad',
        lore: 'Monarca del reino: no busca excusas externas; asume el destino de sus proyectos con coraje y determinación regia.',
        weaponName: 'Cetro de Mando Imperial',
        weaponDesc: 'Insignia dorada que canaliza la autoridad personal para asumir el liderazgo y la responsabilidad total.',
        focusApplication: 'Asume la responsabilidad total de tus metas. Nadie vendrá a hacer el trabajo por ti.',
        tacticalQuote: 'El rugido del rey ordena el caos del reino.',
        coinsPerPomodoro: 32,
        pausePenaltyCoins: 15,
        bossDamagePoints: 64,
        bossHealPoints: 28,
        passiveName: 'Rugido Imperial',
        passiveAdvantage: 'Multiplicador de ataque de asedio masivo contra el Jefe.',
        passiveCondition: 'Penalización severa de 15 monedas si abandonas.',
        passiveBestFor: 'Liderar proyectos y alcanzar metas profesionales ambiciosas.',
        cost: 250, 
        qualityId: null, 
        qualityName: 'Liderazgo', 
        qualityReq: 'Canjéalo por 250 Pro Coins 🪙 venciendo la desidia con liderazgo.',
        hasEvolution: false
      },
      { 
        id: 'tigre', 
        name: 'Tigre Feroz', 
        species: 'Felino Rayado',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'DETERMINACIÓN',
        stars: 3,
        emoji: '🐅', 
        color: '#f97316', 
        role: 'Fuerza de Voluntad',
        lore: 'Fuerza de voluntad implacable: cuando el plazo se estrecha, el tigre intensifica su marcha con enfoque destructor.',
        weaponName: 'Cuchillas Dentadas de Furia',
        weaponDesc: 'Armas dobles forjadas para asaltos finales y días de entrega límite donde se requiere máxima potencia.',
        focusApplication: 'Visualiza la recompensa de terminar antes de que el cansancio te convenza de parar.',
        tacticalQuote: 'El cazador no pestañea cuando la presa está a tiro.',
        coinsPerPomodoro: 35,
        pausePenaltyCoins: 16,
        bossDamagePoints: 70,
        bossHealPoints: 30,
        passiveName: 'Furia Determinada',
        passiveAdvantage: '+70 Puntos de daño directo por cada pomodoro finalizado.',
        passiveCondition: 'Penalización de 16 coins si quiebras la sesión.',
        passiveBestFor: 'Días de entrega límite y sprints finales de alta exigencia.',
        cost: 300, 
        qualityId: null, 
        qualityName: 'Determinación', 
        qualityReq: 'Canjéalo por 300 Pro Coins 🪙 mostrando coraje en cada meta.',
        hasEvolution: false
      },
      { 
        id: 'lobo', 
        name: 'Lobo Alfa', 
        species: 'Cánido Salvaje',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'PERSEVERANCIA',
        stars: 3,
        emoji: '🐺', 
        color: '#ef4444', 
        role: 'Guía de Manada',
        lore: 'Líder de la manada: guía con el ejemplo y mantiene la promesa sagrada de concluir lo empezado pase lo que pase.',
        weaponName: 'Garras Tácticas de Manada',
        weaponDesc: 'Emblema de pacto de honor: garantiza el cumplimiento del compromiso diario sin concesiones.',
        focusApplication: 'Mantén el pacto contigo mismo: si dijiste que estudiarías hoy, cúmplelo sin excusas.',
        tacticalQuote: 'La manada avanza unida bajo el aullido del líder.',
        coinsPerPomodoro: 38,
        pausePenaltyCoins: 18,
        bossDamagePoints: 76,
        bossHealPoints: 32,
        passiveName: 'Aullido Alfa',
        passiveAdvantage: 'La cúspide de los cazadores épicos: +38 Coins y +76 daño.',
        passiveCondition: 'Riesgo alto: 18 monedas de multa al pausar.',
        passiveBestFor: 'Jornadas de estudio comunitario y desafíos de fin de semana.',
        cost: 350, 
        qualityId: null, 
        qualityName: 'Perseverancia', 
        qualityReq: 'Canjéalo por 350 Pro Coins 🪙 demostrando lealtad y consistencia.',
        hasEvolution: false
      },

      // 4. LEGENDARIOS
      { 
        id: 'dragon', 
        name: 'Dragón del Ego', 
        species: 'Sierpe Cósmica',
        type: 'legendario', 
        tier: 'Legendario',
        archetype: 'Alto Riesgo',
        archetypeBadge: 'ALTO RIESGO / PODER',
        stars: 5,
        emoji: '🐉', 
        color: '#10b981', 
        role: 'Señor del Ego',
        lore: 'Sierpe cósmica legendaria: domina la batalla mental definitiva comprendiendo que el único adversario real a vencer es uno mismo.',
        weaponName: 'Katana de Plasma & Orbe Rúnico',
        weaponDesc: 'Empuñadura forjada con fuego astral que corta la resistencia interna y somete al ego procrastinador.',
        focusApplication: 'Domina tu propio ego: el mayor rival a vencer no es la tarea, es tu resistencia a empezar.',
        tacticalQuote: 'Quien doblega su propio ego gobierna su destino.',
        coinsPerPomodoro: 60,
        pausePenaltyCoins: 35,
        bossDamagePoints: 130,
        bossHealPoints: 60,
        passiveName: 'Llama del Vórtice Rúnico',
        passiveAdvantage: 'Recompensa colosal: +60 Coins y +130 Daño fulminante al Jefe.',
        passiveCondition: 'Castigo extremo: Si pausas pierdes 35 Coins y curas 60 HP al Jefe.',
        passiveBestFor: 'Sesiones cumbre donde no existe la opción de rendirse.',
        cost: 600, 
        qualityId: null, 
        qualityName: 'Maestría', 
        qualityReq: 'Empuña la Katana de Plasma y el Orbe Cósmico por 600 Pro Coins 🪙.',
        hasEvolution: false
      },
      { 
        id: 'fenix', 
        name: 'Fénix Inmortal', 
        species: 'Ave de Fuego Eterno',
        type: 'legendario', 
        tier: 'Legendario',
        archetype: 'Alto Riesgo',
        archetypeBadge: 'RENACIMIENTO',
        stars: 5,
        emoji: '🔥', 
        color: '#f97316', 
        role: 'Inmortal de Fuego',
        lore: 'Ave sagrada de renacimiento: enseña que ningún error del pasado define el presente, pues cada bloque es una nueva oportunidad.',
        weaponName: 'Lanza Solar de Ascuas Eternas',
        weaponDesc: 'Canalizador de calor solar que consume la culpa del ayer para renacer con energía renovada en cada sesión.',
        focusApplication: 'Si tuviste un mal día ayer, hoy renaces de tus cenizas sin culpa ni remordimientos.',
        tacticalQuote: 'De las cenizas del tropiezo brota la llama de la victoria.',
        coinsPerPomodoro: 55,
        pausePenaltyCoins: 30,
        bossDamagePoints: 120,
        bossHealPoints: 50,
        passiveName: 'Corona Solar de Ascuas',
        passiveAdvantage: 'Generación estelar de +55 Coins y +120 Daño Solar al Jefe.',
        passiveCondition: 'Penalización masiva de 30 monedas si abandonas el vuelo.',
        passiveBestFor: 'Retomar el hábito tras una mala racha o bloqueo prolongado.',
        cost: 500, 
        qualityId: null, 
        qualityName: 'Resiliencia', 
        qualityReq: 'Blande la Lanza Solar y la Corona de Fuego por 500 Pro Coins 🪙.',
        hasEvolution: false
      },
      { 
        id: 'grifo', 
        name: 'Grifo Celestial', 
        species: 'Híbrido de Luz',
        type: 'legendario', 
        tier: 'Legendario',
        archetype: 'Alto Riesgo',
        archetypeBadge: 'HONOR SAGRADO',
        stars: 5,
        emoji: '🦅', 
        color: '#eab308', 
        role: 'Guardián Celestial',
        lore: 'Guardián de la pureza y el honor: vuela en las alturas del compromiso absoluto donde solo existe la misión y la verdad.',
        weaponName: 'Alabarda Sagrada & Rueda Astral',
        weaponDesc: 'Arma bendecida por la luz solar, creada para sesiones de concentración sagrada con cero ventanas trampa.',
        focusApplication: 'Trabaja con honor impecable: no abras redes ni pestañas trampa durante el hiperfoco.',
        tacticalQuote: 'La alabarda sagrada solo corta cuando el alma es pura.',
        coinsPerPomodoro: 58,
        pausePenaltyCoins: 32,
        bossDamagePoints: 125,
        bossHealPoints: 55,
        passiveName: 'Rueda Astral del Alba',
        passiveAdvantage: '+58 Coins y +125 Daño Astral directo al Jefe de la Comunidad.',
        passiveCondition: 'Penalización de 32 monedas y +55 HP al jefe si rompes el honor.',
        passiveBestFor: 'Sesiones sagradas de concentración profunda ininterrumpida.',
        cost: 550, 
        qualityId: null, 
        qualityName: 'Honor', 
        qualityReq: 'Desata la Alabarda Celestial y la Rueda Astral por 550 Pro Coins 🪙.',
        hasEvolution: false
      }
    ];

    return list.map(item => {
      let isUnlocked = false;
      const quality = item.qualityId ? qualities.find(q => q.id === item.qualityId) : null;
      let displayReq = item.qualityReq || '';

      if (item.cost === 0) {
        isUnlocked = true;
      } else if (unlockedList.includes(item.id)) {
        isUnlocked = true;
      } else if (item.qualityId && quality) {
        const total = item.unlockTotal || quality.unlockTotal || 0;
        let progress = quality.unlockProgress || 0;

        if (item.id === 'tortuga_evolved' || item.id === 'tortuga_phase3') {
          progress = this.membership.getTotalCompletedPomodoros();
        }

        if (progress >= total) {
          isUnlocked = true;
        }

        let taskName = '';
        if (item.qualityId === 'vision') taskName = `pomodoro${total > 1 ? 's' : ''} con metodología Normal`;
        else if (item.qualityId === 'disciplina') taskName = `pomodoro${total > 1 ? 's' : ''} en total`;
        else if (item.qualityId === 'constancia') taskName = `día${total > 1 ? 's' : ''} de racha consecutiva`;
        else if (item.qualityId === 'colaboracion') taskName = `pomodoro${total > 1 ? 's' : ''} en modo comunitario`;
        else if (item.qualityId === 'construccion') taskName = `meta${total > 1 ? 's' : ''} completada con 3 pomodoros consecutivos el mismo día`;
        else if (item.qualityId === 'sabiduria') taskName = `pomodoro${total > 1 ? 's' : ''} con metodología Pareto (80/20)`;
        else if (item.qualityId === 'superacion') taskName = `pomodoro${total > 1 ? 's' : ''} con metodología Sapo/Rana completado`;

        displayReq = `Demuestra la cualidad de ${quality.name}: completa ${total} ${taskName} (Progreso: ${progress}/${total}).`;
      }

      return {
        ...item,
        isUnlocked,
        quality,
        displayName: item.qualityId && quality ? quality.name : (item.qualityName || ''),
        displayReq
      };
    });
  });

  activeAvatar = computed(() => {
    const currentId = this.membership.selectedAvatar();
    const found = this.allAvatars().find(a => a.id === currentId);
    return found || this.allAvatars()[0];
  });

  visibleAvatars = computed(() => {
    const cat = this.selectedCategory();
    const list = this.allAvatars();
    if (cat === 'todos') return list;
    if (cat === 'desbloqueados') return list.filter(a => a.isUnlocked);
    return list.filter(a => a.type === cat);
  });

  userLevel = computed(() => {
    const pomodoros = this.membership.focusTomatoes();
    return Math.floor(pomodoros / 4) + 1;
  });

  userRankTitle = computed(() => {
    const lvl = this.userLevel();
    if (lvl >= 30) return 'Comandante Supremo';
    if (lvl >= 20) return 'Gran Maestro';
    if (lvl >= 15) return 'Estratega Élite';
    if (lvl >= 10) return 'Guerrero Veterano';
    if (lvl >= 5) return 'Centinela';
    return 'Recluta de Enfoque';
  });

  userHoursFocused = computed(() => {
    return (this.membership.focusTomatoes() * 0.42).toFixed(1);
  });

  ngOnInit() {
    this.inspectedAvatar.set(this.activeAvatar());
    this.inputName.set(this.membership.userName());
    this.inputProfession.set(this.membership.userProfession() || 'Desarrollador de Software');
    this.selectedCountry.set(this.membership.userCountry() || 'México');
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
    this.inspectedAvatar.set(avatar);
  }

  equipAvatar(avatar: ComunidadAvatar) {
    if (avatar.isUnlocked) {
      this.membership.selectedAvatar.set(avatar.id);
      this.showToast(`¡${avatar.name} equipado como tu guardián activo!`);
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

  getCountryFlag(countryName: string): string {
    const raw = (countryName || '').trim();
    const opt = this.countryOptions.find(c => 
      c.name.toLowerCase() === raw.toLowerCase() ||
      c.code.toLowerCase() === raw.toLowerCase() ||
      raw.toLowerCase().startsWith(c.name.toLowerCase())
    );
    return opt ? opt.flag : '🇲🇽';
  }

  getCleanCountry(): string {
    const raw = (this.membership.userCountry() || '').trim();
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
              .trim() || 'México';
  }

  getCleanProfession(): string {
    const raw = this.membership.userProfession() || 'Desarrollador de Software';
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
    return str.replace(/["'\\]+/g, '').replace(/[\/\\]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Desarrollador de Software';
  }

  toggleEditProfile() {
    this.isEditingProfile.set(!this.isEditingProfile());
    if (this.isEditingProfile()) {
      this.inputName.set(this.membership.userName());
      this.inputProfession.set(this.getCleanProfession());
      this.selectedCountry.set(this.membership.userCountry() || 'México');
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
    const raw = this.selectedActiveDays() || [];
    const days = [...raw].sort((a, b) => a - b);
    if (days.length === 0) return 'Sin días seleccionados';
    if (days.length === 7) return 'Lunes a Domingo';
    if (days.length === 5 && days[0] === 1 && days[1] === 2 && days[2] === 3 && days[3] === 4 && days[4] === 5) {
      return 'Lunes a Viernes';
    }
    if (days.length === 6 && days[0] === 1 && days[1] === 2 && days[2] === 3 && days[3] === 4 && days[4] === 5 && days[5] === 6) {
      return 'Lunes a Sábado';
    }
    if (days.length === 2 && days.includes(6) && days.includes(7)) {
      return 'Sábado y Domingo';
    }
    const dayNames: { [k: number]: string } = {
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
    const cleaned = name.trim();
    if (!cleaned) {
      this.usernameError.set('El nombre no puede estar vacío.');
      return;
    }
    if (cleaned.length > 22) {
      this.usernameError.set('Máximo 22 caracteres.');
      return;
    }
    this.usernameError.set(null);
  }

  async saveProfileChanges() {
    const cleaned = this.inputName().trim();
    this.validateUsername(cleaned);
    if (this.usernameError()) return;

    let prof = (this.inputProfession() || '').replace(/["'\\]+/g, '').replace(/[\/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!prof) prof = 'Desarrollador de Software';
    const activeDays = this.selectedActiveDays();
    this.membership.userName.set(cleaned);
    this.membership.userProfession.set(prof);
    this.membership.userCountry.set(this.selectedCountry());
    this.membership.userActiveDays.set(activeDays);
    await this.membership.saveSupabaseProfile(cleaned, this.membership.selectedAvatar(), this.selectedCountry(), undefined, prof, activeDays);
    this.isEditingProfile.set(false);
    this.showToast('Perfil actualizado correctamente.');
  }

  simulateUnlockQuality(quality: QualityItem) {
    this.unlockedRewardQuality.set(quality);
  }

  closeRewardFlow() {
    const quality = this.unlockedRewardQuality();
    if (quality) {
      let maxTotal = quality.unlockTotal;
      this.membership.qualitiesCatalog.update(list => {
        return list.map(q => {
          if (q.id === quality.id) {
            const relatedAvatars = this.allAvatars().filter(a => a.qualityId === q.id);
            maxTotal = relatedAvatars.reduce((max, a) => Math.max(max, a.unlockTotal || 0), q.unlockTotal);
            return {
              ...q,
              isUnlocked: true,
              unlockProgress: maxTotal,
              unlockedAt: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
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
      }
      this.showToast(`¡Cualidad ${quality.name} demostrada!`);
    }
    this.unlockedRewardQuality.set(null);
  }

  buyAvatar(avatar: ComunidadAvatar) {
    if (this.membership.proCoins() >= avatar.cost) {
      const success = this.membership.unlockAvatar(avatar.id, avatar.cost);
      if (success) {
        this.selectAvatar({ ...avatar, isUnlocked: true });
        this.showToast(`¡${avatar.name} desbloqueado exitosamente!`);
      }
    }
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}
