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
  isAssigned?: boolean;
}

export interface RankingPlayer {
  rank: number;
  name: string;
  avatar: string;
  objectives?: number;
  pomodoros?: number;
  streakCount?: number;
  coins?: number;
  podiums?: number;
  damage?: number;
  formattedValue?: string;
  rankName?: string;
  title?: string;
  tag?: string;
  label?: string;
  isSelf?: boolean;
  isAssigned?: boolean;
}

interface RawRankingPlayer {
  name: string;
  avatar: string;
  objectives?: number;
  pomodoros?: number;
  streakCount?: number;
  coins?: number;
  podiums?: number;
  damage?: number;
  rankName?: string;
  title?: string;
  tag?: string;
  label?: string;
  isSelf?: boolean;
}

import { TranslatePipe, TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-medallero',
  standalone: true,
  imports: [CommonModule, Navbar, TranslatePipe],
  templateUrl: './medallero.html',
  styleUrl: './medallero.css'
})
export class Medallero implements OnInit, OnDestroy {
  public membership = inject(MembershipService);
  public bossService = inject(ComunidadBossService);
  private supabaseService = inject(SupabaseService);
  public translation = inject(TranslationService);

  activeTab = signal<'objectives' | 'pomodoros' | 'streaks' | 'boss'>('objectives');
  sidebarCollapsed = this.membership.sidebarCollapsed;
  userName = this.membership.userName;

  // Modo de vista principal: 'records_3d' | 'signifier_map' | 'weekly_podium'
  viewMode = signal<'records_3d' | 'signifier_map' | 'weekly_podium'>('records_3d');

  // Categoría activa dentro del Mapa de Significadores
  activeSignifierCategory = signal<'podiums' | 'streaks' | 'broken_records' | 'ranks' | 'qualities' | 'economy'>('podiums');

  // Indice activo de la tarjeta en el slider full-screen
  activeCardIndex = signal(0);

  // Computados para el Mapa de Significadores y Estado del Usuario
  userLevel = computed(() => Math.floor(this.membership.focusTomatoes() / 4) + 1);

  userRankName = computed(() => {
    const lvl = this.userLevel();
    const isEn = this.translation.currentLang() === 'en';
    if (lvl >= 30) return isEn ? 'Supreme Commander' : 'Comandante Supremo';
    if (lvl >= 20) return isEn ? 'Grandmaster' : 'Gran Maestro';
    if (lvl >= 15) return isEn ? 'Elite Strategist' : 'Estratega Élite';
    if (lvl >= 10) return isEn ? 'Veteran Warrior' : 'Guerrero Veterano';
    if (lvl >= 5) return isEn ? 'Sentinel' : 'Centinela';
    return isEn ? 'Focus Recruit' : 'Recluta de Enfoque';
  });

  userRankIcon = computed(() => {
    const lvl = this.userLevel();
    if (lvl >= 30) return 'fa-crown';
    if (lvl >= 20) return 'fa-dragon';
    if (lvl >= 15) return 'fa-bolt';
    if (lvl >= 10) return 'fa-shield-halved';
    if (lvl >= 5) return 'fa-feather';
    return 'fa-seedling';
  });

  userRankNextTomatoes = computed(() => {
    const t = this.membership.focusTomatoes();
    const lvl = this.userLevel();
    let nextThreshold = 16;
    if (lvl < 5) nextThreshold = 16;
    else if (lvl < 10) nextThreshold = 36;
    else if (lvl < 15) nextThreshold = 56;
    else if (lvl < 20) nextThreshold = 76;
    else if (lvl < 30) nextThreshold = 116;
    else return 0;
    return Math.max(0, nextThreshold - t);
  });

