-- ==============================================================================
-- 🛡️ PROCRASTINA COMO UN PRO (COFU) - ACTUALIZACIÓN DE RACHA Y ESTADÍSTICAS
-- Soporte de Zona Horaria Local (Timezone-Aware Streak & Statistics)
-- ==============================================================================

-- 1. Función de evaluación de racha rota entre fechas según active_days
CREATE OR REPLACE FUNCTION public.check_is_streak_broken(
    p_last_focus_date DATE,
    p_check_date DATE,
    p_active_days INTEGER[]
)
RETURNS BOOLEAN AS $$
DECLARE
    v_day DATE;
    v_dow INTEGER;
    v_active INTEGER[] := COALESCE(p_active_days, ARRAY[1, 2, 3, 4, 5]);
BEGIN
    IF p_last_focus_date IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF p_last_focus_date >= p_check_date THEN
        RETURN FALSE;
    END IF;

    IF cardinality(v_active) = 0 THEN
        v_active := ARRAY[1, 2, 3, 4, 5];
    END IF;

    -- Revisar días estrictamente intermedios
    v_day := p_last_focus_date + INTERVAL '1 day';
    WHILE v_day < p_check_date LOOP
        v_dow := EXTRACT(ISODOW FROM v_day)::INTEGER;
        IF v_dow = ANY(v_active) THEN
            RETURN TRUE;
        END IF;
        v_day := v_day + INTERVAL '1 day';
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 2. Función de cálculo de racha efectiva activa
CREATE OR REPLACE FUNCTION public.get_effective_streak(
    p_last_focus_date DATE,
    p_streak_days INTEGER,
    p_active_days INTEGER[],
    p_today DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
BEGIN
    IF p_last_focus_date IS NULL OR p_streak_days IS NULL OR p_streak_days <= 0 THEN
        RETURN 0;
    END IF;

    IF p_last_focus_date >= p_today THEN
        RETURN p_streak_days;
    END IF;

    IF public.check_is_streak_broken(p_last_focus_date, p_today, p_active_days) THEN
        RETURN 0;
    END IF;

    RETURN p_streak_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 3. Actualizar función RPC settle_focus_session con soporte de zona horaria y fecha local
CREATE OR REPLACE FUNCTION public.settle_focus_session(
    p_nonce_id UUID,
    p_avatar_id VARCHAR,
    p_methodology VARCHAR,
    p_coworking_mode VARCHAR,
    p_energy_level VARCHAR,
    p_objective_text TEXT,
    p_planned_seconds INTEGER,
    p_actual_seconds INTEGER,
    p_pause_count INTEGER,
    p_total_pause_seconds INTEGER,
    p_status VARCHAR,
    p_objective_completed VARCHAR,
    p_idea_id UUID DEFAULT NULL,
    p_log_learnings TEXT DEFAULT NULL,
    p_distractions JSONB DEFAULT '[]'::jsonb,
    p_client_date DATE DEFAULT NULL,
    p_client_timezone TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user RECORD;
    v_avatar RECORD;
    v_existing_session RECORD;
    v_time_factor NUMERIC := 1.0;
    v_coins_earned BIGINT := 0;
    v_coins_penalized BIGINT := 0;
    v_xp_earned INTEGER := 0;
    v_boss_damage INTEGER := 0;
    v_boss_heal INTEGER := 0;
    v_is_critical BOOLEAN := FALSE;
    v_grit_bonus BOOLEAN := FALSE;
    v_new_session_id UUID;
    v_tz TEXT := COALESCE(NULLIF(p_client_timezone, ''), 'UTC');
    v_today DATE := COALESCE(p_client_date, (CURRENT_TIMESTAMP AT TIME ZONE v_tz)::date, CURRENT_DATE);
    v_new_streak INTEGER;
    v_new_longest_streak INTEGER;
    v_actual_minutes INTEGER := 0;
    v_tomatoes_earned INTEGER := 0;
BEGIN
    -- 1. Validar autenticación
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    -- 2. Idempotencia: Verificar si el nonce ya fue liquidado
    SELECT * INTO v_existing_session FROM public.focus_sessions WHERE nonce_id = p_nonce_id;
    IF FOUND THEN
        RETURN json_build_object(
            'success', TRUE,
            'is_duplicate', TRUE,
            'session_id', v_existing_session.id,
            'coins_earned', v_existing_session.coins_earned,
            'coins_penalized', v_existing_session.coins_penalized,
            'xp_earned', v_existing_session.xp_earned,
            'boss_damage', v_existing_session.boss_damage_dealt,
            'boss_heal', v_existing_session.boss_hp_healed
        );
    END IF;

    -- 3. Obtener avatar del snapshot inmutable
    SELECT * INTO v_avatar FROM public.catalog_items WHERE id = p_avatar_id AND is_active = TRUE;
    IF NOT FOUND THEN
        SELECT * INTO v_avatar FROM public.catalog_items WHERE id = 'gato';
    END IF;

    -- 4. Bloquear perfil para actualización atómica
    SELECT * INTO v_user FROM public.profiles WHERE id = v_user_id FOR UPDATE;

    -- 5. Lógica de Liquidación según Estado
    IF p_status = 'completed' THEN
        IF p_actual_seconds >= 60 THEN
            -- Monedas ganadas:
            -- < 25 min (< 1500 seg): Fijas 2 monedas independiente del avatar
            -- >= 25 min (>= 1500 seg): Monedas configuradas en el avatar seleccionado (coins_per_pomodoro)
            IF p_actual_seconds < 1500 THEN
                v_coins_earned := 2;
            ELSE
                v_coins_earned := COALESCE(v_avatar.coins_per_pomodoro, 10);
            END IF;

            v_boss_damage := ROUND(v_avatar.boss_damage_points * v_time_factor);

            IF p_methodology = 'sapo' AND (p_objective_completed = 'yes' OR p_objective_completed = 'progress') THEN
                v_is_critical := TRUE;
                v_boss_damage := GREATEST(v_boss_damage, 300);
            END IF;

            IF p_methodology = 'pareto' THEN
                v_boss_damage := v_boss_damage * 2;
            END IF;

            IF p_coworking_mode = 'comunitario' THEN
                v_boss_damage := v_boss_damage + 20;
            END IF;

            IF p_energy_level = 'low' THEN
                v_grit_bonus := TRUE;
                v_xp_earned := v_xp_earned + 50;
            END IF;

            IF p_pause_count = 0 THEN
                v_boss_damage := ROUND(v_boss_damage * 1.15);
            END IF;

            IF p_objective_completed = 'yes' THEN
                v_xp_earned := v_xp_earned + 20;
            END IF;

            -- XP base de enfoque (1 XP por minuto de concentración, mínimo 10, 25 para pomodoros estándar)
            IF p_actual_seconds >= 1500 THEN
                v_xp_earned := v_xp_earned + GREATEST(25, (p_actual_seconds / 60)::INTEGER);
            ELSE
                v_xp_earned := v_xp_earned + GREATEST(1, (p_actual_seconds / 60)::INTEGER);
            END IF;
        ELSE
            v_coins_earned := 0;
            v_boss_damage := 5;
        END IF;

        -- Cálculo de Racha Diaria y Tomates según duración:
        -- < 25 min: 0 tomates (sin racha)
        -- 25 - 44 min: 1 tomate (suma racha diaria)
        -- 45 - 69 min: 2 tomates (doble mérito por alta concentración)
        -- >= 70 min: FLOOR((minutos + 5) / 25) tomates
        v_actual_minutes := p_actual_seconds / 60;
        IF v_actual_minutes >= 25 AND v_actual_minutes < 45 THEN
            v_tomatoes_earned := 1;
        ELSIF v_actual_minutes >= 45 THEN
            v_tomatoes_earned := FLOOR((v_actual_minutes + 5) / 25)::INTEGER;
        ELSE
            v_tomatoes_earned := 0;
        END IF;

        IF p_actual_seconds >= 1500 THEN
            IF v_user.last_focus_date IS NULL THEN
                v_new_streak := 1;
            ELSIF v_user.last_focus_date = v_today THEN
                -- Mismo día local: mantener racha existente
                v_new_streak := GREATEST(1, COALESCE(v_user.streak_days, 1));
            ELSIF public.check_is_streak_broken(v_user.last_focus_date, v_today, v_user.active_days) THEN
                -- Se rompió por faltar a un día pactado: reiniciar en 1
                v_new_streak := 1;
            ELSE
                -- Día consecutivo válido o descanso permitido: +1 día de racha
                v_new_streak := COALESCE(v_user.streak_days, 0) + 1;
            END IF;

            v_new_longest_streak := GREATEST(COALESCE(v_user.longest_streak, 0), v_new_streak);

            UPDATE public.profiles
            SET 
                pro_coins = pro_coins + v_coins_earned,
                focus_tomatoes = focus_tomatoes + v_tomatoes_earned,
                focus_points = focus_points + v_xp_earned,
                completed_objectives = completed_objectives + CASE WHEN p_objective_completed = 'yes' THEN 1 ELSE 0 END,
                streak_days = v_new_streak,
                longest_streak = v_new_longest_streak,
                last_focus_date = v_today
            WHERE id = v_user_id;
        ELSE
            v_new_streak := public.get_effective_streak(v_user.last_focus_date, v_user.streak_days, v_user.active_days, v_today);
            v_new_longest_streak := COALESCE(v_user.longest_streak, 0);

            UPDATE public.profiles
            SET 
                pro_coins = pro_coins + v_coins_earned,
                focus_points = focus_points + v_xp_earned,
                completed_objectives = completed_objectives + CASE WHEN p_objective_completed = 'yes' THEN 1 ELSE 0 END
            WHERE id = v_user_id;
        END IF;

    ELSE
        -- Estado: Abandonado o Interrumpido
        IF p_actual_seconds < 120 THEN
            v_coins_penalized := 0;
            v_boss_heal := 0;
        ELSE
            v_coins_penalized := v_avatar.pause_penalty_coins + 15;
            v_boss_heal := v_avatar.boss_heal_points + 20;

            UPDATE public.profiles
            SET 
                pro_coins = GREATEST(0, pro_coins - v_coins_penalized),
                focus_points = GREATEST(0, focus_points - 20),
                abandoned_sessions = abandoned_sessions + 1
            WHERE id = v_user_id;
        END IF;
    END IF;

    -- 6. Insertar sesión
    INSERT INTO public.focus_sessions (
        nonce_id, user_id, objective_text, status, methodology, coworking_mode, energy_level,
        planned_duration_seconds, actual_duration_seconds, pause_count, total_pause_seconds,
        objective_completed, avatar_id, idea_id, coins_earned, coins_penalized, xp_earned,
        boss_damage_dealt, boss_hp_healed, is_critical_hit, grit_bonus_applied,
        started_at, completed_at
    ) VALUES (
        p_nonce_id, v_user_id, p_objective_text, p_status::focus_session_status_enum,
        p_methodology::focus_methodology_enum, p_coworking_mode::coworking_mode_enum,
        p_energy_level::energy_level_enum, p_planned_seconds, p_actual_seconds,
        p_pause_count, p_total_pause_seconds, p_objective_completed, p_avatar_id, p_idea_id,
        v_coins_earned, v_coins_penalized, v_xp_earned, v_boss_damage, v_boss_heal,
        v_is_critical, v_grit_bonus,
        TIMEZONE('utc'::text, NOW() - (p_actual_seconds || ' seconds')::interval),
        TIMEZONE('utc'::text, NOW())
    )
    RETURNING id INTO v_new_session_id;

    -- 6.1 Idea vinculada
    IF p_idea_id IS NOT NULL THEN
        UPDATE public.captured_ideas
        SET 
            is_converted_to_objective = TRUE,
            converted_at = COALESCE(converted_at, TIMEZONE('utc'::text, NOW()))
        WHERE id = p_idea_id AND user_id = v_user_id;
    END IF;

    -- 7. Bitácora
    IF p_log_learnings IS NOT NULL AND TRIM(p_log_learnings) <> '' THEN
        INSERT INTO public.focus_logs (
            user_id, session_id, title, learnings, distractions_recorded, mood_score
        ) VALUES (
            v_user_id, v_new_session_id, p_objective_text, p_log_learnings, p_distractions, 4
        );
    END IF;

    -- 8. Retornar payload
    RETURN json_build_object(
        'success', TRUE,
        'session_id', v_new_session_id,
        'status', p_status,
        'coins_earned', v_coins_earned,
        'coins_penalized', v_coins_penalized,
        'xp_earned', v_xp_earned,
        'boss_damage', v_boss_damage,
        'boss_heal', v_boss_heal,
        'is_critical', v_is_critical,
        'grit_bonus', v_grit_bonus,
        'streak_days', COALESCE(v_new_streak, v_user.streak_days, 0),
        'remaining_coins', (SELECT pro_coins FROM public.profiles WHERE id = v_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Actualizar función RPC get_user_focus_statistics con soporte de zona horaria
CREATE OR REPLACE FUNCTION public.get_user_focus_statistics(
    p_client_timezone TEXT DEFAULT 'UTC',
    p_client_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_tz TEXT := COALESCE(NULLIF(p_client_timezone, ''), 'UTC');
    v_today DATE := COALESCE(p_client_date, (CURRENT_TIMESTAMP AT TIME ZONE v_tz)::date, CURRENT_DATE);
    v_today_attempts JSON;
    v_today_completed INTEGER := 0;
    v_today_focus_seconds INTEGER := 0;
    v_week_start DATE;
    v_weekly_by_day INTEGER[] := ARRAY[0, 0, 0, 0, 0, 0, 0];
    v_monthly_by_day JSON;
    v_annual_by_month INTEGER[] := ARRAY[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    v_total_focus_seconds BIGINT := 0;
    v_rec RECORD;
    v_day_idx INTEGER;
    v_month_idx INTEGER;
BEGIN
    -- 1. Validar autenticación
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'No autenticado'
        );
    END IF;

    -- 2. Obtener datos de perfil
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

    -- 3. Intentos de hoy (según zona horaria local del usuario)
    SELECT COALESCE(json_agg(json_build_object(
        'status', status::text,
        'time', to_char(completed_at AT TIME ZONE v_tz, 'HH24:MI'),
        'duration_seconds', actual_duration_seconds
    ) ORDER BY completed_at ASC), '[]'::json) INTO v_today_attempts
    FROM public.focus_sessions
    WHERE user_id = v_user_id AND (completed_at AT TIME ZONE v_tz)::date = v_today;

    -- 4. Métricas completadas hoy (según zona horaria)
    SELECT 
        COUNT(*),
        COALESCE(SUM(actual_duration_seconds), 0)
    INTO v_today_completed, v_today_focus_seconds
    FROM public.focus_sessions
    WHERE user_id = v_user_id AND status = 'completed' AND actual_duration_seconds >= 1500 AND (completed_at AT TIME ZONE v_tz)::date = v_today;

    -- Tiempo total enfocado hoy (incluyendo sesiones cortas)
    SELECT COALESCE(SUM(actual_duration_seconds), 0)
    INTO v_today_focus_seconds
    FROM public.focus_sessions
    WHERE user_id = v_user_id AND status = 'completed' AND (completed_at AT TIME ZONE v_tz)::date = v_today;

    -- 5. Métricas de la semana actual (Lunes a Domingo según zona horaria - Pomodoros estándar >= 25 min)
    v_week_start := date_trunc('week', v_today)::date;

    FOR v_rec IN 
        SELECT ((completed_at AT TIME ZONE v_tz)::date - v_week_start) as day_offset, COUNT(*) as cnt
        FROM public.focus_sessions
        WHERE user_id = v_user_id 
          AND status = 'completed' 
          AND actual_duration_seconds >= 1500
          AND (completed_at AT TIME ZONE v_tz)::date >= v_week_start 
          AND (completed_at AT TIME ZONE v_tz)::date < v_week_start + INTERVAL '7 days'
        GROUP BY ((completed_at AT TIME ZONE v_tz)::date - v_week_start)
    LOOP
        v_day_idx := v_rec.day_offset + 1;
        IF v_day_idx >= 1 AND v_day_idx <= 7 THEN
            v_weekly_by_day[v_day_idx] := v_rec.cnt;
        END IF;
    END LOOP;

    -- 6. Métricas del mes actual por día (1..31 según zona horaria - Pomodoros estándar >= 25 min)
    SELECT COALESCE(json_object_agg(day_num, cnt), '{}'::json) INTO v_monthly_by_day FROM (
        SELECT EXTRACT(DAY FROM (completed_at AT TIME ZONE v_tz))::integer as day_num, COUNT(*) as cnt
        FROM public.focus_sessions
        WHERE user_id = v_user_id 
          AND status = 'completed' 
          AND actual_duration_seconds >= 1500
          AND date_trunc('month', (completed_at AT TIME ZONE v_tz))::date = date_trunc('month', v_today)::date
        GROUP BY EXTRACT(DAY FROM (completed_at AT TIME ZONE v_tz))::integer
    ) m;

    -- 7. Métricas del año actual por mes (1..12 según zona horaria - Pomodoros estándar >= 25 min)
    FOR v_rec IN 
        SELECT EXTRACT(MONTH FROM (completed_at AT TIME ZONE v_tz))::integer as month_num, COUNT(*) as cnt
        FROM public.focus_sessions
        WHERE user_id = v_user_id 
          AND status = 'completed' 
          AND actual_duration_seconds >= 1500
          AND EXTRACT(YEAR FROM (completed_at AT TIME ZONE v_tz)) = EXTRACT(YEAR FROM v_today)
        GROUP BY EXTRACT(MONTH FROM (completed_at AT TIME ZONE v_tz))::integer
    LOOP
        v_month_idx := v_rec.month_num;
        IF v_month_idx >= 1 AND v_month_idx <= 12 THEN
            v_annual_by_month[v_month_idx] := v_rec.cnt;
        END IF;
    END LOOP;

    -- 8. Total histórico de tiempo enfocado
    SELECT COALESCE(SUM(actual_duration_seconds), 0) INTO v_total_focus_seconds
    FROM public.focus_sessions
    WHERE user_id = v_user_id AND status = 'completed';

    -- 9. Retornar payload completo
    RETURN json_build_object(
        'success', TRUE,
        'today_attempts', v_today_attempts,
        'today_completed', v_today_completed,
        'today_focus_seconds', v_today_focus_seconds,
        'weekly_by_day', v_weekly_by_day,
        'monthly_by_day', v_monthly_by_day,
        'annual_by_month', v_annual_by_month,
        'streak_days', COALESCE(v_profile.streak_days, 0),
        'longest_streak', COALESCE(v_profile.longest_streak, 0),
        'total_pomodoros', COALESCE(v_profile.focus_tomatoes, 0),
        'total_focus_seconds', v_total_focus_seconds,
        'total_completed_objectives', (
            SELECT COUNT(*) FROM public.focus_sessions 
            WHERE user_id = v_user_id AND status = 'completed' AND objective_completed = 'yes'
        ),
        'today_completed_objectives', (
            SELECT COUNT(*) FROM public.focus_sessions 
            WHERE user_id = v_user_id AND status = 'completed' AND objective_completed = 'yes' AND (completed_at AT TIME ZONE v_tz)::date = v_today
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Función de Recálculo y Corrección de Racha Histórica
CREATE OR REPLACE FUNCTION public.recalculate_user_streak(
    p_user_id UUID,
    p_client_timezone TEXT DEFAULT 'UTC'
)
RETURNS JSON AS $$
DECLARE
    v_tz TEXT := COALESCE(NULLIF(p_client_timezone, ''), 'UTC');
    v_active INTEGER[];
    v_dates DATE[];
    v_streak INTEGER := 0;
    v_longest INTEGER := 0;
    v_prev_date DATE := NULL;
    v_cur_date DATE;
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE v_tz)::date;
BEGIN
    SELECT COALESCE(active_days, ARRAY[1,2,3,4,5]) INTO v_active FROM public.profiles WHERE id = p_user_id;

    -- Obtener fechas únicas en la zona horaria local donde completó >= 25 min (1500s)
    SELECT ARRAY_AGG(d ORDER BY d ASC) INTO v_dates
    FROM (
        SELECT DISTINCT (completed_at AT TIME ZONE v_tz)::date as d
        FROM public.focus_sessions
        WHERE user_id = p_user_id 
          AND status = 'completed' 
          AND actual_duration_seconds >= 1500
    ) sub;

    IF v_dates IS NULL OR cardinality(v_dates) = 0 THEN
        UPDATE public.profiles 
        SET streak_days = 0, longest_streak = 0, last_focus_date = NULL 
        WHERE id = p_user_id;
        RETURN json_build_object('success', TRUE, 'streak_days', 0, 'longest_streak', 0);
    END IF;

    -- Calcular racha secuencialmente
    FOR i IN 1..cardinality(v_dates) LOOP
        v_cur_date := v_dates[i];
        IF v_prev_date IS NULL THEN
            v_streak := 1;
        ELSIF public.check_is_streak_broken(v_prev_date, v_cur_date, v_active) THEN
            v_streak := 1;
        ELSE
            v_streak := v_streak + 1;
        END IF;

        IF v_streak > v_longest THEN
            v_longest := v_streak;
        END IF;

        v_prev_date := v_cur_date;
    END LOOP;

    -- Verificar si la racha sigue vigente respecto al día de hoy
    IF public.check_is_streak_broken(v_prev_date, v_today, v_active) THEN
        v_streak := 0;
    END IF;

    -- Actualizar perfil del usuario
    UPDATE public.profiles
    SET 
        streak_days = v_streak,
        longest_streak = GREATEST(COALESCE(longest_streak, 0), v_longest),
        last_focus_date = v_prev_date
    WHERE id = p_user_id;

    RETURN json_build_object(
        'success', TRUE,
        'streak_days', v_streak,
        'longest_streak', GREATEST(v_longest, (SELECT longest_streak FROM public.profiles WHERE id = p_user_id)),
        'last_focus_date', v_prev_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 💬 10. TABLA DE LIKES / ME MOTIVA COMUNITARIOS (MULTI-DISPOSITIVO Y SIN DUPLICADOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.community_motivation_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motivation_id TEXT NOT NULL REFERENCES public.community_motivations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_motivation_user_like UNIQUE (motivation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_motivation_likes_motivation ON public.community_motivation_likes(motivation_id);
CREATE INDEX IF NOT EXISTS idx_motivation_likes_user ON public.community_motivation_likes(user_id);

ALTER TABLE public.community_motivation_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Permitir lectura publica de likes" 
    ON public.community_motivation_likes FOR SELECT 
    USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Permitir dar like autenticado" 
    ON public.community_motivation_likes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Permitir remover mi propio like" 
    ON public.community_motivation_likes FOR DELETE 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RPC para alternar Like de forma atómica (Toggle Like)
CREATE OR REPLACE FUNCTION public.toggle_motivation_like(
    p_motivation_id TEXT
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_liked BOOLEAN;
    v_total_likes INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    -- Verificar si ya existe el like
    IF EXISTS (
        SELECT 1 FROM public.community_motivation_likes
        WHERE motivation_id = p_motivation_id AND user_id = v_user_id
    ) THEN
        -- Quitar like
        DELETE FROM public.community_motivation_likes
        WHERE motivation_id = p_motivation_id AND user_id = v_user_id;
        v_liked := FALSE;
    ELSE
        -- Dar like
        INSERT INTO public.community_motivation_likes (motivation_id, user_id)
        VALUES (p_motivation_id, v_user_id)
        ON CONFLICT (motivation_id, user_id) DO NOTHING;
        v_liked := TRUE;
    END IF;

    -- Recalcular total real de likes
    SELECT COUNT(*)::INTEGER INTO v_total_likes
    FROM public.community_motivation_likes
    WHERE motivation_id = p_motivation_id;

    -- Actualizar contador en community_motivations
    UPDATE public.community_motivations
    SET likes = v_total_likes
    WHERE id = p_motivation_id;

    RETURN json_build_object(
        'success', TRUE,
        'motivation_id', p_motivation_id,
        'liked', v_liked,
        'likes_count', v_total_likes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger de like inicial automático (los mensajes surgen con 0 likes)
DROP TRIGGER IF EXISTS trg_new_community_motivation ON public.community_motivations;
DROP FUNCTION IF EXISTS public.handle_new_community_motivation();
