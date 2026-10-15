// ==============================================================================
// Edge Function: stripe-checkout
// Propósito: Genera sesiones de pago seguras para suscripciones COFU Pro
// con 7 días de prueba gratuita y cobro recurrente automático en USD.
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
      .select('stripe_customer_id, email, username')
      .eq('id', user.id)
      .maybeSingle();

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

      // B) Si tenemos customerId, consultar las suscripciones del cliente en Stripe
      if (customerId) {
        try {
          const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 3 });
          for (const sub of subs.data) {
            if (['active', 'trialing'].includes(sub.status)) {
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

      // Opción A: Si no hay suscripción activa en Stripe, pero el periodo de prueba premium_until aún no expira, se respeta el tiempo
      if (!isProActive && profile?.premium_until && new Date(profile.premium_until).getTime() > Date.now()) {
        isProActive = true;
        premiumUntil = profile.premium_until;
      }

      if (isProActive) {
        await supabaseAdmin
          .from('profiles')
          .update({
            is_premium: true,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId || profile?.stripe_subscription_id || null,
            premium_until: premiumUntil,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        const vipAvatars = ['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
        const rows = vipAvatars.map(id => ({ user_id: user.id, item_id: id, unlock_source: 'admin' }));
        await supabaseAdmin.from('user_unlocked_items').upsert(rows, { onConflict: 'user_id, item_id', ignoreDuplicates: true });

        return new Response(
          JSON.stringify({ success: true, is_premium: true, customerId, subscriptionId, premiumUntil }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si el periodo expiró definitivamente o no tiene suscripción:
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
        JSON.stringify({ success: false, is_premium: false }),
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

    // 6. Crear Checkout Session en Stripe con 7 DÍAS DE PRUEBA GRATIS
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
              description: 'Prueba de 7 días gratis. Acceso total a Salas de Coworking, Ligas, Desbloqueables Legendarios y Pro Coins.'
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
      subscription_data: {
        trial_period_days: 7,
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
      },
      success_url: `${origin}/membresia?status=success&session_id={CHECKOUT_SESSION_ID}`,
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