  userRankProgressPercent = computed(() => {
    const t = this.membership.focusTomatoes();
    const lvl = this.userLevel();
    if (lvl >= 30) return 100;
    let start = 0;
    let end = 16;
    if (lvl >= 20) { start = 76; end = 116; }
    else if (lvl >= 15) { start = 56; end = 76; }
    else if (lvl >= 10) { start = 36; end = 56; }
    else if (lvl >= 5) { start = 16; end = 36; }
    else { start = 0; end = 16; }
    const pct = Math.round(((t - start) / (end - start)) * 100);
    return Math.min(100, Math.max(0, pct));
  });

  unlockedQualitiesCount = computed(() => 
    this.membership.qualitiesCatalog().filter(q => q.isUnlocked).length
  );

  userStreak = computed(() => this.membership.streak());
  userPodiumWins = computed(() => this.membership.podiumWins());
  userGoldMedals = computed(() => this.membership.goldMedals());
  userSilverMedals = computed(() => this.membership.silverMedals());
  userBronzeMedals = computed(() => this.membership.bronzeMedals());

  setViewMode(mode: 'records_3d' | 'signifier_map' | 'weekly_podium') {
    this.viewMode.set(mode);
  }

  setSignifierCategory(cat: 'podiums' | 'streaks' | 'broken_records' | 'ranks' | 'qualities' | 'economy') {
    this.activeSignifierCategory.set(cat);
  }

  // Datos en vivo desde Supabase
  private realtimeChannel: any = null;
  liveRecords = signal<{
    bestStreak: MedalleroBrokenRecordHolder | null;
    mostTomatoes: MedalleroBrokenRecordHolder | null;
    mostCoins: MedalleroBrokenRecordHolder | null;
    mostPodiums: MedalleroBrokenRecordHolder | null;
    bossMvp: MedalleroBrokenRecordHolder | null;
  }>({
    bestStreak: null,
    mostTomatoes: null,
    mostCoins: null,
    mostPodiums: null,
    bossMvp: null
  });

  liveRankings = signal<{
    objectives: any[];
    pomodoros: any[];
    streaks: any[];
    boss: any[];
    coins: any[];
    podiums: any[];
  }>({
    objectives: [],
    pomodoros: [],
    streaks: [],
    boss: [],
    coins: [],
    podiums: []
  });

