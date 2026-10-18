-- ==============================================================================
-- 👻 PROCRASTINA COMO UN PRO (COFU) - SEMILLA DE USUARIOS Y PODIO HISTÓRICO
-- ==============================================================================
-- Propósito:
-- 1. Insertar 7 usuarios simulados con nombres realistas, profesiones, países
--    (México, Colombia, Brasil, USA, España), avatares guardianes, medallas y
--    estadísticas competitivas en Supabase.
-- 2. Registrar el snapshot histórico del Podio de la semana anterior para que
--    la card "CAMPEONES VIGENTES" aparezca con Oro, Plata y Bronce de inmediato.
-- 3. Idempotente: Se puede ejecutar múltiples veces sin duplicar ni romper nada.
--
-- Para revertir/borrar estos datos en cualquier momento:
-- Ejecutar el script: docs/clean_ghost_community_users.sql
-- ==============================================================================

DO $$
DECLARE
    -- Cálculo dinámico del domingo anterior (cierre de la semana pasada)
    v_prev_sunday DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE - 1;
    v_prev_year_week TEXT := to_char(v_prev_sunday, 'IYYY-"W"IW');

    -- UUIDs fijos para garantizar idempotencia y eliminación limpia
    v_id_valeria UUID := 'a0000000-0000-0000-0000-000000000001';
    v_id_mateo   UUID := 'a0000000-0000-0000-0000-000000000002';
    v_id_lucas   UUID := 'a0000000-0000-0000-0000-000000000003';
    v_id_ethan   UUID := 'a0000000-0000-0000-0000-000000000004';
    v_id_sofia   UUID := 'a0000000-0000-0000-0000-000000000005';
    v_id_gabriel UUID := 'a0000000-0000-0000-0000-000000000006';
    v_id_mariana UUID := 'a0000000-0000-0000-0000-000000000007';
