import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('ProcrastinaComoUnPro');

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
}