  brokenRecords = computed<BrokenRecordCard[]>(() => {
    // Escuchar el idioma para reactividad total al alternar inglés y español
    this.translation.currentLang();

    const ramStreak = this.membership.streak();
    const ramName = this.membership.userName() || this.translation.t('medals.warrior');
    const ramAvatar = this.membership.selectedAvatar() || 'gato';
    const ramCoins = this.membership.proCoins();
    const ramTomatoes = this.membership.focusTomatoes();
    const ramPodiumWins = this.membership.podiumWins();
    const isPremium = this.membership.isPremium();

    const rec = this.liveRecords();

    // 1. MEJOR RACHA
    let streakHolderName = this.translation.t('medals.inDispute');
    let streakHolderAvatar = '';
    let streakHolderFlag = '';
    let bestStreakVal = 0;
    let streakDate = this.translation.t('medals.noRecord');
    let isStreakAssigned = false;

    if (rec.bestStreak && (rec.bestStreak.streak ?? 0) > 0) {
      streakHolderName = rec.bestStreak.holder || this.translation.t('medals.warrior');
      streakHolderAvatar = rec.bestStreak.avatar || '';
      streakHolderFlag = rec.bestStreak.flag || 'mx';
      bestStreakVal = rec.bestStreak.streak || 0;
      streakDate = this.translation.t('medals.historical');
      isStreakAssigned = true;
    }

    const ramCreatedAt = this.membership.userCreatedAt();

    if (isPremium && ramStreak > 0 && this.isUserEligible(ramStreak, ramCreatedAt) && ramStreak >= bestStreakVal) {
      bestStreakVal = ramStreak;
      streakHolderName = ramName;
      streakHolderAvatar = ramAvatar;
      streakHolderFlag = 'mx';
      streakDate = this.translation.t('medals.today');
      isStreakAssigned = true;
    }

    // 2. SESIONES DE CONCENTRACIÓN (POMODOROS)
    let tomatoHolderName = this.translation.t('medals.inDispute');
    let tomatoHolderAvatar = '';
    let tomatoHolderFlag = '';
    let bestTomatoesVal = 0;
    let tomatoDate = this.translation.t('medals.noRecord');
    let isTomatoAssigned = false;

    if (rec.mostTomatoes && (rec.mostTomatoes.tomatoes ?? 0) > 0) {
      tomatoHolderName = rec.mostTomatoes.holder || this.translation.t('medals.warrior');
      tomatoHolderAvatar = rec.mostTomatoes.avatar || '';
      tomatoHolderFlag = rec.mostTomatoes.flag || 'mx';
      bestTomatoesVal = rec.mostTomatoes.tomatoes || 0;
      tomatoDate = this.translation.t('medals.historical');
      isTomatoAssigned = true;
    }

    if (isPremium && ramTomatoes > 0 && this.isUserEligible(ramTomatoes, ramCreatedAt) && ramTomatoes >= bestTomatoesVal) {
      bestTomatoesVal = ramTomatoes;
      tomatoHolderName = ramName;
      tomatoHolderAvatar = ramAvatar;
      tomatoHolderFlag = 'mx';
      tomatoDate = this.translation.t('medals.today');
      isTomatoAssigned = true;
    }

    // 3. EL MAGNATE DE FOCUS (PRO COINS)
    let coinHolderName = this.translation.t('medals.inDispute');
    let coinHolderAvatar = '';
    let coinHolderFlag = '';
    let bestCoinsVal = 0;
    let coinDate = this.translation.t('medals.noRecord');
    let isCoinAssigned = false;

    if (rec.mostCoins && (rec.mostCoins.coins ?? 0) > 0) {
      coinHolderName = rec.mostCoins.holder || this.translation.t('medals.warrior');
      coinHolderAvatar = rec.mostCoins.avatar || '';
      coinHolderFlag = rec.mostCoins.flag || 'mx';
      bestCoinsVal = rec.mostCoins.coins || 0;
      coinDate = this.translation.t('medals.historical');
      isCoinAssigned = true;
    }

    if (isPremium && ramCoins > 0 && this.isUserEligible(ramCoins, ramCreatedAt) && ramCoins >= bestCoinsVal) {
      bestCoinsVal = ramCoins;
      coinHolderName = ramName;
      coinHolderAvatar = ramAvatar;
      coinHolderFlag = 'mx';
      coinDate = this.translation.t('medals.today');
      isCoinAssigned = true;
    }

    // 4. MVP DEL JEFE EN TURNO (DAÑO TOTAL AL JEFE ACTIVO)
    const ramDamage = this.bossService.userDamageDealt();
    let bossMvpName = this.translation.t('medals.inDispute');
    let bossMvpAvatar = '';
    let bossMvpFlag = '';
    let bestBossDamageVal = 0;
    let bossMvpDate = this.translation.t('medals.noRecord');
    let isBossMvpAssigned = false;

    if (rec.bossMvp && (rec.bossMvp.damage ?? 0) > 0) {
      bossMvpName = rec.bossMvp.holder || this.translation.t('medals.warrior');
      bossMvpAvatar = rec.bossMvp.avatar || 'lobo';
      bossMvpFlag = rec.bossMvp.flag || 'mx';
      bestBossDamageVal = rec.bossMvp.damage || 0;
      bossMvpDate = this.translation.t('medals.activeBoss');
      isBossMvpAssigned = true;
    }

    if (isPremium && ramDamage > 0 && this.isUserEligible(ramDamage, ramCreatedAt) && ramDamage >= bestBossDamageVal) {
      bestBossDamageVal = ramDamage;
      bossMvpName = ramName;
      bossMvpAvatar = ramAvatar;
      bossMvpFlag = 'mx';
      bossMvpDate = this.translation.t('medals.today');
      isBossMvpAssigned = true;
    }

    const availableText = this.translation.t('medals.available');
    const daysUnit = this.translation.t('common.days');
    const sessionsUnit = this.translation.t('medals.sessionsUnit');

    return [
      {
        title: this.translation.t('medals.bestStreakCardTitle'),
        description: this.translation.t('medals.bestStreakCardDesc'),
        motivation: this.translation.t('medals.bestStreakCardMotivation'),
        value: bestStreakVal > 0 ? `${bestStreakVal.toLocaleString()} ${daysUnit}` : availableText,
        holder: streakHolderName,
        avatar: streakHolderAvatar,
        flag: streakHolderFlag,
        socials: isStreakAssigned ? [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' },
          { icon: 'fa-x-twitter', platform: 'Twitter', link: 'https://x.com' }
        ] : [],
        date: streakDate,
        icon: 'fa-fire',
        color: '#ff6b00',
        bgGlow: 'rgba(255, 107, 0, 0.12)',
        isAssigned: isStreakAssigned
      },
      {
        title: this.translation.t('medals.pomodorosCardTitle'),
        description: this.translation.t('medals.pomodorosCardDesc'),
        motivation: this.translation.t('medals.pomodorosCardMotivation'),
        value: bestTomatoesVal > 0 ? `${bestTomatoesVal.toLocaleString()} ${sessionsUnit}` : availableText,
        holder: tomatoHolderName,
        avatar: tomatoHolderAvatar,
        flag: tomatoHolderFlag,
        socials: isTomatoAssigned ? [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' }
        ] : [],
        date: tomatoDate,
        icon: 'fa-apple-whole',
        color: '#14b8a6',
        bgGlow: 'rgba(20, 184, 166, 0.12)',
        isAssigned: isTomatoAssigned
      },
      {
        title: this.translation.t('medals.coinsCardTitle'),
        description: this.translation.t('medals.coinsCardDesc'),
        motivation: this.translation.t('medals.coinsCardMotivation'),
        value: bestCoinsVal > 0 ? `${bestCoinsVal.toLocaleString()} Coins` : availableText,
        holder: coinHolderName,
        avatar: coinHolderAvatar,
        flag: coinHolderFlag,
        socials: isCoinAssigned ? [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' },
          { icon: 'fa-twitch', platform: 'Twitch', link: 'https://twitch.tv' }
        ] : [],
        date: coinDate,
        icon: 'fa-coins',
        color: '#fbbf24',
        bgGlow: 'rgba(251, 191, 36, 0.12)',
        isAssigned: isCoinAssigned
      },
      {
        title: this.translation.t('medals.bossMvpCardTitle'),
        description: this.translation.t('medals.bossMvpCardDesc'),
        motivation: this.translation.t('medals.bossMvpCardMotivation'),
        value: bestBossDamageVal > 0 ? `${bestBossDamageVal.toLocaleString()} HP` : availableText,
        holder: bossMvpName,
        avatar: bossMvpAvatar,
        flag: bossMvpFlag,
        socials: isBossMvpAssigned ? [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' },
          { icon: 'fa-twitch', platform: 'Twitch', link: 'https://twitch.tv' }
        ] : [],
        date: bossMvpDate,
        icon: 'fa-skull-crossbones',
        color: '#ef4444',
        bgGlow: 'rgba(239, 68, 68, 0.14)',
        isAssigned: isBossMvpAssigned
      }
    ];
  });

