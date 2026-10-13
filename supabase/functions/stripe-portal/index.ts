// ==============================================================================
// Edge Function: stripe-portal
// Propósito: Genera una sesión del portal de autoservicio de clientes
// para que el usuario pueda cambiar su tarjeta de crédito, ver facturas
// o cancelar su suscripción con 1 solo clic.
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
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ 
          error: 'STRIPE_NOT_CONFIGURED', 
          message: 'Falta configurar STRIPE_SECRET_KEY en los Secrets de Supabase.' 
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
      console.error('[stripe-portal] Error al autenticar token:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no autenticado o sesión expirada',
          detail: authError?.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Obtener el stripe_customer_id del usuario desde profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No se encontró una suscripción activa para este usuario.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Crear sesión del portal de cliente de Stripe
    const origin = req.headers.get('origin') || 'https://procrastinacomonpro.com';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/membresia`
    });

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[stripe-portal error]', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al generar la sesión del portal de facturación' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
