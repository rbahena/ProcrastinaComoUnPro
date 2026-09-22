import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { SupabaseService, MedalleroBrokenRecordHolder } from '../../services/supabase.service';
import { Navbar } from '../../components/navbar/navbar';

export interface BrokenRecordCard {
  title: string;
  description: string;
  motivation: string;
  value: string;
  holder: string;
  avatar: string;
  flag: string;
  socials: Array<{ icon: string; platform: string; link: string }>;
  date: string;
  icon: string;
  color: string;
  bgGlow: string;
}

export interface RankingPlayer {
  rank: number;
  name: string;
  avatar: string;
  objectives?: number;
  pomodoros?: number;
  streakCount?: number;
  damage?: number;
  rankName?: string;
  title?: string;
  tag?: string;
  label?: string;
  isSelf?: boolean;
}

@Component({
  selector: 'app-medallero',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './medallero.html',
  styleUrl: './medallero.css'
})
export class Medallero implements OnInit, OnDestroy {
  public membership = inject(MembershipService);
  public bossService = inject(ComunidadBossService);
  private supabaseService = inject(SupabaseService);

  activeTab = signal<'objectives' | 'pomodoros' | 'streaks' | 'boss'>('objectives');
  sidebarCollapsed = this.membership.sidebarCollapsed;
  userName = this.membership.userName;

  // Indice activo de la tarjeta en el slider full-screen
  activeCardIndex = signal(0);

  // Datos en vivo desde Supabase
  private realtimeChannel: any = null;
  liveRecords = signal<{
    bestStreak: MedalleroBrokenRecordHolder | null;
    mostTomatoes: MedalleroBrokenRecordHolder | null;
    mostCoins: MedalleroBrokenRecordHolder | null;
    mostPodiums: MedalleroBrokenRecordHolder | null;
  }>({
    bestStreak: null,
    mostTomatoes: null,
    mostCoins: null,
    mostPodiums: null
  });

  liveRankings = signal<{
    objectives: any[];
    pomodoros: any[];
    streaks: any[];
    boss: any[];
  }>({
    objectives: [],
    pomodoros: [],
    streaks: [],
    boss: []
  });

