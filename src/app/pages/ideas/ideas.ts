import { Component, signal, computed, OnInit, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './ideas.html',
  styleUrl: './ideas.css',
})
export class Ideas implements OnInit {
  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  sidebarCollapsed!: any;

  newIdeaText = signal('');

  constructor(public membership: MembershipService, private router: Router) {
    this.currentTheme = this.membership.selectedTheme;
    this.userName = this.membership.userName;
    this.selectedAvatar = this.membership.selectedAvatar;
    this.sidebarCollapsed = this.membership.sidebarCollapsed;
  }

  ngOnInit() {}

  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newIdeaText.set(input.value);
  }

  addIdea() {
    const text = this.newIdeaText().trim();
    if (!text) return;
    this.membership.addIdea(text);
    this.newIdeaText.set('');
  }

  removeIdea(index: number) {
    this.membership.removeIdea(index);
  }

  clearAllIdeas() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el baúl de ideas?')) {
      this.membership.clearAllIdeas();
    }
  }

  convertToObjective(idea: string, index: number) {
    // Save draft in localStorage and redirect
    localStorage.setItem('activeObjectiveDraft', idea);
    // Remove the idea from list
    this.membership.removeIdea(index);
    // Redirect to focus page
    this.router.navigate(['/enfoque']);
  }
}
