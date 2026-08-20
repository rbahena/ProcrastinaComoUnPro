import { Component, signal, computed, inject, WritableSignal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { DojoBossService } from '../../services/dojo-boss.service';

export interface WeaponItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  damageBoost: string;
  unlocked: boolean;
  theme: string;
  desc: string;
}

@Component({
  selector: 'app-bestiario',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './bestiario.html',
  styleUrl: './bestiario.css'
})
export class Bestiario {
  membership = inject(MembershipService);
  bossService = inject(DojoBossService);

  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  sidebarCollapsed!: any;

  // Selected villain for detail view
  selectedVillainId = signal<string>('samurai');
  sirenRevealed = signal<boolean>(false);

  selectVillain(id: string) {
    this.selectedVillainId.set(id);
    this.sirenRevealed.set(false);
  }

  toggleSirenReveal() {
    this.sirenRevealed.update(v => !v);
  }

  // Armería - Weapons that boost focus damage
  weapons = signal<WeaponItem[]>([
    {
      id: 'katana_wood',
      name: 'Bokken de Entrenamiento',
      emoji: '🪵',
      cost: 50,
      damageBoost: '+10% daño',
      unlocked: true,
      theme: 'samurai',
      desc: 'Sable de madera ligero. Ideal para aprender los fundamentos del corte contra la distracción.'
    },
    {
      id: 'katana_steel',
      name: 'Katana del Altar',
      emoji: '⚔️',
      cost: 250,
      damageBoost: '+25% daño',
      unlocked: false,
      theme: 'samurai',
      desc: 'Forjada en acero de alta pureza. Corta los hilos de la procrastinación con precisión quirúrgica.'
    },
    {
      id: 'laser_saber',
      name: 'Sable de Luz Neón',
      emoji: '🚨',
      cost: 300,
      damageBoost: '+30% daño',
      unlocked: false,
      theme: 'cyberpunk',
      desc: 'Haz de plasma coral concentrado. Hackea la resistencia cerebral y disuelve el ruido mental.'
    },
    {
      id: 'sage_staff',
      name: 'Bastón de Bambú Sabio',
      emoji: '🎋',
      cost: 200,
      damageBoost: '+20% daño',
      unlocked: false,
      theme: 'zen',
      desc: 'Flexible y pacífico. Te reconecta con el momento presente y frena los saltos del Mono Mental.'
    },
    {
      id: 'solar_spear',
      name: 'Lanza del Alba Solar',
      emoji: '🔱',
      cost: 400,
      damageBoost: '+40% daño',
      unlocked: false,
      theme: 'aurora',
      desc: 'Canaliza la luz del sol matutino. Su brillo disuelve instantáneamente la gravedad del Agujero Negro del Presente.'
    }
  ]);

  constructor() {
    this.currentTheme = this.membership.selectedTheme;
    this.userName = this.membership.userName;
    this.selectedAvatar = this.membership.selectedAvatar;
    this.sidebarCollapsed = this.membership.sidebarCollapsed;

    // Load unlocked weapons from localStorage
    const saved = localStorage.getItem('unlocked-weapons');
    if (saved) {
      try {
        const ids: string[] = JSON.parse(saved);
        this.weapons.update(list => list.map(w => ({
          ...w,
          unlocked: ids.includes(w.id) || w.id === 'katana_wood'
        })));
      } catch (e) {
        // Fallback
      }
    }
  }

  // Helper for avatar icons
  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  buyWeapon(w: WeaponItem) {
    if (w.unlocked) return;
    
    const confirmBuy = confirm(`¿Quieres desbloquear "${w.name}" por ${w.cost} Pro Coins? Te otorgará un bono pasivo de ${w.damageBoost} en las Raids.`);
    if (confirmBuy) {
      if (this.membership.proCoins() >= w.cost) {
        this.membership.proCoins.update(c => c - w.cost);
        this.weapons.update(list => list.map(item => {
          if (item.id === w.id) {
            return { ...item, unlocked: true };
          }
          return item;
        }));
        
        // Save state
        const unlockedIds = this.weapons().filter(x => x.unlocked).map(x => x.id);
        localStorage.setItem('unlocked-weapons', JSON.stringify(unlockedIds));
        alert(`¡Has adquirido "${w.name}"! Tu bono del ${w.damageBoost} ya está activo en el Dojo.`);
      } else {
        alert('No tienes suficientes Pro Coins. Completa más pomodoros de enfoque para ganar monedas del Templo.');
      }
    }
  }

  // Dynamic labels helper
  labels = computed(() => {
    const t = this.currentTheme();
    if (t === 'cyberpunk') {
      return {
        logoText: 'COFU PRO',
        navTasks: 'Terminal',
        navZen: 'Zona de Enfoque',
        navTimer: 'Métricas de Red',
        navShield: 'Cortafuegos'
      };
    } else if (t === 'zen') {
      return {
        logoText: 'COFU ZEN',
        navTasks: 'Bonsái',
        navZen: 'Zona de Enfoque',
        navTimer: 'Jardín Temporal',
        navShield: 'Silencio'
      };
    } else if (t === 'aurora') {
      return {
        logoText: 'COFU AURORA',
        navTasks: 'Objetivos',
        navZen: 'Zona de Enfoque',
        navTimer: 'Cronograma',
        navShield: 'Protección'
      };
    } else {
      return {
        logoText: 'COFU SAMURÁI',
        navTasks: 'Misiones',
        navZen: 'Zona de Enfoque',
        navTimer: 'Estadísticas',
        navShield: 'Ideas fugaces'
      };
    }
  });
}
