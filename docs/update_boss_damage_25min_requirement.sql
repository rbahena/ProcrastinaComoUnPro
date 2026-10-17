-- ==============================================================================
-- MIGRACIÓN: REQUISITO DE 1 POMODORO (>= 25 MINUTOS) PARA INFLIGIR DAÑO AL JEFE
-- ==============================================================================
-- Propósito:
--   1. El daño al jefe de la comunidad sólo se inflige si el usuario completa un
--      bloque completo de Pomodoro (>= 25 minutos / 1500 segundos).
--   2. Sesiones completadas más cortas (< 25 min) otorgan monedas/XP correspondientes
--      pero 0 daño al jefe.
--   3. Sesiones de menos de 60 segundos tampoco otorgan daño fantasma (0 daño).
--   4. Las penalizaciones por abandono continúan vigentes e inalteradas.
--   5. Validación de seguridad en deal_boss_damage para descartar llamadas con daño <= 0.
-- ==============================================================================

-- 1. Actualizar el procedimiento RPC settle_focus_session
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
    -- Permitir bypass seguro para este contexto de transacción
    PERFORM set_config('app.settle_session', 'true', true);

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
        -- Fallback seguro a gato común si el ID no se encuentra
        SELECT * INTO v_avatar FROM public.catalog_items WHERE id = 'gato';
    END IF;

    -- 4. Bloquear perfil para actualización atómica sin condiciones de carrera
    SELECT * INTO v_user FROM public.profiles WHERE id = v_user_id FOR UPDATE;

    -- 5. Lógica de Liquidación según Estado
    IF p_status = 'completed' THEN
        -- Anti-Exploit de tiempo: mínimo 60 segundos para otorgar recompensas
        IF p_actual_seconds >= 60 THEN
            -- Monedas ganadas:
            -- < 25 min (< 1500 seg): Fijas 2 monedas independiente del avatar
            -- >= 25 min (>= 1500 seg): Monedas configuradas en el avatar seleccionado (coins_per_pomodoro)
            IF p_actual_seconds < 1500 THEN
                v_coins_earned := 2;
            ELSE
                v_coins_earned := COALESCE(v_avatar.coins_per_pomodoro, 10);
            END IF;
            
            -- Daño al Boss (exclusivo para usuarios con Membresía Pro y sesiones completas de al menos 25 minutos / 1500 segundos)
            IF v_user.is_premium AND p_actual_seconds >= 1500 THEN
                v_boss_damage := ROUND(v_avatar.boss_damage_points * v_time_factor);

                -- Pasiva Táctica: Metodología Sapo / Rana (Golpe Crítico)
                IF p_methodology = 'sapo' AND (p_objective_completed = 'yes' OR p_objective_completed = 'progress') THEN
                    v_is_critical := TRUE;
                    v_boss_damage := GREATEST(v_boss_damage, 300);
                END IF;

                -- Pasiva Táctica: Metodología Pareto 80/20 (Búho / Enfoque Estratégico)
                IF p_methodology = 'pareto' THEN
                    v_boss_damage := v_boss_damage * 2;
                END IF;

                -- Pasiva Táctica: Coworking Comunitario (Abeja / Apoyo de Enjambre)
                IF p_coworking_mode = 'comunitario' THEN
                    v_boss_damage := v_boss_damage + 20;
                END IF;

                -- Pasiva Táctica: Cero Pausas (Sombra / Lince / Aethel)
                IF p_pause_count = 0 THEN
                    v_boss_damage := ROUND(v_boss_damage * 1.15);
                END IF;
            ELSE
                v_boss_damage := 0;
            END IF;

            -- Pasiva Táctica: Bono de Coraje (desactivado temporalmente)
            IF p_energy_level = 'low' THEN
                v_grit_bonus := TRUE;
            END IF;

            -- Bono de Objetivo Cumplido (+20 XP persistente)
            IF p_objective_completed = 'yes' THEN
                v_xp_earned := v_xp_earned + 20;
            END IF;

            -- XP base de enfoque: 1 XP por cada minuto completado
            v_xp_earned := v_xp_earned + GREATEST(1, (p_actual_seconds / 60)::INTEGER);
        ELSE
            -- Sesión completada en menos de 1 minuto: sin monedas ni daño (prevención de granja)
            v_coins_earned := 0;
            v_boss_damage := 0;
        END IF;

        -- Cálculo de Racha (Streak) y Tomates según duración:
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

        IF v_tomatoes_earned > 0 THEN
            -- Validación y cálculo de racha diaria por pomodoro completo
            IF v_user.last_focus_date IS NULL THEN
                v_new_streak := 1;
            ELSIF v_user.last_focus_date = v_today THEN
                -- Ya completó un pomodoro válido hoy: la racha no incrementa múltiples veces el mismo día
                v_new_streak := GREATEST(1, COALESCE(v_user.streak_days, 1));
            ELSIF public.check_is_streak_broken(v_user.last_focus_date, v_today, v_user.active_days) THEN
                -- Se rompió por faltar a un día forzoso intermedio: reinicia en 1 hoy
                v_new_streak := 1;
            ELSE
                -- Día consecutivo válido o tras días de descanso permitidos: incrementa 1 día
                v_new_streak := COALESCE(v_user.streak_days, 0) + 1;
            END IF;

            v_new_longest_streak := GREATEST(COALESCE(v_user.longest_streak, 0), v_new_streak);

            -- Actualizar perfil con ganancias, racha y objetivos
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
            -- Sesión completada en menos de 25 min (ej. retos rápidos de 5 o 10 min):
            -- Se otorgan monedas y XP correspondientes, pero NO suma tomates ni actualiza/incrementa la racha diaria
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
        -- Penalización calculada según el avatar del snapshot (aplica a todos los usuarios independientemente del plan)
        v_coins_penalized := CASE 
            WHEN v_avatar.pause_penalty_coins IS NOT NULL AND v_avatar.pause_penalty_coins > 0 THEN v_avatar.pause_penalty_coins
            ELSE 10 
        END;

        -- Curación al Boss: solo usuarios Premium en sala comunitaria afectan al Jefe
        IF v_user.is_premium AND p_coworking_mode = 'comunitario' THEN
            v_boss_heal := COALESCE(v_avatar.boss_heal_points, 10);
        ELSE
            v_boss_heal := 0;
        END IF;

        -- Regla Floor 0: La billetera jamás queda en números negativos
        UPDATE public.profiles
        SET 
            pro_coins = GREATEST(0, pro_coins - v_coins_penalized),
            focus_points = GREATEST(0, focus_points - 20),
            abandoned_sessions = abandoned_sessions + 1
        WHERE id = v_user_id;
    END IF;

    -- 6. Insertar registro de sesión inmutable
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

    -- 6.1 Si está vinculada a una idea/tarea del baúl, marcar is_converted_to_objective = TRUE
    IF p_idea_id IS NOT NULL THEN
        UPDATE public.captured_ideas
        SET 
            is_converted_to_objective = TRUE,
            converted_at = COALESCE(converted_at, TIMEZONE('utc'::text, NOW()))
        WHERE id = p_idea_id AND user_id = v_user_id;
    END IF;

    -- 7. Si se proporcionó nota de bitácora, guardarla vinculada a la sesión
    IF p_log_learnings IS NOT NULL AND TRIM(p_log_learnings) <> '' THEN
        INSERT INTO public.focus_logs (
            user_id, session_id, title, learnings, distractions_recorded, mood_score
        ) VALUES (
            v_user_id, v_new_session_id, p_objective_text, p_log_learnings, p_distractions, 4
        );
    END IF;

    -- 8. Retornar payload con telemetría de liquidación
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
        'streak_days', COALESCE(v_new_streak, v_user.streak_days),
        'remaining_coins', (SELECT pro_coins FROM public.profiles WHERE id = v_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Actualizar el procedimiento RPC deal_boss_damage
CREATE OR REPLACE FUNCTION public.deal_boss_damage(
    p_boss_id VARCHAR,
    p_damage INTEGER,
    p_is_critical BOOLEAN DEFAULT FALSE,
    p_user_name TEXT DEFAULT 'Guerrero'
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_boss RECORD;
    v_is_premium BOOLEAN := FALSE;
    v_new_hp INTEGER;
    v_is_defeated BOOLEAN := FALSE;
    v_message TEXT;
    v_event_type boss_event_type_enum := 'attack';
BEGIN
    PERFORM set_config('app.settle_session', 'true', true);

    -- Validar que el daño sea mayor a cero
    IF COALESCE(p_damage, 0) <= 0 THEN
        RETURN json_build_object('success', TRUE, 'current_hp', 0, 'damage_dealt', 0);
    END IF;

    -- Validar si el usuario autenticado tiene membresía Pro (solo Pro inflige daño)
    IF v_user_id IS NOT NULL THEN
        SELECT is_premium INTO v_is_premium FROM public.profiles WHERE id = v_user_id;
        IF NOT COALESCE(v_is_premium, FALSE) THEN
            RETURN json_build_object('success', FALSE, 'error', 'Solo usuarios con Membresía Pro pueden infligir daño al Jefe de la Comunidad');
        END IF;
    END IF;

    -- 1. Obtener y bloquear la fila del Boss para cálculo concurrente exacto
    SELECT * INTO v_boss FROM public.community_bosses WHERE id = p_boss_id FOR UPDATE;
    IF NOT FOUND THEN
        -- Fallback al boss activo si no se especificó ID
        SELECT * INTO v_boss FROM public.community_bosses WHERE is_current_active = TRUE LIMIT 1 FOR UPDATE;
    END IF;

    IF v_boss.status = 'defeated' THEN
        RETURN json_build_object('success', TRUE, 'is_defeated', TRUE, 'current_hp', 0, 'status', 'defeated');
    END IF;

    -- 2. Restar daño con piso en 0
    v_new_hp := GREATEST(0, v_boss.current_hp - p_damage);
    v_is_defeated := (v_new_hp = 0);

    -- 3. Redactar mensaje del feed
    IF p_is_critical THEN
        v_event_type := 'critical';
        v_message := '🔥 ¡GOLPE CRÍTICO! ' || p_user_name || ' infligió ' || p_damage || ' de daño demoledor.';
    ELSE
        v_message := '⚔️ ' || p_user_name || ' completó su Pomodoro e infligió ' || p_damage || ' de daño.';
    END IF;

    -- 4. Actualizar estado del Boss
    UPDATE public.community_bosses
    SET 
        current_hp = v_new_hp,
        status = CASE WHEN v_is_defeated THEN 'defeated'::boss_status_enum ELSE status END,
        defeated_at = CASE WHEN v_is_defeated THEN TIMEZONE('utc'::text, NOW()) ELSE defeated_at END,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = v_boss.id;

    -- 5. Insertar evento en el feed
    INSERT INTO public.community_boss_attacks (
        boss_id, user_id, user_name, event_type, damage_dealt, message
    ) VALUES (
        v_boss.id, v_user_id, p_user_name, v_event_type, p_damage, v_message
    );

    -- 6. Si fue derrotado, insertar evento de victoria
    IF v_is_defeated THEN
        INSERT INTO public.community_boss_attacks (
            boss_id, user_id, user_name, event_type, message
        ) VALUES (
            v_boss.id, NULL, 'Sistema de Comunidad', 'victory',
            '🏆 ¡VICTORIA! La comunidad ha derrotado a ' || (v_boss.name->>'es') || '. ¡+150 Pro Coins a todos!'
        );

        -- Otorgar recompensa de monedas colectiva a todos los participantes
        INSERT INTO public.boss_rewards_log (boss_id, coins_awarded, rewarded_at)
        VALUES (v_boss.id, 150, TIMEZONE('utc'::text, NOW()))
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN json_build_object(
        'success', TRUE,
        'damage_dealt', p_damage,
        'current_hp', v_new_hp,
        'max_hp', v_boss.max_hp,
        'is_critical', p_is_critical,
        'is_defeated', v_is_defeated,
        'status', CASE WHEN v_is_defeated THEN 'defeated' ELSE 'active' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
