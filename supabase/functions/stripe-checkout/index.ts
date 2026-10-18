// ==============================================================================
// Edge Function: stripe-checkout
// Propósito: Genera sesiones de pago seguras para suscripciones COFU Pro
// con 1 día de prueba gratuita y cobro recurrente automático en USD.
// (100% Autónomo: Puedes copiar y pegar todo este archivo directamente
// en el editor web de Supabase Dashboard sin dependencias externas).
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req) => {
  // Manejo de preflight CORS para navegadores
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    // Validación de clave secreta de Stripe
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ 
          error: 'STRIPE_NOT_CONFIGURED', 
          message: 'Falta configurar la variable STRIPE_SECRET_KEY en los Secrets de Supabase.' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 1. Validar autenticación del usuario mediante token Bearer
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Falta cabecera de autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('[stripe-checkout] Error al autenticar token:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no autenticado o sesión expirada',
          detail: authError?.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extraer parámetros del plan (Mensual o Anual)
    const body = await req.json().catch(() => ({}));
    const plan: 'monthly' | 'annual' = body.plan === 'annual' ? 'annual' : 'monthly';
    const currency = 'usd';

    // Precios oficiales en centavos USD: Mensual ($4.49 USD) o Anual ($35.88 USD)
    const amount = plan === 'annual' ? 3588 : 449;
    const interval = plan === 'annual' ? 'year' : 'month';

    // 3. Obtener perfil de usuario
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, email, username, pro_coins, welcome_coins_awarded, is_premium, premium_until')
      .eq('id', user.id)
      .maybeSingle();

    // Activación directa de prueba gratuita de 1 día (demo in-app / prueba sin Stripe)
    if (body.action === 'activate-trial') {
      const trialDays = 1;
      const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
      let welcomeBonusGranted = false;
      const updatePayload: Record<string, any> = {
        is_premium: true,
        premium_until: trialEnd,
        updated_at: new Date().toISOString()
      };

      // Otorgar 50 Pro Coins de bienvenida al activar la prueba si aún no se han concedido
      if (!profile?.welcome_coins_awarded) {
        const currentCoins = Number(profile?.pro_coins) || 0;
        updatePayload.pro_coins = currentCoins + 50;
        updatePayload.welcome_coins_awarded = true;
        welcomeBonusGranted = true;
        console.log(`[stripe-checkout activate-trial] Otorgando 50 Pro Coins de bienvenida a ${user.id}`);
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (updateError) {
        console.error('[stripe-checkout activate-trial] Error actualizando perfil:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const vipAvatars = ['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
      const rows = vipAvatars.map(id => ({ user_id: user.id, item_id: id, unlock_source: 'admin' }));
      await supabaseAdmin.from('user_unlocked_items').upsert(rows, { onConflict: 'user_id, item_id', ignoreDuplicates: true });

      return new Response(
        JSON.stringify({
          success: true,
          is_premium: true,
          premium_until: trialEnd,
          welcome_coins_awarded: welcomeBonusGranted,
          bonus_coins: welcomeBonusGranted ? 50 : 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancelación explícita de suscripción
    if (body.action === 'cancel-subscription') {
      const customerId = profile?.stripe_customer_id;
      const subscriptionId = profile?.stripe_subscription_id;

      if (subscriptionId) {
        try {
          await stripe.subscriptions.cancel(subscriptionId);
        } catch (err) {
          console.warn('[stripe-checkout cancel] Error cancelando sub por ID:', err);
        }
      }

      if (customerId) {
        try {
          const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all' });
          for (const sub of subs.data) {
            if (['active', 'trialing'].includes(sub.status)) {
              try {
                await stripe.subscriptions.cancel(sub.id);
              } catch (err) {
                console.warn('[stripe-checkout cancel] Error cancelando sub del cliente:', err);
              }
            }
          }
        } catch (err) {
          console.warn('[stripe-checkout cancel] Error listando suscripciones:', err);
        }
      }

      await supabaseAdmin
        .from('profiles')
        .update({
          is_premium: false,
          premium_until: null,
          stripe_subscription_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      const vipAvatars = ['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
      await supabaseAdmin
        .from('user_unlocked_items')
        .delete()
        .eq('user_id', user.id)
        .in('item_id', vipAvatars)
        .eq('unlock_source', 'admin');

      if (vipAvatars.includes(profile?.selected_avatar)) {
        await supabaseAdmin
          .from('profiles')
          .update({ selected_avatar: 'gato' })
          .eq('id', user.id);
      }

      return new Response(
        JSON.stringify({ success: true, is_premium: false, is_cancelled: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sincronización o verificación inmediata de suscripción Pro
    if (body.action === 'sync-subscription' || body.action === 'verify-session') {
      let customerId = profile?.stripe_customer_id;
      let subscriptionId: string | null = null;
      let isProActive = false;
      let premiumUntil: string | null = null;

      // A) Si viene sessionId, recuperar la sesión directamente
      if (body.sessionId) {
        try {
          const sessionObj = await stripe.checkout.sessions.retrieve(body.sessionId);
          if (sessionObj.customer) customerId = sessionObj.customer as string;
          if (sessionObj.subscription) subscriptionId = sessionObj.subscription as string;
          if (sessionObj.status === 'complete' || sessionObj.payment_status === 'paid' || sessionObj.payment_status === 'no_payment_required') {
            isProActive = true;
          }
        } catch (err) {
          console.error('[stripe-checkout sync] Error consultando sessionId:', err);
        }
      }

      // B) Si tenemos subscriptionId directamente, consultar la suscripción en Stripe
      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const isCancelled = sub.cancel_at_period_end === true || sub.status === 'canceled' || Boolean(sub.canceled_at);
          if (['active', 'trialing'].includes(sub.status) && !isCancelled) {
            isProActive = true;
            const endTs = sub.trial_end || sub.current_period_end;
            if (endTs) {
              premiumUntil = new Date(endTs * 1000).toISOString();
            }
          }
        } catch (subErr) {
          console.error('[stripe-checkout sync] Error consultando subscription:', subErr);
        }
      }

      let hasHadPriorSubscription = false;
      // C) Si tenemos customerId y aún no validamos subscriptionId, consultar las suscripciones del cliente en Stripe
      if (customerId && !isProActive) {
        try {
          const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 5 });
          if (subs.data && subs.data.length > 0) {
            hasHadPriorSubscription = true;
          }
          for (const sub of subs.data) {
            const isCancelled = sub.cancel_at_period_end === true || sub.status === 'canceled' || Boolean(sub.canceled_at);
            if (['active', 'trialing'].includes(sub.status) && !isCancelled) {
              isProActive = true;
              subscriptionId = sub.id;
              const endTs = sub.trial_end || sub.current_period_end;
              if (endTs) {
                premiumUntil = new Date(endTs * 1000).toISOString();
              }
              break;
            }
          }
        } catch (subErr) {
          console.error('[stripe-checkout sync] Error buscando suscripciones:', subErr);
        }
      }

      // D) Solo si NO existe cliente en Stripe (ej. prueba manual/offline), respetar premium_until no expirado
      if (!customerId && !isProActive && profile?.is_premium === true && profile?.premium_until && new Date(profile.premium_until).getTime() > Date.now()) {
        isProActive = true;
        premiumUntil = profile?.premium_until || null;
      }

      if (isProActive) {
        const updatePayload: Record<string, any> = {
          is_premium: true,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId || profile?.stripe_subscription_id || null,
          premium_until: premiumUntil,
          updated_at: new Date().toISOString()
        };

        // Otorgar 50 Pro Coins de bienvenida al iniciar prueba o suscripción si aún no se han concedido
        let welcomeBonusGranted = false;
        if (!profile?.welcome_coins_awarded) {
          const currentCoins = Number(profile?.pro_coins) || 0;
          updatePayload.pro_coins = currentCoins + 50;
          updatePayload.welcome_coins_awarded = true;
          welcomeBonusGranted = true;
          console.log(`[stripe-checkout sync] Otorgando 50 Pro Coins de bienvenida a ${user.id}`);
        }

        await supabaseAdmin
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id);

        const vipAvatars = ['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
        const rows = vipAvatars.map(id => ({ user_id: user.id, item_id: id, unlock_source: 'admin' }));
        await supabaseAdmin.from('user_unlocked_items').upsert(rows, { onConflict: 'user_id, item_id', ignoreDuplicates: true });

        return new Response(
          JSON.stringify({ 
            success: true, 
            is_premium: true, 
            customerId, 
            subscriptionId, 
            premiumUntil,
            welcome_coins_awarded: welcomeBonusGranted,
            bonus_coins: welcomeBonusGranted ? 50 : 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si el periodo expiró definitivamente o fue cancelada:
      const cancelPayload: Record<string, any> = {
        is_premium: false,
        premium_until: null,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString()
      };
      if (hasHadPriorSubscription && !profile?.welcome_coins_awarded) {
        cancelPayload.welcome_coins_awarded = true;
      }

      await supabaseAdmin
        .from('profiles')
        .update(cancelPayload)
        .eq('id', user.id);

      const vipAvatars = ['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
      await supabaseAdmin
        .from('user_unlocked_items')
        .delete()
        .eq('user_id', user.id)
        .in('item_id', vipAvatars)
        .eq('unlock_source', 'admin');

      if (vipAvatars.includes(profile?.selected_avatar)) {
        await supabaseAdmin
          .from('profiles')
          .update({ selected_avatar: 'gato' })
          .eq('id', user.id);
      }

      return new Response(
        JSON.stringify({ success: true, is_premium: false, is_cancelled: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Crear o reutilizar cliente de Stripe
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || undefined,
        name: profile?.username || undefined,
        metadata: {
          supabase_uid: user.id
        }
      });
      customerId = customer.id;

      // Guardar customer ID en el perfil del usuario
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // 5. Configurar URLs de éxito y cancelación
    const origin = req.headers.get('origin') || 'https://procrastinacomonpro.com';

    // 6. Configurar datos de suscripción: 1 día de prueba gratuita garantizado
    const subscriptionData: Record<string, any> = {
      trial_period_days: 1,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel'
        }
      },
      metadata: {
        supabase_uid: user.id,
        plan: plan,
        currency: currency
      }
    };

    // 7. Crear Checkout Session en Stripe
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_update: {
        address: 'auto'
      },
      client_reference_id: user.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `COFU Pro (${plan === 'annual' ? 'Plan Anual' : 'Plan Mensual'}) 👑`,
              description: 'Prueba de 1 día gratis. Acceso total a Salas de Coworking, Ligas, Desbloqueables Legendarios y Pro Coins.'
            },
            unit_amount: amount,
            recurring: {
              interval: interval
            }
          },
          quantity: 1
        }
      ],
      metadata: {
        supabase_uid: user.id,
        plan: plan,
        currency: currency
      },
      subscription_data: subscriptionData,
      success_url: `${origin}${body.successPath || '/home'}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/membresia?status=cancelled`
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[stripe-checkout error]', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al crear la sesión de pago' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
