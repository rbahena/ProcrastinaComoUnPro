import { Component, OnInit, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MembershipService } from './services/membership.service';
import { LegalService } from './services/legal.service';
import { LegalModal } from './components/legal-modal/legal-modal';
import { TranslatePipe } from './services/translation.service';
import { IdeaPriority } from './services/supabase.service';

import { AnalyticsService } from './services/analytics.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, LegalModal, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('COFU');
  
  showFloatingInput = signal(false);
  ideaText = signal('');
  selectedPriority = signal<IdeaPriority>('media');
  isAnimatingSuccess = signal(false);
  isShootingStarFlying = signal(false);
  showMobileNotice = signal(false);

  @ViewChild('ideaInput') ideaInputRef?: ElementRef<HTMLInputElement>;

  constructor(
    public membership: MembershipService, 
    public legalService: LegalService,
    private analytics: AnalyticsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.applyThemeOnBody();
    this.router.events.subscribe(() => {
      this.applyThemeOnBody();
    });
    this.checkMobileDevice();
  }

  checkMobileDevice() {
    if (typeof window === 'undefined') return;
    const isMobileViewport = window.innerWidth <= 850;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const dismissed = sessionStorage.getItem('cofu_mobile_notice_dismissed');
    
    if ((isMobileViewport || isMobileUA) && !dismissed) {
      this.showMobileNotice.set(true);
    }
  }

  dismissMobileNotice() {
    this.showMobileNotice.set(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cofu_mobile_notice_dismissed', 'true');
    }
  }

  applyThemeOnBody() {
    const body = document.body;
    if (this.isLandingOrAuthRoute()) {
      const toRemove: string[] = [];
      body.classList.forEach(className => {
        if (className.startsWith('theme-') || className.startsWith('mode-')) {
          toRemove.push(className);
        }
      });
      toRemove.forEach(cls => body.classList.remove(cls));
      body.classList.add('theme-samurai', 'mode-dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      this.membership.applyGlobalTheme();
    }
  }

  isLandingOrAuthRoute(): boolean {
    const cleanUrl = this.router.url.split('?')[0].split('#')[0];
    return cleanUrl === '' || cleanUrl === '/' || cleanUrl === '/landing' || cleanUrl === '/login' || cleanUrl === '/register' || cleanUrl === '/registro';
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (typeof window !== 'undefined') {
      const isScrolled = window.scrollY > 10;
      const body = document.body;
      if (isScrolled) {
        body.classList.add('window-scrolled');
      } else {
        body.classList.remove('window-scrolled');
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.isLandingOrAuthRoute()) return;
    // Detectar Alt + I (con tolerancias para teclados con ñ u otros layouts)
    if (event.altKey && (event.key === 'i' || event.key === 'I' || event.code === 'KeyI')) {
      event.preventDefault();
      this.toggleFloatingInput();
    }
  }

  toggleFloatingInput() {
    const nextState = !this.showFloatingInput();
    this.showFloatingInput.set(nextState);
    if (nextState) {
      this.ideaText.set('');
      this.selectedPriority.set('media');
      setTimeout(() => {
        this.ideaInputRef?.nativeElement?.focus();
      }, 50);
    }
  }

  closeFloatingInput() {
    this.showFloatingInput.set(false);
  }

  setPriority(p: IdeaPriority) {
    this.selectedPriority.set(p);
  }

  submitIdea() {
    const text = this.ideaText().trim();
    if (!text) return;
    
    this.membership.addIdea(text, this.selectedPriority());
    
    // Disparar animación de éxito y estrella fugaz
    this.isAnimatingSuccess.set(true);
    this.isShootingStarFlying.set(true);
    
    setTimeout(() => {
      this.isAnimatingSuccess.set(false);
      this.showFloatingInput.set(false);
      this.ideaText.set('');
    }, 850);

    setTimeout(() => {
      this.isShootingStarFlying.set(false);
    }, 1300);
  }

  onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.submitIdea();
    } else if (event.key === 'Escape') {
      this.closeFloatingInput();
    }
  }

  onInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.ideaText.set(target.value);
  }
}
