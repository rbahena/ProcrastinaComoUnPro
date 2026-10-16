// ==============================================================================
// Edge Function: stripe-webhook
// Propósito: Recibe y procesa los eventos y cobros de Stripe en tiempo real.
// Activa automáticamente el plan Pro durante los 7 días de prueba y en renovaciones,
// o revierte a plan gratuito si el usuario cancela su suscripción.
// (100% Autónomo: Puedes copiar y pegar todo este archivo directamente
// en el editor web de Supabase Dashboard sin dependencias externas).
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';

serve(async (req) => {
  // Los webhooks de Stripe se envían únicamente mediante método POST
  if (req.method !== 'POST') {
    return new Response('Método no permitido', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';

  if (!signature || !webhookSecret || !stripeKey) {
    console.error('[stripe-webhook] Faltan variables de entorno (STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET) o cabecera stripe-signature.');
    return new Response(
      JSON.stringify({ error: 'Configuración de webhook incompleta' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: any;
  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`[stripe-webhook] Error de verificación de firma: ${err.message}`);
    return new Response(
      JSON.stringify({ error: `Firma criptográfica inválida: ${err.message}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Inicializar cliente administrativo de Supabase (service_role bypass RLS & column triggers)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`[stripe-webhook] Evento recibido: ${event.type} (ID: ${event.id})`);

  try {
    switch (event.type) {
      // 1. Registro inicial o inicio del período de prueba de 7 días
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_uid || session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.warn('[stripe-webhook] checkout.session.completed sin userId asociado');
          break;
        }

        let premiumUntil: string | null = null;
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const endTs = subscription.trial_end || subscription.current_period_end;
            if (endTs) {
              premiumUntil = new Date(endTs * 1000).toISOString();
            }
          } catch (subErr) {
            console.error('[stripe-webhook] Error consultando subscription en Stripe:', subErr);
          }
        }

        // Consultar perfil para verificar si ya se le dieron monedas de bienvenida
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('pro_coins, welcome_coins_awarded')
          .eq('id', userId)
          .maybeSingle();

        const updatePayload: Record<string, any> = {
          is_premium: true,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId || null,
          premium_until: premiumUntil,
          updated_at: new Date().toISOString()
        };

        if (!profile?.welcome_coins_awarded) {
          const currentCoins = Number(profile?.pro_coins) || 0;
          updatePayload.pro_coins = currentCoins + 30;
          updatePayload.welcome_coins_awarded = true;
          console.log(`[stripe-webhook] Otorgando 30 Pro Coins de bienvenida al usuario ${userId}`);
        }

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId);

        if (updateError) {
          console.error('[stripe-webhook] Error actualizando perfil de usuario:', updateError);
        } else {
          console.log(`[stripe-webhook] Usuario ${userId} activado a COFU Pro con éxito.`);
          const vipAvatars = ['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
          const rows = vipAvatars.map(id => ({ user_id: userId, item_id: id, unlock_source: 'admin' }));
          await supabaseAdmin.from('user_unlocked_items').upsert(rows, { onConflict: 'user_id, item_id', ignoreDuplicates: true });
        }
        break;
      }

      // 2. Suscripción actualizada (renovación, paso de prueba a pago activo, o cambio de plan)
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id as string;
        const isActive = ['active', 'trialing'].includes(subscription.status);
        const endTs = (subscription.status === 'trialing' && subscription.trial_end) 
          ? subscription.trial_end 
          : subscription.current_period_end;
        const premiumUntil = endTs 
          ? new Date(endTs * 1000).toISOString() 
          : null;

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_premium: isActive,
            stripe_subscription_id: subscriptionId,
            premium_until: premiumUntil,
            updated_at: new Date().toISOString()
          })
          .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);

        if (updateError) {
          console.error('[stripe-webhook] Error en customer.subscription.updated:', updateError);
        } else {
          console.log(`[stripe-webhook] Suscripción ${subscriptionId} actualizada. is_premium=${isActive}`);
          if (isActive) {
            const vipAvatars = ['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
            const { data: profs } = await supabaseAdmin
              .from('profiles')
              .select('id, pro_coins, welcome_coins_awarded')
              .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);
            if (profs && profs.length > 0) {
              for (const p of profs) {
                if (!p.welcome_coins_awarded) {
                  await supabaseAdmin
                    .from('profiles')
                    .update({
                      pro_coins: (Number(p.pro_coins) || 0) + 30,
                      welcome_coins_awarded: true
                    })
                    .eq('id', p.id);
                  console.log(`[stripe-webhook] Otorgando 30 Pro Coins de bienvenida a ${p.id} en customer.subscription.updated`);
                }

                const rows = vipAvatars.map(id => ({ user_id: p.id, item_id: id, unlock_source: 'admin' }));
                await supabaseAdmin.from('user_unlocked_items').upsert(rows, { onConflict: 'user_id, item_id', ignoreDuplicates: true });
              }
            }
          }
        }
        break;
      }

      // 3. Suscripción cancelada definitivamente (fin de los 7 días de prueba o cancelación total)
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id as string;

        // 1. Obtener los perfiles afectados
        const { data: affectedProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, selected_avatar')
          .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);

        // 2. Revertir estado a Gratuito en profiles
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_premium: false,
            premium_until: null,
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);

        if (updateError) {
          console.error('[stripe-webhook] Error en customer.subscription.deleted:', updateError);
        } else {
          console.log(`[stripe-webhook] Suscripción ${subscriptionId} cancelada. Usuario revertido a Gratuito.`);
        }

        // 3. Revocar exclusivamente los avatares VIP otorgados por suscripción ('admin')
        const vipAvatars = ['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
        if (affectedProfiles && affectedProfiles.length > 0) {
          for (const prof of affectedProfiles) {
            await supabaseAdmin
              .from('user_unlocked_items')
              .delete()
              .eq('user_id', prof.id)
              .in('item_id', vipAvatars)
              .eq('unlock_source', 'admin');

            // 4. Si el usuario tenía equipado un avatar VIP revocado, desequiparlo a 'gato'
            if (vipAvatars.includes(prof.selected_avatar)) {
              await supabaseAdmin
                .from('profiles')
                .update({ selected_avatar: 'gato' })
                .eq('id', prof.id);
            }
          }
          console.log(`[stripe-webhook] Avatares VIP revocados con éxito para ${affectedProfiles.length} perfil(es).`);
        }
        break;
      }

      // 4. Pago periódico de factura exitoso (renovación mensual o anual)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const premiumUntil = subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString() 
            : null;

          await supabaseAdmin
            .from('profiles')
            .update({
              is_premium: true,
              premium_until: premiumUntil,
              updated_at: new Date().toISOString()
            })
            .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);
        }
        break;
      }

      // 5. Cobro fallido de factura
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`[stripe-webhook] Cobro fallido para cliente ${invoice.customer}. Factura: ${invoice.id}`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Evento recibido: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[stripe-webhook handler error]', err);
    return new Response(
      JSON.stringify({ error: 'Error procesando webhook' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
