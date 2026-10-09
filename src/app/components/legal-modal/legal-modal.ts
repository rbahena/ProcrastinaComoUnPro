import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalService } from '../../services/legal.service';

@Component({
  selector: 'app-legal-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './legal-modal.html',
  styleUrl: './legal-modal.css'
})
export class LegalModal {
  constructor(public legalService: LegalService) {}

  close() {
    this.legalService.close();
  }

  setTab(tab: 'terms' | 'privacy') {
    this.legalService.setTab(tab);
  }
}
