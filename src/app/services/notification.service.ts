import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export type NotificationType = 
  | 'motivation_heart' 
  | 'streak_risk' 
  | 'streak_milestone' 
  | 'boss_defeated' 
  | 'boss_new' 
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO date string
  isRead: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
  route?: string;
  queryParams?: Record<string, any>;
  metadata?: any;
}

const STORAGE_KEY = 'cofu-user-notifications';
const PAUSE_STORAGE_KEY = 'cofu-notifications-paused';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private router = inject(Router);

  // Estado reactivo con Signals
  notifications = signal<AppNotification[]>([]);
  isOpen = signal<boolean>(false);
  isPaused = signal<boolean>(false);

  // Audio Context para el sonido único de notificaciones (Web Audio API)
  private audioCtx: AudioContext | null = null;

  // Computados
  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  hasUnread = computed(() => this.unreadCount() > 0 && !this.isPaused());

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Helper para limpiar emojis redundantes al inicio del título
   */
  private cleanTitle(title: string): string {
    return title.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\s]+/gu, '').trim();
  }

  /**
   * Carga las notificaciones y estado de pausa guardados en LocalStorage.
   * Totalmente limpio sin datos demo en duro.
   */
  private loadFromStorage() {
    // 1. Cargar estado de pausa
    try {
      const pausedStored = localStorage.getItem(PAUSE_STORAGE_KEY);
      if (pausedStored !== null) {
        this.isPaused.set(pausedStored === 'true');
      }
    } catch (e) {}

    // 2. Cargar historial de notificaciones (filtrando cualquier demo anterior)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filtrar notificaciones demo iniciales y limpiar títulos
          const realOnly = parsed
            .filter(n => !n.id.startsWith('notif-init-'))
            .map(n => ({
              ...n,
              title: this.cleanTitle(n.title || '')
            }));
          this.notifications.set(realOnly);
          this.saveToStorage();
          return;
        }
      }
    } catch (e) {
      console.warn('[NotificationService] Error al cargar notificaciones:', e);
    }

    // Si no hay notificaciones o solo había demos, arrancar 100% limpio
    this.notifications.set([]);
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications()));
    } catch (e) {
      console.warn('[NotificationService] Error al guardar notificaciones:', e);
    }
  }

  /**
   * Alterna la pausa / activación de notificaciones (Modo No Molestar rápido).
   * Cuando se despausan (se activan), emite el sonido unificado de notificación.
   */
  togglePaused(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const newState = !this.isPaused();
    this.isPaused.set(newState);
    try {
      localStorage.setItem(PAUSE_STORAGE_KEY, String(newState));
    } catch (e) {}

    // Si el usuario decide activarlas, reproducir el sonido característico único
    if (!newState) {
      this.playNotificationSound();
    }
  }

  /**
   * Sonido unificado de notificación: Gota Zen & Campana de Bambú (432 Hz).
   * Tono aterciopelado, suave y pacífico con filtro cálido de baja frecuencia.
   */
  playNotificationSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Filtro pasa-bajos cálido para eliminar cualquier agudeza y generar textura sedosa
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(1.0, now);
      filter.connect(this.audioCtx.destination);

      // Tono Principal: Gota Zen cálida (432 Hz afinación de relajación)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(432, now);
      osc1.frequency.exponentialRampToValueAtTime(518.4, now + 0.08);

      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(0.16, now + 0.035); // Ataque suave tipo mazo de fieltro
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.15); // Caída prolongada y tranquila

      osc1.connect(gain1);
      gain1.connect(filter);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Tono Secundario: Resonancia de Cuenco Zen armónico (648 Hz con bajo volumen)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(648, now + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(648, now + 0.5);

      gain2.gain.setValueAtTime(0.0001, now + 0.04);
      gain2.gain.linearRampToValueAtTime(0.06, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

      osc2.connect(gain2);
      gain2.connect(filter);
      osc2.start(now + 0.04);
      osc2.stop(now + 1.35);
    } catch (e) {
      console.warn('[NotificationService] Error al emitir sonido:', e);
    }
  }

  /**
   * Alterna la visibilidad del panel de notificaciones
   */
  togglePanel(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isOpen.update(v => !v);
  }

  openPanel() {
    this.isOpen.set(true);
  }

  closePanel() {
    this.isOpen.set(false);
  }

  /**
   * Marca una notificación específica como leída
   */
  markAsRead(id: string) {
    this.notifications.update(list => 
      list.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    this.saveToStorage();
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead() {
    this.notifications.update(list => 
      list.map(n => ({ ...n, isRead: true }))
    );
    this.saveToStorage();
  }

  /**
   * Elimina una notificación individual
   */
  removeNotification(id: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notifications.update(list => list.filter(n => n.id !== id));
    this.saveToStorage();
  }

  /**
   * Borra todas las notificaciones
   */
  clearAll() {
    this.notifications.set([]);
    this.saveToStorage();
  }

  /**
   * Agrega una nueva notificación asegurando que no sobrecargue la bandeja
   * (límite máximo de 20 notificaciones). Si no están pausadas, emite el sonido único.
   */
  addNotification(item: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string }) {
    const newNotif: AppNotification = {
      id: item.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: item.type,
      title: this.cleanTitle(item.title),
      message: item.message,
      createdAt: new Date().toISOString(),
      isRead: false,
      icon: item.icon,
      iconColor: item.iconColor,
      iconBg: item.iconBg,
      route: item.route,
      queryParams: item.queryParams,
      metadata: item.metadata
    };

    this.notifications.update(list => {
      // Limitar a máximo 20 items para mantener la interfaz ligera y tranquila
      const updated = [newNotif, ...list.filter(n => n.id !== newNotif.id)];
      return updated.slice(0, 20);
    });
    this.saveToStorage();

    // Reproducir el sonido único solo si no están pausadas
    if (!this.isPaused()) {
      this.playNotificationSound();
    }
  }

  /**
   * 1. Notificación de Corazón en Motivación (Inspiración en el Muro)
   */
  notifyMotivationHeart(motivationText: string, likerName?: string, count: number = 1) {
    const snippet = motivationText.length > 40 ? `«${motivationText.substring(0, 37)}...»` : `«${motivationText}»`;
    const message = count > 1
      ? `A ${count} compañeros les ha inspirado tu frase en el Muro: ${snippet}`
      : likerName 
        ? `${likerName} reaccionó con un corazón a tu motivación: ${snippet}`
        : `A un compañero de la comunidad le ha inspirado tu frase: ${snippet}`;

    this.addNotification({
      type: 'motivation_heart',
      title: 'Inspiración en el Muro',
      message,
      icon: 'fa-solid fa-heart',
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      route: '/enfoque',
      metadata: { motivationText }
    });
  }

  /**
   * 2. Notificación de Racha en Riesgo
   */
  notifyStreakRisk(streakDays: number) {
    this.addNotification({
      type: 'streak_risk',
      title: 'Racha en Juego',
      message: `Llevas ${streakDays} días consecutivos de enfoque. Completa 1 sesión hoy para mantener encendida tu llama.`,
      icon: 'fa-solid fa-fire',
      iconColor: '#ff6b00',
      iconBg: 'rgba(255, 107, 0, 0.15)',
      route: '/enfoque'
    });
  }

  /**
   * 3. Notificación de Hito de Racha Alcanzado
   */
  notifyStreakMilestone(streakDays: number) {
    this.addNotification({
      type: 'streak_milestone',
      title: '¡Hito de Constancia!',
      message: `¡Increíble! Has alcanzado una racha de ${streakDays} días seguidos. Tu disciplina inspira a tus compañeros.`,
      icon: 'fa-solid fa-trophy',
      iconColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      route: '/medallero'
    });
  }

  /**
   * 4. Notificación de Boss Derrotado
   */
  notifyBossDefeated(bossName: string, rewardCoins: number = 50) {
    this.addNotification({
      type: 'boss_defeated',
      title: '¡Victoria Comunitaria!',
      message: `¡El ${bossName} ha sido derrotado por la comunidad! Pasa a reclamar tu botín de +${rewardCoins} Pro Coins.`,
      icon: 'fa-solid fa-crown',
      iconColor: '#10b981',
      iconBg: 'rgba(168, 85, 247, 0.15)',
      route: '/enfoque'
    });
  }

  /**
   * Navega a la ruta asociada al hacer clic en una notificación
   */
  onNotificationClick(notif: AppNotification) {
    this.markAsRead(notif.id);
    this.closePanel();
    if (notif.route) {
      this.router.navigate([notif.route], { queryParams: notif.queryParams });
    }
  }

  /**
   * Formateador de tiempo relativo humanizado en español
   */
  formatTimeAgo(isoString: string): string {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 1) return 'Ahora mismo';
      if (diffMin < 60) return `Hace ${diffMin}m`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays}d`;
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  }
}
