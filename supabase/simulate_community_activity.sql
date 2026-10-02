-- ==============================================================================
-- ⚡ PROCRASTINA COMO UN PRO (COFU) - SIMULADOR DINÁMICO DE ACTIVIDAD COMUNITARIA
-- ==============================================================================
-- Propósito:
-- Mantener la plataforma viva de forma periódica en producción mediante:
-- 1. Ataques esporádicos al Jefe de Raid activo con variedad narrativa RPG.
-- 2. Incremento orgánico de pomodoros y puntos en perfiles simulados.
-- 3. Inserción de sesiones en `focus_sessions` para mantener viva la telemetría diaria.
-- 4. Función de limpieza total (reset) para cuando desees retirar la simulación.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROCEDIMIENTO: simulate_community_tick()
-- ------------------------------------------------------------------------------
-- Ejecuta 1 o más acciones simuladas aleatorias de miembros de la comunidad.
-- Puede llamarse manualmente con: SELECT public.simulate_community_tick(1);
-- O programarse mediante pg_cron cada 30-60 minutos.
CREATE OR REPLACE FUNCTION public.simulate_community_tick(p_num_actions INTEGER DEFAULT 1)
RETURNS JSON AS $$
DECLARE
    v_boss RECORD;
    v_bot RECORD;
    v_damage INTEGER;
    v_is_critical BOOLEAN;
    v_message TEXT;
    v_event_type public.boss_event_type_enum;
    v_new_hp INTEGER;
    v_is_defeated BOOLEAN := FALSE;
    v_actions_performed INTEGER := 0;
    v_results JSONB := '[]'::jsonb;
    v_random_action INT;
    v_task_title TEXT;