  brokenRecords = computed<BrokenRecordCard[]>(() => {
    const ramStreak = this.membership.streak();
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();
    const ramCoins = this.membership.proCoins();
    const ramTomatoes = this.membership.focusTomatoes();

    const rec = this.liveRecords();

    // 1. MEJOR RACHA
    let streakHolderName = rec.bestStreak?.holder || 'Carlos "Mente Zen"';
    let streakHolderAvatar = rec.bestStreak?.avatar || 'panda';
    let streakHolderFlag = rec.bestStreak?.flag || 'mx';
    let bestStreakVal = rec.bestStreak?.streak ?? 15;
    let streakDate = '25 Ago 2026';

    if (this.membership.isPremium() && ramStreak >= bestStreakVal && ramStreak > 0) {
      bestStreakVal = ramStreak;
      streakHolderName = ramName;
      streakHolderAvatar = ramAvatar;
      streakHolderFlag = 'mx';
      streakDate = 'Hoy';
    }

    // 2. SESIONES DE CONCENTRACIÓN (POMODOROS)
    let tomatoHolderName = rec.mostTomatoes?.holder || 'Diego "Paso Firme"';
    let tomatoHolderAvatar = rec.mostTomatoes?.avatar || 'tortuga';
    let tomatoHolderFlag = rec.mostTomatoes?.flag || 'pe';
    let bestTomatoesVal = rec.mostTomatoes?.tomatoes ?? 2450;
    let tomatoDate = 'Histórico';

    if (this.membership.isPremium() && ramTomatoes >= bestTomatoesVal && ramTomatoes > 0) {
      bestTomatoesVal = ramTomatoes;
      tomatoHolderName = ramName;
      tomatoHolderAvatar = ramAvatar;
      tomatoHolderFlag = 'mx';
      tomatoDate = 'Hoy';
    }

    // 3. EL MAGNATE DE FOCUS (PRO COINS)
    let coinHolderName = rec.mostCoins?.holder || 'Elena "Rana Veloz"';
    let coinHolderAvatar = rec.mostCoins?.avatar || 'rana';
    let coinHolderFlag = rec.mostCoins?.flag || 'es';
    let bestCoinsVal = rec.mostCoins?.coins ?? 75000;
    let coinDate = 'Histórico';

    if (this.membership.isPremium() && ramCoins >= bestCoinsVal && ramCoins > 0) {
      bestCoinsVal = ramCoins;
      coinHolderName = ramName;
      coinHolderAvatar = ramAvatar;
      coinHolderFlag = 'mx';
      coinDate = 'Hoy';
    }

    // 4. PODIOS CONQUISTADOS
    let podiumHolderName = rec.mostPodiums?.holder || 'Sofía "Hacker"';
    let podiumHolderAvatar = rec.mostPodiums?.avatar || 'zorro';
    let podiumHolderFlag = rec.mostPodiums?.flag || 'cl';
    let bestPodiumsVal = rec.mostPodiums?.podiums ?? 12;
    let podiumDate = 'Histórico';

    return [
      {
        title: 'Mejor Racha',
        description: 'Racha consecutiva de días de enfoque completados en la plataforma al día de hoy.',
        motivation: '¡Has demostrado ser una persona sumamente constante y disciplinada en tu camino al éxito! Mantén encendida la llama del enfoque.',
        value: `${bestStreakVal.toLocaleString()} días`,
        holder: streakHolderName,
        avatar: streakHolderAvatar,
        flag: streakHolderFlag,
        socials: [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' },
          { icon: 'fa-x-twitter', platform: 'Twitter', link: 'https://x.com' }
        ],
        date: streakDate,
        icon: 'fa-fire',
        color: '#ff6b00',
        bgGlow: 'rgba(255, 107, 0, 0.12)'
      },
      {
        title: 'Sesiones de Concentración',
        description: 'Total acumulado de sesiones de enfoque (pomodoros) finalizadas desde el registro en la plataforma.',
        motivation: '¡Paso a paso se llega a la cima! Cada bloque es un ladrillo en el monumento a tu productividad. Sigue construyendo tu legado.',
        value: `${bestTomatoesVal.toLocaleString()} sesiones`,
        holder: tomatoHolderName,
        avatar: tomatoHolderAvatar,
        flag: tomatoHolderFlag,
        socials: [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' }
        ],
        date: tomatoDate,
        icon: 'fa-apple-whole',
        color: '#14b8a6',
        bgGlow: 'rgba(20, 184, 166, 0.12)'
      },
      {
        title: 'El Magnate de Focus',
        description: 'Total acumulado de Pro Coins obtenidas enfocándose en la Comunidad desde el origen.',
        motivation: '¡Tu esfuerzo se traduce en verdadera riqueza mental y digital! Invierte siempre tu tiempo en ti mismo.',
        value: `${bestCoinsVal.toLocaleString()} Coins`,
        holder: coinHolderName,
        avatar: coinHolderAvatar,
        flag: coinHolderFlag,
        socials: [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' },
          { icon: 'fa-twitch', platform: 'Twitch', link: 'https://twitch.tv' }
        ],
        date: coinDate,
        icon: 'fa-coins',
        color: '#fbbf24',
        bgGlow: 'rgba(251, 191, 36, 0.12)'
      },
      {
        title: 'Podios Conquistados',
        description: 'Total acumulado de primeros lugares obtenidos en los podios semanales de la Comunidad.',
        motivation: '¡La gloria pertenece a quienes perseveran! Has conquistado la cima y demostrado estar a la altura de los grandes.',
        value: `${bestPodiumsVal.toLocaleString()} podios`,
        holder: podiumHolderName,
        avatar: podiumHolderAvatar,
        flag: podiumHolderFlag,
        socials: [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' },
          { icon: 'fa-x-twitter', platform: 'Twitter', link: 'https://x.com' }
        ],
        date: podiumDate,
        icon: 'fa-trophy',
        color: '#f59e0b',
        bgGlow: 'rgba(245, 158, 11, 0.12)'
      }
    ];
  });