BEGIN
    RAISE NOTICE 'Iniciando siembra de usuarios vivos en Supabase...';

    -- --------------------------------------------------------------------------
    -- 1. CREACIÓN EN AUTH.USERS (Para cumplir con la Foreign Key de public.profiles)
    -- --------------------------------------------------------------------------
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES
    (
        '00000000-0000-0000-0000-000000000000', v_id_valeria, 'authenticated', 'authenticated',
        'valeria.ramos@ghosts.cofu.internal', crypt('GhostPass2026!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{"user_name":"vramos"}'::jsonb, now(), now()
    ),
    (
        '00000000-0000-0000-0000-000000000000', v_id_mateo, 'authenticated', 'authenticated',
        'mateo.restrepo@ghosts.cofu.internal', crypt('GhostPass2026!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{"user_name":"Mateo"}'::jsonb, now(), now()
    ),
    (
        '00000000-0000-0000-0000-000000000000', v_id_lucas, 'authenticated', 'authenticated',
        'lucas.silva@ghosts.cofu.internal', crypt('GhostPass2026!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{"user_name":"Silva"}'::jsonb, now(), now()
    ),
    (
        '00000000-0000-0000-0000-000000000000', v_id_ethan, 'authenticated', 'authenticated',
        'ethan.miller@ghosts.cofu.internal', crypt('GhostPass2026!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{"user_name":"Ethan_M"}'::jsonb, now(), now()
    ),
    (
        '00000000-0000-0000-0000-000000000000', v_id_sofia, 'authenticated', 'authenticated',
        'sofia.navarro@ghosts.cofu.internal', crypt('GhostPass2026!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{"user_name":"Sofi_N"}'::jsonb, now(), now()
    ),
    (
        '00000000-0000-0000-0000-000000000000', v_id_gabriel, 'authenticated', 'authenticated',
        'gabriel.oliveira@ghosts.cofu.internal', crypt('GhostPass2026!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{"user_name":"Gabo"}'::jsonb, now(), now()
    ),
    (
        '00000000-0000-0000-0000-000000000000', v_id_mariana, 'authenticated', 'authenticated',
        'mariana.herrera@ghosts.cofu.internal', crypt('GhostPass2026!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{"user_name":"m.herrera"}'::jsonb, now(), now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- --------------------------------------------------------------------------
    -- 2. POBLACIÓN DE PERFILES EN PUBLIC.PROFILES
    -- --------------------------------------------------------------------------
    INSERT INTO public.profiles (
        id, email, username, profession, country, country_code, language,
        selected_avatar, selected_theme, is_premium, focus_points, focus_tomatoes,
        completed_objectives, streak_days, longest_streak, podium_wins,
        gold_medals, silver_medals, bronze_medals, pro_coins, onboarding_completed,
        social_links, last_focus_date, updated_at
    ) VALUES
    (
        v_id_mateo, 'mateo.restrepo@ghosts.cofu.internal', 'Mateo',
        'Ingeniería de Software & Arquitectura', 'Colombia', 'CO', 'es',
        'perro', 'cyberpunk', TRUE, 265, 8,
        7, 6, 12, 2,
        1, 1, 0, 280, TRUE,
        '{"github":"https://github.com","linkedin":"https://linkedin.com"}'::jsonb,
        CURRENT_DATE, now()
    ),
    (
        v_id_sofia, 'sofia.navarro@ghosts.cofu.internal', 'Sofi_N',
        'Derecho & Oposiciones', 'España', 'ES', 'es',
        'hamster', 'aurora', TRUE, 235, 7,
        6, 5, 10, 1,
        0, 0, 1, 230, TRUE,
        '{"github":"https://github.com","portfolio":"https://dev.to"}'::jsonb,
        CURRENT_DATE, now()
    ),
    (
        v_id_ethan, 'ethan.miller@ghosts.cofu.internal', 'Ethan_M',
        'Emprendimiento & Estrategia Digital', 'USA', 'US', 'es',
        'loro', 'zen', TRUE, 205, 6,
        5, 5, 8, 1,
        0, 1, 0, 190, TRUE,
        '{"github":"https://github.com"}'::jsonb,
        CURRENT_DATE, now()
    ),
    (
        v_id_valeria, 'valeria.ramos@ghosts.cofu.internal', 'vramos',
        'Estudiante de Medicina & Salud', 'México', 'MX', 'es',
        'conejo', 'aurora', TRUE, 175, 5,
        4, 7, 14, 3,
        2, 1, 0, 350, TRUE,
        '{"linkedin":"https://linkedin.com","portfolio":"https://behance.net"}'::jsonb,
        CURRENT_DATE, now()
    ),
    (
        v_id_lucas, 'lucas.silva@ghosts.cofu.internal', 'Silva',
        'Investigador & Tesista de Posgrado', 'Brasil', 'BR', 'es',
        'gato', 'samurai', TRUE, 140, 4,
        3, 4, 7, 2,
        0, 0, 2, 210, TRUE,
        '{"portfolio":"https://dribbble.com"}'::jsonb,
        CURRENT_DATE, now()
    ),
    (
        v_id_gabriel, 'gabriel.oliveira@ghosts.cofu.internal', 'Gabo',
        'Finanzas Corporativas & Contabilidad', 'Brasil', 'BR', 'es',
        'raton', 'samurai', TRUE, 95, 3,
        2, 3, 5, 0,
        0, 0, 0, 90, TRUE,
        '{}'::jsonb,
        CURRENT_DATE, now()
    ),
    (
        v_id_mariana, 'mariana.herrera@ghosts.cofu.internal', 'm.herrera',
        'Docencia, Idiomas & Traducción', 'México', 'MX', 'es',
        'tortuga', 'zen', TRUE, 60, 2,
        1, 2, 3, 0,
        0, 0, 0, 60, TRUE,
        '{}'::jsonb,
        CURRENT_DATE, now()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        profession = EXCLUDED.profession,
        country = EXCLUDED.country,
        country_code = EXCLUDED.country_code,
        selected_avatar = EXCLUDED.selected_avatar,
        selected_theme = EXCLUDED.selected_theme,
        is_premium = EXCLUDED.is_premium,
        focus_points = EXCLUDED.focus_points,
        focus_tomatoes = EXCLUDED.focus_tomatoes,
        completed_objectives = EXCLUDED.completed_objectives,
        streak_days = EXCLUDED.streak_days,
        longest_streak = EXCLUDED.longest_streak,
        podium_wins = EXCLUDED.podium_wins,
        gold_medals = EXCLUDED.gold_medals,
        silver_medals = EXCLUDED.silver_medals,
        bronze_medals = EXCLUDED.bronze_medals,
        social_links = EXCLUDED.social_links,
        last_focus_date = EXCLUDED.last_focus_date,
        updated_at = now();

    -- --------------------------------------------------------------------------
    -- 3. SNAPSHOT DEL PODIO SEMANAL DE LA SEMANA ANTERIOR (CAMPEONES VIGENTES)
    -- --------------------------------------------------------------------------
    -- Insertamos a los campeones defensores de la semana pasada:
    -- 1º Oro: vramos (285 pts)
    -- 2º Plata: Mateo (250 pts)
    -- 3º Bronce: Silva (215 pts)
    INSERT INTO public.weekly_podium_snapshots (
        week_end_date,
        year_week,
        first_place_id,
        first_place_username,
        first_place_avatar,
        first_place_score,
        second_place_id,
        second_place_username,
        second_place_avatar,
        second_place_score,
        third_place_id,
        third_place_username,
        third_place_avatar,
        third_place_score,
        created_at
    ) VALUES (
        v_prev_sunday,
        v_prev_year_week,
        v_id_valeria,
        'vramos',
        'conejo',
        285,
        v_id_mateo,
        'Mateo',
        'perro',
        250,
        v_id_lucas,
        'Silva',
        'gato',
        215,
        v_prev_sunday + TIME '23:59:59'
    )
    ON CONFLICT (year_week) DO UPDATE SET
        first_place_id = EXCLUDED.first_place_id,
        first_place_username = EXCLUDED.first_place_username,
        first_place_avatar = EXCLUDED.first_place_avatar,
        first_place_score = EXCLUDED.first_place_score,
        second_place_id = EXCLUDED.second_place_id,
        second_place_username = EXCLUDED.second_place_username,
        second_place_avatar = EXCLUDED.second_place_avatar,
        second_place_score = EXCLUDED.second_place_score,
        third_place_id = EXCLUDED.third_place_id,
        third_place_username = EXCLUDED.third_place_username,
        third_place_avatar = EXCLUDED.third_place_avatar,
        third_place_score = EXCLUDED.third_place_score;

    -- --------------------------------------------------------------------------
    -- 4. PUBLICACIONES EN EL MURO DE MOTIVACIÓN (COMMUNITY MOTIVATIONS)
    -- --------------------------------------------------------------------------
    INSERT INTO public.community_motivations (
        id, user_id, user_name, avatar, text, category, likes, created_at
    ) VALUES
    (
        'mot-ghost-mateo', v_id_mateo, 'Mateo', 'perro',
        'No esperes a tener ganas para empezar. La motivación aparece después de los primeros 5 minutos de enfoque.',
        'disciplina', 14, now() - INTERVAL '3 hours'
    ),
    (
        'mot-ghost-vramos', v_id_valeria, 'vramos', 'conejo',
        'Cada bloque de estudio cuenta. La constancia silenciosa de hoy es el éxito del mañana.',
        'crecimiento', 12, now() - INTERVAL '5 hours'
    ),
    (
        'mot-ghost-sofi', v_id_sofia, 'Sofi_N', 'hamster',
        'Un artículo a la vez, una ley a la vez. El secreto no es la prisa, es no detenerse.',
        'disciplina', 10, now() - INTERVAL '8 hours'
    ),
    (
        'mot-ghost-ethan', v_id_ethan, 'Ethan_M', 'loro',
        'Enfócate en lo que puedes controlar hoy. La ejecución vence al perfeccionismo siempre.',
        'metas', 9, now() - INTERVAL '12 hours'
    ),
    (
        'mot-ghost-silva', v_id_lucas, 'Silva', 'gato',
        'La profundidad requiere calma. Apaga las notificaciones y sumérgete en una sola tarea.',
        'crecimiento', 7, now() - INTERVAL '16 hours'
    ),
    (
        'mot-ghost-gabo', v_id_gabriel, 'Gabo', 'raton',
        'Los grandes resultados se construyen con pequeñas sumas diarias. 25 minutos valen oro.',
        'disciplina', 6, now() - INTERVAL '22 hours'
    ),
    (
        'mot-ghost-mherrera', v_id_mariana, 'm.herrera', 'tortuga',
        'Paso a paso, como la tortuga: despacio pero sin pausa. ¡Ánimo guerreros!',
        'pasion', 5, now() - INTERVAL '26 hours'
    )
    ON CONFLICT (id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        avatar = EXCLUDED.avatar,
        text = EXCLUDED.text,
        category = EXCLUDED.category,
        likes = EXCLUDED.likes;

    -- --------------------------------------------------------------------------
    -- 5. REGISTRO DE ATAQUES Y DAÑOS AL JEFE COLECTIVO (COMMUNITY BOSS ATTACKS)
    -- --------------------------------------------------------------------------
    INSERT INTO public.community_boss_attacks (
        id, boss_id, user_id, user_name, user_avatar, event_type, damage_dealt, hp_healed, shield_damage, message, created_at
    ) VALUES
    (
        'b0000000-0000-0000-0000-000000000001', 'siren', v_id_mateo, 'Mateo', 'perro',
        'attack', 45, 0, 0,
        '⚔️ Mateo completó un pomodoro y asestó 45 de daño a La Sirena de las Distracciones.',
        now() - INTERVAL '18 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000002', 'siren', v_id_valeria, 'vramos', 'conejo',
        'critical', 60, 0, 0,
        '💥 vramos resistió el canto de distracción con un golpe crítico de 60 de daño.',
        now() - INTERVAL '34 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000003', 'siren', v_id_sofia, 'Sofi_N', 'hamster',
        'attack', 50, 0, 0,
        '🎯 Sofi_N mantuvo disciplina total e infligió 50 de daño a La Sirena.',
        now() - INTERVAL '52 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000004', 'siren', v_id_ethan, 'Ethan_M', 'loro',
        'attack', 35, 0, 0,
        '⚡ Ethan_M finalizó su objetivo y golpeó con 35 de daño al Jefe colectivo.',
        now() - INTERVAL '1 hour 15 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000005', 'siren', v_id_lucas, 'Silva', 'gato',
        'heal', 0, 30, 0,
        '🛡️ Silva recargó energías en descanso y reforzó el escudo comunitario con 30 pts.',
        now() - INTERVAL '1 hour 40 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000006', 'siren', v_id_gabriel, 'Gabo', 'raton',
        'attack', 40, 0, 0,
        '⚔️ Gabo cerró su sesión de concentración restando 40 HP a La Sirena.',
        now() - INTERVAL '2 hours 10 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000007', 'siren', v_id_mariana, 'm.herrera', 'tortuga',
        'attack', 30, 0, 0,
        '✨ m.herrera sumó 30 de daño constante combatiendo la procrastinación en equipo.',
        now() - INTERVAL '2 hours 45 minutes'
    )
    ON CONFLICT (id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        user_avatar = EXCLUDED.user_avatar,
        event_type = EXCLUDED.event_type,
        damage_dealt = EXCLUDED.damage_dealt,
        hp_healed = EXCLUDED.hp_healed,
        message = EXCLUDED.message;

    -- Actualizar salud de la Sirena para reflejar el combate colectivo activo
    UPDATE public.community_bosses
    SET current_hp = GREATEST(100, max_hp - 260),
        updated_at = now()
    WHERE id = 'siren';

    RAISE NOTICE '¡Éxito! 7 guerreros activos, Podio, Motivaciones y Ataques al Jefe han sido sembrados correctamente.';
END $$;