  private reloadDebounceTimeout: any = null;

  private triggerRealtimeReload() {
    if (this.reloadDebounceTimeout) {
      clearTimeout(this.reloadDebounceTimeout);
    }
    this.reloadDebounceTimeout = setTimeout(() => {
      this.loadMedalleroFromSupabase();
    }, 250);
  }

  ngOnInit() {
    this.loadMedalleroFromSupabase();

    if (this.supabaseService.isConfigured()) {
      this.realtimeChannel = this.supabaseService.client
        .channel('public:profiles_medallero')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          this.triggerRealtimeReload();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => {
          this.triggerRealtimeReload();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'community_boss_attacks' }, () => {
          this.triggerRealtimeReload();
        })
        .subscribe();
    }
  }

  ngOnDestroy() {
    if (this.reloadDebounceTimeout) {
      clearTimeout(this.reloadDebounceTimeout);
    }
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
          mostPodiums: data.records.most_podiums,
          bossMvp: data.records.boss_mvp || null
        });
      }

      if (data.rankings) {
        this.liveRankings.set({
          objectives: data.rankings.objectives || [],
          pomodoros: data.rankings.pomodoros || [],
          streaks: data.rankings.streaks || [],
          boss: data.rankings.boss || [],
          coins: data.rankings.coins || [],
          podiums: data.rankings.podiums || []
        });
      }
    } catch (e) {
      console.warn('[Medallero Load Error]', e);
    }
  }

  prevCard() {
    const maxIdx = this.brokenRecords().length - 1;
    this.activeCardIndex.update(i => i > 0 ? i - 1 : Math.max(0, maxIdx));
  }

  nextCard() {
    const maxIdx = this.brokenRecords().length - 1;
    this.activeCardIndex.update(i => i < maxIdx ? i + 1 : 0);
  }

  setCard(idx: number) {
    this.activeCardIndex.set(idx);
  }

  getFormattedToday(): string {
    const isEn = this.translation.currentLang() === 'en';
    const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = isEn ? monthsEn : monthsEs;
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

  isUserEligible(units: number, createdAt?: string): boolean {
    return units > 0;
  }

  // 1. Más objetivos alcanzados
  rankingObjectives = computed<RankingPlayer[]>(() => {
    this.translation.currentLang();
    const warriorText = this.translation.t('medals.warrior');
    const ofFocusText = this.translation.t('medals.ofFocus');
    const ramName = this.membership.userName() || warriorText;
    const ramAvatar = this.membership.selectedAvatar() || 'gato';
    const ramPoints = this.membership.focusPoints();
    const ramObjCount = Math.floor(ramPoints / 40);
    const ramCreatedAt = this.membership.userCreatedAt();

    const liveList = this.liveRankings().objectives;
    const mapped: RawRankingPlayer[] = (liveList || [])
      .filter((p: any) => this.isUserEligible(p.focus_points ? Math.floor(p.focus_points / 40) : (p.focus_tomatoes || 0), p.created_at))
      .map((p: any) => ({
        name: p.username || warriorText,
        avatar: p.selected_avatar || 'gato',
        objectives: p.focus_points ? Math.floor(p.focus_points / 40) : (p.focus_tomatoes || 0),
        pomodoros: p.focus_tomatoes || 0,
        streakCount: p.streak_days || 0,
        rankName: this.membership.getAvatarTitle(p.selected_avatar || 'gato') + ofFocusText,
        isSelf: p.username === ramName
      }));

    if (this.membership.isPremium() && this.isUserEligible(ramObjCount, ramCreatedAt) && !mapped.some(p => p.isSelf)) {
      mapped.push({
        name: ramName,
        avatar: ramAvatar,
        objectives: ramObjCount,
        pomodoros: this.membership.focusTomatoes(),
        streakCount: this.membership.streak(),
        rankName: this.membership.getAvatarTitle(ramAvatar) + ofFocusText,
        isSelf: true
      });
    }

    return mapped.sort((a, b) => 
      ((b.objectives || 0) - (a.objectives || 0)) ||
      ((b.pomodoros || 0) - (a.pomodoros || 0)) ||
      ((b.streakCount || 0) - (a.streakCount || 0))
    ).slice(0, 10).map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));
  });

  // 2. Más pomodoros completados
  rankingPomodoros = computed<RankingPlayer[]>(() => {
    this.translation.currentLang();
    const warriorText = this.translation.t('medals.warrior');
    const pomodoroWarriorText = this.translation.t('medals.pomodoroWarrior');
    const ramName = this.membership.userName() || warriorText;
    const ramAvatar = this.membership.selectedAvatar() || 'gato';
    const ramTomatoes = this.membership.focusTomatoes();
    const ramCreatedAt = this.membership.userCreatedAt();

    const liveList = this.liveRankings().pomodoros;
    const mapped: RawRankingPlayer[] = (liveList || [])
      .filter((p: any) => this.isUserEligible(p.focus_tomatoes || 0, p.created_at))
      .map((p: any) => ({
        name: p.username || warriorText,
        avatar: p.selected_avatar || 'gato',
        pomodoros: p.focus_tomatoes || 0,
        streakCount: p.streak_days || 0,
        objectives: p.focus_points ? Math.floor(p.focus_points / 40) : 0,
        title: this.membership.getAvatarTitle(p.selected_avatar || 'gato'),
        isSelf: p.username === ramName
      }));

    if (this.membership.isPremium() && this.isUserEligible(ramTomatoes, ramCreatedAt) && !mapped.some(p => p.isSelf)) {
      mapped.push({
        name: ramName,
        avatar: ramAvatar,
        pomodoros: ramTomatoes,
        streakCount: this.membership.streak(),
        objectives: Math.floor(this.membership.focusPoints() / 40),
        title: pomodoroWarriorText,
        isSelf: true
      });
    }

    return mapped.sort((a, b) => 
      ((b.pomodoros || 0) - (a.pomodoros || 0)) ||
      ((b.streakCount || 0) - (a.streakCount || 0)) ||
      ((b.objectives || 0) - (a.objectives || 0))
    ).slice(0, 10).map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));
  });

  // 3. Mejor racha
  rankingStreaks = computed<RankingPlayer[]>(() => {
    this.translation.currentLang();
    const warriorText = this.translation.t('medals.warrior');
    const activeStreakText = this.translation.t('medals.activeStreakTag');
    const ramStreak = this.membership.streak();
    const ramName = this.membership.userName() || warriorText;
    const ramAvatar = this.membership.selectedAvatar() || 'gato';
    const ramCreatedAt = this.membership.userCreatedAt();

    const liveList = this.liveRankings().streaks;
    const mapped: RawRankingPlayer[] = (liveList || [])
      .filter((p: any) => this.isUserEligible(p.streak_count || p.streak_days || 0, p.created_at))
      .map((p: any) => ({
        name: p.username || warriorText,
        avatar: p.selected_avatar || 'gato',
        streakCount: p.streak_count || p.streak_days || 0,
        pomodoros: p.focus_tomatoes || 0,
        objectives: p.focus_points ? Math.floor(p.focus_points / 40) : 0,
        tag: activeStreakText,
        isSelf: p.username === ramName
      }));

    if (this.membership.isPremium() && this.isUserEligible(ramStreak, ramCreatedAt) && !mapped.some(p => p.isSelf)) {
      mapped.push({
        name: ramName,
        avatar: ramAvatar,
        streakCount: ramStreak,
        pomodoros: this.membership.focusTomatoes(),
        objectives: Math.floor(this.membership.focusPoints() / 40),
        tag: activeStreakText,
        isSelf: true
      });
    }

    return mapped.sort((a, b) => 
      ((b.streakCount || 0) - (a.streakCount || 0)) ||
      ((b.pomodoros || 0) - (a.pomodoros || 0)) ||
      ((b.objectives || 0) - (a.objectives || 0))
    ).slice(0, 10).map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));
  });

  // 4. Mejor aporte a villanos
  rankingBoss = computed<RankingPlayer[]>(() => {
    this.translation.currentLang();
    const warriorText = this.translation.t('medals.warrior');
    const hunterText = this.translation.t('medals.bossHunter');
    const activeWarriorText = this.translation.t('medals.activeWarrior');
    const ramDamage = this.bossService.userDamageDealt();
    const ramName = this.membership.userName() || warriorText;
    const ramAvatar = this.membership.selectedAvatar() || 'gato';
    const ramCreatedAt = this.membership.userCreatedAt();

    const liveList = this.liveRankings().boss;
    const mapped: RawRankingPlayer[] = (liveList || [])
      .filter((p: any) => this.isUserEligible(p.total_damage || 0, p.created_at))
      .map((p: any) => ({
        name: p.username || warriorText,
        avatar: p.selected_avatar || 'lobo',
        damage: p.total_damage || 0,
        pomodoros: p.focus_tomatoes || 0,
        label: hunterText,
        isSelf: p.username === ramName
      }));

    if (this.membership.isPremium() && this.isUserEligible(ramDamage, ramCreatedAt) && !mapped.some(p => p.isSelf)) {
      mapped.push({
        name: ramName,
        avatar: ramAvatar,
        damage: ramDamage,
        pomodoros: this.membership.focusTomatoes(),
        label: activeWarriorText,
        isSelf: true
      });
    }

    return mapped.sort((a, b) => 
      ((b.damage || 0) - (a.damage || 0)) ||
      ((b.pomodoros || 0) - (a.pomodoros || 0))
    ).slice(0, 10).map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));
  });

  // 5. Ranking por Pro Coins (El Magnate de Focus)
  rankingCoins = computed<RankingPlayer[]>(() => {
    this.translation.currentLang();
    const warriorText = this.translation.t('medals.warrior');
    const tycoonText = this.translation.t('medals.focusTycoon');
    const ramName = this.membership.userName() || warriorText;
    const ramAvatar = this.membership.selectedAvatar() || 'gato';
    const ramCoins = this.membership.proCoins();
    const ramCreatedAt = this.membership.userCreatedAt();

    const liveList = this.liveRankings().coins;
    const mapped: RawRankingPlayer[] = (liveList || [])
      .filter((p: any) => this.isUserEligible(p.pro_coins || p.coins || 0, p.created_at))
      .map((p: any) => ({
        name: p.username || warriorText,
        avatar: p.selected_avatar || 'gato',
        coins: p.pro_coins || p.coins || 0,
        pomodoros: p.focus_tomatoes || 0,
        tag: tycoonText,
        isSelf: p.username === ramName
      }));

    if (this.membership.isPremium() && this.isUserEligible(ramCoins, ramCreatedAt) && !mapped.some(p => p.isSelf)) {
      mapped.push({
        name: ramName,
        avatar: ramAvatar,
        coins: ramCoins,
        pomodoros: this.membership.focusTomatoes(),
        tag: tycoonText,
        isSelf: true
      });
    }

    return mapped.sort((a, b) => 
      ((b.coins || 0) - (a.coins || 0)) ||
      ((b.pomodoros || 0) - (a.pomodoros || 0))
    ).slice(0, 10).map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));
  });

  // 6. Ranking por Podios Conquistados
  rankingPodiums = computed<RankingPlayer[]>(() => {
    this.translation.currentLang();
    const warriorText = this.translation.t('medals.warrior');
    const championText = this.translation.t('medals.weeklyChampion');
    const ramName = this.membership.userName() || warriorText;
    const ramAvatar = this.membership.selectedAvatar() || 'gato';
    const ramPodiums = this.membership.podiumWins();
    const ramCreatedAt = this.membership.userCreatedAt();

    const liveList = this.liveRankings().podiums;
    const mapped: RawRankingPlayer[] = (liveList || [])
      .filter((p: any) => this.isUserEligible(p.podium_wins || p.podiums || 0, p.created_at))
      .map((p: any) => ({
        name: p.username || warriorText,
        avatar: p.selected_avatar || 'gato',
        podiums: p.podium_wins || p.podiums || 0,
        pomodoros: p.focus_tomatoes || 0,
        tag: championText,
        isSelf: p.username === ramName
      }));

    if (this.membership.isPremium() && this.isUserEligible(ramPodiums, ramCreatedAt) && !mapped.some(p => p.isSelf)) {
      mapped.push({
        name: ramName,
        avatar: ramAvatar,
        podiums: ramPodiums,
        pomodoros: this.membership.focusTomatoes(),
        tag: championText,
        isSelf: true
      });
    }

    return mapped.sort((a, b) => 
      ((b.podiums || 0) - (a.podiums || 0)) ||
      ((b.pomodoros || 0) - (a.pomodoros || 0))
    ).slice(0, 10).map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));
  });

  // Información del récord activo seleccionado en el carrusel
  currentRecordInfo = computed<BrokenRecordCard>(() => {
    const list = this.brokenRecords();
    const idx = this.activeCardIndex();
    return list[idx] || list[0];
  });

  // Siguientes 4 lugares (Puestos 2º, 3º, 4º y 5º) de la categoría activa
  currentCategoryRunnersUp = computed<RankingPlayer[]>(() => {
    this.translation.currentLang();
    const idx = this.activeCardIndex();
    let sourceList: RankingPlayer[] = [];
    let unitLabel = '';

    switch (idx) {
      case 0: // Mejor Racha
        sourceList = this.rankingStreaks();
        unitLabel = this.translation.t('common.days');
        break;
      case 1: // Sesiones de Concentración
        sourceList = this.rankingPomodoros();
        unitLabel = this.translation.t('medals.sessionsUnit');
        break;
      case 2: // El Magnate de Focus
        sourceList = this.rankingCoins();
        unitLabel = 'Coins';
        break;
      case 3: // MVP del Jefe en Turno
        sourceList = this.rankingBoss();
        unitLabel = 'HP';
        break;
      default:
        sourceList = this.rankingStreaks();
        unitLabel = this.translation.t('common.days');
    }

    const availableText = this.translation.t('medals.available');
    const vacantText = this.translation.t('medals.vacantPosition');

    const runnersUp: RankingPlayer[] = [];
    for (let place = 2; place <= 5; place++) {
      const player = sourceList[place - 1];
      const valNum = player ? (
        idx === 0 ? (player.streakCount || 0) :
        idx === 1 ? (player.pomodoros || 0) :
        idx === 2 ? (player.coins || 0) :
        (player.damage || 0)
      ) : 0;

      if (player && valNum > 0) {
        runnersUp.push({
          ...player,
          rank: place,
          formattedValue: `${valNum.toLocaleString()} ${unitLabel}`,
          isAssigned: true
        });
      } else {
        runnersUp.push({
          rank: place,
          name: availableText,
          avatar: '',
          formattedValue: availableText,
          isAssigned: false,
          isSelf: false,
          tag: vacantText
        });
      }
    }

    return runnersUp;
  });

  getPodiumUser(place: 1 | 2 | 3): { name: string; avatar: string; value: string; isSelf: boolean } {
    this.translation.currentLang();
    const idx = place - 1;
    const tab = this.activeTab();
    const disputeText = this.translation.t('medals.inDispute');
    if (tab === 'objectives') {
      const p = this.rankingObjectives()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: (p.objectives || 0) + ' objs', isSelf: !!p.isSelf } : { name: disputeText, avatar: '', value: '', isSelf: false };
    } else if (tab === 'pomodoros') {
      const p = this.rankingPomodoros()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: (p.pomodoros || 0) + ' poms', isSelf: !!p.isSelf } : { name: disputeText, avatar: '', value: '', isSelf: false };
    } else if (tab === 'streaks') {
      const p = this.rankingStreaks()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: (p.streakCount || 0) + ' ' + this.translation.t('common.days'), isSelf: !!p.isSelf } : { name: disputeText, avatar: '', value: '', isSelf: false };
    } else {
      const p = this.rankingBoss()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: (p.damage || 0) + ' HP', isSelf: !!p.isSelf } : { name: disputeText, avatar: '', value: '', isSelf: false };
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

