import { Component, OnInit, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MembershipService } from './services/membership.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('COFU');
  
  showFloatingInput = signal(false);
  ideaText = signal('');
  isAnimatingSuccess = signal(false);
  isShootingStarFlying = signal(false);

  @ViewChild('ideaInput') ideaInputRef?: ElementRef<HTMLInputElement>;

  constructor(public membership: MembershipService, private router: Router) {}

  ngOnInit() {
    const savedTheme = localStorage.getItem('procrastina-theme') || 'samurai';
    const body = document.body;
    // Remove existing themes
    body.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        body.classList.remove(className);
      }
    });
    // Add current theme
    body.classList.add(`theme-${savedTheme}`);
  }

  isLandingOrAuthRoute(): boolean {
    const url = this.router.url;
    return url.includes('/landing') || url.includes('/login') || url.includes('/registro') || url === '/';
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
      setTimeout(() => {
        this.ideaInputRef?.nativeElement?.focus();
      }, 50);
    }
  }

  closeFloatingInput() {
    this.showFloatingInput.set(false);
  }

  submitIdea() {
    const text = this.ideaText().trim();
    if (!text) return;
    
    this.membership.addIdea(text);
    
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
