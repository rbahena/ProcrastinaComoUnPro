import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MembershipService } from '../../services/membership.service';

@Component({
  selector: 'app-membresia',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './membresia.html',
  styleUrls: ['./membresia.css']
})
export class Membresia {
  isAnnual = signal<boolean>(true);
  showSuccessToast = signal<boolean>(false);

  constructor(private router: Router, public membership: MembershipService) {}

  selectPlan(annual: boolean) {
    this.isAnnual.set(annual);
  }

  togglePremium() {
    const nextState = !this.membership.isPremium();
    this.membership.setPremium(nextState);
    
    if (nextState) {
      this.showSuccessToast.set(true);
      setTimeout(() => {
        this.showSuccessToast.set(false);
        this.router.navigate(['/home']);
      }, 2200);
    }
  }
}
