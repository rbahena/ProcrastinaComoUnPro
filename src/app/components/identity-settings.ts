import { Component, OnInit, signal, computed, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipService, AvatarItem, QualityItem } from '../services/membership.service';
import { DojoBossService } from '../services/dojo-boss.service';

@Component({
  selector: 'app-identity-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="identity-overlay">
      <div class="identity-modal">
        
        <!-- COLUMNA IZQUIERDA: VISTA PREVIA -->
        <div class="preview-panel">
          <div class="panel-header">
            <span class="step-badge" *ngIf="onboardingMode">PERFIL</span>
            <h3 class="preview-title">Avatar Actual</h3>
          </div>

          <div class="preview-card" [style.--card-color]="previewAvatar().color">
            <div class="preview-glow"></div>
            
            <div class="avatar-ring">
              <div [class]="'avatar-circle avatar-sprite sprite-' + previewAvatar().id" [style.--card-color]="previewAvatar().color"></div>
            </div>

            <div class="preview-info">
              <h4 class="preview-name">{{ cleanUsername(inputName()) || 'Tu Nombre' }}</h4>
              <span class="preview-username-handle" style="font-size: 11px; color: var(--muted); display: block; margin-top: 2px;">
                @{{ cleanUsername(inputName())?.toLowerCase()?.replace(' ', '_') || 'nombre' }}
              </span>
              <p class="preview-avatar-label" style="font-size: 10px; color: var(--text); margin: 8px 0 0; opacity: 0.85;">
                Avatar actual: <strong>{{ previewAvatar().name }}</strong>
              </p>
            </div>
          </div>

          <div class="community-banner" style="margin-top: 16px; background: rgba(255, 255, 255, 0.015); border: 1px dashed rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 10px; font-size: 9.5px; color: var(--muted); text-align: center; line-height: 1.3;">
            <i class="fa-solid fa-users" style="color: var(--accent); margin-right: 4px;"></i>
            Así te verá la comunidad y estas son las cualidades que has demostrado.
          </div>
        </div>

        <!-- COLUMNA DERECHA: SELECCIÓN -->
        <div class="selection-panel" style="position: relative; overflow-y: auto; max-height: 85vh; padding-right: 6px;">
          
          <!-- DETALLES DE CUALIDAD BLOQUEADA (POPUP INTERNO) -->
          <div class="unlock-details-overlay" *ngIf="selectedLockedQuality()" (click)="selectedLockedQuality.set(null)">
            <div class="unlock-details-card" (click)="$event.stopPropagation()">
              <button class="close-btn" (click)="selectedLockedQuality.set(null)">×</button>
              
              <div class="avatar-sprite" [class]="'sprite-' + selectedLockedQuality()?.animal" style="width: 96px; height: 96px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1); margin: 0 auto 12px; filter: grayscale(1) brightness(0.6);"></div>
              
              <h3 style="font-size: 15px; font-weight: 800; color: #fff; margin: 0; text-transform: uppercase;">{{ selectedLockedQuality()?.name }}</h3>
              <span class="locked-badge" style="color: var(--red); font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                <i class="fa-solid fa-lock" style="margin-right: 2px;"></i> Próxima Cualidad
              </span>
              
              <p style="font-size: 11px; color: var(--muted); margin: 6px 0; font-style: italic;">
                "{{ selectedLockedQuality()?.description }}"
              </p>
              
              <div class="progress-section" style="margin-top: 14px; text-align: left;">
                <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: var(--muted); margin-bottom: 4px;">
                  <span>Requisito:</span>
                  <span style="color: var(--yellow);">{{ selectedLockedQuality()?.unlockProgress || 0 }} / {{ selectedLockedQuality()?.unlockTotal || 1 }}</span>
                </div>
                <p style="font-size: 10px; color: var(--text); margin: 0 0 8px 0; line-height: 1.3;">
                  {{ selectedLockedQuality()?.unlockRequirement }}
                </p>
                <div class="progress-bar-container" style="background: rgba(255,255,255,0.05); border-radius: 10px; height: 10px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.08);">
                  <div class="progress-bar-fill" [style.background]="'var(--accent)'" [style.width]="getQualityProgressPercent(selectedLockedQuality()) + '%'" style="height: 100%; transition: width 0.5s ease-out;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 9px; color: var(--muted); margin-top: 4px;">
                  <span>Faltan {{ (selectedLockedQuality()?.unlockTotal || 0) - (selectedLockedQuality()?.unlockProgress || 0) }} para desbloquear</span>
                  <span>{{ getQualityProgressPercent(selectedLockedQuality()) }}%</span>
                </div>
              </div>

              <!-- MOCK UNLOCK BUTTON -->
              <button class="mock-unlock-btn" (click)="simulateUnlockQuality(selectedLockedQuality()!)" style="margin-top: 14px; background: rgba(16, 185, 129, 0.1); border: 1.5px solid var(--green); color: var(--green); font-size: 10.5px; font-weight: 700; padding: 5px 12px; border-radius: 6px; width: 100%; cursor: pointer; transition: all 0.2s;">
                <i class="fa-solid fa-wand-magic-sparkles" style="margin-right: 4px;"></i> Demostrar Cualidad (Test)
              </button>
            </div>
          </div>

          <!-- DETALLES DE CUALIDAD DESBLOQUEADA (POPUP INTERNO) -->
          <div class="unlock-details-overlay" *ngIf="selectedUnlockedQuality()" (click)="selectedUnlockedQuality.set(null)">
            <div class="unlock-details-card" (click)="$event.stopPropagation()">
              <button class="close-btn" (click)="selectedUnlockedQuality.set(null)">×</button>
              
              <div class="avatar-sprite" [class]="'sprite-' + selectedUnlockedQuality()?.animal" style="width: 96px; height: 96px; border-radius: 50%; border: 2px solid var(--green); margin: 0 auto 12px; box-shadow: 0 0 10px rgba(16, 185, 129, 0.35);"></div>
              
              <h3 style="font-size: 15px; font-weight: 800; color: #fff; margin: 0; text-transform: uppercase;">{{ selectedUnlockedQuality()?.name }}</h3>
              <span class="unlocked-badge" style="color: var(--green); font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                <i class="fa-solid fa-circle-check" style="margin-right: 2px;"></i> Cualidad Demostrada
              </span>
              
              <p style="font-size: 11px; color: var(--muted); margin: 6px 0; font-style: italic;">
                "{{ selectedUnlockedQuality()?.description }}"
              </p>
              
              <div class="progress-section" style="margin-top: 14px; text-align: left; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 8px;">
                <div style="font-size: 8px; color: var(--muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">DESBLOQUEADA EL:</div>
                <div style="font-size: 10px; color: #fff; font-weight: 700; margin-bottom: 8px;">{{ selectedUnlockedQuality()?.unlockedAt }}</div>
                
                <div style="font-size: 8px; color: var(--muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">PROGRESO LOGRADO:</div>
                <div style="font-size: 10px; color: var(--yellow); font-weight: 700; margin-bottom: 8px;">{{ selectedUnlockedQuality()?.unlockTotal }} de {{ selectedUnlockedQuality()?.unlockTotal }}</div>
                
                <div style="font-size: 8px; color: var(--muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">MEJOR RACHA:</div>
                <div style="font-size: 10px; color: var(--green); font-weight: 700;">{{ selectedUnlockedQuality()?.unlockTotal }} días consecutivos</div>
              </div>
            </div>
          </div>

          <!-- POPUP RECOMPENSA: CUALIDAD DESBLOQUEADA -->
          <div class="unlock-success-overlay" *ngIf="unlockedRewardQuality()">
            <div class="unlock-success-card" [style.--glow-color]="'#84cc16'">
              <div class="success-glow"></div>
              
              <div class="sparkles-container">
                <i class="fa-solid fa-sparkles text-yellow" style="font-size: 20px;"></i>
              </div>
              
              <span class="success-badge">¡NUEVA CUALIDAD DEMOSTRADA!</span>
              
              <div class="avatar-sprite" [class]="'sprite-' + unlockedRewardQuality()?.animal" style="width: 120px; height: 120px; border-radius: 50%; border: 3px solid #84cc16; margin: 12px auto; box-shadow: 0 0 20px rgba(132, 204, 22, 0.4); animation: successScale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
              
              <h2 style="font-size: 18px; font-weight: 900; color: #fff; margin: 0; text-transform: uppercase;">{{ unlockedRewardQuality()?.name }}</h2>
              <span class="success-quality" style="color: #84cc16; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                CUALIDAD DEMOSTRADA
              </span>
              
              <p style="font-size: 11.5px; color: var(--text); max-width: 240px; margin: 10px auto; line-height: 1.4;">
                Has demostrado la cualidad de {{ (unlockedRewardQuality()?.name || '') | lowercase }} en COFU al cumplir la condición.
              </p>
              
              <button (click)="closeRewardFlow()" class="btn-equip-now" style="background: #84cc16; margin-top: 14px;">
                CONTINUAR
              </button>
            </div>
          </div>

          <div class="panel-header">
            <h2 class="main-title">Identidad</h2>
            <p class="subtitle">Elige cómo quieres aparecer y descubre las cualidades que has demostrado.</p>
          </div>

          <div class="form-section">
            <div class="input-header">
              <label for="username">NOMBRE DE USUARIO</label>
              <span class="char-counter" [class.danger]="inputName().length > 20">
                {{ inputName().length }}/20
              </span>
            </div>
            <input 
              id="username" 
              type="text" 
              [value]="inputName()"
              (input)="onUsernameInput($event)"
              placeholder="Ej. RamiroNinja"
              maxLength="22"
              class="identity-input"
              [class.input-error]="usernameError()"
            />
            <div class="error-container" *ngIf="usernameError()">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>{{ usernameError() }}</span>
            </div>
          </div>

          <!-- SECCIÓN SELECCIÓN DE AVATAR -->
          <div class="catalog-section" style="margin-top: 18px;">
            <div class="catalog-header">
              <label>ELIGE TU AVATAR</label>
              <span class="catalog-sub">Este animal representa cómo quieres aparecer en la comunidad.</span>
            </div>
            
            <div class="avatar-grid" style="max-height: 220px; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px;">
              <div 
                *ngFor="let avatar of membership.avatarsCatalog()"
                class="avatar-card"
                [class.selected]="previewAvatar().id === avatar.id"
                (click)="selectAvatar(avatar)"
                [style.--avatar-color]="avatar.color"
                style="padding: 12px 6px;"
              >
                <!-- Check pequeño si es el seleccionado -->
                <div class="equipped-badge" *ngIf="previewAvatar().id === avatar.id" style="width: 16px; height: 16px; font-size: 10px;">
                  ✓
                </div>
                <div [class]="'card-emoji-container avatar-sprite sprite-' + avatar.id" style="width: 72px; height: 72px; margin-bottom: 8px;"></div>
                <span class="card-name" style="font-size: 11px;">{{ avatar.name }}</span>
              </div>
            </div>
          </div>

          <!-- SECCIÓN MIS CUALIDADES DEMOSTRADAS -->
          <div class="catalog-section" style="margin-top: 18px;">
            <div class="catalog-header">
              <label>MIS CUALIDADES</label>
              <span class="catalog-sub">Lo que has demostrado con tus acciones.</span>
            </div>
            
            <div class="avatar-grid" style="max-height: 220px; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px;">
              <div 
                *ngFor="let qual of getUnlockedQualities()"
                class="avatar-card"
                (click)="showUnlockedQualityInfo(qual)"
                [style.--avatar-color]="'#84cc16'"
                style="border-color: rgba(132, 204, 22, 0.15); background: rgba(132, 204, 22, 0.015); padding: 12px 6px;"
                title="Click para ver detalles"
              >
                <!-- Badge de chequeado -->
                <div class="equipped-badge" style="background: #84cc16; color: #000; width: 16px; height: 16px; font-size: 10px;">
                  ✓
                </div>
                <div [class]="'card-emoji-container avatar-sprite sprite-' + qual.animal" style="width: 68px; height: 68px; margin-bottom: 8px;"></div>
                <span class="card-name" style="color: #fff; font-size: 11px; margin-top: 2px;">{{ qual.name }}</span>
              </div>
            </div>
          </div>

          <!-- SECCIÓN PRÓXIMAS CUALIDADES -->
          <div class="catalog-section" style="margin-top: 18px;">
            <div class="catalog-header">
              <label>PRÓXIMAS CUALIDADES</label>
              <span class="catalog-sub">Continúa avanzando para demostrar nuevas cualidades.</span>
            </div>
            
            <div class="avatar-grid" style="max-height: 220px; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px;">
              <div 
                *ngFor="let qual of getLockedQualities()"
                class="avatar-card locked-card"
                (click)="showLockedQualityInfo(qual)"
                [style.--avatar-color]="'#94a3b8'"
                style="padding: 12px 6px;"
                title="Click para ver progreso de desbloqueo"
              >
                <div class="lock-indicator" style="top: 6px; right: 8px; font-size: 10px;">
                  <i class="fa-solid fa-lock"></i>
                </div>
                
                <div [class]="'card-emoji-container avatar-sprite sprite-' + qual.animal" style="width: 68px; height: 68px; margin-bottom: 8px;"></div>
                <span class="card-name" style="font-size: 11px; margin-top: 2px;">{{ qual.name }}</span>
              </div>
            </div>
          </div>

           <!-- SECCIÓN ARMAS Y EQUIPAMIENTO -->
           <div class="catalog-section" style="margin-top: 18px;">
             <div class="catalog-header">
               <label>MIS ARMAS ADQUIRIDAS</label>
               <span class="catalog-sub">Elige tu arma activa para tus Raids de Enfoque.</span>
             </div>
             
             <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
               <div *ngFor="let weapon of weapons" 
                    style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: all 0.2s;"
                    [style.borderColor]="isWeaponUnlocked(weapon.id) ? (bossService.activeWeaponId() === weapon.id ? 'var(--green)' : 'rgba(255,255,255,0.08)') : 'rgba(255,255,255,0.03)'"
                    [style.opacity]="isWeaponUnlocked(weapon.id) ? '1' : '0.4'">
                 
                 <div style="display: flex; align-items: center; gap: 12px;">
                   <span style="font-size: 20px;">{{ weapon.emoji }}</span>
                   <div style="display: flex; flex-direction: column; text-align: left;">
                     <span style="font-size: 12px; font-weight: 700; color: #fff;">{{ weapon.name }}</span>
                     <span style="font-size: 9.5px; color: var(--muted);">{{ weapon.desc }}</span>
                   </div>
                 </div>

                 <div>
                   <!-- Bloqueado -->
                   <div *ngIf="!isWeaponUnlocked(weapon.id)" 
                        style="font-size: 10px; color: var(--red); font-weight: 700; display: flex; align-items: center; gap: 4px; padding-right: 8px;">
                     <i class="fa-solid fa-lock" style="font-size: 9px;"></i> Bloqueado
                   </div>

                   <!-- Desbloqueado y Equipado -->
                   <div *ngIf="isWeaponUnlocked(weapon.id) && bossService.activeWeaponId() === weapon.id" 
                        style="font-size: 9.5px; color: var(--green); font-weight: 800; text-transform: uppercase; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px;">
                     ✨ Equipado
                   </div>

                   <!-- Desbloqueado pero no Equipado (Botón para equipar) -->
                   <button *ngIf="isWeaponUnlocked(weapon.id) && bossService.activeWeaponId() !== weapon.id" 
                           (click)="equipWeapon(weapon.id)"
                           style="border: none; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.08); color: var(--text); padding: 4px 10px; border-radius: 6px; font-size: 9.5px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit;"
                           onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'"
                           onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'">
                     Equipar
                   </button>
                 </div>

               </div>
             </div>
           </div>

          <!-- BOTONES DE ACCIÓN -->
          <div class="action-footer" style="margin-top: 24px;">
            <button 
              *ngIf="!onboardingMode" 
              (click)="closeSettings()"
              class="btn-cancel"
            >
              Cancelar
            </button>
            <button 
              (click)="saveProfile()" 
              [disabled]="isSaving() || !!usernameError() || !inputName().trim()"
              class="btn-save"
              [class.loading]="isSaving()"
            >
              <span *ngIf="!isSaving()">Guardar</span>
              <span *ngIf="isSaving()">Guardando...</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .identity-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(8, 8, 10, 0.88);
      backdrop-filter: blur(16px);
      z-index: 12000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeInOverlay 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes fadeInOverlay {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .identity-modal {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--r);
      max-width: 980px;
      width: 100%;
      min-height: 520px;
      display: grid;
      grid-template-columns: 1.2fr 1.5fr;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      overflow: hidden;
      animation: scaleInModal 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes scaleInModal {
      from { transform: scale(0.96) translateY(12px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    /* VISTA PREVIA */
    .preview-panel {
      background: rgba(0, 0, 0, 0.15);
      border-right: 1px solid var(--border);
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .step-badge {
      font-size: 8.5px;
      font-weight: 800;
      color: var(--yellow);
      background: rgba(212, 175, 55, 0.1);
      border: 1px solid var(--yellow);
      padding: 3px 6px;
      border-radius: 4px;
      letter-spacing: 1px;
      display: inline-block;
      margin-bottom: 8px;
    }

    .preview-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--muted);
      margin-bottom: 24px;
      text-align: center;
    }

    .preview-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      width: 100%;
      max-width: 320px;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .preview-glow {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      width: 210px;
      height: 210px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--card-color, var(--accent)) 0%, transparent 70%);
      opacity: 0.2;
      pointer-events: none;
      filter: blur(12px);
      transition: all 0.3s ease;
    }

    .avatar-ring {
      position: relative;
      margin-bottom: 20px;
    }

    .avatar-circle {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 82px;
      color: #fff;
      box-shadow: 0 0 35px rgba(0, 0, 0, 0.55), 0 0 25px var(--card-color);
      border: 2px solid var(--card-color);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      animation: avatarGlowPulse 2.2s infinite alternate ease-in-out;
      background-color: rgba(0, 0, 0, 0.25);
    }

    @keyframes avatarGlowPulse {
      from { transform: scale(1); box-shadow: 0 0 25px rgba(0, 0, 0, 0.55), 0 0 20px var(--card-color); }
      to { transform: scale(1.05); box-shadow: 0 0 35px rgba(0, 0, 0, 0.55), 0 0 30px var(--card-color); }
    }

    .preview-emoji {
      position: absolute;
      bottom: -6px;
      right: -6px;
      background: var(--bg3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }

    .preview-info {
      width: 100%;
      z-index: 2;
    }

    .preview-name {
      font-size: 18px;
      color: var(--text);
      margin-bottom: 6px;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    .quality-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      display: inline-block;
    }

    .preview-slogan {
      font-size: 11px;
      color: var(--muted);
      font-style: italic;
      line-height: 1.4;
      margin: 0;
    }

    .interaction-tip {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(212, 175, 55, 0.05);
      border: 1px solid rgba(212, 175, 55, 0.1);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 10.5px;
      color: var(--yellow);
      margin-top: 20px;
      text-align: center;
      max-width: 260px;
      animation: floatUp 0.3s ease;
    }

    @keyframes floatUp {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* SELECCIÓN */
    .selection-panel {
      padding: 36px 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .main-title {
      font-size: 24px;
      color: var(--text);
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 12.5px;
      color: var(--muted);
      margin-bottom: 24px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .input-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .input-header label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: var(--muted);
    }

    .char-counter {
      font-size: 10px;
      color: var(--muted);
    }

    .char-counter.danger {
      color: var(--red);
      font-weight: 700;
    }

    .identity-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 14px;
      color: var(--text);
      font-family: inherit;
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
    }

    .identity-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.15);
      background: rgba(0, 0, 0, 0.35);
    }

    .identity-input.input-error {
      border-color: var(--red);
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
    }

    .error-container {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--red);
      font-size: 10.5px;
      margin-top: 6px;
    }

    .catalog-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-bottom: 24px;
    }

    .catalog-header {
      display: flex;
      flex-direction: column;
      margin-bottom: 10px;
    }

    .catalog-header label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: var(--muted);
    }

    .catalog-sub {
      font-size: 9.5px;
      color: var(--muted);
      opacity: 0.8;
    }

    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
      gap: 6px;
      max-height: 310px;
      overflow-y: auto;
      padding-right: 6px;
    }

    /* Scrollbar */
    .avatar-grid::-webkit-scrollbar {
      width: 4px;
    }
    .avatar-grid::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }
    .avatar-grid::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 2px;
    }

    .avatar-card {
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      padding: 8px 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .avatar-card:hover {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }

    .avatar-card.selected {
      background: rgba(99, 102, 241, 0.05);
      border-color: var(--accent);
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.12);
    }

    .avatar-card.locked {
      opacity: 0.45;
    }

    .lock-indicator {
      position: absolute;
      top: 4px;
      right: 6px;
      font-size: 8.5px;
      color: var(--muted);
    }

    .card-emoji-container {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1.5px solid rgba(255, 255, 255, 0.06);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
      margin-bottom: 4px;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .avatar-card:hover .card-emoji-container {
      transform: scale(1.15) rotate(4deg);
      border-color: rgba(255, 255, 255, 0.15);
      background-color: rgba(255, 255, 255, 0.05);
    }

    .avatar-card.selected .card-emoji-container {
      border-color: var(--avatar-color);
      box-shadow: 0 0 15px var(--avatar-color);
      background-color: rgba(255, 255, 255, 0.04);
      transform: scale(1.1) rotate(0);
    }

    .card-name {
      font-size: 11px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 2px;
    }

    .card-quality {
      font-size: 9px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* FOOTER */
    .action-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--muted);
      font-size: 11.5px;
      font-weight: 700;
      padding: 8px 18px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .btn-cancel:hover {
      color: var(--text);
      border-color: rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.02);
    }

    .btn-save {
      background: var(--accent);
      border: 1px solid var(--accent);
      color: #fff;
      font-size: 11.5px;
      font-weight: 700;
      padding: 8px 24px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
    }

    .btn-save:hover:not(:disabled) {
      background: #5053e3;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
    }

    .btn-save:disabled {
      background: var(--muted2);
      border-color: var(--border);
      color: var(--muted);
      cursor: not-allowed;
      box-shadow: none;
    }

    /* ===== COLLECTION SHELF ===== */
    .collection-shelf {
      width: 100%;
      background: rgba(255, 255, 255, 0.015);
      border: 1px dashed rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 10px;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .shelf-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--yellow);
      text-align: center;
    }

    .shelf-slots {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 5px;
    }

    .shelf-slot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
    }

    .shelf-slot.unlocked {
      border: 1px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
    }

    .shelf-slot.unlocked:hover {
      transform: scale(1.18);
      border-color: var(--accent);
    }

    .shelf-slot.equipped {
      border-color: var(--green);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }

    .equipped-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      background: var(--green);
      color: #000;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7.5px;
      font-weight: 900;
      border: 1px solid #1a1a24;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .shelf-slot.locked {
      background: rgba(0, 0, 0, 0.35);
      border: 1px dashed rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.15);
    }

    /* locked-card visuals */
    .avatar-card.locked-card {
      opacity: 0.85;
      cursor: pointer;
    }

    .avatar-card.locked-card .card-emoji-container {
      filter: grayscale(1) brightness(0.25) contrast(0.8);
      border-color: rgba(255, 255, 255, 0.03);
      background-color: rgba(0, 0, 0, 0.45);
    }

    .avatar-card.locked-card .card-name {
      opacity: 0.35;
    }

    .avatar-card.locked-card:hover {
      transform: scale(1.02);
      border-color: rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.02);
    }

    /* Sub-overlays and success modales */
    .unlock-details-overlay, .unlock-success-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(8, 8, 10, 0.88);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      border-radius: 12px;
      animation: innerFadeIn 0.25s ease-out;
    }

    @keyframes innerFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .unlock-details-card {
      background: #14141b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 24px;
      width: 100%;
      max-width: 320px;
      text-align: center;
      position: relative;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    .close-btn {
      position: absolute;
      top: 6px;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 18px;
      cursor: pointer;
    }

    .close-btn:hover {
      color: #fff;
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
      box-shadow: 0 15px 40px rgba(0,0,0,0.6), 0 0 20px var(--glow-color);
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
      font-size: 8px;
      font-weight: 900;
      color: var(--yellow);
      letter-spacing: 1.5px;
      display: inline-block;
      margin-bottom: 4px;
    }

    .btn-equip-now {
      border: none;
      color: #000;
      font-size: 11.5px;
      font-weight: 800;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(255,255,255,0.05);
      transition: all 0.2s;
    }

    .btn-equip-now:hover {
      transform: translateY(-1px);
      filter: brightness(1.1);
    }

    .btn-continue-flat {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.15);
      color: var(--muted);
      font-size: 11.5px;
      font-weight: 700;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
      transition: all 0.2s;
    }

    .btn-continue-flat:hover {
      border-color: rgba(255,255,255,0.3);
      color: #fff;
    }

    @keyframes successScale {
      from { transform: scale(0.85); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @media (max-width: 768px) {
      .identity-modal {
        grid-template-columns: 1fr;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .preview-panel {
        border-right: none;
        border-bottom: 1px solid var(--border);
        padding: 24px;
      }

      .selection-panel {
        padding: 24px;
      }
    }
  `]
})
export class IdentitySettings implements OnInit {
  // Input parameter to define if it's the first onboarding modal
  @Input() onboardingMode: boolean = false;
  
  // Output event when closed
  closed = output<void>();

  inputName = signal<string>('');
  previewAvatar = signal<AvatarItem>({
    id: 'gato', name: 'Gato Lancero', icon: 'fa-cat', color: '#10b981', isUnlocked: true, isInitial: true
  });
  
  usernameError = signal<string | null>(null);
  isSaving = signal<boolean>(false);
  interactionMessage = signal<string | null>(null);

  // Popups/overlays signals
  selectedLockedQuality = signal<QualityItem | null>(null);
  selectedUnlockedQuality = signal<QualityItem | null>(null);
  unlockedRewardQuality = signal<QualityItem | null>(null);

  constructor(
    public membership: MembershipService,
    public bossService: DojoBossService
  ) {}

  weapons = [
    { id: 'katana_wood', name: 'Bokken de Entrenamiento', emoji: '🪵', desc: 'Arma inicial (+10% daño)' },
    { id: 'katana_steel', name: 'Katana del Altar', emoji: '⚔️', desc: 'Forja de acero (+25% daño)' },
    { id: 'laser_saber', name: 'Sable de Luz Neón', emoji: '🚨', desc: 'Corte de plasma (+30% daño)' },
    { id: 'sage_staff', name: 'Bastón de Bambú', emoji: '🎋', desc: 'Equilibrio mental (+20% daño)' },
    { id: 'solar_spear', name: 'Lanza del Alba', emoji: '🔱', desc: 'Fuerza solar (+40% daño)' }
  ];

  isWeaponUnlocked(id: string): boolean {
    if (id === 'katana_wood') return true; // Initial weapon is always unlocked
    const saved = localStorage.getItem('unlocked-weapons');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        return ids.includes(id);
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  equipWeapon(id: string) {
    if (this.isWeaponUnlocked(id)) {
      this.bossService.equipWeapon(id);
    }
  }

  ngOnInit() {
    // Prefill data with current settings
    this.inputName.set(this.membership.userName());
    
    const currentAvatarId = this.membership.selectedAvatar();
    const currentAvatar = this.membership.avatarsCatalog().find(a => a.id === currentAvatarId);
    if (currentAvatar) {
      this.previewAvatar.set(currentAvatar);
    }
  }

  // Filter list of unlocked qualities
  getUnlockedQualities(): QualityItem[] {
    return this.membership.qualitiesCatalog().filter(q => q.isUnlocked);
  }

  // Filter list of locked qualities
  getLockedQualities(): QualityItem[] {
    return this.membership.qualitiesCatalog().filter(q => !q.isUnlocked);
  }

  getQualityProgressPercent(quality: QualityItem | null): number {
    if (!quality || !quality.unlockProgress || !quality.unlockTotal) return 0;
    return Math.round((quality.unlockProgress / quality.unlockTotal) * 100);
  }

  onUsernameInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.inputName.set(value);
    this.validateUsername(value);
  }

  cleanUsername(value: string): string {
    // Clean spaces
    return value.replace(/\s+/g, ' ').trim();
  }

  validateUsername(name: string) {
    const cleaned = this.cleanUsername(name);
    
    if (!cleaned) {
      this.usernameError.set('El nombre de usuario no puede estar vacío.');
      return;
    }

    if (cleaned.length > 20) {
      this.usernameError.set('Máximo 20 caracteres.');
      return;
    }

    // Characters validator (Alphanumeric and underscores)
    const validPattern = /^[a-zA-Z0-9_ñÑáéíóúÁÉÍÓÚ\\s]+$/;
    if (!validPattern.test(cleaned)) {
      this.usernameError.set('El nombre contiene caracteres no permitidos.');
      return;
    }

    // Admin blacklist check
    const forbidden = ['admin', 'administrator', 'support', 'system', 'moderator', 'root', 'staff', 'procrastina'];
    if (forbidden.includes(cleaned.toLowerCase())) {
      this.usernameError.set('Este nombre es administrativo y no está permitido.');
      return;
    }

    // Unique check mock
    const busyNames = ['ocupado', 'ramiro_admin', 'procrastinator'];
    if (busyNames.includes(cleaned.toLowerCase())) {
      this.usernameError.set('Este nombre ya está ocupado. Prueba con otro.');
      return;
    }

    // Success
    this.usernameError.set(null);
  }

  selectAvatar(avatar: AvatarItem) {
    this.previewAvatar.set(avatar);

    // Microinteraction slogans triggers
    this.triggerMicrointeraction(avatar);
  }

  showLockedQualityInfo(quality: QualityItem) {
    this.selectedLockedQuality.set(quality);
  }

  showUnlockedQualityInfo(quality: QualityItem) {
    this.selectedUnlockedQuality.set(quality);
  }

  simulateUnlockQuality(quality: QualityItem) {
    this.unlockedRewardQuality.set(quality);
    this.selectedLockedQuality.set(null);
  }

  closeRewardFlow() {
    const quality = this.unlockedRewardQuality();
    if (quality) {
      // Mark as unlocked in service Catalog
      this.membership.qualitiesCatalog.update(list => {
        return list.map(q => {
          if (q.id === quality.id) {
            return {
              ...q,
              isUnlocked: true,
              unlockProgress: q.unlockTotal,
              unlockedAt: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
            };
          }
          return q;
        });
      });
    }
    this.unlockedRewardQuality.set(null);
  }

  triggerMicrointeraction(avatar: AvatarItem) {
    this.interactionMessage.set(`¡Has elegido al ${avatar.name} como tu avatar!`);
  }

  getEmoji(id: string): string {
    switch (id) {
      case 'lobo': return '🐺';
      case 'zorro': return '🦊';
      case 'buho': return '🦉';
      case 'lince': return '🦌';
      case 'panda': return '🐼';
      case 'sloth': return '🦥';
      case 'tortuga': return '🐢';
      case 'abeja': return '🐝';
      case 'castor': return '🦫';
      case 'aguila': return '🦅';
      case 'hormiga': return '🐜';
      case 'elefante': return '🐘';
      case 'gato': return '🐱';
      case 'perro': return '🐶';
      case 'conejo': return '🐰';
      case 'mapache': return '🦝';
      case 'nutria': return '🦦';
      case 'loro': return '🦜';
      default: return '🐾';
    }
  }

  async saveProfile() {
    const cleaned = this.cleanUsername(this.inputName());
    this.validateUsername(cleaned);
    
    if (this.usernameError()) return;

    this.isSaving.set(true);
    const avatarId = this.previewAvatar().id;

    // Call mock Supabase profile API
    const response = await this.membership.saveSupabaseProfile(cleaned, avatarId);
    this.isSaving.set(false);

    if (response.success) {
      this.closeSettings();
    } else {
      this.usernameError.set(response.error || 'Ocurrió un error al guardar.');
    }
  }

  closeSettings() {
    this.membership.showSettingsModal.set(false);
    this.closed.emit();
  }
}
