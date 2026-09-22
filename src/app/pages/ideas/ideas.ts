import { Component, signal, computed, OnInit, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { CapturedIdea, SupabaseService, IdeaPriority } from '../../services/supabase.service';
import { Navbar } from '../../components/navbar/navbar';

export type SortOption = 'priority' | 'newest' | 'oldest' | 'alpha';
export type IdeaFilterType = 'all' | IdeaPriority | 'completed';

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
  selectedNewPriority = signal<IdeaPriority>('media');

  // Filtro y Ordenación
  activeFilter = signal<IdeaFilterType>('all');
  activeSort = signal<SortOption>('priority');

  // Estado de edición inline
  editingIdeaId = signal<string | null>(null);
  editingText = signal<string>('');
  editingPriority = signal<IdeaPriority>('media');

  // Estado de confirmación de eliminación y completado para evitar acciones accidentales
  confirmDeleteId = signal<string | null>(null);
  confirmCompleteId = signal<string | null>(null);

  // Estado de existencia de notas/cards
  hasIdeas = computed(() => this.membership.capturedIdeas().length > 0);

  // Contadores reactivos por categoría
  countPending = computed(() => this.membership.capturedIdeas().filter(i => !i.is_completed).length);
  countAll = computed(() => this.countPending());
  countAlta = computed(() => this.membership.capturedIdeas().filter(i => !i.is_completed && i.priority === 'alta').length);
  countMedia = computed(() => this.membership.capturedIdeas().filter(i => !i.is_completed && (i.priority || 'media') === 'media').length);
  countBaja = computed(() => this.membership.capturedIdeas().filter(i => !i.is_completed && i.priority === 'baja').length);
  countCompleted = computed(() => this.membership.capturedIdeas().filter(i => i.is_completed).length);

  // Lista procesada (filtrada y ordenada)
  filteredIdeas = computed(() => {
    let list = [...this.membership.capturedIdeas()];
    const filter = this.activeFilter();

    if (filter === 'completed') {
      list = list.filter(idea => idea.is_completed);
    } else {
      list = list.filter(idea => !idea.is_completed);
      if (filter !== 'all') {
        list = list.filter(idea => (idea.priority || 'media') === filter);
      }
    }

    const sort = this.activeSort();
    if (sort === 'priority') {
      const priorityOrder: Record<IdeaPriority, number> = { alta: 1, media: 2, baja: 3 };
      list.sort((a, b) => {
        const pa = priorityOrder[a.priority || 'media'];
        const pb = priorityOrder[b.priority || 'media'];
        if (pa !== pb) return pa - pb;
        const timeA = new Date(a.created_at || '').getTime() || 0;
        const timeB = new Date(b.created_at || '').getTime() || 0;
        return timeB - timeA;
      });
    } else if (sort === 'newest') {
      list.sort((a, b) => {
        const dateA = a.is_completed ? (a.completed_at || a.created_at || '') : (a.created_at || '');
        const dateB = b.is_completed ? (b.completed_at || b.created_at || '') : (b.created_at || '');
        const timeA = new Date(dateA).getTime() || 0;
        const timeB = new Date(dateB).getTime() || 0;
        return timeB - timeA;
      });
    } else if (sort === 'oldest') {
      list.sort((a, b) => {
        const timeA = new Date(a.created_at || '').getTime() || 0;
        const timeB = new Date(b.created_at || '').getTime() || 0;
        return timeA - timeB;
      });
    } else if (sort === 'alpha') {
      list.sort((a, b) => a.content.localeCompare(b.content));
    }

    return list;
  });

  // Paginación
  pageSizeOptions = [6, 10, 20, 50];
  pageSize = signal<number>(10);
  currentPage = signal<number>(1);

  // Lista paginada
  paginatedIdeas = computed(() => {
    const list = this.filteredIdeas();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => {
    const total = this.filteredIdeas().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  itemRange = computed(() => {
    const total = this.filteredIdeas().length;
    if (total === 0) return '0 de 0';
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), total);
    return `${start} - ${end} de ${total}`;
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (current < total - 2) pages.push('...');
      if (!pages.includes(total)) pages.push(total);
    }

    return pages;
  });

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

  setFilter(filter: IdeaFilterType) {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
  }

  askComplete(idea: CapturedIdea) {
    if (idea.id) {
      this.confirmCompleteId.set(idea.id);
      this.confirmDeleteId.set(null);
      this.editingIdeaId.set(null);
    }
  }

  cancelComplete() {
    this.confirmCompleteId.set(null);
  }

  async confirmComplete(idea: CapturedIdea) {
    if (idea.id) {
      await this.membership.completeIdea(idea.id);
    }
    this.confirmCompleteId.set(null);
  }

  async markComplete(idea: CapturedIdea) {
    this.askComplete(idea);
  }

  async reactivateIdea(idea: CapturedIdea) {
    if (idea.id) {
      await this.membership.reactivateIdea(idea.id);
    }
  }

  setSort(sort: SortOption) {
    this.activeSort.set(sort);
    this.currentPage.set(1);
  }

  setPageSize(size: number | string) {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  goToPage(page: number | string) {
    if (typeof page !== 'number') return;
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage() {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }

  setNewPriority(p: IdeaPriority) {
    this.selectedNewPriority.set(p);
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newIdeaText.set(input.value);
  }

  async addIdea() {
    const text = this.newIdeaText().trim();
    if (!text) return;
    const priority = this.selectedNewPriority();
    await this.membership.addIdea(text, priority);
    this.newIdeaText.set('');
  }

  startEditing(idea: CapturedIdea) {
    this.editingIdeaId.set(idea.id || null);
    this.editingText.set(idea.content);
    this.editingPriority.set(idea.priority || 'media');
    this.confirmDeleteId.set(null);
    this.confirmCompleteId.set(null);
  }

  cancelEditing() {
    this.editingIdeaId.set(null);
    this.editingText.set('');
  }

  async saveEdit(idea: CapturedIdea) {
    const newText = this.editingText().trim();
    if (!newText) return;
    const newPriority = this.editingPriority();
    if (idea.id) {
      await this.membership.updateIdea(idea.id, newText, newPriority);
    }
    this.cancelEditing();
  }

  onEditKeydown(event: KeyboardEvent, idea: CapturedIdea) {
    if (event.key === 'Enter' && !event.shiftKey) {
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
      this.confirmCompleteId.set(null);
      this.editingIdeaId.set(null);
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
      this.confirmCompleteId.set(null);
      this.editingIdeaId.set(null);
    }
  }

  async convertToObjective(idea: CapturedIdea, index: number) {
    // Guardar borrador e ID de la nota para la arena de enfoque
    localStorage.setItem('activeObjectiveDraft', idea.content);
    if (idea.id) {
      localStorage.setItem('activeObjectiveIdeaId', idea.id);
      await this.membership.convertIdeaToObjective(idea.id);
    } else {
      localStorage.setItem('activeObjectiveIdeaId', `temp-${index}`);
      await this.membership.convertIdeaToObjective(index);
    }

    // Redireccionar a la zona de concentración (donde estará precargado en estado setup antes de iniciar)
    this.router.navigate(['/enfoque']);
  }

  getPriorityTooltip(priority?: IdeaPriority): string {
    switch (priority) {
      case 'alta': return 'Prioridad: Urgente';
      case 'baja': return 'Prioridad: Aplazar';
      case 'media':
      default: return 'Prioridad: Puede esperar';
    }
  }

  getPriorityLabel(priority?: IdeaPriority): string {
    switch (priority) {
      case 'alta': return 'Prioridad';
      case 'baja': return 'Aplazar';
      case 'media':
      default: return 'Puede esperar';
    }
  }

  getPriorityIcon(priority?: IdeaPriority): string {
    switch (priority) {
      case 'alta': return 'fa-solid fa-fire';
      case 'baja': return 'fa-solid fa-clock-rotate-left';
      case 'media':
      default: return 'fa-solid fa-hourglass-half';
    }
  }

  getPriorityEmoji(priority?: IdeaPriority): string {
    switch (priority) {
      case 'alta': return '🔥';
      case 'baja': return '💤';
      case 'media':
      default: return '⏳';
    }
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

  formatDedicatedTime(minutes?: number): string {
    if (!minutes || minutes <= 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}
