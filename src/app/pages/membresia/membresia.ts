import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SupabaseService } from '../../services/supabase.service';
import { TranslatePipe, TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-membresia',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
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
    this.notifyViewPlans();
  }

  private notifyViewPlans(): void {
    const user = this.supabase.currentUser();
    const email = user?.email || this.membership.getCurrentUserEmail();
    if (!email) return;

    const username = this.membership.userName() || email.split('@')[0];
    const planStatus = this.membership.isPremium() ? 'Plan Pro Activo' : 'Plan Básico (Gratis)';

    this.supabase.notifyTelegramAuth(
      email,
      username,
      'Visita a Mi Plan',
      'VIEW_PLANS',
      planStatus
    );
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
      this.router.navigate(['/login'], { queryParams: { redirect: '/membership' } });
      return;
    }

    const user = this.supabase.currentUser();
    const email = user?.email || this.membership.getCurrentUserEmail();
    const username = this.membership.userName() || (email ? email.split('@')[0] : 'Guerrero');
    const planDetail = this.isAnnual() ? 'Anual ($35.88 USD/año con 1 día gratis)' : 'Mensual ($4.49 USD/mes con 1 día gratis)';

    if (email) {
      this.supabase.notifyTelegramAuth(
        email,
        username,
        'Probar 1 día gratis',
        'START_TRIAL',
        planDetail
      );
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
        return;
      }

      const confirmCancel = confirm(
        '¿Estás seguro de que deseas cancelar tu suscripción a COFU Pro? Perderás acceso a las salas de co-working y avatares legendarios.'
      );
      if (confirmCancel) {
        await this.supabase.cancelStripeSubscription();
        await this.membership.syncProfileFromSupabase();
        this.showToastFeedback('Tu suscripción a COFU Pro ha sido cancelada exitosamente.', 'info');
      }
    } catch (e) {
      console.error(e);
      this.showToastFeedback('Para cambios de facturación o cancelación, contacta a soporte@cofu.io', 'info');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async refreshSubscriptionStatus(): Promise<void> {
    const session = await this.supabase.getSession();
    if (session?.user) {
      try {
        await this.supabase.syncStripeSubscription();
        await this.membership.syncProfileFromSupabase();
      } catch (e) {
        console.warn('[Membresia] Error al sincronizar con Stripe:', e);
      }
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
        } catch (e) {
          console.error('[Error de activación de suscripción]', e);
        } finally {
          this.isProcessing.set(false);
          // Redirigir de inmediato a Home con status=success
          this.router.navigate(['/home'], {
            queryParams: { status: 'success', session_id: sessionId },
            replaceUrl: true
          });
        }
      } else {
        if (status === 'cancelled') {
          this.router.navigate([], { queryParams: {}, replaceUrl: true });
        }
        // Siempre sincronizar el estatus real de Stripe al ingresar o regresar a Membresía
        await this.refreshSubscriptionStatus();
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.refreshSubscriptionStatus();
      }, { once: false });
    }
  }

  private showToastFeedback(message: string, type: 'success' | 'info' = 'success'): void {
    alert(message);
  }
}
