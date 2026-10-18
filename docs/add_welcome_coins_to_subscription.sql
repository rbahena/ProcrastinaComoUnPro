-- ==============================================================================
-- 🪙 ACTUALIZACIÓN DE BASE DE DATOS: BONO DE BIENVENIDA (50 PRO COINS)
-- Archivo: docs/add_welcome_coins_to_subscription.sql
-- Propósito:
--   1. Añadir la columna 'welcome_coins_awarded' a la tabla 'profiles' para evitar
--      que se entreguen monedas de bienvenida duplicadas si el webhook y la
--      redirección de Stripe se procesan concurrentemente, o si el usuario
--      cancela y vuelve a iniciar una prueba más adelante.
--   2. Blindar 'welcome_coins_awarded' en el trigger 'check_profile_column_permissions'
--      para que ningún cliente 'authenticated' o 'anon' pueda manipularla.
--   3. Actualizar el trigger 'handle_profile_premium_status_change' para que
--      automáticamente asigne las 50 Pro Coins de regalo y los avatares VIP
--      cada vez que una cuenta se active a Premium (incluyendo la demo de 7 días).
--   4. Crear la función RPC 'activate_free_trial' para activación segura de prueba.
--   5. Ajuste retroactivo para otorgar las 50 monedas a cuentas Premium activas
--      que aún no las hayan recibido.
-- (100% Autónomo e Idempotente: Puedes copiar y pegar todo este archivo directamente 
--  en el editor web de Supabase Dashboard en la pestaña SQL Editor y presionar RUN).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AGREGAR COLUMNA EN public.profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_coins_awarded BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.welcome_coins_awarded IS 
'Indica si el usuario ya recibió el bono de bienvenida de 50 Pro Coins al iniciar su suscripción o periodo de prueba.';

-- ------------------------------------------------------------------------------
-- 2. ACTUALIZAR TRIGGER DE SEGURIDAD PARA BLINDAR LA COLUMNA
-- ------------------------------------------------------------------------------
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
        NEW.welcome_coins_awarded := OLD.welcome_coins_awarded;

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

        -- G. Blindaje de país: solo códigos ISO de 2 letras en minúsculas
        IF NEW.country_code IS NOT NULL THEN
            NEW.country_code := LOWER(TRIM(NEW.country_code));
            IF LENGTH(NEW.country_code) != 2 THEN
                NEW.country_code := OLD.country_code;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER AUTOMÁTICO: OTORGAR 50 PRO COINS Y AVATARES VIP AL ACTIVAR PREMIUM
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_profile_premium_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_vip_avatars TEXT[] := ARRAY['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
BEGIN
    -- Ignorar si la llamada proviene de un cliente no autorizado
    IF current_user IN ('authenticated', 'anon') AND current_setting('app.settle_session', true) != 'true' THEN
        RETURN NEW;
    END IF;

    -- CASO A: El usuario pierde el estatus Premium (Fin de prueba o cancelación)
    IF (OLD.is_premium = TRUE AND NEW.is_premium = FALSE) THEN
        DELETE FROM public.user_unlocked_items
        WHERE user_id = NEW.id
          AND item_id = ANY(v_vip_avatars)
          AND unlock_source = 'admin';

        IF NEW.selected_avatar = ANY(v_vip_avatars) THEN
            NEW.selected_avatar := 'gato';
        END IF;
    END IF;

    -- CASO B: El usuario activa Premium Pro (Inicio de prueba de 7 días o suscripción activa)
    IF (NEW.is_premium = TRUE AND (OLD.is_premium IS NULL OR OLD.is_premium = FALSE)) THEN
        -- Adjudicar automáticamente los 6 avatares VIP con procedencia 'admin'
        INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
        SELECT NEW.id, unnest(v_vip_avatars), 'admin'
        ON CONFLICT (user_id, item_id) DO NOTHING;

        -- Otorgar automáticamente las 50 Pro Coins de bienvenida si no se han concedido
        IF NEW.welcome_coins_awarded IS NOT TRUE THEN
            NEW.pro_coins := COALESCE(NEW.pro_coins, 0) + 50;
            NEW.welcome_coins_awarded := TRUE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_handle_profile_premium_status_change ON public.profiles;

CREATE TRIGGER tr_handle_profile_premium_status_change
BEFORE UPDATE OF is_premium ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_premium_status_change();

-- ------------------------------------------------------------------------------
-- 4. FUNCIÓN RPC: ACTIVACIÓN DIRECTA DE PRUEBA GRATUITA DE 7 DÍAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_free_trial()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_prof RECORD;
    v_trial_end TIMESTAMPTZ;
    v_vip_items TEXT[] := ARRAY['leon', 'tigre', 'fenix', 'grifo', 'lince', 'elefante'];
    v_item TEXT;
    v_coins_granted INT := 0;
BEGIN
    PERFORM set_config('app.settle_session', 'true', true);

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
    END IF;

    SELECT * INTO v_prof FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'PROFILE_NOT_FOUND');
    END IF;

    v_trial_end := NOW() + INTERVAL '1 day';

    -- Si aún no ha recibido el premio de 50 monedas, otorgarlo
    IF v_prof.welcome_coins_awarded IS NOT TRUE THEN
        v_coins_granted := 50;
        UPDATE public.profiles
        SET is_premium = TRUE,
            premium_until = v_trial_end,
            pro_coins = COALESCE(v_prof.pro_coins, 0) + 50,
            welcome_coins_awarded = TRUE,
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        UPDATE public.profiles
        SET is_premium = TRUE,
            premium_until = v_trial_end,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- Desbloqueo de avatares VIP
    FOREACH v_item IN ARRAY v_vip_items
    LOOP
        INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
        VALUES (v_user_id, v_item, 'admin')
        ON CONFLICT (user_id, item_id) DO NOTHING;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'is_premium', TRUE,
        'premium_until', v_trial_end,
        'bonus_coins', v_coins_granted,
        'welcome_coins_awarded', TRUE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_free_trial() TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. ASIGNACIÓN RETROACTIVA PARA USUARIOS ACTUALES CON MEMBRESÍA O PRUEBA
-- ------------------------------------------------------------------------------
-- Si un usuario ya tiene is_premium = TRUE pero no se le habían sumado las 50 monedas, sumarlas:
UPDATE public.profiles
SET pro_coins = COALESCE(pro_coins, 0) + 50,
    welcome_coins_awarded = TRUE,
    updated_at = NOW()
WHERE is_premium = TRUE 
  AND (welcome_coins_awarded IS NOT TRUE OR welcome_coins_awarded IS NULL);

-- ------------------------------------------------------------------------------
-- 6. CONFIRMACIÓN FINAL
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '✅ Migración de Bono de Bienvenida (50 Pro Coins) aplicada con éxito.';
END $$;
