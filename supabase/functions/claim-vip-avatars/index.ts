// ==============================================================================
// Edge Function: claim-vip-avatars
// Propósito: Valida criptográficamente la sesión del usuario en Supabase Auth,
// verifica en la base de datos que cuenta con suscripción o prueba activa (is_premium = true),
// y registra de forma segura y blindada los 6 avatares VIP en user_unlocked_items
// para habilitar la descarga de ilustraciones en alta resolución desde Supabase Storage.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

const VIP_AVATARS = ['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 1. Validar autenticación del usuario mediante token Bearer
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'Falta cabecera de autenticación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[claim-vip-avatars] Error al autenticar token:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_TOKEN', message: 'Token de sesión no válido o expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar estatus Premium directamente en la base de datos (inmutable desde el cliente)
    const { data: profile, error: profError } = await supabaseAdmin
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (profError || !profile) {
      console.error('[claim-vip-avatars] Perfil no encontrado:', profError);
      return new Response(
        JSON.stringify({ success: false, error: 'PROFILE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.is_premium) {
      console.warn(`[claim-vip-avatars] Usuario ${user.id} intentó reclamar VIP sin ser premium.`);
      return new Response(
        JSON.stringify({ success: false, error: 'NOT_PREMIUM', message: 'Requiere suscripción o prueba activa de COFU Pro' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Desbloqueo seguro de los 6 avatares VIP en user_unlocked_items
    const rows = VIP_AVATARS.map(item_id => ({
      user_id: user.id,
      item_id,
      unlock_source: 'admin'
    }));

    const { error: upsertError } = await supabaseAdmin
      .from('user_unlocked_items')
      .upsert(rows, { onConflict: 'user_id, item_id', ignoreDuplicates: true });

    if (upsertError) {
      console.error('[claim-vip-avatars] Error al registrar avatares VIP:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: 'DATABASE_ERROR', message: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[claim-vip-avatars] Avatares VIP desbloqueados legítimamente para usuario ${user.id}`);
    return new Response(
      JSON.stringify({ success: true, items: VIP_AVATARS }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[claim-vip-avatars] Error inesperado:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR', message: err?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
