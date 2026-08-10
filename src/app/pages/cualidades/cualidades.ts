import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MembershipService, AvatarItem, QualityItem } from '../../services/membership.service';

interface DojoAvatar {
  id: string;
  name: string;
  type: 'inicial' | 'cualidad' | 'especial' | 'legendario';
  emoji: string;
  color: string;
  role: string;
  cost: number;
  qualityId: string | null;
  qualityName?: string;
  qualityReq?: string;
  unlockTotal?: number;
}

@Component({
  selector: 'app-cualidades',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- SIDEBAR -->
    <div class="sidebar">
      <a routerLink="/home" class="logo">
        <span class="logo-icon"><i class="fa-solid fa-yin-yang" style="color: var(--accent);"></i></span>
        <span class="logo-text">Kaizen Focus</span>
      </a>
      <div class="nav">
        <a routerLink="/home" routerLinkActive="active" class="nav-item">
          <span class="nav-dot"></span>
          Inicio
        </a>
        <a routerLink="/enfoque" routerLinkActive="active" class="nav-item">
          <span class="nav-dot"></span>
          Zona de concentración
        </a>
        <a routerLink="/fechas" routerLinkActive="active" class="nav-item">
          <span class="nav-dot"></span>
          Estadísticas
        </a>
        <a (click)="openIdeasModal()" class="nav-item" style="cursor: pointer; display: flex; align-items: center; width: 100%;">
          <span class="nav-dot"></span>
          Baúl de ideas
          <span *ngIf="capturedIdeas().length > 0" 
                style="margin-left: auto; background: var(--accent); color: #fff; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 10px; line-height: 1; box-shadow: 0 0 8px rgba(99, 102, 241, 0.45);">
            {{ capturedIdeas().length }}
          </span>
        </a>
        <!-- LOGOUT -->
        <a routerLink="/login" class="nav-item logout-item" style="margin-top: auto;">
          <i class="fa-solid fa-right-from-bracket" style="font-size: 13px;"></i>
          Cerrar Sesión
        </a>
      </div>
      <div class="sidebar-footer" routerLink="/cualidades" style="cursor: pointer;">
        <div [class]="'avatar avatar-sprite sprite-' + membership.selectedAvatar()" style="background-color: var(--accent); border: 1.5px solid rgba(255,255,255,0.08);">
        </div>
        <div style="overflow: hidden; display: flex; flex-direction: column;">
          <div class="user-name" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">{{ membership.userName() }}</div>
          <div class="user-sub" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: var(--yellow);">
            {{ membership.getSelectedAvatarName() }}
          </div>
        </div>
        <i class="fa-solid fa-gear" style="margin-left: auto; font-size: 14px; color: var(--muted); opacity: 0.65; transition: all 0.3s ease; padding-right: 4px;"></i>
      </div>
    </div>

    <!-- MAIN PANEL -->
    <div class="main">
      <div class="minimal-grid">
        
        <!-- COLUMNA IZQUIERDA: PERFIL Y DETALLES (ANCLADO/MINIMALISTA) -->
        <div class="profile-sidebar-card">
          
          <!-- SECCIÓN VISTA PREVIA -->
          <div class="avatar-preview-section">
            <div class="avatar-ring-large" [style.--ring-color]="previewAvatar().color">
              <div [class]="'avatar-sprite sprite-' + previewAvatar().id"></div>
            </div>
            
            <div class="warrior-title-badge">
              <i class="fa-solid fa-medal badge-accent-icon"></i>
              <span>{{ previewAvatar().name }}</span>
            </div>
          </div>

          <!-- EDITOR DE NOMBRE INLINE -->
          <div class="username-inline-container">
            <span class="username-input-label">Nombre de usuario</span>
            <div class="username-input-wrapper">
              <input 
                type="text" 
                [value]="inputName()"
                (input)="onUsernameInput($event)"
                placeholder="Nombre de usuario"
                class="username-field-inline"
                [class.has-changes]="inputName().trim() !== membership.userName()"
                [class.has-error]="usernameError()"
              />
              <i class="fa-solid fa-pen input-icon-decor"></i>
            </div>
            <div class="username-error-inline" *ngIf="usernameError()">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>{{ usernameError() }}</span>
            </div>
            
            <!-- BOTÓN GUARDAR DINÁMICO -->
            <button 
              *ngIf="inputName().trim() !== membership.userName() && !usernameError()"
              (click)="saveUsername()"
              class="save-username-btn-inline animate-pulse-glow"
            >
              Guardar Cambios <i class="fa-solid fa-circle-check"></i>
            </button>
          </div>

          <!-- PANEL DINÁMICO DE UNLOCK / O DETALLES DE BLOQUEADO -->
          <div class="dynamic-details-panel">
            
            <!-- ESTADO A: SI EL USUARIO HIZO CLIC EN UN AVATAR BLOQUEADO -->
            <div *ngIf="selectedLockedAvatar() as avatar; else defaultStats" class="locked-details-box">
              <div class="locked-details-header">
                <span class="locked-badge-indicator" [style.color]="avatar.type === 'legendario' ? 'var(--yellow)' : 'var(--red)'">
                  <i class="fa-solid fa-lock"></i> {{ avatar.type === 'legendario' ? 'Legendario' : 'Bloqueado' }}
                </span>
                <button class="clear-selection-btn" (click)="selectedLockedAvatar.set(null)">×</button>
              </div>
              
              <div class="locked-avatar-intro">
                <span class="locked-avatar-name" [style.color]="avatar.type === 'legendario' ? 'var(--yellow)' : '#fff'">{{ avatar.name }}</span>
                <span class="locked-avatar-role">{{ avatar.role }}</span>
              </div>

              <!-- CASO 1: DESBLOQUEABLE POR CUALIDAD -->
              <div *ngIf="avatar.qualityId && avatar.quality" class="unlock-criteria-section">
                <p class="criteria-label">Cualidad de Honor Requerida:</p>
                <div class="criteria-quality-card">
                  <div class="criteria-quality-meta">
                    <span class="criteria-quality-name">{{ avatar.quality.name }}</span>
                    <span class="criteria-quality-ratio">{{ avatar.quality.unlockProgress }} / {{ avatar.quality.unlockTotal }}</span>
                  </div>
                  <p class="criteria-quality-req">{{ avatar.quality.unlockRequirement }}</p>
                  
                  <div class="criteria-progress-track">
                    <div class="criteria-progress-fill" [style.width]="getQualityProgressPercent(avatar.quality) + '%'"></div>
                  </div>
                </div>

                <button 
                  (click)="simulateUnlockQuality(avatar.quality)"
                  class="action-btn-unlock-test"
                >
                  <i class="fa-solid fa-wand-magic-sparkles"></i> Demostrar Cualidad (Test)
                </button>
              </div>

              <!-- CASO 2: DESBLOQUEABLE POR PRO COINS (TIENDA / LEGENDARIOS) -->
              <div *ngIf="!avatar.qualityId && avatar.cost > 0" class="unlock-criteria-section">
                <p class="criteria-label">Desbloquea con Monedas del Dojo:</p>
                <div class="criteria-shop-card">
                  <div class="shop-cost-row">
                    <span>Precio:</span>
                    <span class="cost-value">{{ avatar.cost }} 🪙</span>
                  </div>
                  <div class="shop-balance-row">
                    <span>Tu Saldo:</span>
                    <span class="balance-value" [class.insufficient]="membership.proCoins() < avatar.cost">
                      {{ membership.proCoins() }} 🪙
                    </span>
                  </div>
                </div>

                <button 
                  [disabled]="membership.proCoins() < avatar.cost"
                  (click)="buyAvatar(avatar)"
                  class="action-btn-buy"
                  [class.disabled]="membership.proCoins() < avatar.cost"
                  [style.background]="avatar.type === 'legendario' ? 'var(--yellow)' : 'var(--accent)'"
                  [style.color]="avatar.type === 'legendario' ? '#000' : '#fff'"
                >
                  <i class="fa-solid fa-coins"></i> 
                  {{ membership.proCoins() >= avatar.cost ? 'Adquirir Criatura' : 'Monedas Insuficientes' }}
                </button>
              </div>

            </div>

            <!-- ESTADO B: DATOS E HISTORIAL POR DEFECTO -->
            <ng-template #defaultStats>
              <div class="stats-overview-box">
                <h4 class="stats-box-title"><i class="fa-solid fa-chart-simple"></i> Progreso en el Dojo</h4>
                
                <div class="stat-row">
                  <span class="stat-name">Avatares Desbloqueados:</span>
                  <span class="stat-value">{{ getUnlockedAvatarsCount() }} / 21</span>
                </div>
                <div class="stat-row">
                  <span class="stat-name">Avatares con Cualidades:</span>
                  <span class="stat-value">{{ getUnlockedQualities().length }} / 6</span>
                </div>
                <div class="stat-row">
                  <span class="stat-name">Monedas Pro Coins:</span>
                  <span class="stat-value highlight-coins">{{ membership.proCoins() }} 🪙</span>
                </div>

                <!-- CUALIDADES DESBLOQUEADAS (PILLS) -->
                <div class="unlocked-qualities-section" *ngIf="getUnlockedQualities().length > 0">
                  <span class="sub-label">Cualidades de Honor Activas</span>
                  <div class="qualities-badges-row">
                    <span 
                      *ngFor="let q of getUnlockedQualities()" 
                      class="badge-quality-small"
                      [style.border-color]="previewAvatar().color"
                      [title]="q.unlockRequirement"
                    >
                      {{ membership.getEmoji(q.animal) }} {{ q.name }}
                    </span>
                  </div>
                </div>
              </div>
            </ng-template>

          </div>

        </div>

        <!-- COLUMNA DERECHA: CATÁLOGO DE AVATARES SECCIONADO (MINIMALISTA) -->
        <div class="catalog-main-panel">
          
          <div class="minimal-header">
            <h1 class="minimal-title">Configurar mi avatar</h1>
            <p class="minimal-subtitle">Selecciona tu avatar guardián o desbloquea nuevas criaturas mediante tu esfuerzo.</p>
          </div>

          <!-- SECCIÓN 1: LIBRES DESDE EL INICIO -->
          <div class="category-section">
            <h3 class="category-title">
              Mi Avatar
            </h3>
            <div class="avatar-minimal-grid">
              <div 
                *ngFor="let avatar of getAvatarsByType('inicial')"
                (click)="selectAvatar(avatar)"
                class="avatar-minimal-card"
                [class.selected]="previewAvatar().id === avatar.id"
                [class.locked]="!avatar.isUnlocked"
                [style.--glow-color]="avatar.color"
              >
                <!-- Lock Icon Badge in Corner -->
                <div class="card-lock-badge" *ngIf="!avatar.isUnlocked">
                  <i class="fa-solid fa-lock"></i>
                </div>
                <!-- Checkmark badge if equipped -->
                <div class="card-equipped-badge" *ngIf="previewAvatar().id === avatar.id">
                  ✓
                </div>
                
                <div [class]="'avatar-sprite sprite-thumb sprite-' + avatar.id"></div>
                <span class="card-avatar-name">{{ avatar.name }}</span>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 2: GANADOS POR CUALIDADES -->
          <div class="category-section">
            <h3 class="category-title">
              Ganados por Cualidades
            </h3>
            <div class="avatar-minimal-grid">
              <div 
                *ngFor="let avatar of getAvatarsByType('cualidad')"
                (click)="selectAvatar(avatar)"
                class="avatar-minimal-card"
                [class.selected]="previewAvatar().id === avatar.id"
                [class.locked]="!avatar.isUnlocked"
                [style.--glow-color]="avatar.color"
              >
                <div class="card-lock-badge" *ngIf="!avatar.isUnlocked">
                  <i class="fa-solid fa-lock"></i>
                </div>
                <div class="card-equipped-badge" *ngIf="previewAvatar().id === avatar.id">
                  ✓
                </div>
                
                <div [class]="'avatar-sprite sprite-thumb sprite-' + avatar.id"></div>
                <span class="card-avatar-name">{{ avatar.name }}</span>

                <!-- TOOLTIP AL HACER HOVER -->
                <div class="hover-tooltip-minimal" *ngIf="avatar.displayName">
                  <span class="tooltip-qual-title">
                    <i class="fa-solid fa-award"></i> Cualidad: {{ avatar.displayName }}
                  </span>
                  <span class="tooltip-qual-req">{{ avatar.displayReq }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 3: ESPECIALES DEL DOJO -->
          <div class="category-section">
            <h3 class="category-title">
              Especiales del Dojo
            </h3>
            <div class="avatar-minimal-grid">
              <div 
                *ngFor="let avatar of getAvatarsByType('especial')"
                (click)="selectAvatar(avatar)"
                class="avatar-minimal-card"
                [class.selected]="previewAvatar().id === avatar.id"
                [class.locked]="!avatar.isUnlocked"
                [style.--glow-color]="avatar.color"
              >
                <div class="card-lock-badge" *ngIf="!avatar.isUnlocked">
                  <i class="fa-solid fa-lock"></i>
                </div>
                <div class="card-equipped-badge" *ngIf="previewAvatar().id === avatar.id">
                  ✓
                </div>
                
                <div [class]="'avatar-sprite sprite-thumb sprite-' + avatar.id"></div>
                <span class="card-avatar-name">{{ avatar.name }}</span>

                <!-- TOOLTIP AL HACER HOVER -->
                <div class="hover-tooltip-minimal" *ngIf="avatar.displayName">
                  <span class="tooltip-qual-title">
                    <i class="fa-solid fa-award"></i> Cualidad: {{ avatar.displayName }}
                  </span>
                  <span class="tooltip-qual-req">{{ avatar.displayReq }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- SECCIÓN 4: LEGENDARIOS -->
          <div class="category-section" style="margin-bottom: 40px;">
            <h3 class="category-title" style="color: var(--yellow);">
              Legendarios
            </h3>
            <div class="avatar-minimal-grid">
              <div 
                *ngFor="let avatar of getAvatarsByType('legendario')"
                (click)="selectAvatar(avatar)"
                class="avatar-minimal-card legendary-card"
                [class.selected]="previewAvatar().id === avatar.id"
                [class.locked]="!avatar.isUnlocked"
                [style.--glow-color]="avatar.color"
              >
                <div class="card-lock-badge" *ngIf="!avatar.isUnlocked">
                  <i class="fa-solid fa-lock"></i>
                </div>
                <div class="card-equipped-badge" *ngIf="previewAvatar().id === avatar.id">
                  ✓
                </div>
                
                <div [class]="'avatar-sprite sprite-thumb sprite-' + avatar.id"></div>
                <span class="card-avatar-name">{{ avatar.name }}</span>

                <!-- TOOLTIP AL HACER HOVER -->
                <div class="hover-tooltip-minimal" *ngIf="avatar.displayName">
                  <span class="tooltip-qual-title">
                    <i class="fa-solid fa-award"></i> Cualidad: {{ avatar.displayName }}
                  </span>
                  <span class="tooltip-qual-req">{{ avatar.displayReq }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>

    <!-- PANTALLA RECOMPENSA DE DESBLOQUEO EXITOSO (EVALUABLE/TEST) -->
    <div class="unlock-success-overlay" *ngIf="unlockedRewardQuality()" (click)="closeRewardFlow()">
      <div class="unlock-success-card" (click)="$event.stopPropagation()" [style.--glow-color]="'#84cc16'">
        <div class="success-glow"></div>
        <span class="success-badge">¡CUALIDAD DEMOSTRADA!</span>
        <div [class]="'avatar-sprite sprite-reward sprite-' + unlockedRewardQuality()?.animal"></div>
        <h3 class="reward-title">Cualidad Desbloqueada</h3>
        <span class="success-quality">{{ unlockedRewardQuality()?.name }}</span>
        <p class="reward-description">
          Has demostrado la cualidad de <strong>{{ unlockedRewardQuality()?.name }}</strong>. El avatar del Dojo ahora está desbloqueado.
        </p>
        <button (click)="closeRewardFlow()" class="btn-equip-now-action">
          Excelente <i class="fa-solid fa-circle-check"></i>
        </button>
      </div>
    </div>

    <!-- TOAST DE BIENVENIDA AL DOJO -->
    <div class="welcome-toast-overlay" *ngIf="showWelcomeAlert()" (click)="showWelcomeAlert.set(false)" style="cursor: pointer;">
      <div class="welcome-toast-card">
        <div class="toast-accent-bar"></div>
        <div class="toast-content-wrapper">
          <span class="toast-badge">✨ ¡BIENVENIDO AL DOJO!</span>
          <h4 class="toast-title">Comienza tu viaje de enfoque</h4>
          <p class="toast-desc">
            Ingresa tu nombre de usuario y equipa tu avatar inicial en la sección <strong>"Mi Avatar"</strong>.
          </p>
        </div>
      </div>
    </div>

    <!-- MODAL DE IDEAS CAPTURADAS (BAÚL DE IDEAS) -->
    <div *ngIf="showIdeasModal()" 
         style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); z-index: 10000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease; font-family: 'Space Grotesk', sans-serif;">
      
      <div style="background: linear-gradient(135deg, rgba(18, 18, 24, 0.95) 0%, rgba(30, 30, 39, 0.9) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 32px 80px rgba(0,0,0,0.6); position: relative; animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        
        <!-- Cerrar -->
        <button (click)="closeIdeasModal()" 
                style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: var(--muted); cursor: pointer; font-size: 16px; transition: color 0.2s;"
                onmouseover="this.style.color='var(--text)';"
                onmouseout="this.style.color='var(--muted)';">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <!-- Header Modal -->
        <div style="display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 14px;">
          <i class="fa-solid fa-box-archive" style="color: var(--yellow); font-size: 20px; filter: drop-shadow(0 0 8px rgba(255,215,0,0.3));"></i>
          <div style="text-align: left;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text); margin: 0; letter-spacing: -0.3px;">Baúl de Ideas Fugaces</h3>
            <span style="font-size: 10px; color: var(--muted); font-weight: 600;">Ideas y distractores capturados para procesar luego</span>
          </div>
        </div>

        <!-- Contenido Modal -->
        <div style="flex: 1; min-height: 200px; max-height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 4px;">
          
          <!-- Si no hay ideas -->
          <div *ngIf="capturedIdeas().length === 0" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 200px; color: var(--muted);">
            <i class="fa-solid fa-feather" style="font-size: 32px; opacity: 0.3;"></i>
            <span style="font-size: 12px; font-weight: 500; font-style: italic;">El baúl está vacío. ¡Envía tus primeras ideas volando!</span>
          </div>

          <!-- Lista de ideas -->
          <div *ngFor="let idea of capturedIdeas(); let i = index" 
               style="display: flex; align-items: flex-start; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 12px 16px; gap: 12px; transition: all 0.2s;"
               onmouseover="this.style.background='rgba(255,255,255,0.04)'; this.style.borderColor='rgba(255,215,0,0.15)';"
               onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(255,255,255,0.05)';">
            <div style="display: flex; flex-direction: column; gap: 4px; text-align: left; flex: 1;">
              <span style="font-size: 12.5px; color: var(--text); font-weight: 600; line-height: 1.4; word-break: break-word;">{{ idea }}</span>
              <span style="font-size: 9px; color: var(--muted); font-weight: 500;">Capturado hoy</span>
            </div>
            <button (click)="removeIdea(i)" 
                    style="background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 4px 8px; font-size: 11px; transition: all 0.2s;"
                    onmouseover="this.style.color='var(--red)'; this.style.transform='scale(1.1)';"
                    onmouseout="this.style.color='var(--muted)'; this.style.transform='scale(1)';"
                    title="Eliminar idea del baúl">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <!-- Footer Modal -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; margin-top: 5px;">
          <span style="font-size: 11px; color: var(--muted); font-weight: 600;">Total: {{ capturedIdeas().length }} ideas</span>
          
          <div style="display: flex; gap: 8px;">
            <!-- Botón limpiar todo (solo si hay ideas) -->
            <button *ngIf="capturedIdeas().length > 0"
                    (click)="clearAllIdeas()"
                    style="background: transparent; border: 1px solid rgba(239, 68, 68, 0.2); color: var(--red); padding: 8px 14px; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.2s;"
                    onmouseover="this.style.background='rgba(239, 68, 68, 0.05)';"
                    onmouseout="this.style.background='transparent';">
              Limpiar Todo
            </button>

            <button (click)="closeIdeasModal()" 
                    style="background: var(--accent); border: none; color: #000; padding: 8px 16px; border-radius: 8px; font-size: 11.5px; font-weight: 800; cursor: pointer; transition: all 0.2s;"
                    onmouseover="this.style.transform='translateY(-1px)';"
                    onmouseout="this.style.transform='translateY(0)';">
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .minimal-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      align-items: start;
    }
    .profile-sidebar-card {
      background: rgba(20, 20, 27, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      box-sizing: border-box;
      position: sticky;
      top: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .avatar-preview-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .avatar-ring-large {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      padding: 4px;
      background: linear-gradient(135deg, var(--ring-color, var(--accent)) 0%, transparent 80%);
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.6), 0 0 20px var(--ring-color, var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      position: relative;
    }
    .avatar-ring-large .avatar-sprite {
      width: 192px;
      height: 192px;
      border-radius: 50%;
      border: 3px solid #14141b;
      background-color: rgba(0, 0, 0, 0.4);
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
    }
    .warrior-title-badge {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 14px;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
    .badge-accent-icon {
      color: var(--accent);
      font-size: 10px;
    }
    .warrior-title-badge span {
      font-size: 11px;
      font-weight: 800;
      color: #fff;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .username-inline-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .username-input-label {
      font-size: 9px;
      font-weight: 800;
      color: var(--muted);
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .username-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .username-field-inline {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 36px 10px 14px;
      color: var(--text);
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 700;
      outline: none;
      transition: all 0.25s;
    }
    .username-field-inline:focus {
      border-color: var(--accent);
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
    }
    .username-field-inline.has-changes {
      border-color: var(--yellow);
    }
    .username-field-inline.has-error {
      border-color: var(--red) !important;
    }
    .input-icon-decor {
      position: absolute;
      right: 14px;
      color: var(--muted);
      font-size: 12px;
      pointer-events: none;
      opacity: 0.7;
    }
    .username-error-inline {
      color: var(--red);
      font-size: 9.5px;
      font-weight: 600;
      margin-top: 1px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .save-username-btn-inline {
      margin-top: 6px;
      background: var(--accent);
      color: #000;
      border: none;
      padding: 9px 14px;
      font-size: 11px;
      font-weight: 800;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
    }
    .save-username-btn-inline:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }
    .animate-pulse-glow {
      animation: buttonPulse 2.5s infinite ease-in-out;
    }
    @keyframes buttonPulse {
      0%, 100% { box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25); }
      50% { box-shadow: 0 4px 20px rgba(99, 102, 241, 0.45); }
    }
    .dynamic-details-panel {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 16px;
      margin-top: 4px;
      width: 100%;
    }
    .stats-overview-box {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .stats-box-title {
      font-size: 11px;
      font-weight: 850;
      color: #fff;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      color: var(--muted);
    }
    .stat-value {
      font-weight: 700;
      color: #fff;
    }
    .highlight-coins {
      color: var(--yellow);
    }
    .unlocked-qualities-section {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .unlocked-qualities-section .sub-label {
      font-size: 8.5px;
      font-weight: 800;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .qualities-badges-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .badge-quality-small {
      font-size: 9.5px;
      color: #fff;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.08);
      padding: 3px 8px;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .locked-details-box {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.04);
      padding: 14px;
      border-radius: 12px;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);
      animation: detailBoxSlide 0.25s ease-out;
    }
    @keyframes detailBoxSlide {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .locked-details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .locked-badge-indicator {
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .clear-selection-btn {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .clear-selection-btn:hover {
      color: #fff;
    }
    .locked-avatar-intro {
      display: flex;
      flex-direction: column;
    }
    .locked-avatar-name {
      font-size: 14px;
      font-weight: 850;
    }
    .locked-avatar-role {
      font-size: 10px;
      color: var(--muted);
      font-style: italic;
    }
    .unlock-criteria-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }
    .criteria-label {
      font-size: 11px;
      color: var(--muted);
      margin: 0;
      font-weight: 700;
    }
    .criteria-quality-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .criteria-quality-meta {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      font-weight: 800;
    }
    .criteria-quality-name {
      color: #fff;
    }
    .criteria-quality-ratio {
      color: var(--accent);
    }
    .criteria-quality-req {
      font-size: 11.5px;
      color: var(--muted);
      line-height: 1.35;
      margin: 2px 0 4px 0;
    }
    .criteria-progress-track {
      background: rgba(255,255,255,0.05);
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
    }
    .criteria-progress-fill {
      background: var(--accent);
      height: 100%;
    }
    .action-btn-unlock-test {
      background: rgba(16, 185, 129, 0.1);
      border: 1.5px solid var(--green);
      color: var(--green);
      font-size: 10.5px;
      font-weight: 800;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .action-btn-unlock-test:hover {
      background: rgba(16, 185, 129, 0.2);
    }
    .criteria-shop-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 11px;
    }
    .shop-cost-row, .shop-balance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--muted);
    }
    .cost-value {
      color: var(--yellow);
      font-weight: 800;
    }
    .balance-value {
      color: #fff;
      font-weight: 700;
    }
    .balance-value.insufficient {
      color: var(--red);
    }
    .action-btn-buy {
      border: none;
      font-size: 10.5px;
      font-weight: 900;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .action-btn-buy:hover:not(.disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .action-btn-buy.disabled {
      background: rgba(255, 255, 255, 0.05) !important;
      color: var(--muted) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      cursor: not-allowed !important;
    }
    .catalog-main-panel {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .minimal-header {
      border-bottom: 1px solid rgba(255,255,255,0.04);
      padding-bottom: 12px;
    }
    .minimal-title {
      font-size: 24px;
      font-weight: 950;
      color: #fff;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .minimal-subtitle {
      font-size: 12.5px;
      color: var(--muted);
      margin: 4px 0 0;
    }
    .category-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .category-title {
      font-size: 13.5px;
      font-weight: 900;
      color: #fff;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0.9;
    }
    .category-icon {
      font-size: 14px;
    }
    .avatar-minimal-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
      gap: 12px;
    }
    .avatar-minimal-card {
      background: rgba(255, 255, 255, 0.015);
      border: 1.5px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      padding: 6px;
      box-sizing: border-box;
    }
    .avatar-minimal-card:hover {
      background: rgba(255, 255, 255, 0.035);
      border-color: rgba(255, 255, 255, 0.1);
      transform: scale(1.04);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .avatar-minimal-card.selected {
      border-color: var(--glow-color, var(--accent)) !important;
      background: rgba(255, 255, 255, 0.02) !important;
      box-shadow: 0 0 15px rgba(var(--glow-color, var(--accent)), 0.3);
    }
    .avatar-minimal-card.locked {
      background: rgba(0, 0, 0, 0.18);
      border-color: rgba(255, 255, 255, 0.02);
    }
    .avatar-minimal-card.locked .avatar-sprite {
      filter: grayscale(1) brightness(0.35) contrast(0.9);
      opacity: 0.75;
    }
    .avatar-minimal-card.locked:hover {
      border-color: rgba(239, 68, 68, 0.25);
      background: rgba(239, 68, 68, 0.01);
    }
    .avatar-minimal-card.legendary-card {
      border-color: rgba(245, 158, 11, 0.25);
      background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, rgba(20, 20, 27, 0.45) 100%);
    }
    .avatar-minimal-card.legendary-card:hover {
      border-color: var(--yellow) !important;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.4) !important;
    }
    .avatar-minimal-card.legendary-card.selected {
      border-color: var(--yellow) !important;
      box-shadow: 0 0 22px rgba(245, 158, 11, 0.5) !important;
    }
    .avatar-sprite.sprite-thumb {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
      transition: all 0.2s ease;
    }
    .avatar-minimal-card:hover .avatar-sprite.sprite-thumb {
      transform: scale(1.05);
    }
    .card-lock-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #1e1e24;
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--muted);
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .card-equipped-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--glow-color, var(--accent));
      color: #000;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 900;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    .avatar-minimal-card.legendary-card .card-equipped-badge {
      background: var(--yellow) !important;
      color: #000 !important;
    }
    .card-avatar-name {
      font-size: 9px;
      font-weight: 700;
      color: var(--muted);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      max-width: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      pointer-events: none;
    }
    .avatar-minimal-card:hover .card-avatar-name {
      color: #fff;
    }
    .avatar-minimal-card.selected .card-avatar-name {
      color: #fff;
      font-weight: 800;
    }
    .hover-tooltip-minimal {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(-8px);
      width: 220px;
      background: rgba(10, 10, 15, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      z-index: 100;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-sizing: border-box;
      text-align: left;
    }
    .hover-tooltip-minimal::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px;
      border-style: solid;
      border-color: rgba(10, 10, 15, 0.96) transparent transparent transparent;
    }
    .avatar-minimal-card:hover .hover-tooltip-minimal {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(-4px);
    }
    .tooltip-qual-title {
      font-size: 12px;
      font-weight: 900;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tooltip-qual-req {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.35;
      font-weight: 500;
    }
    .unlock-success-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(8, 8, 10, 0.88);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: successOverlayFade 0.25s ease-out;
    }
    @keyframes successOverlayFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .unlock-success-card {
      background: #0f0f14;
      border: 1.5px solid var(--glow-color, var(--accent));
      border-radius: 16px;
      padding: 28px 24px;
      width: 100%;
      max-width: 340px;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 15px 40px rgba(0,0,0,0.6), 0 0 25px var(--glow-color);
    }
    .success-glow {
      position: absolute;
      top: -50px;
      left: 50%;
      transform: translateX(-50%);
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--glow-color, var(--accent)) 0%, transparent 70%);
      opacity: 0.18;
      pointer-events: none;
      filter: blur(15px);
    }
    .success-badge {
      font-size: 8.5px;
      font-weight: 900;
      color: var(--yellow);
      letter-spacing: 1.5px;
      display: inline-block;
      margin-bottom: 4px;
    }
    .sprite-reward {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 3px solid #84cc16;
      margin: 12px auto;
      box-shadow: 0 0 25px rgba(132, 204, 22, 0.45);
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
    }
    .reward-title {
      font-size: 18px;
      font-weight: 900;
      color: #fff;
      margin: 0;
      text-transform: uppercase;
    }
    .success-quality {
      color: #84cc16;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-top: 4px;
    }
    .reward-description {
      font-size: 11px;
      color: var(--text);
      max-width: 220px;
      margin: 8px auto;
      line-height: 1.45;
    }
    .btn-equip-now-action {
      background: #84cc16;
      margin-top: 12px;
      font-size: 11px;
      padding: 8px 16px;
      border: none;
      color: #000;
      font-weight: 800;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
      text-transform: uppercase;
      transition: all 0.2s;
    }
    .btn-equip-now-action:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }
    @media (max-width: 860px) {
      .minimal-grid {
        grid-template-columns: 1fr;
      }
      .profile-sidebar-card {
        position: relative;
        top: 0;
      }
    }
    .welcome-toast-overlay {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 2000;
      animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes toastSlideIn {
      from { opacity: 0; transform: translateX(50px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .welcome-toast-card {
      background: rgba(15, 15, 20, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      width: 320px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(99, 102, 241, 0.15);
      backdrop-filter: blur(12px);
      display: flex;
      overflow: hidden;
      position: relative;
    }
    .toast-accent-bar {
      width: 5px;
      background: var(--accent);
      flex-shrink: 0;
    }
    .toast-content-wrapper {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-sizing: border-box;
      width: 100%;
      text-align: left;
    }
    .toast-badge {
      font-size: 8.5px;
      font-weight: 900;
      color: var(--yellow);
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .toast-title {
      font-size: 13px;
      font-weight: 850;
      color: #fff;
      margin: 0;
    }
    .toast-desc {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.45;
      margin: 0;
    }
    .toast-dismiss-btn {
      background: var(--accent);
      color: #000;
      border: none;
      border-radius: 6px;
      padding: 7px 12px;
      font-size: 10.5px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 4px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
    }
    .toast-dismiss-btn:hover {
      filter: brightness(1.15);
    }
  `]
})
export class Cualidades implements OnInit {
  previewAvatar = signal<AvatarItem>({
    id: 'gato', name: 'Gato', icon: 'fa-cat', color: '#10b981', isUnlocked: true, isInitial: true
  });

  selectedLockedAvatar = signal<any | null>(null);
  unlockedRewardQuality = signal<QualityItem | null>(null);
  showWelcomeAlert = signal<boolean>(false);

  // Edit Name signals
  inputName = signal<string>('');
  usernameError = signal<string | null>(null);

  showIdeasModal = signal(false);
  capturedIdeas = signal<string[]>([]);

  openIdeasModal() {
    this.showIdeasModal.set(true);
    this.loadIdeas();
  }

  closeIdeasModal() {
    this.showIdeasModal.set(false);
  }

  loadIdeas() {
    const list = JSON.parse(localStorage.getItem('captured-ideas') || '[]');
    this.capturedIdeas.set(list);
  }

  removeIdea(index: number) {
    const updatedList = this.capturedIdeas().filter((_, i) => i !== index);
    this.capturedIdeas.set(updatedList);
    localStorage.setItem('captured-ideas', JSON.stringify(updatedList));
  }

  clearAllIdeas() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el baúl de ideas?')) {
      this.capturedIdeas.set([]);
      localStorage.setItem('captured-ideas', '[]');
    }
  }

  // Define todos los 21 avatares en un computed signal reactivo clasificados por obtención
  allAvatars = computed(() => {
    const unlockedList = this.membership.unlockedAvatars();
    const qualities = this.membership.qualitiesCatalog();

    const list: DojoAvatar[] = [
      // LIBRES DESDE EL INICIO
      { id: 'gato', name: 'Gato', type: 'inicial', emoji: '🐱', color: '#10b981', role: 'Ninja Ágil', cost: 0, qualityId: null },
      { id: 'perro', name: 'Perro', type: 'inicial', emoji: '🐶', color: '#3a86f0', role: 'Guardián Fiel', cost: 0, qualityId: null },
      { id: 'conejo', name: 'Conejo', type: 'inicial', emoji: '🐰', color: '#9ca3af', role: 'Veloz Saltarín', cost: 0, qualityId: null },
      { id: 'loro', name: 'Loro', type: 'inicial', emoji: '🦜', color: '#fbbf24', role: 'Eco Parlanchín', cost: 0, qualityId: null },
      { id: 'hamster', name: 'Hámster', type: 'inicial', emoji: '🐹', color: '#f97316', role: 'Veloz Corredor', cost: 0, qualityId: null },
      { id: 'pez', name: 'Pez', type: 'inicial', emoji: '🐟', color: '#06b6d4', role: 'Nadador Fluido', cost: 0, qualityId: null },
      { id: 'cuyo', name: 'Cuyo', type: 'inicial', emoji: '🐹', color: '#8b5cf6', role: 'Pequeño Glotón', cost: 0, qualityId: null },
      { id: 'raton', name: 'Ratón', type: 'inicial', emoji: '🐭', color: '#ec4899', role: 'Escurridizo Astuto', cost: 0, qualityId: null },
      { id: 'rana', name: 'Rana', type: 'inicial', emoji: '🐸', color: '#22c55e', role: 'Gran Saltarina', cost: 0, qualityId: null },

      // GANADOS POR CUALIDADES
      { id: 'tortuga', name: 'Tortuga', type: 'cualidad', emoji: '🐢', color: '#22c55e', role: 'Sabio Paciente', cost: 50, qualityId: 'constancia', unlockTotal: 7 },
      { id: 'hormiga', name: 'Hormiga', type: 'cualidad', emoji: '🐜', color: '#78350f', role: 'Esfuerzo Diario', cost: 60, qualityId: 'disciplina', unlockTotal: 10 },
      { id: 'zorro', name: 'Zorro', type: 'cualidad', emoji: '🦊', color: '#f97316', role: 'Espía de Sombras', cost: 100, qualityId: 'disciplina', unlockTotal: 20 },
      { id: 'lince', name: 'Lince', type: 'cualidad', emoji: '🦌', color: '#a855f7', role: 'Felino Sigiloso', cost: 150, qualityId: 'vision', unlockTotal: 2 },
      { id: 'aguila', name: 'Águila', type: 'cualidad', emoji: '🦅', color: '#3b82f6', role: 'Ojo de Halcón', cost: 200, qualityId: 'vision', unlockTotal: 4 },
      { id: 'abeja', name: 'Abeja', type: 'cualidad', emoji: '🐝', color: '#eab308', role: 'Obrero Incansable', cost: 70, qualityId: 'colaboracion', unlockTotal: 5 },
      { id: 'castor', name: 'Castor', type: 'cualidad', emoji: '🦫', color: '#b45309', role: 'Constructor Feroz', cost: 80, qualityId: 'construccion', unlockTotal: 10 },
      { id: 'lobo', name: 'Lobo', type: 'cualidad', emoji: '🐺', color: '#ef4444', role: 'Guía de Manada', cost: 50, qualityId: 'cooperacion', unlockTotal: 5 },

      // ESPECIALES DEL DOJO
      { id: 'elefante', name: 'Elefante', type: 'especial', emoji: '🐘', color: '#6b7280', role: 'Memoria Ancestral', cost: 80, qualityId: null, qualityName: 'Sabiduría', qualityReq: 'Adquiérelo por 80 Pro Coins 🪙 analizando tus estadísticas semanales en la bitácora.' },
      { id: 'sloth', name: 'Perezoso', type: 'especial', emoji: '🦥', color: '#78716c', role: 'Meditador Calmo', cost: 90, qualityId: null, qualityName: 'Paciencia', qualityReq: 'Adquiérelo por 90 Pro Coins 🪙 completando sesiones largas de forma constante.' },
      { id: 'octopus', name: 'Pulpo', type: 'especial', emoji: '🐙', color: '#ec4899', role: 'Multitarea', cost: 110, qualityId: null, qualityName: 'Versatilidad', qualityReq: 'Adquiérelo por 110 Pro Coins 🪙 gestionando eficientemente múltiples proyectos simultáneos.' },
      { id: 'buho', name: 'Búho', type: 'especial', emoji: '🦉', color: '#6366f1', role: 'Estratega Sabio', cost: 120, qualityId: null, qualityName: 'Estrategia', qualityReq: 'Adquiérelo por 120 Pro Coins 🪙 planificando tus tareas en el calendario.' },
      { id: 'panda', name: 'Panda', type: 'especial', emoji: '🐼', color: '#6b7280', role: 'Maestro Zen', cost: 150, qualityId: null, qualityName: 'Serenidad', qualityReq: 'Adquiérelo por 150 Pro Coins 🪙 completando tus meditaciones y manteniendo el enfoque.' },
      { id: 'leon', name: 'León', type: 'especial', emoji: '🦁', color: '#fbbf24', role: 'Rey del Dojo', cost: 250, qualityId: null, qualityName: 'Liderazgo', qualityReq: 'Adquiérelo por 250 Pro Coins 🪙 superando con valor tus misiones más difíciles.' },

      // LEGENDARIOS
      { id: 'dragon', name: 'Dragón', type: 'legendario', emoji: '🐉', color: '#dc2626', role: 'Emperador Fuego', cost: 500, qualityId: null, qualityName: 'Trascendencia', qualityReq: 'Adquiérelo por 500 Pro Coins 🪙 dominando el arte supremo del enfoque Zen.' }
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
        const progress = quality.unlockProgress || 0;

        if (progress >= total) {
          isUnlocked = true;
        }

        let taskName = '';
        if (item.qualityId === 'vision') {
          taskName = `objetivo${total > 1 ? 's' : ''} grande${total > 1 ? 's' : ''}`;
        } else if (item.qualityId === 'disciplina') {
          taskName = `pequeño${total > 1 ? 's' : ''} objetivo${total > 1 ? 's' : ''}`;
        } else if (item.qualityId === 'constancia') {
          taskName = `día${total > 1 ? 's' : ''} de racha consecutiva`;
        } else if (item.qualityId === 'colaboracion') {
          taskName = `sesión${total > 1 ? 's' : ''} acompañada${total > 1 ? 's' : ''}`;
        } else if (item.qualityId === 'construccion') {
          taskName = `día${total > 1 ? 's' : ''} trabajando en objetivos`;
        } else if (item.qualityId === 'cooperacion') {
          taskName = `acción${total > 1 ? 's' : ''} de ayuda a otros`;
        }

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

  constructor(public membership: MembershipService) {}

  ngOnInit() {
    const currentAvatarId = this.membership.selectedAvatar();
    const currentAvatar = this.allAvatars().find(a => a.id === currentAvatarId);
    if (currentAvatar) {
      this.previewAvatar.set({
        id: currentAvatar.id,
        name: currentAvatar.name,
        color: currentAvatar.color,
        icon: 'fa-paw',
        isUnlocked: currentAvatar.isUnlocked,
        isInitial: currentAvatar.cost === 0
      });
    }
    this.inputName.set(this.membership.userName());

    this.loadIdeas();

    // Mostrar el toast de bienvenida únicamente después del registro
    const justRegistered = localStorage.getItem('procrastina-just-registered') === 'true';
    if (justRegistered) {
      this.showWelcomeAlert.set(true);
      localStorage.removeItem('procrastina-just-registered');

      // Desaparecer automáticamente después de 6 segundos
      setTimeout(() => {
        this.showWelcomeAlert.set(false);
      }, 6000);
    }
  }

  getAvatarsByType(type: 'inicial' | 'cualidad' | 'especial' | 'legendario') {
    return this.allAvatars().filter(a => a.type === type);
  }

  getUnlockedAvatarsCount(): number {
    return this.allAvatars().filter(a => a.isUnlocked).length;
  }

  selectAvatar(avatar: any) {
    if (avatar.isUnlocked) {
      this.previewAvatar.set({
        id: avatar.id,
        name: avatar.name,
        color: avatar.color,
        icon: 'fa-paw',
        isUnlocked: true,
        isInitial: avatar.cost === 0
      });
      this.membership.selectedAvatar.set(avatar.id);
      this.selectedLockedAvatar.set(null);
    } else {
      this.selectedLockedAvatar.set(avatar);
    }
  }

  getUnlockedQualities(): QualityItem[] {
    return this.membership.qualitiesCatalog().filter(q => q.isUnlocked);
  }

  getQualityProgressPercent(quality: QualityItem | null): number {
    if (!quality || !quality.unlockProgress || !quality.unlockTotal) return 0;
    return Math.round((quality.unlockProgress / quality.unlockTotal) * 100);
  }

  simulateUnlockQuality(quality: QualityItem) {
    this.unlockedRewardQuality.set(quality);
    this.selectedLockedAvatar.set(null);
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
      
      // Asegurar que también se añaden todos los avatares correspondientes que se desbloquean con este progreso
      const relatedAvatars = this.allAvatars().filter(a => a.qualityId === quality.id);
      const unlockedIds = this.membership.unlockedAvatars();
      const newlyUnlocked = relatedAvatars
        .filter(a => (a.unlockTotal || 0) <= maxTotal && !unlockedIds.includes(a.id))
        .map(a => a.id);

      if (newlyUnlocked.length > 0) {
        this.membership.unlockedAvatars.update(list => [...list, ...newlyUnlocked]);
      }
    }
    this.unlockedRewardQuality.set(null);
  }

  buyAvatar(avatar: any) {
    if (this.membership.proCoins() >= avatar.cost) {
      const success = this.membership.unlockAvatar(avatar.id, avatar.cost);
      if (success) {
        // Seleccionarlo de inmediato
        this.selectAvatar({ ...avatar, isUnlocked: true });
      }
    }
  }

  onUsernameInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.inputName.set(value);
    this.validateUsername(value);
  }

  validateUsername(name: string) {
    const cleaned = name.trim();
    if (!cleaned) {
      this.usernameError.set('El nombre de usuario no puede estar vacío.');
      return;
    }
    if (cleaned.length > 20) {
      this.usernameError.set('Máximo 20 caracteres.');
      return;
    }
    const validPattern = /^[a-zA-Z0-9_ñÑáéíóúÁÉÍÓÚ\s]+$/;
    if (!validPattern.test(cleaned)) {
      this.usernameError.set('El nombre contiene caracteres no permitidos.');
      return;
    }
    this.usernameError.set(null);
  }

  async saveUsername() {
    const cleaned = this.inputName().trim();
    this.validateUsername(cleaned);
    if (this.usernameError()) return;

    await this.membership.saveSupabaseProfile(cleaned, this.membership.selectedAvatar());
  }
}
