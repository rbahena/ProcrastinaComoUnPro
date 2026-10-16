-- ==============================================================================
-- 🪙 ACTUALIZACIÓN DE BASE DE DATOS: BONO DE BIENVENIDA (30 PRO COINS)
-- Archivo: docs/add_welcome_coins_to_subscription.sql
-- Propósito:
--   1. Añadir la columna 'welcome_coins_awarded' a la tabla 'profiles' para evitar
--      que se entreguen monedas de bienvenida duplicadas si el webhook y la
--      redirección de Stripe se procesan concurrentemente, o si el usuario
--      cancela y vuelve a iniciar una prueba más adelante.
--   2. Blindar 'welcome_coins_awarded' en el trigger 'check_profile_column_permissions'
--      para que ningún cliente 'authenticated' o 'anon' pueda manipularla.
-- (100% Autónomo e Idempotente: Puedes copiar y pegar todo este archivo directamente 
--  en el editor web de Supabase Dashboard en la pestaña SQL Editor y presionar RUN).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AGREGAR COLUMNA EN public.profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_coins_awarded BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.welcome_coins_awarded IS 
'Indica si el usuario ya recibió el bono de bienvenida de 30 Pro Coins al iniciar su suscripción o periodo de prueba.';

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
-- 3. CONFIRMACIÓN FINAL
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '✅ Migración de Bono de Bienvenida (30 Pro Coins) aplicada con éxito.';
END $$;
