import { Component, signal, computed, OnInit, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { CapturedIdea, SupabaseService } from '../../services/supabase.service';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './ideas.html',
  styleUrl: './ideas.css',
})
export class Ideas implements OnInit {
  public membership = inject(MembershipService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  sidebarCollapsed!: any;

  newIdeaText = signal('');
  searchTerm = signal('');

  // Estado de edición inline
  editingIdeaId = signal<string | null>(null);
  editingText = signal<string>('');

  // Estado de confirmación de eliminación para evitar borrados accidentales
  confirmDeleteId = signal<string | null>(null);

  constructor() {
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

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  filteredIdeas = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.membership.capturedIdeas();
    if (!term) return list;
    return list.filter(item => item.content.toLowerCase().includes(term));
  });

  async addIdea() {
    const text = this.newIdeaText().trim();
    if (!text) return;
    await this.membership.addIdea(text);
    this.newIdeaText.set('');
  }

  startEditing(idea: CapturedIdea) {
    this.editingIdeaId.set(idea.id || null);
    this.editingText.set(idea.content);
    this.confirmDeleteId.set(null);
  }

  cancelEditing() {
    this.editingIdeaId.set(null);
    this.editingText.set('');
  }

  async saveEdit(idea: CapturedIdea) {
    const newText = this.editingText().trim();
    if (!newText) return;
    if (idea.id) {
      await this.membership.updateIdea(idea.id, newText);
    }
    this.cancelEditing();
  }

  onEditKeydown(event: KeyboardEvent, idea: CapturedIdea) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEdit(idea);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditing();
    }
  }

  askDelete(idea: CapturedIdea) {
    if (idea.id) {
      this.confirmDeleteId.set(idea.id);
    }
  }

  cancelDelete() {
    this.confirmDeleteId.set(null);
  }

  async confirmDelete(idea: CapturedIdea, index: number) {
    await this.membership.removeIdea(idea.id || index);
    this.confirmDeleteId.set(null);
  }

  async clearAllIdeas() {
    if (confirm('¿Estás seguro de que deseas vaciar todas tus notas y objetivos del baúl? Esta acción eliminará los registros de la base de datos.')) {
      await this.membership.clearAllIdeas();
      this.confirmDeleteId.set(null);
      this.editingIdeaId.set(null);
    }
  }

  async convertToObjective(idea: CapturedIdea, index: number) {
    // Guardar borrador para la arena de enfoque
    localStorage.setItem('activeObjectiveDraft', idea.content);

    // Si tiene ID en Supabase, marcar conversión
    if (idea.id && !idea.id.startsWith('local-') && !idea.id.startsWith('temp-') && this.supabaseService.isConfigured()) {
      this.supabaseService.convertIdeaToObjective(idea.id).catch(err => {
        console.warn('[Convert idea to objective error]', err);
      });
    }

    // Remover del baúl
    await this.membership.removeIdea(idea.id || index);

    // Redireccionar a la zona de concentración
    this.router.navigate(['/enfoque']);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'Capturado recientemente';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Capturado recientemente';

      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      if (isToday) {
        return `Hoy a las ${timeStr}`;
      } else if (isYesterday) {
        return `Ayer a las ${timeStr}`;
      } else {
        const day = date.getDate();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthName = months[date.getMonth()];
        const year = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '';
        return `${day} ${monthName}${year}, ${timeStr}`;
      }
    } catch {
      return 'Capturado recientemente';
    }
  }
}
