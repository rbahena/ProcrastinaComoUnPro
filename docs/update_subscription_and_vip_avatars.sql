-- ==============================================================================
-- 🛡️ ACTUALIZACIÓN DE BASE DE DATOS SUPABASE: CICLO DE VIDA DE COFU PRO Y AVATARES VIP
-- Archivo: docs/update_subscription_and_vip_avatars.sql
-- Propósito: 
--   1. Automatizar la adjudicación segura de los 6 avatares VIP al activar COFU Pro.
--   2. Garantizar la revocación atómica de avatares VIP al vencer o cancelar la membresía.
--   3. Evitar avatares fantasma (si el usuario tenía equipado un VIP, vuelve a 'gato').
--   4. Blindar el acceso mediante Políticas RLS en Supabase Storage (bucket 'avatars').
--   5. Evitar inyección de avatares no desbloqueados mediante PATCH a profiles.
-- (100% Autónomo e Idempotente: Puedes copiar y pegar todo este archivo directamente 
--  en el editor web de Supabase Dashboard en la pestaña SQL Editor y presionar RUN).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. VERIFICAR COLUMNAS EN public.profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100) DEFAULT NULL;

-- ------------------------------------------------------------------------------
-- 2. BLINDAJE DE COLUMNAS Y CONTROL DE ACCESO EN public.profiles
-- ------------------------------------------------------------------------------
-- Evita que clientes authenticated/anon manipulen estatus de suscripción o equipen
-- avatares que no han desbloqueado legítimamente.
CREATE OR REPLACE FUNCTION public.check_profile_column_permissions()
RETURNS TRIGGER 
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Si la modificación proviene de una función de servidor autorizada (RPC con bypass), permitirla
    IF current_setting('app.settle_session', true) = 'true' THEN
        RETURN NEW;
    END IF;

    -- Si el rol de ejecución es cliente directo (PostgREST / anon / authenticated), blindar columnas
    IF current_user IN ('authenticated', 'anon') THEN
        -- A. Facturación y suscripción Pro (Solo modificable por Stripe Webhook vía service_role)
        NEW.is_premium := OLD.is_premium;
        NEW.premium_until := OLD.premium_until;
        NEW.stripe_customer_id := OLD.stripe_customer_id;
        NEW.stripe_subscription_id := OLD.stripe_subscription_id;

        -- B. Economía y Monedas de Tienda (ProCoins)
        NEW.pro_coins := OLD.pro_coins;

        -- C. Telemetría de concentración y Puntos de Clasificación (XP)
        NEW.focus_points := OLD.focus_points;
        NEW.focus_tomatoes := OLD.focus_tomatoes;
        NEW.completed_objectives := OLD.completed_objectives;
        NEW.abandoned_sessions := OLD.abandoned_sessions;

        -- D. Rachas de disciplina (Streaks)
        NEW.streak_days := OLD.streak_days;
        NEW.longest_streak := OLD.longest_streak;
        NEW.last_focus_date := OLD.last_focus_date;

        -- E. Palmarés competitivo y medallas del Podio
        NEW.podium_wins := OLD.podium_wins;
        NEW.gold_medals := OLD.gold_medals;
        NEW.silver_medals := OLD.silver_medals;
        NEW.bronze_medals := OLD.bronze_medals;

        -- F. Blindaje de avatar equipado: no se permite equipar lo que no se posee
        IF NEW.selected_avatar IS DISTINCT FROM OLD.selected_avatar THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.catalog_items c
                WHERE c.id = NEW.selected_avatar AND c.is_initial = TRUE
            ) AND NOT EXISTS (
                SELECT 1 FROM public.user_unlocked_items u
                WHERE u.user_id = NEW.id AND u.item_id = NEW.selected_avatar
            ) THEN
                NEW.selected_avatar := OLD.selected_avatar;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_profile_columns ON public.profiles;
CREATE TRIGGER tr_protect_profile_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_column_permissions();

