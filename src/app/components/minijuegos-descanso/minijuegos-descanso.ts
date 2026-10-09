import { 
  Component, 
  signal, 
  computed, 
  OnInit, 
  OnDestroy, 
  HostListener, 
  ViewChild, 
  ElementRef, 
  inject, 
  Input, 
  Output, 
  EventEmitter, 
  AfterViewInit,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

export type MiniGameType = 'lobby' | 'gato' | 'dodge' | 'snake' | 'flappy' | 'memory' | 'breaker' | 'tetris' | 'samurai' | 'space';
export type GatoPlayer = 'X' | 'O';
export type GatoCell = GatoPlayer | null;

export interface GameCatalogItem {
  id: MiniGameType;
  title: string;
  subtitle: string;
  category: string;
  isUnlocked: boolean;
  isPremium: boolean;
  icon: string;
  badgeText: string;
  accentColor: string;
  description: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

interface Obstacle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  angle: number;
  spinSpeed: number;
  shape: 'shuriken' | 'orb';
}

export interface DodgeLevelInfo {
  level: number;
  name: string;
  badgeClass: string;
  spawnInterval: number;
  speedMultiplier: number;
}

export interface DodgePowerOrb {
  x: number;
  y: number;
  radius: number;
  pulseAngle: number;
  color: string;
  expiresAt: number;
}

export interface DodgeShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export interface SnakeLevelInfo {
  level: number;
  name: string;
  badgeClass: string;
  intervalMs: number;
  minScore: number;
}

export interface MemoryCard {
  id: number;
  pairId: number;
  icon: string;
  name: string;
  color: string;
  flipped: boolean;
  matched: boolean;
}

@Component({
  selector: 'app-minijuegos-descanso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minijuegos-descanso.html',
  styleUrl: './minijuegos-descanso.css'
})
export class MinijuegosDescanso implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  public isBrowser = isPlatformBrowser(this.platformId);

  @Input() theme: 'samurai' | 'cyberpunk' | 'aurora' | 'zen' = 'samurai';
  @Input() currentBreakTimeLeft: string = '';
  @Output() close = new EventEmitter<void>();

  // Inicia en el lobby con todas las cards animadas
  activeGame = signal<MiniGameType>('lobby');
  isMuted = signal<boolean>(false);
  activeFilter = signal<'all' | 'unlocked' | 'arcade' | 'puzzle'>('all');

  // Modal de vista previa / info (opcional)
  selectedPremiumGame = signal<GameCatalogItem | null>(null);
  showPremiumModal = signal<boolean>(false);

  // Catálogo completo de 9 minijuegos (¡TODOS DESBLOQUEADOS!)
  readonly catalogGames: GameCatalogItem[] = [
    {
      id: 'gato',
      title: 'Gato Clásico',
      subtitle: 'IA Nivel Experto',
      category: 'Lógica',
      isUnlocked: true,
      isPremium: false,
      icon: 'fa-table-cells-large',
      badgeText: 'JUGAR',
      accentColor: '#38bdf8',
      description: 'Reta a la IA experta (Minimax) en una partida rápida de 3 en raya con marcador dinámico.'
    },
    {
      id: 'dodge',
      title: 'Esquiva Veloz',
      subtitle: 'Reflejos Ninja',
      category: 'Reflejos',
      isUnlocked: true,
      isPremium: false,
      icon: 'fa-bolt',
      badgeText: 'JUGAR',
      accentColor: '#10b981',
      description: 'Sobrevive 60 segundos esquivando shurikens y orbes de energía con dificultad adaptativa.'
    },
    {
      id: 'snake',
      title: 'Cyber Culebrita',
      subtitle: 'Snake Neón Retro',
      category: 'Arcade',
      isUnlocked: true,
      isPremium: false,
      icon: 'fa-worm',
      badgeText: 'JUGAR',
      accentColor: '#22c55e',
      description: 'Guía la serpiente cibernética, devora orbes de energía y desafía tus propios récords sin chocar.'
    },
    {
      id: 'flappy',
      title: 'Flappy Foco',
      subtitle: 'Aleteo de Precisión',
      category: 'Habilidad',
      isUnlocked: true,
      isPremium: false,
      icon: 'fa-feather-pointed',
      badgeText: 'JUGAR',
      accentColor: '#f59e0b',
      description: 'Mantén el vuelo en el momento justo a través de columnas de neón y calibra tu ritmo de enfoque.'
    },
    {
      id: 'memory',
      title: 'Memoria Zen',
      subtitle: 'Parejas Holográficas',
      category: 'Memoria',
      isUnlocked: true,
      isPremium: false,
      icon: 'fa-brain',
      badgeText: 'JUGAR',
      accentColor: '#a855f7',
      description: 'Empareja sellos y runas místicas en 3D para activar la agilidad mental en pocos segundos.'
    },
    {
      id: 'breaker',
      title: 'Rompe-Bloques',
      subtitle: 'Laser Arkanoid',
      category: 'Arcade',
      isUnlocked: true,
      isPremium: false,
      icon: 'fa-layer-group',
      badgeText: 'JUGAR',
      accentColor: '#06b6d4',
      description: 'Destruye todas las barreras de distracción con disparos de precisión y rebote láser.'
    },
    {
      id: 'tetris',
      title: 'Tetris Relax',
      subtitle: 'Alineación Total',
      category: 'Estrategia',
      isUnlocked: true,
      isPremium: false,
      icon: 'fa-cubes',
      badgeText: 'JUGAR',
      accentColor: '#818cf8',
      description: 'Encaja bloques geométricos en un flujo continuo y satisfactorio para despejar la mente.'
    },
    {
      id: 'samurai',
      title: 'Reflejo Samurai',
      subtitle: 'Corte de Katana',
      category: 'Velocidad',
      isUnlocked: true,
      isPremium: false,
      icon: 'fa-hand-fist',
      badgeText: 'JUGAR',
      accentColor: '#ef4444',
      description: 'Corta objetivos en milisegundos cuando aparezca la señal de ataque con tajos láser.'
    },
    {
      id: 'space',
      title: 'Salto Espacial',
      subtitle: 'Cosmic Jumper',
      category: 'Plataformas',
      isUnlocked: true,
      isPremium: false,
      icon: 'fa-rocket',
      badgeText: 'JUGAR',
      accentColor: '#facc15',
      description: 'Impulsa tu cohete de plataforma en plataforma evitando anomalías hacia las estrellas.'
    }
  ];

  filteredGames = computed<GameCatalogItem[]>(() => {
    const filter = this.activeFilter();
    if (filter === 'arcade') {
      return this.catalogGames.filter(g => ['dodge', 'snake', 'flappy', 'breaker', 'samurai', 'space'].includes(g.id));
    }
    if (filter === 'puzzle') {
      return this.catalogGames.filter(g => ['gato', 'memory', 'tetris'].includes(g.id));
    }
    return this.catalogGames;
  });

  // ==========================================
  // ESTADO JUEGO 1: GATO CLÁSICO (MINIMAX EXPERTO)
  // ==========================================
  gatoBoard = signal<GatoCell[]>(Array(9).fill(null));
  gatoTurn = signal<GatoPlayer>('X'); // X siempre es el usuario
  gatoStatus = signal<'playing' | 'won_player' | 'won_bot' | 'draw'>('playing');
  winningCombo = signal<number[] | null>(null);
  isCpuThinking = signal<boolean>(false);

  gatoScore = signal<{ player: number; bot: number; ties: number }>({
    player: 0,
    bot: 0,
    ties: 0
  });

  private readonly winCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
    [0, 4, 8], [2, 4, 6]             // Diagonales
  ];

  // ==========================================
  // ESTADO JUEGO 2: ESQUIVA VELOZ (DODGE)
  // ==========================================
  @ViewChild('dodgeCanvas') dodgeCanvasRef?: ElementRef<HTMLCanvasElement>;
  dodgeStatus = signal<'idle' | 'playing' | 'gameover' | 'won'>('idle');
  survivalTime = signal<number>(0);
  readonly targetSurvival = 60; // 60 segundos
  bestSurvival = signal<number>(0);
  
  readonly dodgeLevels: DodgeLevelInfo[] = [
    { level: 1, name: 'Fácil', badgeClass: 'lvl-facil', spawnInterval: 750, speedMultiplier: 0.75 },
    { level: 2, name: 'Medio', badgeClass: 'lvl-medio', spawnInterval: 520, speedMultiplier: 1.05 },
    { level: 3, name: 'Difícil', badgeClass: 'lvl-dificil', spawnInterval: 380, speedMultiplier: 1.35 },
    { level: 4, name: 'Experto', badgeClass: 'lvl-experto', spawnInterval: 280, speedMultiplier: 1.65 },
    { level: 5, name: 'Maestro', badgeClass: 'lvl-maestro', spawnInterval: 200, speedMultiplier: 1.95 }
  ];

  currentLevelIndex = signal<number>(0);
  levelUpNotification = signal<string | null>(null);
  dodgePowerUses = signal<number>(0);

  currentLevelInfo = computed<DodgeLevelInfo>(() => {
    const idx = this.currentLevelIndex();
    return this.dodgeLevels[Math.min(idx, this.dodgeLevels.length - 1)];
  });

  private canvasWidth = 480;
  private canvasHeight = 300;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private gameStartTime = 0;
  private invulnerableUntil = 0;
  private lastPowerSpawn = 0;
  private dodgePowerOrb: DodgePowerOrb | null = null;
  private dodgeShockwaves: DodgeShockwave[] = [];
  
  private player = {
    x: 240,
    y: 150,
    radius: 12,
    targetX: 240,
    targetY: 150,
    speed: 0.28,
    trail: [] as { x: number; y: number; alpha: number }[]
  };

  private obstacles: Obstacle[] = [];
  private particles: Particle[] = [];
  private lastObstacleSpawn = 0;
  private keysPressed: Record<string, boolean> = {};

  // ==========================================
  // ESTADO JUEGO 3: CYBER CULEBRITA (SNAKE)
  // Inicia sencillo (180ms) y escala progresivamente
  // ==========================================
  @ViewChild('snakeCanvas') snakeCanvasRef?: ElementRef<HTMLCanvasElement>;
  snakeStatus = signal<'idle' | 'playing' | 'gameover'>('idle');
  snakeScore = signal<number>(0);
  snakeBest = signal<number>(0);

  readonly snakeLevels: SnakeLevelInfo[] = [
    { level: 1, name: 'Tranquilo', badgeClass: 'lvl-facil', intervalMs: 180, minScore: 0 },
    { level: 2, name: 'Fluido', badgeClass: 'lvl-medio', intervalMs: 145, minScore: 40 },
    { level: 3, name: 'Rápido', badgeClass: 'lvl-dificil', intervalMs: 115, minScore: 90 },
    { level: 4, name: 'Experto', badgeClass: 'lvl-experto', intervalMs: 90, minScore: 160 },
    { level: 5, name: 'Turbo Neón', badgeClass: 'lvl-maestro', intervalMs: 72, minScore: 240 }
  ];

  currentSnakeLevelIndex = signal<number>(0);
  snakeLevelNotification = signal<string | null>(null);

  currentSnakeLevelInfo = computed<SnakeLevelInfo>(() => {
    const idx = this.currentSnakeLevelIndex();
    return this.snakeLevels[Math.min(idx, this.snakeLevels.length - 1)];
  });

  private snakeCtx: CanvasRenderingContext2D | null = null;
  private snakeIntervalId: any = null;
  private readonly snakeGridCols = 16;
  private readonly snakeGridRows = 12;
  private readonly snakeTileSize = 20;
  private snakeBody: { x: number; y: number }[] = [];
  private snakeDir = { x: 1, y: 0 };
  private nextSnakeDir = { x: 1, y: 0 };
  private snakeFood = { x: 10, y: 6 };
  private snakeBonusFood: { x: number; y: number; expiresAt: number } | null = null;
  private snakeEatenCount = 0;
  private snakeParticles: { x: number; y: number; vx: number; vy: number; color: string; alpha: number }[] = [];

  // ==========================================
  // ESTADO JUEGO 4: FLAPPY FOCO (PIXEL BIRD)
  // ==========================================
  @ViewChild('flappyCanvas') flappyCanvasRef?: ElementRef<HTMLCanvasElement>;
  flappyStatus = signal<'idle' | 'playing' | 'gameover'>('idle');
  flappyScore = signal<number>(0);
  flappyBest = signal<number>(0);
  private flappyCtx: CanvasRenderingContext2D | null = null;
  private flappyFrameId: number | null = null;
  private bird = { x: 60, y: 110, vy: 0, radius: 11 };
  private pipes: { x: number; top: number; bottom: number; passed: boolean }[] = [];
  private flappyLastSpawn = 0;

  // ==========================================
  // ESTADO JUEGO 5: MEMORIA ZEN (3D CARDS)
  // ==========================================
  memoryCards = signal<MemoryCard[]>([]);
  memoryStatus = signal<'playing' | 'won'>('playing');
  memoryMoves = signal<number>(0);
  memoryMatches = signal<number>(0);
  memoryBestMoves = signal<number>(0);
  private flippedIndices: number[] = [];
  private isCheckingMatch = false;

  // ==========================================
  // ESTADO JUEGO 6: ROMPE-BLOQUES (BRICK BREAKER)
  // ==========================================
  @ViewChild('breakerCanvas') breakerCanvasRef?: ElementRef<HTMLCanvasElement>;
  breakerStatus = signal<'idle' | 'playing' | 'gameover' | 'won'>('idle');
  breakerScore = signal<number>(0);
  breakerBest = signal<number>(0);
  private breakerCtx: CanvasRenderingContext2D | null = null;
  private breakerFrameId: number | null = null;
  private breakerPaddle = { x: 150, w: 65, h: 8, speed: 6 };
  private breakerBall = { x: 180, y: 160, vx: 3, vy: -3, radius: 5 };
  private breakerBricks: { x: number; y: number; w: number; h: number; color: string; alive: boolean }[] = [];

  // ==========================================
  // ESTADO JUEGO 7: TETRIS RELAX (FALLING BLOCKS)
  // ==========================================
  @ViewChild('tetrisCanvas') tetrisCanvasRef?: ElementRef<HTMLCanvasElement>;
  tetrisStatus = signal<'idle' | 'playing' | 'gameover'>('idle');
  tetrisScore = signal<number>(0);
  tetrisLines = signal<number>(0);
  tetrisBest = signal<number>(0);
  private tetrisCtx: CanvasRenderingContext2D | null = null;
  private tetrisIntervalId: any = null;
  private readonly tetrisCols = 10;
  private readonly tetrisRows = 15;
  private readonly tetrisTile = 18;
  private tetrisGrid: (string | null)[][] = [];
  private currentPiece: { shape: number[][]; color: string; x: number; y: number } | null = null;

  // ==========================================
  // ESTADO JUEGO 8: REFLEJO SAMURAI (KATANA SLASH)
  // ==========================================
  samuraiStatus = signal<'idle' | 'waiting' | 'ready' | 'slashed' | 'early'>('idle');
  samuraiReaction = signal<number>(0);
  samuraiBest = signal<number>(0);
  samuraiRank = signal<string>('');
  private samuraiStartTime = 0;
  private samuraiTimerId: any = null;

  // ==========================================
  // ESTADO JUEGO 9: SALTO ESPACIAL (SPACE HOPPER)
  // ==========================================
  @ViewChild('spaceCanvas') spaceCanvasRef?: ElementRef<HTMLCanvasElement>;
  spaceStatus = signal<'idle' | 'playing' | 'gameover'>('idle');
  spaceScore = signal<number>(0);
  spaceBest = signal<number>(0);
  private spaceCtx: CanvasRenderingContext2D | null = null;
  private spaceFrameId: number | null = null;
  private rocket = { x: 150, y: 180, vx: 0, vy: 0, w: 16, h: 22 };
  private spacePlatforms: { x: number; y: number; w: number; h: number; moving: boolean; vx: number }[] = [];
  private spaceCameraY = 0;

  // Audio sintetizado
  private audioCtx: AudioContext | null = null;

  ngOnInit() {
    this.resetGato();
    this.initMemoryCards();
    this.loadStats();
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.initCurrentGameCanvas();
    }
  }

  ngOnDestroy() {
    this.stopAllGameLoops();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
  }

  // ==========================================
  // NAVEGACIÓN Y SELECCIÓN DE JUEGOS
  // ==========================================
  onCardClick(game: GameCatalogItem) {
    this.switchGame(game.id);
  }

  switchGame(game: MiniGameType | string) {
    const gameType = game as MiniGameType;
    if (this.activeGame() === gameType) return;
    this.stopAllGameLoops();
    this.playTone(420, 'sine', 0.05);
    this.activeGame.set(gameType);

    if (this.isBrowser) {
      setTimeout(() => {
        this.initCurrentGameCanvas();
      }, 70);
    }
  }

  goToLobby() {
    this.stopAllGameLoops();
    this.playTone(340, 'sine', 0.05);
    this.activeGame.set('lobby');
  }

  setFilter(filter: 'all' | 'unlocked' | 'arcade' | 'puzzle') {
    this.activeFilter.set(filter);
    this.playTone(400, 'sine', 0.04);
  }

  toggleSound() {
    this.isMuted.set(!this.isMuted());
    if (!this.isMuted()) {
      this.playTone(520, 'sine', 0.08);
    }
  }

  private stopAllGameLoops() {
    this.stopDodgeLoop();
    this.stopSnakeLoop();
    this.stopFlappyLoop();
    this.stopBreakerLoop();
    this.stopTetrisLoop();
    this.stopSpaceLoop();
    if (this.samuraiTimerId) clearTimeout(this.samuraiTimerId);
  }

  private initCurrentGameCanvas() {
    const game = this.activeGame();
    if (game === 'dodge') this.initCanvas();
    if (game === 'snake') this.initSnake();
    if (game === 'flappy') this.initFlappy();
    if (game === 'memory') this.initMemoryCards();
    if (game === 'breaker') this.initBreaker();
    if (game === 'tetris') this.initTetris();
    if (game === 'samurai') this.resetSamurai();
    if (game === 'space') this.initSpace();
  }

  // ==========================================
  // JUEGO 1: GATO CLÁSICO (MINIMAX EXPERTO)
  // ==========================================
  resetGato() {
    this.gatoBoard.set(Array(9).fill(null));
    this.gatoTurn.set('X');
    this.gatoStatus.set('playing');
    this.winningCombo.set(null);
    this.isCpuThinking.set(false);
  }

  resetGatoScore() {
    this.gatoScore.set({ player: 0, bot: 0, ties: 0 });
    this.resetGato();
    this.saveStats();
  }

  makeMove(index: number) {
    const board = [...this.gatoBoard()];
    if (board[index] !== null || this.gatoStatus() !== 'playing' || this.isCpuThinking()) {
      return;
    }

    const currentTurn = this.gatoTurn();
    board[index] = currentTurn;
    this.gatoBoard.set(board);

    if (currentTurn === 'X') {
      this.playTone(540, 'sine', 0.06, 0.09);
    } else {
      this.playTone(420, 'sine', 0.06, 0.09);
    }

    const winnerData = this.checkWinner(board);
    if (winnerData) {
      this.winningCombo.set(winnerData.combo);
      if (winnerData.winner === 'X') {
        this.gatoStatus.set('won_player');
        this.updateGatoScore('player');
        this.playSuccessMelody();
      } else {
        this.gatoStatus.set('won_bot');
        this.updateGatoScore('bot');
        this.playTone(220, 'sawtooth', 0.25, 0.1);
      }
      return;
    }

    if (board.every(cell => cell !== null)) {
      this.gatoStatus.set('draw');
      this.updateGatoScore('ties');
      this.playTone(320, 'triangle', 0.15, 0.08);
      return;
    }

    const nextTurn: GatoPlayer = currentTurn === 'X' ? 'O' : 'X';
    this.gatoTurn.set(nextTurn);

    if (nextTurn === 'O') {
      this.makeCpuMove();
    }
  }

  private makeCpuMove() {
    this.isCpuThinking.set(true);
    setTimeout(() => {
      if (this.gatoStatus() !== 'playing') {
        this.isCpuThinking.set(false);
        return;
      }

      const board = [...this.gatoBoard()];
      const bestMove = this.getBestCpuMove(board);

      this.isCpuThinking.set(false);
      if (bestMove !== -1) {
        this.makeMove(bestMove);
      }
    }, 260);
  }

  private getBestCpuMove(board: GatoCell[]): number {
    const available = board
      .map((val, idx) => (val === null ? idx : null))
      .filter((val): val is number => val !== null);

    if (available.length === 0) return -1;

    let bestScore = -Infinity;
    let bestMoves: number[] = [];

    for (const pos of available) {
      board[pos] = 'O';
      const score = this.minimax(board, 0, false);
      board[pos] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [pos];
      } else if (score === bestScore) {
        bestMoves.push(pos);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  private minimax(board: GatoCell[], depth: number, isMaximizing: boolean): number {
    const winnerData = this.checkWinner(board);
    if (winnerData) {
      if (winnerData.winner === 'O') return 10 - depth;
      if (winnerData.winner === 'X') return depth - 10;
    }

    const available = board
      .map((val, idx) => (val === null ? idx : null))
      .filter((val): val is number => val !== null);

    if (available.length === 0) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const pos of available) {
        board[pos] = 'O';
        const evaluation = this.minimax(board, depth + 1, false);
        board[pos] = null;
        maxEval = Math.max(maxEval, evaluation);
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const pos of available) {
        board[pos] = 'X';
        const evaluation = this.minimax(board, depth + 1, true);
        board[pos] = null;
        minEval = Math.min(minEval, evaluation);
      }
      return minEval;
    }
  }

  private checkWinner(board: GatoCell[]): { winner: GatoPlayer; combo: number[] } | null {
    for (const combo of this.winCombinations) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a] as GatoPlayer, combo };
      }
    }
    return null;
  }

  private updateGatoScore(result: 'player' | 'bot' | 'ties') {
    const current = this.gatoScore();
    const updated = {
      player: current.player + (result === 'player' ? 1 : 0),
      bot: current.bot + (result === 'bot' ? 1 : 0),
      ties: current.ties + (result === 'ties' ? 1 : 0)
    };
    this.gatoScore.set(updated);
    this.saveStats();
  }

  // ==========================================
  // JUEGO 2: ESQUIVA VELOZ (DODGE)
  // ==========================================
  initCanvas() {
    if (!this.dodgeCanvasRef) return;
    const canvas = this.dodgeCanvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    this.resetDodgeState();
    this.drawDodge();
  }

  private resizeCanvas() {
    if (!this.dodgeCanvasRef) return;
    const canvas = this.dodgeCanvasRef.nativeElement;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      const w = Math.min(460, Math.max(260, Math.round(rect.width)));
      const h = Math.min(230, Math.max(170, Math.round(w * 0.54)));
      canvas.width = w;
      canvas.height = h;
      this.canvasWidth = w;
      this.canvasHeight = h;
    }
  }

  resetDodgeState() {
    this.player.x = this.canvasWidth / 2;
    this.player.y = this.canvasHeight / 2;
    this.player.targetX = this.player.x;
    this.player.targetY = this.player.y;
    this.player.trail = [];
    this.obstacles = [];
    this.particles = [];
    this.survivalTime.set(0);
    this.currentLevelIndex.set(0);
    this.levelUpNotification.set(null);
    this.dodgePowerUses.set(0);
    this.dodgePowerOrb = null;
    this.dodgeShockwaves = [];
  }

  startDodgeGame() {
    if (this.dodgeStatus() === 'playing') return;
    this.resetDodgeState();
    this.dodgeStatus.set('playing');
    
    const now = performance.now();
    this.gameStartTime = now;
    this.lastObstacleSpawn = now;
    this.lastPowerSpawn = now;
    this.invulnerableUntil = now + 1200;
    this.playTone(480, 'sine', 0.1, 0.1);

    this.startDodgeLoop();
  }

  private evaluateLevelProgression(seconds: number) {
    let targetIdx = 0;
    if (seconds >= 48) targetIdx = 4;
    else if (seconds >= 36) targetIdx = 3;
    else if (seconds >= 24) targetIdx = 2;
    else if (seconds >= 12) targetIdx = 1;

    if (targetIdx > this.currentLevelIndex()) {
      this.currentLevelIndex.set(targetIdx);
      const newLvl = this.dodgeLevels[targetIdx];
      this.triggerLevelUpToast(`¡Subiste a Nivel ${newLvl.name}! ⚡`);
      this.playLevelUpMelody();
    }
  }

  private triggerLevelUpToast(msg: string) {
    this.levelUpNotification.set(msg);
    setTimeout(() => {
      if (this.levelUpNotification() === msg) {
        this.levelUpNotification.set(null);
      }
    }, 2800);
  }

  private startDodgeLoop() {
    const loop = (timestamp: number) => {
      if (this.dodgeStatus() !== 'playing') return;

      const elapsedSec = Math.floor((timestamp - this.gameStartTime) / 1000);
      this.survivalTime.set(elapsedSec);
      this.evaluateLevelProgression(elapsedSec);

      if (elapsedSec >= this.targetSurvival) {
        this.dodgeStatus.set('won');
        if (elapsedSec > this.bestSurvival()) {
          this.bestSurvival.set(elapsedSec);
          this.saveStats();
        }
        this.playSuccessMelody();
        this.createVictorySparks();
        return;
      }

      this.updateDodge(timestamp);
      this.drawDodge();

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopDodgeLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private updateDodge(now: number) {
    const p = this.player;
    p.x += (p.targetX - p.x) * p.speed;
    p.y += (p.targetY - p.y) * p.speed;
    p.x = Math.max(p.radius, Math.min(this.canvasWidth - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(this.canvasHeight - p.radius, p.y));

    if (Math.random() < 0.35) {
      p.trail.push({ x: p.x, y: p.y, alpha: 0.6 });
    }
    p.trail.forEach(t => t.alpha -= 0.04);
    p.trail = p.trail.filter(t => t.alpha > 0);

    // Generar orbe de poder periódicamente (cada 9-11 segundos si no hay uno activo)
    if (!this.dodgePowerOrb && (now - this.lastPowerSpawn > 9500)) {
      this.spawnDodgePowerOrb(now);
      this.lastPowerSpawn = now;
    }

    // Actualizar orbe de poder y detectar colisión con el avatar del jugador
    if (this.dodgePowerOrb) {
      this.dodgePowerOrb.pulseAngle += 0.08;
      if (now > this.dodgePowerOrb.expiresAt) {
        this.dodgePowerOrb = null;
      } else {
        const distToPower = Math.hypot(p.x - this.dodgePowerOrb.x, p.y - this.dodgePowerOrb.y);
        if (distToPower < p.radius + this.dodgePowerOrb.radius) {
          this.activateDodgePower(this.dodgePowerOrb.x, this.dodgePowerOrb.y);
          this.dodgePowerOrb = null;
        }
      }
    }

    const level = this.currentLevelInfo();
    const powerUses = this.dodgePowerUses();
    const spawnInterval = Math.max(130, level.spawnInterval / (1 + powerUses * 0.12));

    if (now - this.lastObstacleSpawn > spawnInterval) {
      this.spawnObstacle(level.speedMultiplier);
      this.lastObstacleSpawn = now;
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x += obs.vx;
      obs.y += obs.vy;
      obs.angle += obs.spinSpeed;

      const dist = Math.hypot(p.x - obs.x, p.y - obs.y);
      if (dist < p.radius + obs.radius * 0.75) {
        if (now > this.invulnerableUntil) {
          this.dodgeStatus.set('gameover');
          this.createExplosion(p.x, p.y);
          this.playTone(160, 'sawtooth', 0.35, 0.12);
          if (this.survivalTime() > this.bestSurvival()) {
            this.bestSurvival.set(this.survivalTime());
            this.saveStats();
          }
          return;
        }
      }

      if (obs.x < -40 || obs.x > this.canvasWidth + 40 || obs.y < -40 || obs.y > this.canvasHeight + 40) {
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;
      if (pt.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  private spawnDodgePowerOrb(now: number) {
    const margin = 35;
    const rx = margin + Math.random() * (this.canvasWidth - margin * 2);
    const ry = margin + Math.random() * (this.canvasHeight - margin * 2);
    this.dodgePowerOrb = {
      x: rx,
      y: ry,
      radius: 13,
      pulseAngle: 0,
      color: '#06b6d4',
      expiresAt: now + 7000
    };
    this.playTone(840, 'sine', 0.12, 0.08);
  }

  private activateDodgePower(x: number, y: number) {
    const destroyedCount = this.obstacles.length;
    const currentUses = this.dodgePowerUses() + 1;
    this.dodgePowerUses.set(currentUses);

    // Destruir todos los shurikens en pantalla y generar partículas de explosión
    for (const obs of this.obstacles) {
      this.createExplosion(obs.x, obs.y);
    }
    this.obstacles = [];

    // Brindar 1s de invulnerabilidad para reposicionarse
    this.invulnerableUntil = performance.now() + 1000;

    // Onda de choque EMP expansiva
    this.dodgeShockwaves.push({
      x,
      y,
      radius: 12,
      maxRadius: Math.max(this.canvasWidth, this.canvasHeight) * 1.3,
      color: '#06b6d4',
      alpha: 1.0
    });

    // Melodía y sonido de pulso EMP
    this.playTone(180, 'sawtooth', 0.18, 0.15);
    setTimeout(() => {
      this.playTone(740, 'sine', 0.25, 0.12);
    }, 60);

    // Notificación flotante
    const agilityBonus = currentUses * 25;
    this.triggerLevelUpToast(`¡Onda de Vacío! 💥 ${destroyedCount} Shurikens eliminados. (Agilidad enemiga: +${agilityBonus}%)`);
  }

  private spawnObstacle(speedMultiplier: number) {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * this.canvasWidth; y = -20; }
    else if (side === 1) { x = this.canvasWidth + 20; y = Math.random() * this.canvasHeight; }
    else if (side === 2) { x = Math.random() * this.canvasWidth; y = this.canvasHeight + 20; }
    else { x = -20; y = Math.random() * this.canvasHeight; }

    const targetX = this.player.x + (Math.random() - 0.5) * 80;
    const targetY = this.player.y + (Math.random() - 0.5) * 80;
    const angle = Math.atan2(targetY - y, targetX - x);

    // Agilidad incrementada progresivamente por cada poder utilizado (+25% velocidad y giro por uso)
    const agilityMultiplier = 1 + (this.dodgePowerUses() * 0.25);
    const speed = (1.8 + Math.random() * 1.8) * speedMultiplier * agilityMultiplier;
    const spinSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.12) * agilityMultiplier;

    const colors = this.getHazardColors();
    this.obstacles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 9 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: 0,
      spinSpeed,
      shape: Math.random() > 0.35 ? 'shuriken' : 'orb'
    });
  }

  private drawDodge() {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Rejilla de fondo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridStep = 24;
    for (let x = 0; x < this.canvasWidth; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvasHeight); ctx.stroke();
    }
    for (let y = 0; y < this.canvasHeight; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvasWidth, y); ctx.stroke();
    }

    // Ondas de choque activas
    for (let i = this.dodgeShockwaves.length - 1; i >= 0; i--) {
      const sw = this.dodgeShockwaves[i];
      sw.radius += 14;
      sw.alpha -= 0.035;
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.dodgeShockwaves.splice(i, 1);
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3.5;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Orbe de poder en el mapa
    if (this.dodgePowerOrb) {
      const orb = this.dodgePowerOrb;
      const pulse = Math.sin(orb.pulseAngle) * 3;
      const r = Math.max(6, orb.radius + pulse);

      ctx.save();
      // Anillo exterior pulsante
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Orbe interior brillante
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
      ctx.fill();

      // Núcleo blanco
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Ícono de energía
      ctx.fillStyle = '#08080f';
      ctx.font = '900 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', orb.x, orb.y);

      ctx.restore();
    }

    // Estela del jugador
    const p = this.player;
    for (const t of p.trail) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, p.radius * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = this.getPlayerColor(t.alpha * 0.35);
      ctx.fill();
    }

    // Avatar del jugador
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.getPlayerColor(1.0);
    ctx.shadowColor = this.getPlayerColor(0.8);
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Escudo de invulnerabilidad temporal
    if (performance.now() < this.invulnerableUntil) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // Obstáculos / Shurikens
    for (const obs of this.obstacles) {
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.angle);

      if (obs.shape === 'shuriken') {
        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.lineTo(0, -obs.radius);
          ctx.lineTo(obs.radius * 0.32, -obs.radius * 0.32);
        }
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0f';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      ctx.restore();
    }

    // Partículas
    for (const pt of this.particles) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  onCanvasMouseMove(e: MouseEvent) {
    if (this.dodgeStatus() !== 'playing') return;
    const rect = this.dodgeCanvasRef?.nativeElement.getBoundingClientRect();
    if (rect) {
      this.player.targetX = e.clientX - rect.left;
      this.player.targetY = e.clientY - rect.top;
    }
  }

  onCanvasTouchMove(e: TouchEvent) {
    if (this.dodgeStatus() !== 'playing') return;
    e.preventDefault();
    const rect = this.dodgeCanvasRef?.nativeElement.getBoundingClientRect();
    if (rect && e.touches.length > 0) {
      this.player.targetX = e.touches[0].clientX - rect.left;
      this.player.targetY = e.touches[0].clientY - rect.top;
    }
  }

  // ==========================================
  // JUEGO 3: CYBER CULEBRITA (SNAKE)
  // ==========================================
  initSnake() {
    if (!this.snakeCanvasRef) return;
    const canvas = this.snakeCanvasRef.nativeElement;
    this.snakeCtx = canvas.getContext('2d');
    canvas.width = this.snakeGridCols * this.snakeTileSize;
    canvas.height = this.snakeGridRows * this.snakeTileSize;
    this.resetSnakeState();
    this.drawSnake();
  }

  resetSnakeState() {
    this.snakeBody = [
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 3, y: 6 }
    ];
    this.snakeDir = { x: 1, y: 0 };
    this.nextSnakeDir = { x: 1, y: 0 };
    this.snakeScore.set(0);
    this.currentSnakeLevelIndex.set(0);
    this.snakeLevelNotification.set(null);
    this.snakeBonusFood = null;
    this.snakeEatenCount = 0;
    this.snakeParticles = [];
    this.spawnSnakeFood();
  }

  startSnakeGame() {
    if (this.snakeStatus() === 'playing') return;
    this.resetSnakeState();
    this.snakeStatus.set('playing');
    this.playTone(440, 'sine', 0.08);

    const initialLevel = this.snakeLevels[0];
    this.startSnakeInterval(initialLevel.intervalMs);
  }

  private startSnakeInterval(intervalMs: number) {
    if (this.snakeIntervalId) clearInterval(this.snakeIntervalId);
    this.snakeIntervalId = setInterval(() => {
      this.snakeStep();
    }, intervalMs);
  }

  stopSnakeLoop() {
    if (this.snakeIntervalId) {
      clearInterval(this.snakeIntervalId);
      this.snakeIntervalId = null;
    }
  }

  private evaluateSnakeProgression(score: number) {
    let targetIdx = 0;
    for (let i = this.snakeLevels.length - 1; i >= 0; i--) {
      if (score >= this.snakeLevels[i].minScore) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx > this.currentSnakeLevelIndex()) {
      this.currentSnakeLevelIndex.set(targetIdx);
      const newLvl = this.snakeLevels[targetIdx];
      this.triggerSnakeLevelToast(`¡Nivel ${newLvl.name}! 🚀 (${newLvl.intervalMs}ms)`);
      this.playLevelUpMelody();
      this.startSnakeInterval(newLvl.intervalMs);
    }
  }

  private triggerSnakeLevelToast(msg: string) {
    this.snakeLevelNotification.set(msg);
    setTimeout(() => {
      if (this.snakeLevelNotification() === msg) {
        this.snakeLevelNotification.set(null);
      }
    }, 2200);
  }

  private spawnSnakeFood() {
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
      attempts++;
      const rx = Math.floor(Math.random() * this.snakeGridCols);
      const ry = Math.floor(Math.random() * this.snakeGridRows);
      if (!this.snakeBody.some(s => s.x === rx && s.y === ry)) {
        this.snakeFood = { x: rx, y: ry };
        valid = true;
      }
    }
  }

  private spawnSnakeBonusFood() {
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
      attempts++;
      const rx = Math.floor(Math.random() * this.snakeGridCols);
      const ry = Math.floor(Math.random() * this.snakeGridRows);
      if (
        (this.snakeFood.x !== rx || this.snakeFood.y !== ry) &&
        !this.snakeBody.some(s => s.x === rx && s.y === ry)
      ) {
        this.snakeBonusFood = { x: rx, y: ry, expiresAt: Date.now() + 6500 };
        valid = true;
      }
    }
  }

  private createSnakeEatParticles(gridX: number, gridY: number, color: string) {
    const px = gridX * this.snakeTileSize + this.snakeTileSize / 2;
    const py = gridY * this.snakeTileSize + this.snakeTileSize / 2;
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.8;
      this.snakeParticles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1.0
      });
    }
  }

  setSnakeDirection(dx: number, dy: number) {
    if (this.snakeDir.x + dx === 0 && this.snakeDir.y + dy === 0) return;
    this.nextSnakeDir = { x: dx, y: dy };
  }

  private snakeStep() {
    if (this.snakeStatus() !== 'playing') return;
    this.snakeDir = { ...this.nextSnakeDir };

    const head = { x: this.snakeBody[0].x + this.snakeDir.x, y: this.snakeBody[0].y + this.snakeDir.y };

    // Colisión con paredes
    if (head.x < 0 || head.x >= this.snakeGridCols || head.y < 0 || head.y >= this.snakeGridRows) {
      this.snakeGameOver();
      return;
    }

    // Colisión consigo misma
    if (this.snakeBody.some(seg => seg.x === head.x && seg.y === head.y)) {
      this.snakeGameOver();
      return;
    }

    this.snakeBody.unshift(head);

    let ateFood = false;

    // Come comida normal
    if (head.x === this.snakeFood.x && head.y === this.snakeFood.y) {
      ateFood = true;
      this.snakeEatenCount++;
      const newScore = this.snakeScore() + 10;
      this.snakeScore.set(newScore);
      this.createSnakeEatParticles(head.x, head.y, '#facc15');
      this.playTone(550 + (this.currentSnakeLevelIndex() * 50), 'sine', 0.08, 0.12);
      this.spawnSnakeFood();

      // Cada 4 orbes, spawn de orbe de bonificación si no hay uno activo
      if (this.snakeEatenCount % 4 === 0 && !this.snakeBonusFood) {
        this.spawnSnakeBonusFood();
      }

      this.evaluateSnakeProgression(newScore);

      if (newScore > this.snakeBest()) {
        this.snakeBest.set(newScore);
        this.saveStats();
      }
    }

    // Come comida bonus
    if (this.snakeBonusFood && head.x === this.snakeBonusFood.x && head.y === this.snakeBonusFood.y) {
      ateFood = true;
      const bonusScore = this.snakeScore() + 30;
      this.snakeScore.set(bonusScore);
      this.createSnakeEatParticles(head.x, head.y, '#ec4899');
      this.playTone(880, 'triangle', 0.14, 0.14);
      this.snakeBonusFood = null;
      this.evaluateSnakeProgression(bonusScore);

      if (bonusScore > this.snakeBest()) {
        this.snakeBest.set(bonusScore);
        this.saveStats();
      }
    }

    if (!ateFood) {
      this.snakeBody.pop();
    }

    this.drawSnake();
  }

  private snakeGameOver() {
    this.snakeStatus.set('gameover');
    this.stopSnakeLoop();
    this.playTone(180, 'sawtooth', 0.3, 0.12);
  }

  private getSnakeColorPair(): { head: string; body: string; shadow: string } {
    const lvl = this.currentSnakeLevelIndex();
    switch (lvl) {
      case 0: // Tranquilo
        return { head: '#4ade80', body: '#22c55e', shadow: '#22c55e' };
      case 1: // Fluido
        return { head: '#34d399', body: '#059669', shadow: '#10b981' };
      case 2: // Rápido
        return { head: '#fbbf24', body: '#d97706', shadow: '#f59e0b' };
      case 3: // Experto
        return { head: '#c084fc', body: '#7c3aed', shadow: '#a855f7' };
      case 4: // Turbo Neón
      default:
        return { head: '#38bdf8', body: '#0284c7', shadow: '#06b6d4' };
    }
  }

  private drawSnake() {
    const ctx = this.snakeCtx;
    if (!ctx) return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const tileSize = this.snakeTileSize;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Rejilla tenue de fondo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += tileSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += tileSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Partículas de comida
    for (let i = this.snakeParticles.length - 1; i >= 0; i--) {
      const pt = this.snakeParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= 0.07;
      if (pt.alpha <= 0) {
        this.snakeParticles.splice(i, 1);
      } else {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Comida regular (Orbe amarillo de energía)
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
      this.snakeFood.x * tileSize + tileSize / 2,
      this.snakeFood.y * tileSize + tileSize / 2,
      tileSize * 0.38,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // Comida bonus (Orbe magenta pulsante)
    if (this.snakeBonusFood) {
      if (Date.now() > this.snakeBonusFood.expiresAt) {
        this.snakeBonusFood = null;
      } else {
        ctx.save();
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(
          this.snakeBonusFood.x * tileSize + tileSize / 2,
          this.snakeBonusFood.y * tileSize + tileSize / 2,
          tileSize * 0.44,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }
    }

    // Serpiente con colores progresivos
    const colors = this.getSnakeColorPair();
    this.snakeBody.forEach((seg, idx) => {
      ctx.save();
      const isHead = idx === 0;
      ctx.fillStyle = isHead ? colors.head : colors.body;
      ctx.shadowColor = colors.shadow;
      ctx.shadowBlur = isHead ? 10 : 4;

      const px = seg.x * tileSize + 1.5;
      const py = seg.y * tileSize + 1.5;
      const size = tileSize - 3;
      const radius = isHead ? 6 : 4;

      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(px, py, size, size, radius);
      } else {
        ctx.rect(px, py, size, size);
      }
      ctx.fill();

      // Ojos en la cabeza orientados según la dirección
      if (isHead) {
        ctx.fillStyle = '#0f172a';
        ctx.shadowBlur = 0;
        const eyeOffsetX = this.snakeDir.x !== 0 ? 0 : 3.5;
        const eyeOffsetY = this.snakeDir.y !== 0 ? 0 : 3.5;
        const centerX = px + size / 2 + (this.snakeDir.x * 2.5);
        const centerY = py + size / 2 + (this.snakeDir.y * 2.5);

        ctx.beginPath();
        ctx.arc(centerX - eyeOffsetX, centerY - eyeOffsetY, 1.8, 0, Math.PI * 2);
        ctx.arc(centerX + eyeOffsetX, centerY + eyeOffsetY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // ==========================================
  // JUEGO 4: FLAPPY FOCO (PIXEL BIRD)
  // ==========================================
  initFlappy() {
    if (!this.flappyCanvasRef) return;
    const canvas = this.flappyCanvasRef.nativeElement;
    this.flappyCtx = canvas.getContext('2d');
    canvas.width = 380;
    canvas.height = 240;
    this.resetFlappyState();
    this.drawFlappy();
  }

  resetFlappyState() {
    this.bird = { x: 70, y: 110, vy: 0, radius: 11 };
    this.pipes = [];
    this.flappyScore.set(0);
    this.flappyLastSpawn = performance.now();
  }

  startFlappyGame() {
    if (this.flappyStatus() === 'playing') return;
    this.resetFlappyState();
    this.flappyStatus.set('playing');
    this.flapBird();

    const loop = (now: number) => {
      if (this.flappyStatus() !== 'playing') return;

      this.updateFlappy(now);
      this.drawFlappy();

      this.flappyFrameId = requestAnimationFrame(loop);
    };
    this.flappyFrameId = requestAnimationFrame(loop);
  }

  stopFlappyLoop() {
    if (this.flappyFrameId) {
      cancelAnimationFrame(this.flappyFrameId);
      this.flappyFrameId = null;
    }
  }

  flapBird() {
    if (this.flappyStatus() !== 'playing') {
      this.startFlappyGame();
      return;
    }
    this.bird.vy = -5.8;
    this.playTone(520, 'sine', 0.05, 0.08);
  }

  private updateFlappy(now: number) {
    const b = this.bird;
    b.vy += 0.32;
    b.y += b.vy;

    if (b.y + b.radius >= 240 || b.y - b.radius <= 0) {
      this.flappyGameOver();
      return;
    }

    if (now - this.flappyLastSpawn > 1400) {
      const gap = 78;
      const top = 30 + Math.random() * 90;
      this.pipes.push({ x: 380, top, bottom: top + gap, passed: false });
      this.flappyLastSpawn = now;
    }

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= 2.2;

      // Colisión
      if (b.x + b.radius > p.x && b.x - b.radius < p.x + 36) {
        if (b.y - b.radius < p.top || b.y + b.radius > p.bottom) {
          this.flappyGameOver();
          return;
        }
      }

      // Puntos
      if (!p.passed && p.x + 36 < b.x) {
        p.passed = true;
        const newScore = this.flappyScore() + 1;
        this.flappyScore.set(newScore);
        this.playTone(700, 'sine', 0.06, 0.09);
        if (newScore > this.flappyBest()) {
          this.flappyBest.set(newScore);
          this.saveStats();
        }
      }

      if (p.x < -50) this.pipes.splice(i, 1);
    }
  }

  private flappyGameOver() {
    this.flappyStatus.set('gameover');
    this.stopFlappyLoop();
    this.playTone(180, 'sawtooth', 0.3, 0.12);
  }

  private drawFlappy() {
    const ctx = this.flappyCtx;
    if (!ctx) return;

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, 380, 240);

    // Tuberías de neón
    for (const p of this.pipes) {
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, 0, 36, p.top);
      ctx.fillRect(p.x, p.bottom, 36, 240 - p.bottom);
      ctx.shadowBlur = 0;
    }

    // Pájaro / Foco
    const b = this.bird;
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ==========================================
  // JUEGO 5: MEMORIA ZEN (3D CARDS)
  // ==========================================
  initMemoryCards() {
    const icons = [
      { name: 'Yin-Yang', icon: 'fa-yin-yang', color: '#a855f7' },
      { name: 'Dragón', icon: 'fa-dragon', color: '#ef4444' },
      { name: 'Rayo', icon: 'fa-bolt', color: '#38bdf8' },
      { name: 'Fuego', icon: 'fa-fire', color: '#f59e0b' },
      { name: 'Gema', icon: 'fa-gem', color: '#10b981' },
      { name: 'Estrella', icon: 'fa-star', color: '#facc15' }
    ];

    let deck: MemoryCard[] = [];
    icons.forEach((item, pId) => {
      deck.push({ id: pId * 2, pairId: pId, icon: item.icon, name: item.name, color: item.color, flipped: false, matched: false });
      deck.push({ id: pId * 2 + 1, pairId: pId, icon: item.icon, name: item.name, color: item.color, flipped: false, matched: false });
    });

    // Mezclar
    deck = deck.sort(() => Math.random() - 0.5);
    this.memoryCards.set(deck);
    this.memoryMoves.set(0);
    this.memoryMatches.set(0);
    this.memoryStatus.set('playing');
    this.flippedIndices = [];
    this.isCheckingMatch = false;
  }

  flipMemoryCard(idx: number) {
    if (this.isCheckingMatch) return;
    const cards = [...this.memoryCards()];
    if (cards[idx].flipped || cards[idx].matched) return;

    cards[idx].flipped = true;
    this.playTone(480, 'sine', 0.05, 0.08);
    this.memoryCards.set(cards);
    this.flippedIndices.push(idx);

    if (this.flippedIndices.length === 2) {
      this.memoryMoves.set(this.memoryMoves() + 1);
      this.isCheckingMatch = true;

      const [first, second] = this.flippedIndices;
      if (cards[first].pairId === cards[second].pairId) {
        // Coincidencia
        setTimeout(() => {
          cards[first].matched = true;
          cards[second].matched = true;
          this.memoryMatches.set(this.memoryMatches() + 1);
          this.playTone(720, 'sine', 0.1, 0.12);
          this.flippedIndices = [];
          this.isCheckingMatch = false;
          this.memoryCards.set(cards);

          if (cards.every(c => c.matched)) {
            this.memoryStatus.set('won');
            this.playSuccessMelody();
            if (this.memoryBestMoves() === 0 || this.memoryMoves() < this.memoryBestMoves()) {
              this.memoryBestMoves.set(this.memoryMoves());
              this.saveStats();
            }
          }
        }, 320);
      } else {
        // No coinciden
        setTimeout(() => {
          cards[first].flipped = false;
          cards[second].flipped = false;
          this.flippedIndices = [];
          this.isCheckingMatch = false;
          this.memoryCards.set(cards);
        }, 850);
      }
    }
  }

  // ==========================================
  // JUEGO 6: ROMPE-BLOQUES (BRICK BREAKER)
  // ==========================================
  initBreaker() {
    if (!this.breakerCanvasRef) return;
    const canvas = this.breakerCanvasRef.nativeElement;
    this.breakerCtx = canvas.getContext('2d');
    canvas.width = 380;
    canvas.height = 240;
    this.resetBreakerState();
    this.drawBreaker();
  }

  resetBreakerState() {
    this.breakerPaddle = { x: 155, w: 70, h: 8, speed: 6 };
    this.breakerBall = { x: 190, y: 170, vx: 2.8, vy: -2.8, radius: 5 };
    this.breakerScore.set(0);

    this.breakerBricks = [];
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#38bdf8'];
    const rows = 3;
    const cols = 6;
    const bw = 54;
    const bh = 14;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.breakerBricks.push({
          x: 24 + c * (bw + 5),
          y: 24 + r * (bh + 6),
          w: bw,
          h: bh,
          color: colors[r % colors.length],
          alive: true
        });
      }
    }
  }

  startBreakerGame() {
    if (this.breakerStatus() === 'playing') return;
    this.resetBreakerState();
    this.breakerStatus.set('playing');
    this.playTone(460, 'sine', 0.08);

    const loop = () => {
      if (this.breakerStatus() !== 'playing') return;

      this.updateBreaker();
      this.drawBreaker();

      this.breakerFrameId = requestAnimationFrame(loop);
    };
    this.breakerFrameId = requestAnimationFrame(loop);
  }

  stopBreakerLoop() {
    if (this.breakerFrameId) {
      cancelAnimationFrame(this.breakerFrameId);
      this.breakerFrameId = null;
    }
  }

  onBreakerMouseMove(e: MouseEvent) {
    if (this.breakerStatus() !== 'playing') return;
    const rect = this.breakerCanvasRef?.nativeElement.getBoundingClientRect();
    if (rect) {
      this.breakerPaddle.x = Math.max(0, Math.min(380 - this.breakerPaddle.w, e.clientX - rect.left - this.breakerPaddle.w / 2));
    }
  }

  onBreakerTouchMove(e: TouchEvent) {
    if (this.breakerStatus() !== 'playing') return;
    e.preventDefault();
    const rect = this.breakerCanvasRef?.nativeElement.getBoundingClientRect();
    if (rect && e.touches.length > 0) {
      this.breakerPaddle.x = Math.max(0, Math.min(380 - this.breakerPaddle.w, e.touches[0].clientX - rect.left - this.breakerPaddle.w / 2));
    }
  }

  private updateBreaker() {
    const ball = this.breakerBall;
    const pad = this.breakerPaddle;

    ball.x += ball.vx;
    ball.y += ball.vy;

    // Paredes
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= 380) {
      ball.vx = -ball.vx;
      this.playTone(360, 'sine', 0.03, 0.05);
    }
    if (ball.y - ball.radius <= 0) {
      ball.vy = -ball.vy;
      this.playTone(360, 'sine', 0.03, 0.05);
    }

    // Raqueta
    if (ball.y + ball.radius >= 240 - 18 && ball.y + ball.radius <= 240 - 8) {
      if (ball.x >= pad.x && ball.x <= pad.x + pad.w) {
        const hitPos = (ball.x - (pad.x + pad.w / 2)) / (pad.w / 2);
        ball.vx = hitPos * 4.2;
        ball.vy = -Math.abs(ball.vy);
        this.playTone(520, 'sine', 0.04, 0.08);
      }
    }

    // Bloques
    for (const b of this.breakerBricks) {
      if (b.alive) {
        if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
          b.alive = false;
          ball.vy = -ball.vy;
          const newScore = this.breakerScore() + 15;
          this.breakerScore.set(newScore);
          this.playTone(680, 'sine', 0.05, 0.09);
          if (newScore > this.breakerBest()) {
            this.breakerBest.set(newScore);
            this.saveStats();
          }
          break;
        }
      }
    }

    if (this.breakerBricks.every(b => !b.alive)) {
      this.breakerStatus.set('won');
      this.stopBreakerLoop();
      this.playSuccessMelody();
      return;
    }

    if (ball.y > 245) {
      this.breakerStatus.set('gameover');
      this.stopBreakerLoop();
      this.playTone(180, 'sawtooth', 0.3, 0.12);
    }
  }

  private drawBreaker() {
    const ctx = this.breakerCtx;
    if (!ctx) return;

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, 380, 240);

    // Ladrillos
    for (const b of this.breakerBricks) {
      if (b.alive) {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.shadowBlur = 0;
      }
    }

    // Raqueta
    const pad = this.breakerPaddle;
    ctx.fillStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(pad.x, 240 - 18, pad.w, pad.h);
    ctx.shadowBlur = 0;

    // Pelota
    const ball = this.breakerBall;
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ==========================================
  // JUEGO 7: TETRIS RELAX (FALLING BLOCKS)
  // ==========================================
  initTetris() {
    if (!this.tetrisCanvasRef) return;
    const canvas = this.tetrisCanvasRef.nativeElement;
    this.tetrisCtx = canvas.getContext('2d');
    canvas.width = this.tetrisCols * this.tetrisTile;
    canvas.height = this.tetrisRows * this.tetrisTile;
    this.resetTetrisState();
    this.drawTetris();
  }

  resetTetrisState() {
    this.tetrisGrid = Array.from({ length: this.tetrisRows }, () => Array(this.tetrisCols).fill(null));
    this.tetrisScore.set(0);
    this.tetrisLines.set(0);
    this.spawnTetrisPiece();
  }

  startTetrisGame() {
    if (this.tetrisStatus() === 'playing') return;
    this.resetTetrisState();
    this.tetrisStatus.set('playing');
    this.playTone(440, 'sine', 0.08);

    if (this.tetrisIntervalId) clearInterval(this.tetrisIntervalId);
    this.tetrisIntervalId = setInterval(() => {
      this.dropTetris();
    }, 550);
  }

  stopTetrisLoop() {
    if (this.tetrisIntervalId) {
      clearInterval(this.tetrisIntervalId);
      this.tetrisIntervalId = null;
    }
  }

  private readonly tetrisShapes = [
    { shape: [[1, 1, 1, 1]], color: '#06b6d4' },       // I
    { shape: [[1, 1], [1, 1]], color: '#facc15' },     // O
    { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' }, // T
    { shape: [[1, 1, 0], [0, 1, 1]], color: '#22c55e' }, // S
    { shape: [[0, 1, 1], [1, 1, 0]], color: '#ef4444' }, // Z
    { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' }, // J
    { shape: [[0, 0, 1], [1, 1, 1]], color: '#f59e0b' }  // L
  ];

  private spawnTetrisPiece() {
    const proto = this.tetrisShapes[Math.floor(Math.random() * this.tetrisShapes.length)];
    this.currentPiece = {
      shape: proto.shape,
      color: proto.color,
      x: Math.floor(this.tetrisCols / 2) - Math.floor(proto.shape[0].length / 2),
      y: 0
    };

    if (this.checkTetrisCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
      this.tetrisStatus.set('gameover');
      this.stopTetrisLoop();
      this.playTone(180, 'sawtooth', 0.3, 0.12);
    }
  }

  moveTetris(dx: number) {
    if (this.tetrisStatus() !== 'playing' || !this.currentPiece) return;
    if (!this.checkTetrisCollision(this.currentPiece.x + dx, this.currentPiece.y, this.currentPiece.shape)) {
      this.currentPiece.x += dx;
      this.playTone(340, 'sine', 0.02, 0.04);
      this.drawTetris();
    }
  }

  rotateTetris() {
    if (this.tetrisStatus() !== 'playing' || !this.currentPiece) return;
    const rotated = this.currentPiece.shape[0].map((_, i) =>
      this.currentPiece!.shape.map(row => row[i]).reverse()
    );
    if (!this.checkTetrisCollision(this.currentPiece.x, this.currentPiece.y, rotated)) {
      this.currentPiece.shape = rotated;
      this.playTone(460, 'sine', 0.03, 0.05);
      this.drawTetris();
    }
  }

  dropTetris() {
    if (this.tetrisStatus() !== 'playing' || !this.currentPiece) return;
    if (!this.checkTetrisCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
      this.currentPiece.y += 1;
    } else {
      this.lockTetrisPiece();
      this.clearTetrisLines();
      this.spawnTetrisPiece();
    }
    this.drawTetris();
  }

  hardDropTetris() {
    if (this.tetrisStatus() !== 'playing' || !this.currentPiece) return;
    while (!this.checkTetrisCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
      this.currentPiece.y += 1;
    }
    this.dropTetris();
  }

  private checkTetrisCollision(x: number, y: number, shape: number[][]): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= this.tetrisCols || newY >= this.tetrisRows) return true;
          if (newY >= 0 && this.tetrisGrid[newY][newX]) return true;
        }
      }
    }
    return false;
  }

  private lockTetrisPiece() {
    if (!this.currentPiece) return;
    for (let r = 0; r < this.currentPiece.shape.length; r++) {
      for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
        if (this.currentPiece.shape[r][c]) {
          const gx = this.currentPiece.x + c;
          const gy = this.currentPiece.y + r;
          if (gy >= 0 && gy < this.tetrisRows && gx >= 0 && gx < this.tetrisCols) {
            this.tetrisGrid[gy][gx] = this.currentPiece.color;
          }
        }
      }
    }
  }

  private clearTetrisLines() {
    let cleared = 0;
    for (let r = this.tetrisRows - 1; r >= 0; r--) {
      if (this.tetrisGrid[r].every(cell => cell !== null)) {
        this.tetrisGrid.splice(r, 1);
        this.tetrisGrid.unshift(Array(this.tetrisCols).fill(null));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      this.tetrisLines.set(this.tetrisLines() + cleared);
      const points = cleared * 100 * cleared;
      const newScore = this.tetrisScore() + points;
      this.tetrisScore.set(newScore);
      this.playTone(720, 'sine', 0.1, 0.1);
      if (newScore > this.tetrisBest()) {
        this.tetrisBest.set(newScore);
        this.saveStats();
      }
    }
  }

  private drawTetris() {
    const ctx = this.tetrisCtx;
    if (!ctx) return;

    ctx.fillStyle = '#0a0914';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Bloques fijados
    for (let r = 0; r < this.tetrisRows; r++) {
      for (let c = 0; c < this.tetrisCols; c++) {
        const color = this.tetrisGrid[r][c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c * this.tetrisTile + 1, r * this.tetrisTile + 1, this.tetrisTile - 2, this.tetrisTile - 2);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.strokeRect(c * this.tetrisTile, r * this.tetrisTile, this.tetrisTile, this.tetrisTile);
        }
      }
    }

    // Pieza actual
    if (this.currentPiece) {
      ctx.fillStyle = this.currentPiece.color;
      ctx.shadowColor = this.currentPiece.color;
      ctx.shadowBlur = 6;
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c]) {
            ctx.fillRect(
              (this.currentPiece.x + c) * this.tetrisTile + 1,
              (this.currentPiece.y + r) * this.tetrisTile + 1,
              this.tetrisTile - 2,
              this.tetrisTile - 2
            );
          }
        }
      }
      ctx.shadowBlur = 0;
    }
  }

  // ==========================================
  // JUEGO 8: REFLEJO SAMURAI (KATANA SLASH)
  // ==========================================
  resetSamurai() {
    this.samuraiStatus.set('idle');
    this.samuraiReaction.set(0);
    this.samuraiRank.set('');
    if (this.samuraiTimerId) clearTimeout(this.samuraiTimerId);
  }

  startSamurai() {
    this.samuraiStatus.set('waiting');
    this.samuraiReaction.set(0);
    this.playTone(320, 'sine', 0.1);

    const delay = 1800 + Math.random() * 2600;
    if (this.samuraiTimerId) clearTimeout(this.samuraiTimerId);
    this.samuraiTimerId = setTimeout(() => {
      this.samuraiStatus.set('ready');
      this.samuraiStartTime = performance.now();
      this.playTone(880, 'sawtooth', 0.15, 0.2);
    }, delay);
  }

  triggerSlash() {
    const status = this.samuraiStatus();
    if (status === 'waiting') {
      // Muy temprano
      if (this.samuraiTimerId) clearTimeout(this.samuraiTimerId);
      this.samuraiStatus.set('early');
      this.playTone(180, 'sawtooth', 0.25, 0.1);
      return;
    }

    if (status === 'ready') {
      const reaction = Math.round(performance.now() - this.samuraiStartTime);
      this.samuraiReaction.set(reaction);
      this.samuraiStatus.set('slashed');
      this.playTone(1050, 'sine', 0.12, 0.15);

      let rank = 'Guerrero Novato 🗡️';
      if (reaction < 200) rank = 'Kensei Legendario 👑';
      else if (reaction < 260) rank = 'Maestro Samurai ⚔️';
      else if (reaction < 340) rank = 'Guerrero Ninja ⚡';
      else if (reaction < 430) rank = 'Espadachín Diestro 🥋';
      this.samuraiRank.set(rank);

      if (this.samuraiBest() === 0 || reaction < this.samuraiBest()) {
        this.samuraiBest.set(reaction);
        this.saveStats();
      }
    }
  }

  // ==========================================
  // JUEGO 9: SALTO ESPACIAL (SPACE HOPPER)
  // ==========================================
  initSpace() {
    if (!this.spaceCanvasRef) return;
    const canvas = this.spaceCanvasRef.nativeElement;
    this.spaceCtx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 240;
    this.resetSpaceState();
    this.drawSpace();
  }

  resetSpaceState() {
    this.rocket = { x: 150, y: 150, vx: 0, vy: -7, w: 18, h: 22 };
    this.spaceScore.set(0);
    this.spacePlatforms = [];
    this.spaceCameraY = 0;

    // Generar plataformas iniciales
    for (let i = 0; i < 7; i++) {
      this.spacePlatforms.push({
        x: 30 + Math.random() * 220,
        y: 220 - i * 36,
        w: 55,
        h: 7,
        moving: Math.random() > 0.6,
        vx: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 1.2)
      });
    }
  }

  startSpaceGame() {
    if (this.spaceStatus() === 'playing') return;
    this.resetSpaceState();
    this.spaceStatus.set('playing');
    this.playTone(520, 'sine', 0.08);

    const loop = () => {
      if (this.spaceStatus() !== 'playing') return;

      this.updateSpace();
      this.drawSpace();

      this.spaceFrameId = requestAnimationFrame(loop);
    };
    this.spaceFrameId = requestAnimationFrame(loop);
  }

  stopSpaceLoop() {
    if (this.spaceFrameId) {
      cancelAnimationFrame(this.spaceFrameId);
      this.spaceFrameId = null;
    }
  }

  onSpaceMouseMove(e: MouseEvent) {
    if (this.spaceStatus() !== 'playing') return;
    const rect = this.spaceCanvasRef?.nativeElement.getBoundingClientRect();
    if (rect) {
      this.rocket.x = e.clientX - rect.left - this.rocket.w / 2;
    }
  }

  onSpaceTouchMove(e: TouchEvent) {
    if (this.spaceStatus() !== 'playing') return;
    e.preventDefault();
    const rect = this.spaceCanvasRef?.nativeElement.getBoundingClientRect();
    if (rect && e.touches.length > 0) {
      this.rocket.x = e.touches[0].clientX - rect.left - this.rocket.w / 2;
    }
  }

  private updateSpace() {
    const r = this.rocket;
    r.vy += 0.24;
    r.y += r.vy;

    // Wrap horizontal
    if (r.x < -10) r.x = 320;
    if (r.x > 320) r.x = -10;

    // Mover plataformas
    for (const p of this.spacePlatforms) {
      if (p.moving) {
        p.x += p.vx;
        if (p.x <= 10 || p.x + p.w >= 310) p.vx = -p.vx;
      }

      // Rebote de cohete en plataforma
      if (r.vy > 0 && r.x + r.w > p.x && r.x < p.x + p.w && r.y + r.h >= p.y && r.y + r.h <= p.y + 10) {
        r.vy = -7.5;
        this.playTone(620, 'sine', 0.04, 0.06);
      }
    }

    // Cámara scroll hacia arriba
    if (r.y < 100) {
      const delta = 100 - r.y;
      r.y = 100;
      this.spaceScore.set(this.spaceScore() + Math.round(delta));
      if (this.spaceScore() > this.spaceBest()) {
        this.spaceBest.set(this.spaceScore());
        this.saveStats();
      }

      for (const p of this.spacePlatforms) {
        p.y += delta;
      }
    }

    // Reciclar plataformas caídas
    this.spacePlatforms = this.spacePlatforms.filter(p => p.y < 260);
    while (this.spacePlatforms.length < 7) {
      const highest = Math.min(...this.spacePlatforms.map(p => p.y));
      this.spacePlatforms.push({
        x: 20 + Math.random() * 240,
        y: highest - (32 + Math.random() * 12),
        w: 52,
        h: 7,
        moving: Math.random() > 0.5,
        vx: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 1.5)
      });
    }

    // Caída / Game Over
    if (r.y > 250) {
      this.spaceStatus.set('gameover');
      this.stopSpaceLoop();
      this.playTone(180, 'sawtooth', 0.3, 0.12);
    }
  }

  private drawSpace() {
    const ctx = this.spaceCtx;
    if (!ctx) return;

    ctx.fillStyle = '#070612';
    ctx.fillRect(0, 0, 320, 240);

    // Plataformas
    for (const p of this.spacePlatforms) {
      ctx.fillStyle = p.moving ? '#f59e0b' : '#38bdf8';
      ctx.shadowColor = p.moving ? '#f59e0b' : '#38bdf8';
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.shadowBlur = 0;
    }

    // Cohete
    const r = this.rocket;
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(r.x + r.w / 2, r.y);
    ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.lineTo(r.x, r.y + r.h);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ==========================================
  // TECLAS GLOBALES
  // ==========================================
  @HostListener('window:keydown', ['$event'])
  handleGlobalKeyDown(e: KeyboardEvent) {
    const game = this.activeGame();
    if (game === 'dodge') {
      this.keysPressed[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.dodgeStatus() === 'idle' || this.dodgeStatus() === 'gameover' || this.dodgeStatus() === 'won') {
          this.startDodgeGame();
        }
      }
    } else if (game === 'snake') {
      if (['ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); this.setSnakeDirection(0, -1); }
      if (['ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); this.setSnakeDirection(0, 1); }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) { e.preventDefault(); this.setSnakeDirection(-1, 0); }
      if (['ArrowRight', 'KeyD'].includes(e.code)) { e.preventDefault(); this.setSnakeDirection(1, 0); }
      if (e.code === 'Space' && (this.snakeStatus() === 'idle' || this.snakeStatus() === 'gameover')) {
        e.preventDefault(); this.startSnakeGame();
      }
    } else if (game === 'flappy') {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        this.flapBird();
      }
    } else if (game === 'tetris') {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) { e.preventDefault(); this.moveTetris(-1); }
      if (['ArrowRight', 'KeyD'].includes(e.code)) { e.preventDefault(); this.moveTetris(1); }
      if (['ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); this.rotateTetris(); }
      if (['ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); this.dropTetris(); }
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.tetrisStatus() === 'playing') this.hardDropTetris();
        else this.startTetrisGame();
      }
    } else if (game === 'breaker') {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        this.breakerPaddle.x = Math.max(0, this.breakerPaddle.x - 18);
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        this.breakerPaddle.x = Math.min(380 - this.breakerPaddle.w, this.breakerPaddle.x + 18);
      }
      if (e.code === 'Space' && (this.breakerStatus() === 'idle' || this.breakerStatus() === 'gameover' || this.breakerStatus() === 'won')) {
        e.preventDefault(); this.startBreakerGame();
      }
    } else if (game === 'samurai') {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.samuraiStatus() === 'idle' || this.samuraiStatus() === 'slashed' || this.samuraiStatus() === 'early') {
          this.startSamurai();
        } else {
          this.triggerSlash();
        }
      }
    } else if (game === 'space') {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) { this.rocket.x -= 16; }
      if (['ArrowRight', 'KeyD'].includes(e.code)) { this.rocket.x += 16; }
      if (e.code === 'Space' && (this.spaceStatus() === 'idle' || this.spaceStatus() === 'gameover')) {
        e.preventDefault(); this.startSpaceGame();
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleGlobalKeyUp(e: KeyboardEvent) {
    if (this.activeGame() === 'dodge') {
      this.keysPressed[e.code] = false;
    }
  }

  private createExplosion(x: number, y: number) {
    const colors = ['#ef4444', '#f59e0b', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.025
      });
    }
  }

  private createVictorySparks() {
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: this.canvasWidth / 2,
        y: this.canvasHeight / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.5 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02
      });
    }
  }

  private getPlayerColor(alpha: number): string {
    switch (this.theme) {
      case 'samurai': return `rgba(239, 68, 68, ${alpha})`;
      case 'cyberpunk': return `rgba(6, 182, 212, ${alpha})`;
      case 'aurora': return `rgba(99, 102, 241, ${alpha})`;
      case 'zen': return `rgba(16, 185, 129, ${alpha})`;
      default: return `rgba(99, 102, 241, ${alpha})`;
    }
  }

  private getHazardColors(): string[] {
    switch (this.theme) {
      case 'samurai': return ['#f59e0b', '#fbbf24', '#ef4444', '#dc2626'];
      case 'cyberpunk': return ['#ec4899', '#f43f5e', '#a855f7', '#06b6d4'];
      case 'aurora': return ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
      case 'zen': return ['#d97706', '#ca8a04', '#059669', '#10b981'];
      default: return ['#f59e0b', '#ef4444', '#6366f1'];
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.isBrowser) return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1, gainVal: number = 0.08) {
    if (this.isMuted()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignorar
    }
  }

  private playSuccessMelody() {
    if (this.isMuted()) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.2, 0.09);
      }, idx * 85);
    });
  }

  private playLevelUpMelody() {
    if (this.isMuted()) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.16, 0.1);
      }, idx * 75);
    });
  }

  private loadStats() {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem('procrastina_minigames_stats_v4');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.gato) this.gatoScore.set(parsed.gato);
        if (parsed.bestDodge) this.bestSurvival.set(parsed.bestDodge);
        if (parsed.bestSnake) this.snakeBest.set(parsed.bestSnake);
        if (parsed.bestFlappy) this.flappyBest.set(parsed.bestFlappy);
        if (parsed.bestMemory) this.memoryBestMoves.set(parsed.bestMemory);
        if (parsed.bestBreaker) this.breakerBest.set(parsed.bestBreaker);
        if (parsed.bestTetris) this.tetrisBest.set(parsed.bestTetris);
        if (parsed.bestSamurai) this.samuraiBest.set(parsed.bestSamurai);
        if (parsed.bestSpace) this.spaceBest.set(parsed.bestSpace);
      }
    } catch {
      // Ignorar
    }
  }

  private saveStats() {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem('procrastina_minigames_stats_v4', JSON.stringify({
        gato: this.gatoScore(),
        bestDodge: this.bestSurvival(),
        bestSnake: this.snakeBest(),
        bestFlappy: this.flappyBest(),
        bestMemory: this.memoryBestMoves(),
        bestBreaker: this.breakerBest(),
        bestTetris: this.tetrisBest(),
        bestSamurai: this.samuraiBest(),
        bestSpace: this.spaceBest()
      }));
    } catch {
      // Ignorar
    }
  }
}