BEGIN
    -- 1. Obtener el Jefe de Raid activo
    SELECT * INTO v_boss 
    FROM public.community_bosses 
    WHERE is_current_active = TRUE AND status = 'active'
    FOR UPDATE LIMIT 1;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'No hay ningún Jefe de Raid comunitario activo en este momento.'
        );
    END IF;

    -- 2. Iterar tantas veces como acciones se hayan solicitado
    FOR i IN 1..p_num_actions LOOP
        -- Seleccionar un bot al azar de la comunidad simulada
        SELECT * INTO v_bot 
        FROM public.profiles 
        WHERE is_simulated = TRUE 
        ORDER BY random() 
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN json_build_object(
                'success', FALSE,
                'message', 'No se encontraron usuarios simulados (ejecuta primero seed_simulated_community.sql).'
            );
        END IF;

        -- Determinar tipo de evento (80% Normal, 20% Crítico)
        v_is_critical := (random() < 0.20);
        
        IF v_is_critical THEN
            v_damage := (floor(random() * 35) + 60)::int; -- 60 a 95 de daño
            v_event_type := 'critical';
            
            -- Variaciones de mensajes críticos
            CASE (floor(random() * 4))::int
                WHEN 0 THEN 
                    v_message := '🔥 ¡GOLPE CRÍTICO! ' || v_bot.username || ' completó el Reto Sapo e infligió ' || v_damage || ' de daño demoledor.';
                WHEN 1 THEN 
                    v_message := '⚡ ¡IMPACTO TOTAL! ' || v_bot.username || ' mantuvo 50 min de hiperfoco puro asestando ' || v_damage || ' de daño.';
                WHEN 2 THEN 
                    v_message := '🌟 ¡RACHA DE ACERO! ' || v_bot.username || ' desató su técnica maestra y causó ' || v_damage || ' de daño.';
                ELSE 
                    v_message := '💥 ¡GOLPE CRÍTICO! ' || v_bot.username || ' cerró una tarea clave infligiendo ' || v_damage || ' de daño.';
            END CASE;
        ELSE
            v_damage := (floor(random() * 20) + 20)::int; -- 20 a 40 de daño
            v_event_type := 'attack';
            
            -- Variaciones de mensajes normales
            CASE (floor(random() * 4))::int
                WHEN 0 THEN 
                    v_message := '⚔️ ' || v_bot.username || ' completó su Pomodoro e infligió ' || v_damage || ' de daño.';
                WHEN 1 THEN 
                    v_message := '🛡️ ' || v_bot.username || ' venció una distracción y asestó ' || v_damage || ' de daño al jefe.';
                WHEN 2 THEN 
                    v_message := '🎯 ' || v_bot.username || ' finalizó un bloque de concentración con ' || v_damage || ' de daño.';
                ELSE 
                    v_message := '🗡️ ' || v_bot.username || ' mantuvo el foco y descargó ' || v_damage || ' de daño.';
            END CASE;
        END IF;

        -- Calcular nueva vida del jefe (mínimo 0)
        v_new_hp := GREATEST(0, v_boss.current_hp - v_damage);
        v_is_defeated := (v_new_hp = 0);

        -- Actualizar vida del Boss
        UPDATE public.community_bosses
        SET 
            current_hp = v_new_hp,
            status = CASE WHEN v_is_defeated THEN 'defeated'::public.boss_status_enum ELSE status END,
            defeated_at = CASE WHEN v_is_defeated THEN TIMEZONE('utc'::text, NOW()) ELSE defeated_at END,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = v_boss.id;

        -- Registrar evento en el feed de ataques
        INSERT INTO public.community_boss_attacks (
            boss_id, user_id, user_name, user_avatar, event_type, damage_dealt, message, created_at
        ) VALUES (
            v_boss.id, v_bot.id, v_bot.username, v_bot.selected_avatar, v_event_type, v_damage, v_message, NOW()
        );

        -- Incrementar estadísticas del bot (1 pomodoro, XP y Pro Coins)
        UPDATE public.profiles
        SET 
            focus_tomatoes = focus_tomatoes + 1,
            focus_points = focus_points + (CASE WHEN v_is_critical THEN 40 ELSE 25 END),
            pro_coins = pro_coins + (CASE WHEN v_is_critical THEN 15 ELSE 10 END),
            completed_objectives = completed_objectives + 1,
            last_focus_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = v_bot.id;

        -- Registrar sesión en focus_sessions para alimentar métricas de "Sesiones de hoy"
        CASE (floor(random() * 5))::int
            WHEN 0 THEN v_task_title := 'Sesión de concentración y avance prioritario';
            WHEN 1 THEN v_task_title := 'Revisión y optimización de arquitectura';
            WHEN 2 THEN v_task_title := 'Bloque de estudio y toma de notas';
            WHEN 3 THEN v_task_title := 'Resolución de pendientes críticos';
            ELSE v_task_title := 'Hiperfoco sin interrupciones';
        END CASE;

        INSERT INTO public.focus_sessions (
            id, nonce_id, user_id, objective_text, status, methodology,
            coworking_mode, energy_level, planned_duration_seconds,
            actual_duration_seconds, objective_completed, completed_at, created_at
        ) VALUES (
            gen_random_uuid(),
            gen_random_uuid(),
            v_bot.id,
            v_task_title,
            'completed'::public.focus_session_status_enum,
            CASE WHEN v_is_critical THEN 'sapo'::public.focus_methodology_enum ELSE 'normal'::public.focus_methodology_enum END,
            'comunitario'::public.coworking_mode_enum,
            'high'::public.energy_level_enum,
            1500,
            1500,
            'yes',
            NOW(),
            NOW() - interval '25 minutes'
        );

        -- Si el jefe fue derrotado, emitir mensaje de victoria y salir del ciclo
        IF v_is_defeated THEN
            INSERT INTO public.community_boss_attacks (
                boss_id, user_id, user_name, event_type, message, created_at
            ) VALUES (
                v_boss.id, NULL, 'Sistema de Comunidad', 'victory',
                '🏆 ¡VICTORIA! La comunidad ha derrotado a ' || (v_boss.name->>'es') || '. ¡+150 Pro Coins a todos!',
                NOW()
            );
            
            v_results := v_results || jsonb_build_object('bot', v_bot.username, 'damage', v_damage, 'defeated', TRUE);
            v_actions_performed := v_actions_performed + 1;
            EXIT;
        END IF;

        v_results := v_results || jsonb_build_object('bot', v_bot.username, 'damage', v_damage, 'boss_hp_left', v_new_hp);
        v_actions_performed := v_actions_performed + 1;
        v_boss.current_hp := v_new_hp;
    END LOOP;

    RETURN json_build_object(
        'success', TRUE,
        'actions_performed', v_actions_performed,
        'boss_id', v_boss.id,
        'boss_hp_remaining', v_boss.current_hp,
        'details', v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 2. PROCEDIMIENTO DE LIMPIEZA TOTAL (clean_simulated_community)
-- ------------------------------------------------------------------------------
-- ¿Para qué sirve? Permite eliminar con 1 solo clic todos los usuarios simulados,
-- sus sesiones y sus registros de combate sin afectar a los usuarios reales.
CREATE OR REPLACE FUNCTION public.clean_simulated_community()
RETURNS JSON AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- 1. Eliminar de auth.users los usuarios marcados como simulados (o con correo @sim.cofu.app)
    -- Por la restricción ON DELETE CASCADE, esto limpiará automáticamente perfiles y focus_sessions.
    WITH deleted_auth AS (
        DELETE FROM auth.users
        WHERE id IN (SELECT id FROM public.profiles WHERE is_simulated = TRUE)
           OR email LIKE '%@sim.cofu.app'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted_auth;

    -- 2. Limpiar ataques huérfanos en community_boss_attacks
    DELETE FROM public.community_boss_attacks WHERE user_id IS NULL AND user_name != 'Sistema de Comunidad';

    RETURN json_build_object(
        'success', TRUE,
        'deleted_simulated_users', v_deleted_count,
        'message', 'Todos los datos simulados han sido removidos con éxito.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- ⏰ GUÍA DE AUTOMATIZACIÓN Y PROGRAMACIÓN (CRON) EN SUPABASE
-- ==============================================================================
-- OPCIÓN A (Recomendada con extensión pg_cron en Supabase):
-- 1. Ve a Database -> Extensions en tu dashboard de Supabase y activa 'pg_cron'.
-- 2. Ejecuta el siguiente comando en el SQL Editor para disparar 1 acción cada 45 minutos:
--
--    SELECT cron.schedule(
--        'simular-comunidad-cada-45-min',
--        '*/45 * * * *',
--        'SELECT public.simulate_community_tick(1);'
--    );
--
-- Para desprogramar el cron en el futuro:
--    SELECT cron.unschedule('simular-comunidad-cada-45-min');
--
-- ------------------------------------------------------------------------------
-- OPCIÓN B (Con GitHub Actions, Cron externo o Supabase Edge Functions):
-- Puedes hacer una petición HTTP POST autenticada a la API RPC de Supabase:
-- URL: https://<TU-PROYECTO>.supabase.co/rest/v1/rpc/simulate_community_tick
-- Headers:
--   apikey: <SUPABASE_SERVICE_ROLE_KEY>
--   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
--   Content-Type: application/json
-- Body:
--   { "p_num_actions": 1 }
-- ==============================================================================