  ngOnInit() {
    this.loadMedalleroFromSupabase();

    if (this.supabaseService.isConfigured()) {
      this.realtimeChannel = this.supabaseService.client
        .channel('public:profiles_medallero')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          this.loadMedalleroFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'community_boss_attacks' }, () => {
          this.loadMedalleroFromSupabase();
        })
        .subscribe();
    }
  }

  ngOnDestroy() {
    if (this.realtimeChannel && this.supabaseService.isConfigured()) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
    }
  }

  async loadMedalleroFromSupabase() {
    if (!this.supabaseService.isConfigured()) return;

    try {
      const { data, error } = await this.supabaseService.getMedalleroData();
      if (error || !data) return;

      if (data.records) {
        this.liveRecords.set({
          bestStreak: data.records.best_streak,
          mostTomatoes: data.records.most_tomatoes,
          mostCoins: data.records.most_coins,
          mostPodiums: data.records.most_podiums
        });
      }

      if (data.rankings) {
        this.liveRankings.set({
          objectives: data.rankings.objectives || [],
          pomodoros: data.rankings.pomodoros || [],
          streaks: data.rankings.streaks || [],
          boss: data.rankings.boss || []
        });
      }
    } catch (e) {
      console.warn('[Medallero Load Error]', e);
    }
  }

  prevCard() {
    this.activeCardIndex.update(i => i > 0 ? i - 1 : 3);
  }

  nextCard() {
    this.activeCardIndex.update(i => i < 3 ? i + 1 : 0);
  }

  setCard(idx: number) {
    this.activeCardIndex.set(idx);
  }

  getFormattedToday(): string {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const d = new Date();
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  getAvatarIcon() {
    return this.membership.getSelectedAvatarIcon();
  }

  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  // 1. Más objetivos alcanzados
  rankingObjectives = computed<RankingPlayer[]>(() => {
    const ramObjCount = Math.floor(this.membership.focusPoints() / 40) + 12;
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();

    const liveList = this.liveRankings().objectives;
    if (liveList && liveList.length > 0) {
      const mapped = liveList.map((p: any) => ({
        name: p.username || 'Guerrero',
        avatar: p.selected_avatar || 'gato',
        objectives: p.focus_points ? Math.floor(p.focus_points / 40) : (p.focus_tomatoes || 0),
        rankName: this.membership.getAvatarTitle(p.selected_avatar || 'gato') + ' del Foco',
        isSelf: p.username === ramName
      }));
      const hasSelf = mapped.some(p => p.isSelf);
      if (!hasSelf && this.membership.isPremium()) {
        mapped.push({
          name: ramName,
          avatar: ramAvatar,
          objectives: ramObjCount,
          rankName: this.membership.getAvatarTitle(ramAvatar) + ' del Foco',
          isSelf: true
        });
      }
      return mapped.sort((a, b) => (b.objectives || 0) - (a.objectives || 0)).slice(0, 10).map((p, idx) => ({
        rank: idx + 1,
        ...p
      }));
    }
    
    const players = [
      { name: 'Sofía "Hacker"', avatar: 'mapache', objectives: 98, rankName: 'Sapo Legendario', isSelf: false },
      { name: 'Ana "La Sombra"', avatar: 'lobo', objectives: 84, rankName: 'Sapo Maestro', isSelf: false },
      { name: 'Mateo "El Castor"', avatar: 'castor', objectives: 76, rankName: 'Constructor Experto', isSelf: false },
      { name: 'Carlos "Mente Zen"', avatar: 'panda', objectives: 65, rankName: 'Estratega Zen', isSelf: false },
      { name: 'Laura "Fénix"', avatar: 'fenix', objectives: 55, rankName: 'Fénix Renacido', isSelf: false },
      { name: 'Valeria "Constante"', avatar: 'tortuga', objectives: 48, rankName: 'Constancia Absoluta', isSelf: false },
      { name: 'Diego "Bonsái"', avatar: 'sloth', objectives: 36, rankName: 'Jardinero del Tiempo', isSelf: false },
      { name: 'Elena "Kiai"', avatar: 'fenix', objectives: 28, rankName: 'Guerrera Iniciada', isSelf: false },
      { name: 'Lucas "Veloz"', avatar: 'hamster', objectives: 22, rankName: 'Aprendiz Veloz', isSelf: false }
    ];
    
    const all = [...players];
    if (this.membership.isPremium()) {
      all.push({ name: ramName, avatar: ramAvatar, objectives: ramObjCount, rankName: this.membership.getAvatarTitle(ramAvatar) + ' del Foco', isSelf: true });
    }
    all.sort((a, b) => b.objectives - a.objectives);
    
    return all.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));
  });

  // 2. Más pomodoros completados
  rankingPomodoros = computed<RankingPlayer[]>(() => {
    const ramPomCount = Math.floor(this.membership.focusPoints() / 10) + 15;
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();

    const liveList = this.liveRankings().pomodoros;
    if (liveList && liveList.length > 0) {
      const mapped = liveList.map((p: any) => ({
        name: p.username || 'Guerrero',
        avatar: p.selected_avatar || 'gato',
        pomodoros: p.focus_tomatoes || 0,
        title: this.membership.getAvatarTitle(p.selected_avatar || 'gato'),
        isSelf: p.username === ramName
      }));
      const hasSelf = mapped.some(p => p.isSelf);
      if (!hasSelf && this.membership.isPremium()) {
        mapped.push({
          name: ramName,
          avatar: ramAvatar,
          pomodoros: ramPomCount,
          title: 'Guerrero del Pomodoro',
          isSelf: true
        });
      }
      return mapped.sort((a, b) => (b.pomodoros || 0) - (a.pomodoros || 0)).slice(0, 10).map((p, idx) => ({
        rank: idx + 1,
        ...p
      }));
    }
    
    const players = [
      { name: 'Sofía "Hacker"', avatar: 'mapache', pomodoros: 195, title: 'Monje de Silencio', isSelf: false },
      { name: 'Ana "La Sombra"', avatar: 'lobo', pomodoros: 180, title: 'Guerrera Reloj', isSelf: false },
      { name: 'Mateo "El Castor"', avatar: 'castor', pomodoros: 152, title: 'Constructor Foco', isSelf: false },
      { name: 'Carlos "Mente Zen"', avatar: 'panda', pomodoros: 140, title: 'Mente Imperturbable', isSelf: false },
      { name: 'Laura "Fénix"', avatar: 'fenix', pomodoros: 118, title: 'Luz Concentrada', isSelf: false },
      { name: 'Valeria "Constante"', avatar: 'tortuga', pomodoros: 110, title: 'Constancia Pomodoro', isSelf: false },
      { name: 'Diego "Bonsái"', avatar: 'sloth', pomodoros: 92, title: 'Enfoque Bonsái', isSelf: false },
      { name: 'Elena "Kiai"', avatar: 'fenix', pomodoros: 85, title: 'Fuerza Concentrada', isSelf: false },
      { name: 'Lucas "Veloz"', avatar: 'hamster', pomodoros: 60, title: 'Velocidad Zen', isSelf: false }
    ];
    
    const all = [...players];
    if (this.membership.isPremium()) {
      all.push({ name: ramName, avatar: ramAvatar, pomodoros: ramPomCount, title: 'Guerrero del Pomodoro', isSelf: true });
    }
    all.sort((a, b) => b.pomodoros - a.pomodoros);
    
    return all.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));
  });

  // 3. Mejor racha
  rankingStreaks = computed<RankingPlayer[]>(() => {
    const ramStreak = Math.max(14, this.membership.streak());
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();

    const liveList = this.liveRankings().streaks;
    if (liveList && liveList.length > 0) {
      const mapped = liveList.map((p: any) => ({
        name: p.username || 'Guerrero',
        avatar: p.selected_avatar || 'gato',
        streakCount: p.streak_count || p.streak_days || 0,
        tag: 'Racha Activa',
        isSelf: p.username === ramName
      }));
      const hasSelf = mapped.some(p => p.isSelf);
      if (!hasSelf && this.membership.isPremium()) {
        mapped.push({
          name: ramName,
          avatar: ramAvatar,
          streakCount: ramStreak,
          tag: 'Racha Activa',
          isSelf: true
        });
      }
      return mapped.sort((a, b) => (b.streakCount || 0) - (a.streakCount || 0)).slice(0, 10).map((p, idx) => ({
        rank: idx + 1,
        ...p
      }));
    }
    
    const players = [
      { name: 'Sofía "Hacker"', avatar: 'mapache', streakCount: 15, tag: 'Racha Imparable', isSelf: false },
      { name: 'Ana "La Sombra"', avatar: 'lobo', streakCount: 12, tag: 'Firmeza Samurai', isSelf: false },
      { name: 'Laura "Fénix"', avatar: 'fenix', streakCount: 10, tag: 'Renacimiento Continuo', isSelf: false },
      { name: 'Valeria "Constante"', avatar: 'tortuga', streakCount: 9, tag: 'Racha Paciente', isSelf: false },
      { name: 'Carlos "Mente Zen"', avatar: 'panda', streakCount: 8, tag: 'Equilibrio Diario', isSelf: false },
      { name: 'Elena "Kiai"', avatar: 'fenix', streakCount: 7, tag: 'Disciplina Diaria', isSelf: false },
      { name: 'Mateo "El Castor"', avatar: 'castor', streakCount: 5, tag: 'Trabajo Constante', isSelf: false },
      { name: 'Diego "Bonsái"', avatar: 'sloth', streakCount: 4, tag: 'Calma Diaria', isSelf: false },
      { name: 'Lucas "Veloz"', avatar: 'hamster', streakCount: 3, tag: 'Velocidad Rápida', isSelf: false }
    ];
    
    const all = [...players];
    if (this.membership.isPremium()) {
      all.push({ name: ramName, avatar: ramAvatar, streakCount: ramStreak, tag: 'Racha Activa', isSelf: true });
    }
    all.sort((a, b) => b.streakCount - a.streakCount);
    
    return all.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));
  });

  // 4. Mejor aporte a villanos
  rankingBoss = computed<RankingPlayer[]>(() => {
    const ramDamage = this.bossService.userDamageDealt();
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();

    const liveList = this.liveRankings().boss;
    if (liveList && liveList.length > 0) {
      const mapped = liveList.map((p: any) => ({
        name: p.username || 'Guerrero',
        avatar: p.selected_avatar || 'lobo',
        damage: p.total_damage || 0,
        label: 'Cazador de Jefes',
        isSelf: p.username === ramName
      }));
      const hasSelf = mapped.some(p => p.isSelf);
      if (!hasSelf && this.membership.isPremium()) {
        mapped.push({
          name: ramName,
          avatar: ramAvatar,
          damage: ramDamage,
          label: 'Guerrero Activo',
          isSelf: true
        });
      }
      return mapped.sort((a, b) => (b.damage || 0) - (a.damage || 0)).slice(0, 10).map((p, idx) => ({
        rank: idx + 1,
        ...p
      }));
    }
    
    const players = [
      { name: 'Ana "La Sombra"', avatar: 'lobo', damage: 8500, label: 'Cazadora de Jefes', isSelf: false },
      { name: 'Carlos "Mente Zen"', avatar: 'panda', damage: 6200, label: 'Estratega de la Comunidad', isSelf: false },
      { name: 'Sofía "Hacker"', avatar: 'mapache', damage: 5400, label: 'Destructora de Kraken', isSelf: false },
      { name: 'Laura "Fénix"', avatar: 'fenix', damage: 4800, label: 'Furia Ígnea', isSelf: false },
      { name: 'Mateo "El Castor"', avatar: 'castor', damage: 3900, label: 'Ingeniero de Asedio', isSelf: false },
      { name: 'Diego "Bonsái"', avatar: 'sloth', damage: 2900, label: 'Corte Silencioso', isSelf: false },
      { name: 'Valeria "Constante"', avatar: 'tortuga', damage: 1800, label: 'Martillo Firme', isSelf: false },
      { name: 'Elena "Kiai"', avatar: 'fenix', damage: 1500, label: 'Aura Kiai', isSelf: false },
      { name: 'Lucas "Veloz"', avatar: 'hamster', damage: 1200, label: 'Rayo Veloz', isSelf: false }
    ];
    
    const all = [...players];
    if (this.membership.isPremium()) {
      all.push({ name: ramName, avatar: ramAvatar, damage: ramDamage, label: 'Guerrero Activo', isSelf: true });
    }
    all.sort((a, b) => b.damage - a.damage);
    
    return all.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));
  });

  getPodiumUser(place: 1 | 2 | 3): { name: string; avatar: string; value: string; isSelf: boolean } {
    const idx = place - 1;
    const tab = this.activeTab();
    if (tab === 'objectives') {
      const p = this.rankingObjectives()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: (p.objectives || 0) + ' objs', isSelf: !!p.isSelf } : { name: '', avatar: '', value: '', isSelf: false };
    } else if (tab === 'pomodoros') {
      const p = this.rankingPomodoros()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: (p.pomodoros || 0) + ' poms', isSelf: !!p.isSelf } : { name: '', avatar: '', value: '', isSelf: false };
    } else if (tab === 'streaks') {
      const p = this.rankingStreaks()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: (p.streakCount || 0) + ' días', isSelf: !!p.isSelf } : { name: '', avatar: '', value: '', isSelf: false };
    } else {
      const p = this.rankingBoss()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: (p.damage || 0) + ' HP', isSelf: !!p.isSelf } : { name: '', avatar: '', value: '', isSelf: false };
    }
  }

  labels = computed(() => {
    const t = this.membership.selectedTheme();
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

