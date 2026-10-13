import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-membresia',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './membresia.html',
  styleUrls: ['./membresia.css']
})
export class Membresia implements OnInit {
  isAnnual = signal<boolean>(true);
  showSuccessToast = signal<boolean>(false);
  isProcessing = signal<boolean>(false);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public membership: MembershipService,
    private analytics: AnalyticsService,
    private supabase: SupabaseService
  ) {}

  ngOnInit(): void {
    this.checkReturnStatus();
  }

  selectPlan(annual: boolean): void {
    this.isAnnual.set(annual);
  }

  /**
   * Inicia el flujo de adquisición de suscripción Pro en USD con Stripe Checkout
   */
  async subscribePro(): Promise<void> {
    const planType = this.isAnnual() ? 'annual' : 'monthly';
    this.analytics.trackUpgradeProClick(planType);

    // Si no está autenticado, invitar a iniciar sesión primero
    if (!this.supabase.currentUser()) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/membresia' } });
      return;
    }

    this.isProcessing.set(true);

    try {
      // Invocar Edge Function de Stripe Checkout en USD
      const { data, error } = await this.supabase.createStripeCheckoutSession(planType, 'USD');
      
      if (!error && data?.url) {
        // Redirigir a la pasarela segura de Stripe Checkout
        window.location.href = data.url;
        return;
      }

      console.error('[Error de Checkout]', error, data);
      const msg = error ? `⚠️ ${error}` : '⚠️ El servicio de pago seguro estará disponible muy pronto. ¡Gracias por tu paciencia!';
      this.showToastFeedback(msg, 'info');
    } catch (e: any) {
      console.error('[Error de Checkout]', e);
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Abre el portal de autoservicio de clientes de Stripe para gestionar/cancelar suscripción
   */
  async openCustomerPortal(): Promise<void> {
    this.isProcessing.set(true);
    try {
      const { data, error } = await this.supabase.createStripePortalSession();
      if (!error && data?.url) {
        window.location.href = data.url;
      } else {
        this.showToastFeedback('Para cambios de facturación o cancelación, contacta a soporte@cofu.io', 'info');
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.isProcessing.set(false);
    }
  }

  private async checkReturnStatus(): Promise<void> {
    this.route.queryParams.subscribe(async params => {
      const status = params['status'];
      const sessionId = params['session_id'];

      if (status === 'success') {
        this.isProcessing.set(true);
        try {
          // 1. Sincronizar y confirmar estado Pro con Stripe directamente
          await this.supabase.syncStripeSubscription(sessionId);
          // 2. Refrescar el perfil completo de Supabase en memoria
          await this.membership.syncProfileFromSupabase();
          this.showSuccessToast.set(true);
        } catch (e) {
          console.error('[Error de activación de suscripción]', e);
        } finally {
          this.isProcessing.set(false);
          setTimeout(() => {
            this.showSuccessToast.set(false);
            this.router.navigate([], { queryParams: {} });
          }, 3500);
        }
      } else {
        // Si no viene de redirect, verificar si el usuario ya tiene suscripción activa en Stripe
        const session = await this.supabase.getSession();
        if (session?.user && !this.membership.isPremium()) {
          this.supabase.syncStripeSubscription().then(async res => {
            if (res.success && res.is_premium) {
              await this.membership.syncProfileFromSupabase();
            }
          }).catch(() => {});
        }
      }
    });
  }

  private showToastFeedback(message: string, type: 'success' | 'info' = 'success'): void {
    alert(message);
  }
}
