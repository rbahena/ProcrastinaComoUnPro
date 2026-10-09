import { Injectable, signal } from '@angular/core';

export type LegalModalType = 'terms' | 'privacy' | null;

@Injectable({
  providedIn: 'root'
})
export class LegalService {
  activeModal = signal<LegalModalType>(null);

  open(type: 'terms' | 'privacy') {
    this.activeModal.set(type);
  }

  close() {
    this.activeModal.set(null);
  }

  setTab(type: 'terms' | 'privacy') {
    this.activeModal.set(type);
  }
}