-- ------------------------------------------------------------------------------
-- 3. TRIGGER AUTOMÁTICO: CICLO DE VIDA PREMIUM EN public.profiles
-- ------------------------------------------------------------------------------
-- Se dispara automáticamente cada vez que un proceso autorizado altera 'is_premium'.
-- Si pasa a TRUE: Adjudica de inmediato los 6 avatares VIP en user_unlocked_items.
-- Si pasa a FALSE: Revoca de inmediato los avatares VIP de user_unlocked_items
--                 y desequipa el avatar a 'gato' si tenía un VIP seleccionado.
CREATE OR REPLACE FUNCTION public.handle_profile_premium_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_vip_avatars TEXT[] := ARRAY['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
BEGIN
    -- Ignorar si la llamada proviene de un cliente no autorizado
    IF current_user IN ('authenticated', 'anon') THEN
        RETURN NEW;
    END IF;

    -- CASO A: El usuario pierde el estatus Premium (Fin de prueba de 7 días o cancelación)
    IF (OLD.is_premium = TRUE AND NEW.is_premium = FALSE) THEN
        -- 1. Revocar exclusivamente los avatares VIP otorgados por membresía ('admin')
        -- (Si el usuario compró algún avatar con monedas 'coin_purchase', ese se conserva)
        DELETE FROM public.user_unlocked_items
        WHERE user_id = NEW.id
          AND item_id = ANY(v_vip_avatars)
          AND unlock_source = 'admin';

        -- 2. Evitar avatar fantasma: si tenía equipado un avatar VIP revocado, volver a 'gato'
        IF NEW.selected_avatar = ANY(v_vip_avatars) THEN
            NEW.selected_avatar := 'gato';
        END IF;
    END IF;

    -- CASO B: El usuario activa Premium Pro (Inicio de prueba de 7 días o pago activo)
    IF (NEW.is_premium = TRUE AND (OLD.is_premium IS NULL OR OLD.is_premium = FALSE)) THEN
        -- Adjudicar automáticamente los 6 avatares VIP con procedencia 'admin'
        INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
        SELECT NEW.id, unnest(v_vip_avatars), 'admin'
        ON CONFLICT (user_id, item_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Asegurar la vinculación del trigger
DROP TRIGGER IF EXISTS tr_handle_profile_premium_status_change ON public.profiles;

CREATE TRIGGER tr_handle_profile_premium_status_change
BEFORE UPDATE OF is_premium ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_premium_status_change();

-- ------------------------------------------------------------------------------
-- 4. FUNCIÓN RPC: COMPRA TRANSACCIONAL CON PRO COINS (buy_catalog_item)
-- ------------------------------------------------------------------------------
-- Realiza la deducción atómica de monedas y desbloqueo seguro en user_unlocked_items
CREATE OR REPLACE FUNCTION public.buy_catalog_item(p_item_id VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_item RECORD;
    v_user_coins BIGINT;
BEGIN
    PERFORM set_config('app.settle_session', 'true', true);

    -- A. Validar autenticación
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    -- B. Obtener item del catálogo maestro
    SELECT * INTO v_item FROM public.catalog_items WHERE id = p_item_id AND is_active = TRUE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'El artículo no existe o está inactivo');
    END IF;

    -- C. Si ya lo posee, responder con éxito de forma idempotente
    IF EXISTS (SELECT 1 FROM public.user_unlocked_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
        RETURN json_build_object('success', TRUE, 'message', 'Ya posees este artículo');
    END IF;

    -- D. Obtener saldo de monedas del perfil
    SELECT pro_coins INTO v_user_coins FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    
    -- Validar fondos suficientes con COALESCE defensivo
    IF COALESCE(v_user_coins, 0) < v_item.cost_coins THEN
        RETURN json_build_object(
            'success', FALSE, 
            'error', 'Monedas insuficientes en el servidor (Tienes ' || COALESCE(v_user_coins, 0) || ', necesitas ' || v_item.cost_coins || ')'
        );
    END IF;

    -- E. Descontar monedas del perfil
    UPDATE public.profiles
    SET pro_coins = pro_coins - v_item.cost_coins
    WHERE id = v_user_id;

    -- F. Insertar en user_unlocked_items (idempotente)
    INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
    VALUES (v_user_id, p_item_id, 'coin_purchase')
    ON CONFLICT (user_id, item_id) DO NOTHING;

    RETURN json_build_object(
        'success', TRUE,
        'item_id', p_item_id,
        'cost', v_item.cost_coins,
        'remaining_coins', v_user_coins - v_item.cost_coins
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.buy_catalog_item(VARCHAR) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. FUNCIÓN RPC: RECLAMAR AVATARES VIP (claim_premium_vip_avatars)
-- ------------------------------------------------------------------------------
-- Permite al cliente autenticado sincronizar de inmediato sus avatares VIP tras el checkout
CREATE OR REPLACE FUNCTION public.claim_premium_vip_avatars()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_is_premium BOOLEAN;
    v_vip_items TEXT[] := ARRAY['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
    v_item TEXT;
    v_count INT := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
    END IF;

    SELECT is_premium INTO v_is_premium
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_is_premium IS NOT TRUE THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'NOT_PREMIUM');
    END IF;

    FOREACH v_item IN ARRAY v_vip_items
    LOOP
        INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
        VALUES (v_user_id, v_item, 'admin')
        ON CONFLICT (user_id, item_id) DO NOTHING;
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'unlocked_count', v_count, 'items', v_vip_items);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_premium_vip_avatars() TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. FUNCIÓN RPC: REVOCAR AVATARES VIP DE UN USUARIO (revoke_user_vip_avatars)
-- ------------------------------------------------------------------------------
-- Función de servidor de alta seguridad restringida a service_role
CREATE OR REPLACE FUNCTION public.revoke_user_vip_avatars(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_revoked_count INT;
    v_vip_avatars TEXT[] := ARRAY['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
BEGIN
    -- 1. Desactivar en profiles (esto también disparará el trigger preventivo)
    UPDATE public.profiles
    SET is_premium = FALSE,
        premium_until = NULL,
        stripe_subscription_id = NULL
    WHERE id = p_user_id;

    -- 2. Eliminar avatares VIP de membresía
    DELETE FROM public.user_unlocked_items
    WHERE user_id = p_user_id
      AND item_id = ANY(v_vip_avatars)
      AND unlock_source = 'admin';
    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    -- 3. Desequipar si tenía uno equipado
    UPDATE public.profiles
    SET selected_avatar = 'gato'
    WHERE id = p_user_id
      AND selected_avatar = ANY(v_vip_avatars);

    RETURN jsonb_build_object('success', TRUE, 'revoked_count', v_revoked_count);
END;
$$;

-- Restringir ejecución exclusivamente al rol administrativo
REVOKE EXECUTE ON FUNCTION public.revoke_user_vip_avatars(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_vip_avatars(UUID) TO service_role;

-- ------------------------------------------------------------------------------
-- 7. FUNCIÓN RPC: EXPIRACIÓN AUTOMÁTICA DE PRUEBA / MEMBRESÍA
-- ------------------------------------------------------------------------------
-- Verifica si la fecha premium_until ha vencido y ejecuta la revocación atómica
CREATE OR REPLACE FUNCTION public.check_user_premium_expiration()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_was_expired BOOLEAN := FALSE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
    END IF;

    UPDATE public.profiles
    SET is_premium = FALSE,
        premium_until = NULL,
        stripe_subscription_id = NULL
    WHERE id = v_user_id
      AND is_premium = TRUE
      AND premium_until IS NOT NULL
      AND premium_until <= NOW();

    GET DIAGNOSTICS v_was_expired = ROW_COUNT;

    RETURN jsonb_build_object('success', TRUE, 'was_expired', (v_was_expired > 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_premium_expiration() TO authenticated;

-- Versión para backend/cron con parámetro p_user_id
CREATE OR REPLACE FUNCTION public.check_user_premium_expiration(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_was_expired BOOLEAN := FALSE;
BEGIN
    UPDATE public.profiles
    SET is_premium = FALSE,
        premium_until = NULL,
        stripe_subscription_id = NULL
    WHERE id = p_user_id
      AND is_premium = TRUE
      AND premium_until IS NOT NULL
      AND premium_until <= NOW();

    GET DIAGNOSTICS v_was_expired = ROW_COUNT;

    RETURN jsonb_build_object('success', TRUE, 'was_expired', (v_was_expired > 0));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_user_premium_expiration(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_premium_expiration(UUID) TO service_role;

-- ------------------------------------------------------------------------------
-- 8. ACTUALIZAR POLÍTICA DE CONSULTA EN storage.objects (Bucket 'avatars')
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Avatares accesibles solo si desbloqueados o iniciales" ON storage.objects;

CREATE POLICY "Avatares accesibles solo si desbloqueados o iniciales"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'avatars'
    AND (
        -- Regla A: Es un avatar inicial gratuito
        EXISTS (
            SELECT 1 FROM public.catalog_items c
            WHERE c.id = regexp_replace(storage.objects.name, '\.[^.]+$', '')
              AND c.is_initial = TRUE
        )
        OR
        -- Regla B: El usuario autenticado lo ha desbloqueado legítimamente
        (
            auth.uid() IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.user_unlocked_items u
                WHERE u.user_id = auth.uid()
                  AND u.item_id = regexp_replace(storage.objects.name, '\.[^.]+$', '')
            )
        )
        OR
        -- Regla C: El usuario autenticado cuenta con prueba o suscripción Premium activa
        (
            auth.uid() IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.is_premium = TRUE
                  AND (p.premium_until IS NULL OR p.premium_until > NOW())
            )
            AND regexp_replace(storage.objects.name, '\.[^.]+$', '') IN ('leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante')
        )
        OR
        -- Regla D: El avatar está equipado por algún usuario activo en profiles (para medalleros comunitarios)
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.selected_avatar = regexp_replace(storage.objects.name, '\.[^.]+$', '')
        )
    )
);

-- ------------------------------------------------------------------------------
-- 9. SINCRONIZACIÓN RETROACTIVA DE CUENTAS PREMIUM Y NO-PREMIUM EXISTENTES
-- ------------------------------------------------------------------------------
-- Para los usuarios que actualmente tienen is_premium = TRUE, asegurar sus 6 avatares VIP
INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
SELECT p.id, v.item_id, 'admin'
FROM public.profiles p
CROSS JOIN (
    VALUES ('leon'), ('tigre'), ('fenix'), ('grifo'), ('lince'), ('elefante')
) AS v(item_id)
WHERE p.is_premium = TRUE
ON CONFLICT (user_id, item_id) DO NOTHING;

-- Para los usuarios que tienen is_premium = FALSE, revocar cualquier avatar VIP residual
DELETE FROM public.user_unlocked_items
WHERE unlock_source = 'admin'
  AND item_id IN ('leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante')
  AND user_id IN (SELECT id FROM public.profiles WHERE is_premium = FALSE);

-- Desequipar avatar VIP en usuarios no premium
UPDATE public.profiles
SET selected_avatar = 'gato'
WHERE is_premium = FALSE
  AND selected_avatar IN ('leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante');

-- ------------------------------------------------------------------------------
-- 10. RPC: AVANCE SEGURO DE CUALIDADES Y ADJUDICACIÓN DE AVATARES DE MÉRITO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_user_quality_progress(
    p_quality_id VARCHAR,
    p_increment INTEGER DEFAULT 1
)
RETURNS JSON 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_quality RECORD;
    v_progress RECORD;
    v_profile_streak INTEGER := 0;
    v_new_progress INTEGER;
    v_is_now_unlocked BOOLEAN := FALSE;
    v_newly_unlocked BOOLEAN := FALSE;
BEGIN
    -- 1. Validar usuario autenticado
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    -- 2. Obtener definición de la cualidad maestra
    SELECT * INTO v_quality FROM public.master_qualities WHERE id = p_quality_id AND is_active = TRUE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'La cualidad no existe o está inactiva');
    END IF;

    -- 3. Asegurar que exista la fila de progreso para el usuario
    INSERT INTO public.user_quality_progress (user_id, quality_id, current_progress, is_unlocked)
    VALUES (v_user_id, p_quality_id, 0, FALSE)
    ON CONFLICT (user_id, quality_id) DO NOTHING;

    -- Bloquear la fila para actualización atómica
    SELECT * INTO v_progress FROM public.user_quality_progress 
    WHERE user_id = v_user_id AND quality_id = p_quality_id 
    FOR UPDATE;

    -- 4. Si ya estaba desbloqueada, asegurar que el avatar esté en user_unlocked_items y retornar
    IF v_progress.is_unlocked THEN
        IF v_quality.associated_avatar_id IS NOT NULL THEN
            INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
            VALUES (v_user_id, v_quality.associated_avatar_id, 'quality_reward')
            ON CONFLICT (user_id, item_id) DO NOTHING;
        END IF;

        RETURN json_build_object(
            'success', TRUE,
            'quality_id', p_quality_id,
            'current_progress', v_progress.current_progress,
            'target_total', v_quality.target_total,
            'is_unlocked', TRUE,
            'newly_unlocked', FALSE,
            'unlocked_avatar_id', v_quality.associated_avatar_id
        );
    END IF;

    -- 5. Calcular nuevo progreso acotado al objetivo respetando el incremento o la racha activa del perfil
    IF p_quality_id = 'constancia' THEN
        SELECT COALESCE(streak_days, 0) INTO v_profile_streak FROM public.profiles WHERE id = v_user_id;
        v_new_progress := LEAST(v_quality.target_total, GREATEST(v_progress.current_progress + GREATEST(1, COALESCE(p_increment, 1)), v_profile_streak));
    ELSE
        v_new_progress := LEAST(v_quality.target_total, v_progress.current_progress + GREATEST(1, COALESCE(p_increment, 1)));
    END IF;

    v_is_now_unlocked := (v_new_progress >= v_quality.target_total);
    v_newly_unlocked := v_is_now_unlocked AND NOT v_progress.is_unlocked;

    -- 6. Actualizar registro de progreso
    UPDATE public.user_quality_progress
    SET 
        current_progress = v_new_progress,
        is_unlocked = v_is_now_unlocked,
        unlocked_at = CASE WHEN v_newly_unlocked THEN TIMEZONE('utc'::text, NOW()) ELSE unlocked_at END,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE user_id = v_user_id AND quality_id = p_quality_id;

    -- 7. Si se completó el reto, otorgar el avatar correspondiente en el inventario
    IF v_is_now_unlocked AND v_quality.associated_avatar_id IS NOT NULL THEN
        INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
        VALUES (v_user_id, v_quality.associated_avatar_id, 'quality_reward')
        ON CONFLICT (user_id, item_id) DO NOTHING;
    END IF;

    -- 8. Respuesta estructurada
    RETURN json_build_object(
        'success', TRUE,
        'quality_id', p_quality_id,
        'current_progress', v_new_progress,
        'target_total', v_quality.target_total,
        'is_unlocked', v_is_now_unlocked,
        'newly_unlocked', v_newly_unlocked,
        'unlocked_avatar_id', v_quality.associated_avatar_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.advance_user_quality_progress(VARCHAR, INTEGER) TO authenticated;

-- ------------------------------------------------------------------------------
-- 11. REGISTRO Y CALIBRACIÓN DE LOS 14 ESTILOS DE CRONÓMETRO EN CATALOG_ITEMS
-- ------------------------------------------------------------------------------
ALTER TABLE public.catalog_items 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO public.catalog_items (
    id, category, tier, stars, emoji, color, cost_coins, is_initial, is_premium, required_quality_id,
    coins_per_pomodoro, pause_penalty_coins, boss_damage_points, boss_heal_points,
    name, description
) VALUES
-- 1. ESENCIALES Y MINIMALISTAS (3) - GRATUITOS INICIALES
('digital', 'timer', 'Común', 1, '⏱️', '#3b82f6', 0, TRUE, FALSE, NULL, 0, 0, 0, 0, '{"es": "Cronómetro Digital", "en": "Digital Timer"}', '{"es": "Reloj digital clásico nítido de alta precisión", "en": "Classic crisp high-precision digital clock"}'),
('ring', 'timer', 'Común', 1, '⭕', '#10b981', 0, TRUE, FALSE, NULL, 0, 0, 0, 0, '{"es": "Cronómetro de Anillo", "en": "Ring Timer"}', '{"es": "Círculo de progreso continuo con efecto respiración", "en": "Continuous progress circle with breathing effect"}'),
('line', 'timer', 'Común', 1, '➖', '#fbbf24', 0, TRUE, FALSE, NULL, 0, 0, 0, 0, '{"es": "Cronómetro de Barra", "en": "Bar Timer"}', '{"es": "Línea de progreso horizontal minimalista y despejada", "en": "Minimalist and uncluttered horizontal progress line"}'),

-- 2. ELEMENTOS Y OBJETOS (4) - TIENDA PRO COINS (150 COINS)
('fire', 'timer', 'Raro', 2, '🔥', '#f59e0b', 150, FALSE, FALSE, NULL, 0, 0, 0, 0, '{"es": "Fogata Sagrada", "en": "Sacred Campfire"}', '{"es": "Fuego místico de campamento que devora el tiempo restante", "en": "Mystic campfire flame devouring remaining time"}'),
('hourglass', 'timer', 'Raro', 2, '⏳', '#00f2fe', 150, FALSE, FALSE, NULL, 0, 0, 0, 0, '{"es": "Reloj de Arena", "en": "Hourglass"}', '{"es": "Elegante reloj de arena con partículas celestes y física fluida", "en": "Elegant hourglass with celestial particles and fluid physics"}'),
('ice', 'timer', 'Raro', 2, '🧊', '#38bdf8', 150, FALSE, FALSE, NULL, 0, 0, 0, 0, '{"es": "Cubo de Hielo", "en": "Ice Cube"}', '{"es": "Cubo de hielo ártico que se funde en agua pura gota a gota", "en": "Arctic ice cube melting into pure water drop by drop"}'),
('battery', 'timer', 'Raro', 2, '🔋', '#00e676', 150, FALSE, FALSE, NULL, 0, 0, 0, 0, '{"es": "Batería de Energía", "en": "Energy Battery"}', '{"es": "Célula cibernética con barras de energía y voltaje neón", "en": "Cybernetic cell with energy bars and neon voltage"}'),

-- 3. ÓRBITA LUNAR Y TITANIC (2) - TIENDA PRO COINS (ALTO VALOR)
('moon', 'timer', 'Épico', 3, '🌙', '#e2e8f0', 800, FALSE, FALSE, NULL, 0, 0, 0, 0, '{"es": "Órbita Lunar", "en": "Lunar Orbit"}', '{"es": "Fases lunares precisas y rotación astronómica nocturna", "en": "Precise lunar phases and night astronomical rotation"}'),
('titanic', 'timer', 'Legendario', 4, '🚢', '#38bdf8', 1200, FALSE, FALSE, NULL, 0, 0, 0, 0, '{"es": "Titanic Legendario", "en": "Legendary Titanic"}', '{"es": "Gran travesía marítima hacia el iceberg con cinemática oceánica", "en": "Grand ocean voyage toward the iceberg with oceanic kinematics"}'),

-- 4. EXCLUSIVOS PREMIUM (5) - MEMBRESÍA PRO (CINEMÁTICAS AVANZADAS)
('solar', 'timer', 'Épico', 3, '☀️', '#f59e0b', 0, FALSE, TRUE, NULL, 0, 0, 0, 0, '{"es": "Órbita Solar", "en": "Solar Orbit"}', '{"es": "Corona solar pulsante con planeta en órbita gravitatoria", "en": "Pulsing solar corona with planet in gravitational orbit"}'),
('satellite', 'timer', 'Épico', 3, '🛰️', '#0284c7', 0, FALSE, TRUE, NULL, 0, 0, 0, 0, '{"es": "Satélite Orbital", "en": "Orbital Satellite"}', '{"es": "Estación de comunicaciones orbital con paneles solares activos", "en": "Orbital communications station with active solar panels"}'),
('lighthouse', 'timer', 'Legendario', 4, '🗼', '#fde047', 0, FALSE, TRUE, NULL, 0, 0, 0, 0, '{"es": "El Faro", "en": "The Lighthouse"}', '{"es": "Faro costero con haz de luz giratorio continuo en la noche marítima", "en": "Coastal lighthouse with continuous rotating beam in ocean night"}'),
('airplane', 'timer', 'Legendario', 4, '✈️', '#f8fafc', 0, FALSE, TRUE, NULL, 0, 0, 0, 0, '{"es": "Aterrizaje en Pista", "en": "Runway Landing"}', '{"es": "Aproximación de vuelo comercial, despliegue de tren y humo en pista", "en": "Commercial flight approach, gear deployment, and touchdown smoke"}'),
('lantern', 'timer', 'Legendario', 4, '🏮', '#ea580c', 0, FALSE, TRUE, NULL, 0, 0, 0, 0, '{"es": "Farol Encantado", "en": "Enchanted Lantern"}', '{"es": "Farol de bosque místico con hiedra, mariposas turquesa y fuego mágico", "en": "Mystic forest lantern with ivy, turquoise butterflies, and magic fire"}')
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    tier = EXCLUDED.tier,
    stars = EXCLUDED.stars,
    emoji = EXCLUDED.emoji,
    color = EXCLUDED.color,
    cost_coins = EXCLUDED.cost_coins,
    is_initial = EXCLUDED.is_initial,
    is_premium = EXCLUDED.is_premium,
    name = EXCLUDED.name,
    description = EXCLUDED.description;
