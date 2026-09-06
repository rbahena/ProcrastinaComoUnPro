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
        <!-- 0. CABECERA PRINCIPAL DE LA VISTA                   -->
        <!-- ==================================================== -->
        <div class="profile-page-header">
          <h1 class="profile-page-title">Mi Perfil</h1>
          <p class="profile-page-subtitle">Configura tus datos de identidad, personaliza tu guardián y consulta tu progreso de enfoque.</p>
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

                  @if (hasCustomIdentity()) {
                    <div class="user-identity-metadata">
                      @if (membership.userProfession()) {
                        <span class="identity-chip profession-chip">
                          <i class="fa-solid fa-briefcase"></i>
                          <span>{{ getCleanProfession() }}</span>
                        </span>
                      } @else {
                        <button class="btn-add-chip" (click)="toggleEditProfile()" title="Añadir tu profesión">
                          <i class="fa-solid fa-plus"></i> Profesión
                        </button>
                      }

                      @if (membership.userCountry()) {
                        <span class="identity-chip country-chip">
                          <span class="country-flag-icon">{{ getCountryFlag(membership.userCountry()) }}</span>
                          <span>{{ getCleanCountry() }}</span>
                        </span>
                      } @else {
                        <button class="btn-add-chip" (click)="toggleEditProfile()" title="Añadir tu país">
                          <i class="fa-solid fa-plus"></i> País
                        </button>
                      }
                    </div>
                  } @else {
                    <div class="user-unconfigured-cta">
                      <button class="btn-complete-profile" (click)="toggleEditProfile()">
                        <i class="fa-solid fa-wand-magic-sparkles text-accent"></i>
                        <span>Completar perfil (Profesión y País)</span>
                      </button>
                    </div>
                  }

                  <p class="user-active-week-line">
                    <span class="active-week-txt" title="Días activos para el control de rachas">
                      <strong class="week-summary-highlight">
                        <i class="fa-regular fa-calendar-check"></i> {{ membership.getActiveDaysSummary() }}
                      </strong>
                    </span>
                  </p>
                </div>

                <!-- TELEMETRÍA EN LÍNEA -->
                <div class="user-inline-telemetry">
                  <div class="tele-pill tomato-pill" [class.is-zero]="membership.focusTomatoes() === 0" data-tooltip="1 tomate por cada sesión completada">
                    <span class="tele-icon">🍅</span>
                    <span class="tele-num">{{ membership.focusTomatoes() }}</span>
                  </div>

                  <div class="tele-pill coin-pill" [class.is-zero]="membership.proCoins() === 0" data-tooltip="Monedas de concentración obtenidas">
                    <span class="tele-icon"><i class="fa-solid fa-coins"></i></span>
                    <span class="tele-num">{{ membership.proCoins() }}</span>
                  </div>

                  <div class="tele-pill streak-pill" [class.is-zero]="membership.streak() === 0" data-tooltip="Días consecutivos enfocándote">
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
                <span class="catalog-subtag">Avatares</span>
                <h2 class="catalog-main-title">Selecciona tu Avatar</h2>
              </div>

              <!-- CONTROLES: FILTROS DE CATEGORÍA -->
              <div class="category-filter-chips">
                <button (click)="setFilter('todos')" [class.active]="selectedCategory() === 'todos'">Todos ({{ allAvatars().length }})</button>
                <button (click)="setFilter('desbloqueados')" [class.active]="selectedCategory() === 'desbloqueados'">En Escuadra ({{ getUnlockedAvatarsCount() }})</button>
                <button (click)="setFilter('inicial')" [class.active]="selectedCategory() === 'inicial'">Comunes</button>
                <button (click)="setFilter('cualidad')" [class.active]="selectedCategory() === 'cualidad'">Retos</button>
                <button (click)="setFilter('especial')" [class.active]="selectedCategory() === 'especial'">Cazadores</button>
                <button (click)="setFilter('legendario')" [class.active]="selectedCategory() === 'legendario'">Legendarios</button>
              </div>
            </div>

            <!-- GRID DE CARTAS DE AVATARES -->
            <div class="avatars-grid-container">
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

                <!-- SPRITE DEL PERSONAJE DENTRO DE LA CARTA (EN B&N Y CON CANDADO SI ESTÁ BLOQUEADO) -->
                <div class="hero-card-artwork-frame">
                  <div [class]="'avatar-sprite hero-card-sprite sprite-' + avatar.id" [class.is-locked-sprite]="!avatar.isUnlocked"></div>
                  <div *ngIf="!avatar.isUnlocked" class="hero-card-locked-overlay">
                    <div class="locked-watermark-container">
                      <i class="fa-solid fa-lock"></i>
                    </div>
                  </div>
                </div>

                <!-- OVERLAY INFERIOR CON NOMBRE Y STATUS -->
                <div class="hero-card-footer-glass">
                  <h4 class="hero-card-name">{{ avatar.name }}</h4>
                  
                  <div class="hero-card-status-strip">
                    <span *ngIf="membership.selectedAvatar() === avatar.id" class="status-active">ACTIVO EN PERFIL</span>
                    <span *ngIf="membership.selectedAvatar() !== avatar.id && avatar.isUnlocked" class="status-squad">EN TU ESCUADRA</span>
                    <span *ngIf="!avatar.isUnlocked" class="status-locked">BLOQUEADO</span>
                  </div>
                </div>

                <!-- INDICADOR SELECCIONADO -->
                <div class="active-card-indicator" *ngIf="inspectedAvatar().id === avatar.id">
                  <div class="indicator-glow-dot"></div>
                </div>

              </div>
            </div>

          </div>

          <!-- COLUMNA DERECHA: PANEL DE DETALLE DEL AVATAR -->
          <div class="avatar-detail-column">
            
            <div class="clean-spotlight-card">
              
              <!-- 1. HERO HEADER INTEGRADO -->
              <div class="detail-hero-header">
                <!-- AURA AMBIENTAL MUY SUAVE -->
                <div class="hero-ambient-glow" [style.background]="'radial-gradient(circle at 20% 50%, ' + (inspectedAvatar().isUnlocked ? inspectedAvatar().color : '#64748b') + '18 0%, transparent 70%)'"></div>

                <!-- AVATAR PORTRAIT -->
                <div class="hero-portrait-frame" [class.is-locked-dock]="!inspectedAvatar().isUnlocked">
                  <div [class]="'avatar-sprite hero-portrait-sprite sprite-' + inspectedAvatar().id" [class.is-locked-sprite]="!inspectedAvatar().isUnlocked"></div>
                  <div *ngIf="!inspectedAvatar().isUnlocked" class="hero-portrait-locked-overlay">
                    <i class="fa-solid fa-lock"></i>
                  </div>
                </div>

                <!-- INFORMACIÓN DE IDENTIDAD -->
                <div class="hero-identity-body">
                  <div class="hero-identity-top-row">
                    <div class="hero-stars-pill" title="Tier y Rareza">
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
                      {{ membership.selectedAvatar() === inspectedAvatar().id ? 'Activo' : (inspectedAvatar().isUnlocked ? 'En Escuadra' : 'Bloqueado') }}
                    </span>
                  </div>

                  <h3 class="hero-avatar-name">{{ inspectedAvatar().name }}</h3>

                  <div class="hero-meta-tags">
                    <span class="meta-tag">{{ inspectedAvatar().species }}</span>
                    <span class="meta-dot">•</span>
                    <span class="meta-tag">{{ inspectedAvatar().role }}</span>
                    <span class="meta-dot" *ngIf="inspectedAvatar().weaponName">•</span>
                    <span class="meta-tag weapon-text" *ngIf="inspectedAvatar().weaponName">
                      <i class="fa-solid fa-wand-magic-sparkles"></i> {{ inspectedAvatar().weaponName }}
                    </span>
                  </div>

                  <div class="hero-quote-snippet" *ngIf="inspectedAvatar().tacticalQuote">
                    <i class="fa-solid fa-quote-left"></i>
                    <span>{{ inspectedAvatar().tacticalQuote }}</span>
                  </div>
                </div>
              </div>

              <!-- 2. MÉTRICAS DE ENFOQUE Y COMBATE -->
              <div class="detail-section">
                <div class="section-title-bar">
                  <span class="section-title">Rendimiento por Sesión</span>
                  <span class="section-subtitle">Impacto Pomodoro</span>
                </div>

                <div class="tactical-metrics-grid">
                  <!-- Éxito -->
                  <div class="clean-metric-tile">
                    <div class="tile-header">
                      <i class="fa-solid fa-circle-check text-green"></i>
                      <span>Sesión Completada</span>
                    </div>
                    <div class="tile-stats-row">
                      <div class="tile-stat-item">
                        <span class="stat-value text-green">+{{ inspectedAvatar().coinsPerPomodoro }}</span>
                        <span class="stat-label">🪙 Pro Coins</span>
                      </div>
                      <div class="tile-stat-divider"></div>
                      <div class="tile-stat-item">
                        <span class="stat-value text-white">{{ inspectedAvatar().bossDamagePoints }}</span>
                        <span class="stat-label">⚔️ Daño Jefe</span>
                      </div>
                    </div>
                  </div>

                  <!-- Penalización -->
                  <div class="clean-metric-tile">
                    <div class="tile-header">
                      <i class="fa-solid fa-triangle-exclamation text-red"></i>
                      <span>Pausa o Abandono</span>
                    </div>
                    <div class="tile-stats-row">
                      <div class="tile-stat-item">
                        <span class="stat-value text-red">-{{ inspectedAvatar().pausePenaltyCoins }}</span>
                        <span class="stat-label">🪙 Pro Coins</span>
                      </div>
                      <div class="tile-stat-divider"></div>
                      <div class="tile-stat-item">
                        <span class="stat-value text-red-light">+{{ inspectedAvatar().bossHealPoints }}</span>
                        <span class="stat-label">🩸 Salud Jefe</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 3. HABILIDADES Y ESTRATEGIA -->
              <div class="detail-section">
                <div class="section-title-bar">
                  <span class="section-title">Habilidades y Técnicas</span>
                  <span class="section-badge" *ngIf="inspectedAvatar().archetypeBadge">{{ inspectedAvatar().archetypeBadge }}</span>
                </div>

                <div class="clean-abilities-grid">
                  <!-- Pasiva -->
                  <div class="clean-ability-item">
                    <div class="ability-lead">
                      <span class="ability-lead-tag">Pasiva</span>
                      <span class="ability-title-txt">{{ inspectedAvatar().passiveName }}</span>
                    </div>
                    <p class="ability-body-txt">{{ inspectedAvatar().passiveAdvantage }}</p>
                  </div>

                  <!-- Técnica Mental -->
                  <div class="clean-ability-item">
                    <div class="ability-lead">
                      <span class="ability-lead-tag">Enfoque</span>
                      <span class="ability-title-txt">Técnica Mental</span>
                    </div>
                    <p class="ability-body-txt">{{ inspectedAvatar().focusApplication }}</p>
                  </div>
                </div>
              </div>

              <!-- 4. REQUISITO DE DESBLOQUEO (SI ESTÁ BLOQUEADO) -->
              <div class="clean-unlock-notice" *ngIf="!inspectedAvatar().isUnlocked">
                <div class="unlock-notice-icon">
                  <i [class]="inspectedAvatar().qualityId ? 'fa-solid fa-scroll' : 'fa-solid fa-store'"></i>
                </div>
                <div class="unlock-notice-info">
                  <div class="unlock-notice-title">
                    {{ inspectedAvatar().qualityId ? 'Cualidad Requerida: ' + (inspectedAvatar().displayName || inspectedAvatar().qualityName) : 'Desbloqueo en Tienda' }}
                  </div>
                  <div class="unlock-notice-desc">
                    {{ inspectedAvatar().displayReq || ('Canjea este guardián por ' + inspectedAvatar().cost + ' Pro Coins 🪙') }}
                  </div>
                </div>
              </div>

              <!-- 5. ACCIONES PRINCIPALES -->
              <div class="detail-actions-dock">
                <button 
                  *ngIf="membership.selectedAvatar() === inspectedAvatar().id" 
                  class="btn-clean-cta is-active-equipped" 
                  disabled
                >
                  <i class="fa-solid fa-shield-check text-green"></i> Guardián Activo en tu Perfil ✓
                </button>

                <button 
                  *ngIf="inspectedAvatar().isUnlocked && membership.selectedAvatar() !== inspectedAvatar().id" 
                  (click)="equipAvatar(inspectedAvatar())" 
                  class="btn-clean-cta is-equip-btn"
                >
                  <i class="fa-solid fa-paw"></i> Equipar a {{ inspectedAvatar().name }}
                  <i class="fa-solid fa-arrow-right"></i>
                </button>

                <button 
                  *ngIf="!inspectedAvatar().isUnlocked && inspectedAvatar().qualityId && inspectedAvatar().quality" 
                  (click)="simulateUnlockQuality(inspectedAvatar().quality!)" 
                  class="btn-clean-cta is-challenge-btn"
                >
                  <i class="fa-solid fa-wand-magic-sparkles"></i> Demostrar Cualidad: {{ inspectedAvatar().displayName || inspectedAvatar().qualityName }}
                  <i class="fa-solid fa-arrow-right"></i>
                </button>

                <button 
                  *ngIf="!inspectedAvatar().isUnlocked && !inspectedAvatar().qualityId && inspectedAvatar().cost > 0" 
                  (click)="buyAvatar(inspectedAvatar())" 
                  class="btn-clean-cta is-buy-btn"
                  [disabled]="membership.proCoins() < inspectedAvatar().cost"
                >
                  <i class="fa-solid fa-coins"></i> 
                  {{ membership.proCoins() >= inspectedAvatar().cost ? 'Canjear por ' + inspectedAvatar().cost + ' Pro Coins' : 'Faltan ' + (inspectedAvatar().cost - membership.proCoins()) + ' Pro Coins' }}
                  <i class="fa-solid fa-arrow-right"></i>
                </button>
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
                  placeholder="Desarrollador, Estudiante, Diseñador..."
                  class="text-input-field"
                />
              </div>
              <div class="form-group-item">
                <label>País</label>
                <select [value]="selectedCountry()" (change)="onCountrySelect($event)" class="select-input-field">
                  <option value="" disabled selected>-- Selecciona tu país --</option>
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
      height: 130px;
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
      width: 102px;
      height: 102px;
      margin-top: -51px;
      margin-bottom: 10px;
      z-index: 10;
    }
    .round-avatar-frame {
      width: 102px;
      height: 102px;
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
      width: 94px;
      height: 94px;
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
      margin: 3px 0 0;
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
      display: inline-flex;
      align-items: center;
      gap: 5px;
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
      gap: 12px;
      width: 100%;
    }

    /* ==================================================== */
    /* 3. SECCIÓN: DASHBOARD CUADRÍCULA Y DETALLE (GRID)   */
    /* ==================================================== */
    .guardian-selection-dashboard {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
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

    /* CONTENEDOR DE LA CUADRÍCULA */
    .avatars-grid-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
      gap: 8px;
      max-height: 720px;
      overflow-y: auto;
      padding: 4px 4px 12px 2px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }
    .avatars-grid-container::-webkit-scrollbar {
      width: 4px;
    }
    .avatars-grid-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.18);
      border-radius: 10px;
    }

    /* TARJETA VERTICAL HERO DENTRO DE LA CUADRÍCULA */
    .vertical-hero-card {
      width: 100%;
      height: 135px;
      border-radius: 10px;
      background: #0f1422;
      border: 1.5px solid rgba(255, 255, 255, 0.08);
      position: relative;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
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
      background: linear-gradient(180deg, #090c14 0%, #06080e 100%);
      border-color: rgba(255, 255, 255, 0.06);
    }
    .vertical-hero-card.is-locked:hover {
      border-color: rgba(255, 255, 255, 0.2);
    }
    .avatar-sprite.is-locked-sprite {
      filter: grayscale(100%) brightness(0.32) contrast(1.1) !important;
      opacity: 0.65;
      transition: filter 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
    }
    .vertical-hero-card:hover .avatar-sprite.is-locked-sprite {
      filter: grayscale(100%) brightness(0.45) contrast(1.15) !important;
      opacity: 0.85;
      transform: scale(1.06);
    }

    .hero-card-locked-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 3;
    }
    .locked-watermark-container {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: radial-gradient(circle at center, rgba(15, 20, 32, 0.88) 0%, rgba(8, 11, 18, 0.96) 100%);
      border: 1.5px solid rgba(255, 255, 255, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.85), inset 0 0 8px rgba(255, 255, 255, 0.05);
      transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .vertical-hero-card:hover .locked-watermark-container {
      transform: scale(1.1);
      border-color: rgba(255, 255, 255, 0.4);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.95), 0 0 12px rgba(255, 255, 255, 0.2);
    }
    .locked-watermark-container i {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.75);
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
      transition: color 0.3s ease, transform 0.3s ease;
    }
    .vertical-hero-card:hover .locked-watermark-container i {
      color: #ffffff;
      transform: scale(1.08);
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
      padding: 4px 6px;
    }
    .card-tier-pill {
      font-size: 7px;
      font-weight: 900;
      padding: 1px 4px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .card-tier-pill.tier-común { background: rgba(156, 163, 175, 0.2); color: #e2e8f0; border: 1px solid rgba(156, 163, 175, 0.3); }
    .card-tier-pill.tier-raro { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.35); }
    .card-tier-pill.tier-épico { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); }
    .card-tier-pill.tier-legendario { background: rgba(251, 191, 36, 0.2); color: #fde047; border: 1px solid rgba(251, 191, 36, 0.5); }

    .card-evo-badge {
      font-size: 6px;
      font-weight: 900;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.4);
      padding: 1px 3px;
      border-radius: 3px;
    }
    .card-state-pill {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #10b981;
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7px;
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
      width: 72px;
      height: 72px;
      background-size: cover;
      background-position: center;
      filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.5));
      border-radius: 50%;
      transition: transform 0.3s ease;
    }
    .vertical-hero-card:hover .hero-card-sprite {
      transform: scale(1.06);
    }

    .hero-card-footer-glass {
      position: relative;
      z-index: 5;
      background: linear-gradient(180deg, transparent 0%, rgba(10, 14, 24, 0.92) 28%, rgba(8, 11, 18, 0.98) 100%);
      padding: 10px 4px 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1px;
    }
    .hero-card-name {
      font-size: 9.5px;
      font-weight: 850;
      color: #fff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .hero-card-status-strip {
      margin-top: 1px;
      font-size: 6px;
      font-weight: 850;
      letter-spacing: 0.3px;
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

    /* 1. HERO HEADER INTEGRADO */
    .detail-hero-header {
      display: flex;
      gap: 16px;
      align-items: center;
      position: relative;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 14px 16px;
      overflow: hidden;
    }
    .hero-ambient-glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      transition: background 0.4s ease;
    }
    .hero-portrait-frame {
      width: 86px;
      height: 86px;
      border-radius: 50%;
      background: #090c14;
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
      z-index: 2;
    }
    .hero-portrait-sprite {
      width: 78px;
      height: 78px;
      background-size: cover;
      background-position: center;
      border-radius: 50%;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
    }
    .hero-portrait-locked-overlay {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(10, 14, 24, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.85);
      font-size: 20px;
    }

    .hero-identity-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      flex: 1;
      z-index: 2;
    }
    .hero-identity-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .hero-stars-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2.5px 7px;
      border-radius: 12px;
      font-size: 8.5px;
    }
    .hero-stars-pill i {
      font-size: 8px;
      color: #475569;
    }
    .hero-stars-pill i.is-lit {
      color: #fbbf24;
    }
    .hero-tier-name {
      font-size: 8.5px;
      font-weight: 800;
      color: #e2e8f0;
      margin-left: 3px;
      text-transform: uppercase;
    }

    .hero-state-pill {
      font-size: 9px;
      font-weight: 750;
      padding: 2.5px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .hero-state-pill.is-active {
      color: #34d399;
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.25);
    }
    .hero-state-pill.is-unlocked {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border-color: rgba(56, 189, 248, 0.25);
    }
    .hero-state-pill.is-locked {
      color: #f87171;
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.25);
    }

    .hero-avatar-name {
      font-size: 20px;
      font-weight: 850;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.3px;
      font-family: 'Space Grotesk', sans-serif;
    }
    .hero-meta-tags {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
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
      font-size: 9px;
      color: #00f2fe;
    }
    .meta-dot {
      color: #475569;
      font-size: 8px;
    }
    .hero-quote-snippet {
      font-size: 10.5px;
      font-style: italic;
      color: #64748b;
      margin-top: 2px;
      line-height: 1.35;
      display: flex;
      align-items: flex-start;
      gap: 4px;
    }
    .hero-quote-snippet i {
      font-size: 8px;
      color: #94a3b8;
      margin-top: 3px;
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
      gap: 1px;
      flex: 1;
    }
    .tile-stat-item .stat-value {
      font-size: 15px;
      font-weight: 850;
      font-family: 'Space Grotesk', sans-serif;
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

    /* 4. REQUISITO DE DESBLOQUEO */
    .clean-unlock-notice {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .unlock-notice-icon {
      font-size: 16px;
      color: #fbbf24;
      flex-shrink: 0;
    }
    .unlock-notice-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .unlock-notice-title {
      font-size: 11px;
      font-weight: 800;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .unlock-notice-desc {
      font-size: 11px;
      color: #cbd5e1;
      line-height: 1.35;
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
  inspectedAvatar = signal<ComunidadAvatar>({} as ComunidadAvatar);

  inputName = signal<string>('');
  inputProfession = signal<string>('');
  selectedCountry = signal<string>('');
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
        name: 'Kuro', 
        species: 'Gato Lancero (Felino Sigiloso)',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'EQUILIBRADO',
        stars: 1,
        emoji: '🐱', 
        color: '#10b981', 
        role: 'Centinela del Silencio',
        weaponName: 'Lanza de Bambú',
        focusApplication: 'Técnica de los 2 min: empieza sin pensar en la meta final.',
        tacticalQuote: 'Un zarpazo certero a la vez disuelve cualquier muralla.',
        coinsPerPomodoro: 5,
        pausePenaltyCoins: 2,
        bossDamagePoints: 10,
        bossHealPoints: 5,
        passiveName: 'Paso Ligero',
        passiveAdvantage: 'Ritmo estable con penalización mínima ante distracciones.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'perro', 
        name: 'Borek', 
        species: 'Perro Pastor (Canino Leal)',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'RESISTENCIA',
        stars: 1,
        emoji: '🐶', 
        color: '#3a86f0', 
        role: 'Guardián Leal',
        weaponName: 'Lanza & Escudo Canino',
        focusApplication: 'Monotarea radical: aleja el móvil antes de encender el temporizador.',
        tacticalQuote: 'La fidelidad a tu propósito vence al impulso pasajero.',
        coinsPerPomodoro: 6,
        pausePenaltyCoins: 2,
        bossDamagePoints: 12,
        bossHealPoints: 5,
        passiveName: 'Guardia Firme',
        passiveAdvantage: 'Generación consistente de monedas en sesiones consecutivas.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'conejo', 
        name: 'Zephyr', 
        species: 'Conejo Explorador (Liebre Veloz)',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'VELOCIDAD',
        stars: 1,
        emoji: '🐰', 
        color: '#9ca3af', 
        role: 'Explorador del Viento',
        weaponName: 'Dagas de Impulso',
        focusApplication: 'Sprints rápidos de 15 minutos para romper bloqueos creativos.',
        tacticalQuote: 'La agilidad supera al titubeo.',
        coinsPerPomodoro: 5,
        pausePenaltyCoins: 3,
        bossDamagePoints: 11,
        bossHealPoints: 6,
        passiveName: 'Salto Rápido',
        passiveAdvantage: 'Entrada en flujo inmediato con bajo tiempo de arranque.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'loro', 
        name: 'Ario', 
        species: 'Loro Centinela (Ave Vigía)',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'ALERTA',
        stars: 1,
        emoji: '🦜', 
        color: '#fbbf24', 
        role: 'Centinela Alado',
        weaponName: 'Báculo Feynman',
        focusApplication: 'Efecto Feynman: explica en voz alta tu meta antes de comenzar.',
        tacticalQuote: 'La claridad vocal ahuyenta la niebla mental.',
        coinsPerPomodoro: 6,
        pausePenaltyCoins: 2,
        bossDamagePoints: 12,
        bossHealPoints: 5,
        passiveName: 'Voz Guía',
        passiveAdvantage: 'Mayor retención conceptual y claridad de objetivos.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'hamster', 
        name: 'Pip', 
        species: 'Hámster Veloz (Roedor Dinámico)',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'DINAMISMO',
        stars: 1,
        emoji: '🐹', 
        color: '#f97316', 
        role: 'Impulsor de Momentum',
        weaponName: 'Esferas de Momentum',
        focusApplication: 'Micrometas de 10 minutos para mantener un impulso continuo.',
        tacticalQuote: 'El movimiento continuo acumula victorias colosales.',
        coinsPerPomodoro: 5,
        pausePenaltyCoins: 2,
        bossDamagePoints: 10,
        bossHealPoints: 4,
        passiveName: 'Rueda Constante',
        passiveAdvantage: 'Bajo costo de fallo y gran facilidad de repetición.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },
      { 
        id: 'raton', 
        name: 'Sombra', 
        species: 'Ratón Sigiloso (Roedor Táctico)',
        type: 'inicial', 
        tier: 'Común',
        archetype: 'Inicial',
        archetypeBadge: 'SIGILO',
        stars: 1,
        emoji: '🐭', 
        color: '#ec4899', 
        role: 'Infiltrador Nocturno',
        weaponName: 'Daga Sombría',
        focusApplication: 'Cero ruido: apaga toda notificación antes de arrancar.',
        tacticalQuote: 'En la quietud absoluta el trabajo avanza sin resistencia.',
        coinsPerPomodoro: 6,
        pausePenaltyCoins: 2,
        bossDamagePoints: 11,
        bossHealPoints: 5,
        passiveName: 'Infiltración',
        passiveAdvantage: 'Escudo protector ante distracciones del entorno.',
        cost: 0, 
        qualityId: null,
        hasEvolution: false
      },

      // 2. RETOS DE CUALIDADES
      { 
        id: 'tortuga', 
        name: 'Genbu', 
        species: 'Tortuga Sabia (Reptil Ancestral)',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'CONSTANCIA',
        stars: 2,
        emoji: '🐢', 
        color: '#22c55e', 
        role: 'Sabio Paciente',
        weaponName: 'Caparazón Rúnico',
        focusApplication: 'Avance milimétrico sostenido: no busques velocidad, busca no parar.',
        tacticalQuote: 'Lento pero implacable, el caparazón resiste cualquier tormenta.',
        coinsPerPomodoro: 12,
        pausePenaltyCoins: 4,
        bossDamagePoints: 24,
        bossHealPoints: 8,
        passiveName: 'Caparazón Imperturbable',
        passiveAdvantage: '+100% de daño sostenido al jefe en pomodoros consecutivos.',
        cost: 50, 
        qualityId: 'constancia', 
        unlockTotal: 7,
        hasEvolution: true
      },
      { 
        id: 'hormiga', 
        name: 'Vargas', 
        species: 'Hormiga Guerrera (Himenóptero)',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'DISCIPLINA',
        stars: 2,
        emoji: '🐜', 
        color: '#78350f', 
        role: 'Esfuerzo Diario',
        weaponName: 'Mandíbula Titánica',
        focusApplication: 'Carga una sola roca a la vez: mira solo tu bloque actual.',
        tacticalQuote: 'La fuerza radica en la repetición inquebrantable.',
        coinsPerPomodoro: 14,
        pausePenaltyCoins: 5,
        bossDamagePoints: 28,
        bossHealPoints: 10,
        passiveName: 'Carga Titánica',
        passiveAdvantage: 'Duplica el impacto en la salud del Jefe comunitario.',
        cost: 60, 
        qualityId: 'disciplina', 
        unlockTotal: 15,
        hasEvolution: false
      },
      { 
        id: 'buho', 
        name: 'Noctis', 
        species: 'Búho Erudito (Rapaz Nocturna)',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'SABIDURÍA (80/20)',
        stars: 2,
        emoji: '🦉', 
        color: '#6366f1', 
        role: 'Estratega Sabio',
        weaponName: 'Orbe Ocular 80/20',
        focusApplication: 'Enfoca el 20% de tareas que producirá el 80% del impacto.',
        tacticalQuote: 'La mirada aguda ahorra horas de vuelo inútil.',
        coinsPerPomodoro: 16,
        pausePenaltyCoins: 6,
        bossDamagePoints: 32,
        bossHealPoints: 12,
        passiveName: 'Visión Nocturna 80/20',
        passiveAdvantage: '+32 Puntos de daño por sesión estratégica completada.',
        cost: 120, 
        qualityId: 'sabiduria', 
        unlockTotal: 5,
        hasEvolution: false
      },
      { 
        id: 'rana', 
        name: 'Kero', 
        species: 'Rana Cazadora (Anfibio Táctico)',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'SUPERACIÓN (SAPO)',
        stars: 2,
        emoji: '🐸', 
        color: '#10b981', 
        role: 'Saltarina Cazadora',
        weaponName: 'Arpón Traga-Sapos',
        focusApplication: 'Trágate ese sapo: ejecuta tu tarea más difícil a primera hora.',
        tacticalQuote: 'Vence lo peor primero y el resto del día será un paseo.',
        coinsPerPomodoro: 18,
        pausePenaltyCoins: 7,
        bossDamagePoints: 36,
        bossHealPoints: 14,
        passiveName: 'Salto al Abismo',
        passiveAdvantage: 'Recompensa premium al vencer tareas procrastinadas.',
        cost: 50, 
        qualityId: 'superacion', 
        unlockTotal: 5,
        hasEvolution: false
      },
      { 
        id: 'aguila', 
        name: 'Valkor', 
        species: 'Águila Imperial (Rapaz Soberana)',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'VISIÓN',
        stars: 3,
        emoji: '🦅', 
        color: '#3b82f6', 
        role: 'Ojo de Halcón',
        weaponName: 'Arco Telemetría',
        focusApplication: 'Ojos fijos en la meta: no desvíes la vista del objetivo final.',
        tacticalQuote: 'Desde las alturas ningún laberinto tiene secretos.',
        coinsPerPomodoro: 20,
        pausePenaltyCoins: 8,
        bossDamagePoints: 40,
        bossHealPoints: 16,
        passiveName: 'Foco Telemetría',
        passiveAdvantage: 'Máxima generación de daño y monedas en su categoría.',
        cost: 200, 
        qualityId: 'vision', 
        unlockTotal: 5,
        hasEvolution: false
      },
      { 
        id: 'abeja', 
        name: 'Vespia', 
        species: 'Abeja Obrera (Antófilo Incansable)',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'COLABORACIÓN',
        stars: 2,
        emoji: '🐝', 
        color: '#eab308', 
        role: 'Obrera de la Colmena',
        weaponName: 'Aguijón de Enjambre',
        focusApplication: 'Sincronízate con la comunidad para potenciar la disciplina.',
        tacticalQuote: 'La colmena edifica imperios flor a flor.',
        coinsPerPomodoro: 15,
        pausePenaltyCoins: 5,
        bossDamagePoints: 30,
        bossHealPoints: 10,
        passiveName: 'Zumbido de Enjambre',
        passiveAdvantage: 'Bonificación multiplicada en salas comunitarias.',
        cost: 70, 
        qualityId: 'colaboracion', 
        unlockTotal: 5,
        hasEvolution: false
      },
      { 
        id: 'castor', 
        name: 'Barris', 
        species: 'Castor Ingeniero (Roedor Constructor)',
        type: 'cualidad', 
        tier: 'Raro',
        archetype: 'Cualidad',
        archetypeBadge: 'CONSTRUCCIÓN',
        stars: 2,
        emoji: '🦫', 
        color: '#b45309', 
        role: 'Ingeniero Feroz',
        weaponName: 'Hacha de Ingeniero',
        focusApplication: 'No cierres el día sin haber completado un entregable tangible.',
        tacticalQuote: 'Tronco a tronco se desvía el cauce del río.',
        coinsPerPomodoro: 16,
        pausePenaltyCoins: 6,
        bossDamagePoints: 32,
        bossHealPoints: 12,
        passiveName: 'Dique Inexpugnable',
        passiveAdvantage: 'Alto rendimiento en bloques de 3 pomodoros seguidos.',
        cost: 80, 
        qualityId: 'construccion', 
        unlockTotal: 3,
        hasEvolution: false
      },

      // 3. CAZADORES
      { 
        id: 'zorro', 
        name: 'Renard', 
        species: 'Zorro Astuto (Cánido Táctico)',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'CAZADOR ÁGIL',
        stars: 3,
        emoji: '🦊', 
        color: '#f97316', 
        role: 'Espía de Sombras',
        weaponName: 'Kopis Fantasma',
        focusApplication: 'Cambia de entorno si notas que la desidia se arraigó en tu mesa.',
        tacticalQuote: 'La astucia rodea la trampa antes de que se active.',
        coinsPerPomodoro: 22,
        pausePenaltyCoins: 9,
        bossDamagePoints: 44,
        bossHealPoints: 18,
        passiveName: 'Paso Fantasma',
        passiveAdvantage: '+22 Coins directas con alto daño de asedio al jefe.',
        cost: 100, 
        qualityId: null, 
        qualityName: 'Astucia', 
        qualityReq: 'Canjéalo por 100 Pro Coins 🪙 aplicando inteligencia y estrategia.',
        hasEvolution: false
      },
      { 
        id: 'lince', 
        name: 'Silas', 
        species: 'Lince Cazador (Felino Boreal)',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'ALTA PRECISIÓN',
        stars: 3,
        emoji: '🐱', 
        color: '#a855f7', 
        role: 'Alta Precisión',
        weaponName: 'Garras de Cuarzo',
        focusApplication: 'Elimina cualquier pestaña secundaria: tolerancia cero al error.',
        tacticalQuote: 'La mirada congelada antes del zarpazo infalible.',
        coinsPerPomodoro: 26,
        pausePenaltyCoins: 11,
        bossDamagePoints: 52,
        bossHealPoints: 22,
        passiveName: 'Enfoque Puntería',
        passiveAdvantage: 'Altísimo multiplicador de daño (+52 Pts al Jefe).',
        cost: 180, 
        qualityId: null, 
        qualityName: 'Precisión', 
        qualityReq: 'Canjéalo por 180 Pro Coins 🪙 entrenando tu puntería mental.',
        hasEvolution: false
      },
      { 
        id: 'panda', 
        name: 'Tao', 
        species: 'Panda Maestro (Úrsido Zen)',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'SERENIDAD ZEN',
        stars: 3,
        emoji: '🐼', 
        color: '#6b7280', 
        role: 'Maestro de la Calma',
        weaponName: 'Vara de Bambú Zen',
        focusApplication: 'Inhala 4s y exhala 6s antes de iniciar para calmar el cortisol.',
        tacticalQuote: 'La mente en paz es un escudo impermeable.',
        coinsPerPomodoro: 24,
        pausePenaltyCoins: 8,
        bossDamagePoints: 48,
        bossHealPoints: 16,
        passiveName: 'Paz de Bambú',
        passiveAdvantage: 'Protección equilibrada con gran rendimiento de monedas.',
        cost: 150, 
        qualityId: null, 
        qualityName: 'Serenidad', 
        qualityReq: 'Canjéalo por 150 Pro Coins 🪙 manteniendo el enfoque y la calma.',
        hasEvolution: false
      },
      { 
        id: 'oso', 
        name: 'Bjorn', 
        species: 'Oso Implacable (Úrsido Titánico)',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'FUERZA PURA',
        stars: 3,
        emoji: '🐻', 
        color: '#78350f', 
        role: 'Fuerza Inquebrantable',
        weaponName: 'Maza de Granito',
        focusApplication: 'No te levantes de la silla hasta que el cronómetro llegue a cero.',
        tacticalQuote: 'La montaña no se inmuta ante el aullido del viento.',
        coinsPerPomodoro: 28,
        pausePenaltyCoins: 12,
        bossDamagePoints: 56,
        bossHealPoints: 24,
        passiveName: 'Zarpazo Telúrico',
        passiveAdvantage: 'Golpes masivos directos a la barra de vida del Jefe.',
        cost: 200, 
        qualityId: null, 
        qualityName: 'Resistencia', 
        qualityReq: 'Canjéalo por 200 Pro Coins 🪙 resistiendo a los distractores.',
        hasEvolution: false
      },
      { 
        id: 'elefante', 
        name: 'Titanis', 
        species: 'Elefante Titán (Proboscídeo Ancestral)',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'MEMORIA',
        stars: 3,
        emoji: '🐘', 
        color: '#6b7280', 
        role: 'Memoria Ancestral',
        weaponName: 'Colmillos Rúnicos',
        focusApplication: 'Registra tus aprendizajes en tu bitácora tras cada bloque.',
        tacticalQuote: 'Los pasos firmes del gigante dejan huellas imborrables.',
        coinsPerPomodoro: 30,
        pausePenaltyCoins: 14,
        bossDamagePoints: 60,
        bossHealPoints: 26,
        passiveName: 'Memoria de Roca',
        passiveAdvantage: 'Recompensa de élite con +30 monedas por sesión completada.',
        cost: 220, 
        qualityId: null, 
        qualityName: 'Estabilidad', 
        qualityReq: 'Canjéalo por 220 Pro Coins 🪙 sosteniendo tu esfuerzo continuo.',
        hasEvolution: false
      },
      { 
        id: 'leon', 
        name: 'Leónidas', 
        species: 'León Monarca (Felino Real)',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'LIDERAZGO',
        stars: 3,
        emoji: '🦁', 
        color: '#fbbf24', 
        role: 'Rey de la Comunidad',
        weaponName: 'Cetro Imperial',
        focusApplication: 'Responsabilidad total: nadie vendrá a hacer el trabajo por ti.',
        tacticalQuote: 'El rugido del rey ordena el caos del reino.',
        coinsPerPomodoro: 32,
        pausePenaltyCoins: 15,
        bossDamagePoints: 64,
        bossHealPoints: 28,
        passiveName: 'Rugido Imperial',
        passiveAdvantage: 'Multiplicador de ataque de asedio masivo contra el Jefe.',
        cost: 250, 
        qualityId: null, 
        qualityName: 'Liderazgo', 
        qualityReq: 'Canjéalo por 250 Pro Coins 🪙 venciendo la desidia con liderazgo.',
        hasEvolution: false
      },
      { 
        id: 'tigre', 
        name: 'Rakan', 
        species: 'Tigre Feroz (Felino Rayado)',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'DETERMINACIÓN',
        stars: 3,
        emoji: '🐅', 
        color: '#f97316', 
        role: 'Fuerza de Voluntad',
        weaponName: 'Cuchillas Dentadas',
        focusApplication: 'Visualiza la meta antes de que el cansancio te convenza de parar.',
        tacticalQuote: 'El cazador no pestañea cuando la presa está a tiro.',
        coinsPerPomodoro: 35,
        pausePenaltyCoins: 16,
        bossDamagePoints: 70,
        bossHealPoints: 30,
        passiveName: 'Furia Determinada',
        passiveAdvantage: '+70 Puntos de daño directo por cada pomodoro finalizado.',
        cost: 300, 
        qualityId: null, 
        qualityName: 'Determinación', 
        qualityReq: 'Canjéalo por 300 Pro Coins 🪙 mostrando coraje en cada meta.',
        hasEvolution: false
      },
      { 
        id: 'lobo', 
        name: 'Fenrir', 
        species: 'Lobo Alfa (Cánido Salvaje)',
        type: 'especial', 
        tier: 'Épico',
        archetype: 'Cazador',
        archetypeBadge: 'PERSEVERANCIA',
        stars: 3,
        emoji: '🐺', 
        color: '#ef4444', 
        role: 'Guía de Manada',
        weaponName: 'Garras Tácticas',
        focusApplication: 'Cumple el pacto contigo: si dijiste que estudiarías, hazlo.',
        tacticalQuote: 'La manada avanza unida bajo el aullido del líder.',
        coinsPerPomodoro: 38,
        pausePenaltyCoins: 18,
        bossDamagePoints: 76,
        bossHealPoints: 32,
        passiveName: 'Aullido Alfa',
        passiveAdvantage: 'La cúspide de los cazadores: +38 Coins y +76 daño.',
        cost: 350, 
        qualityId: null, 
        qualityName: 'Perseverancia', 
        qualityReq: 'Canjéalo por 350 Pro Coins 🪙 demostrando lealtad y consistencia.',
        hasEvolution: false
      },

      // 4. LEGENDARIOS
      { 
        id: 'dragon', 
        name: 'Bahamut', 
        species: 'Dragón del Ego (Sierpe Cósmica)',
        type: 'legendario', 
        tier: 'Legendario',
        archetype: 'Alto Riesgo',
        archetypeBadge: 'ALTO RIESGO / PODER',
        stars: 5,
        emoji: '🐉', 
        color: '#10b981', 
        role: 'Señor del Ego',
        weaponName: 'Katana de Plasma',
        focusApplication: 'Domina tu ego: el rival real no es la tarea, es tu resistencia.',
        tacticalQuote: 'Quien doblega su propio ego gobierna su destino.',
        coinsPerPomodoro: 60,
        pausePenaltyCoins: 35,
        bossDamagePoints: 130,
        bossHealPoints: 60,
        passiveName: 'Llama del Vórtice',
        passiveAdvantage: '+60 Coins y +130 Daño fulminante al Jefe.',
        cost: 600, 
        qualityId: null, 
        qualityName: 'Maestría', 
        qualityReq: 'Empuña la Katana de Plasma y el Orbe Cósmico por 600 Pro Coins 🪙.',
        hasEvolution: false
      },
      { 
        id: 'fenix', 
        name: 'Ignis', 
        species: 'Fénix Inmortal (Ave de Fuego)',
        type: 'legendario', 
        tier: 'Legendario',
        archetype: 'Alto Riesgo',
        archetypeBadge: 'RENACIMIENTO',
        stars: 5,
        emoji: '🔥', 
        color: '#f97316', 
        role: 'Inmortal de Fuego',
        weaponName: 'Lanza Solar',
        focusApplication: 'Renace sin culpa ni remordimientos de cualquier mal día.',
        tacticalQuote: 'De las cenizas del tropiezo brota la llama de la victoria.',
        coinsPerPomodoro: 55,
        pausePenaltyCoins: 30,
        bossDamagePoints: 120,
        bossHealPoints: 50,
        passiveName: 'Corona Solar',
        passiveAdvantage: 'Generación estelar de +55 Coins y +120 Daño Solar.',
        cost: 500, 
        qualityId: null, 
        qualityName: 'Resiliencia', 
        qualityReq: 'Blande la Lanza Solar y la Corona de Fuego por 500 Pro Coins 🪙.',
        hasEvolution: false
      },
      { 
        id: 'grifo', 
        name: 'Aethel', 
        species: 'Grifo Celestial (Híbrido de Luz)',
        type: 'legendario', 
        tier: 'Legendario',
        archetype: 'Alto Riesgo',
        archetypeBadge: 'HONOR SAGRADO',
        stars: 5,
        emoji: '🦅', 
        color: '#eab308', 
        role: 'Guardián Celestial',
        weaponName: 'Alabarda Sagrada',
        focusApplication: 'Honor impecable: cero ventanas trampa durante el hiperfoco.',
        tacticalQuote: 'La alabarda sagrada solo corta cuando el alma es pura.',
        coinsPerPomodoro: 58,
        pausePenaltyCoins: 32,
        bossDamagePoints: 125,
        bossHealPoints: 55,
        passiveName: 'Rueda Astral',
        passiveAdvantage: '+58 Coins y +125 Daño Astral directo al Jefe.',
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

      if (item.type === 'inicial' && item.cost === 0) {
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

  hasCustomIdentity(): boolean {
    const prof = this.membership.userProfession();
    const country = this.membership.userCountry();
    return !!((prof && prof.trim()) || (country && country.trim()));
  }

  ngOnInit() {
    this.inspectedAvatar.set(this.activeAvatar());
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
    if (!raw) return '📍';
    const opt = this.countryOptions.find(c => 
      c.name.toLowerCase() === raw.toLowerCase() ||
      c.code.toLowerCase() === raw.toLowerCase() ||
      raw.toLowerCase().startsWith(c.name.toLowerCase())
    );
    return opt ? opt.flag : '🌐';
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
