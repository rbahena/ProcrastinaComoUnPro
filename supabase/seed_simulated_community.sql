-- ==============================================================================
-- 👥 PROCRASTINA COMO UN PRO (COFU) - SEMILLA DE COMUNIDAD SIMULADA
-- ==============================================================================
-- Propósito:
-- 1. Poblar la base de datos con ~30 perfiles de usuarios realistas y variados.
-- 2. Evitar el "Efecto Restaurante Vacío" (Ghost Town Effect) al lanzar a producción.
-- 3. Alimentar instantáneamente:
--    - Podio de Honor y Salón de la Fama (/home y /medallero).
--    - Récords Históricos (Mejor Racha, Pomodoros, Monedas, Podios).
--    - Vecinos en el ranking (2 puestos arriba, tú, 2 puestos abajo).
--    - Feed de batalla del Jefe de Raid Comunitario (/enfoque y /home).
--    - Telemetría global ("X personas enfocándose hoy").
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AGREGAR COLUMNA DE CONTROL INTERNO (is_simulated)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_simulated ON public.profiles(is_simulated);

-- ------------------------------------------------------------------------------
-- 2. PROCEDIMIENTO SEED DE USUARIOS SIMULADOS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    -- Array de usuarios simulados: [id, email, username, profession, country, country_code, avatar, theme, is_premium, coins, points, tomatoes, streak, longest_streak, podium_wins, gold, silver, bronze]
    bot RECORD;
    v_user_id UUID;
    v_active_boss_id VARCHAR(50);
BEGIN
    -- Obtener el ID del jefe de raid activo actual
    SELECT id INTO v_active_boss_id 
    FROM public.community_bosses 
    WHERE is_current_active = TRUE AND status = 'active'
    LIMIT 1;

    IF v_active_boss_id IS NULL THEN
        v_active_boss_id := 'siren';
    END IF;

    -- Tabla temporal con los datos de los 30 usuarios simulados
    CREATE TEMP TABLE tmp_seed_bots (
        bot_id UUID,
        email TEXT,
        username TEXT,
        profession TEXT,
        country TEXT,
        country_code VARCHAR(10),
        selected_avatar VARCHAR(50),
        selected_theme public.user_theme_enum,
        selected_weapon VARCHAR(50),
        is_premium BOOLEAN,
        pro_coins BIGINT,
        focus_points BIGINT,
        focus_tomatoes INTEGER,
        completed_objectives INTEGER,
        abandoned_sessions INTEGER,
        streak_days INTEGER,
        longest_streak INTEGER,
        podium_wins INTEGER,
        gold_medals INTEGER,
        silver_medals INTEGER,
        bronze_medals INTEGER,
        last_focus_offset_hours INTEGER
    ) ON COMMIT DROP;

    INSERT INTO tmp_seed_bots VALUES
    -- Tier 1: Veteranos y Líderes del Salón de la Fama (Top histórico alcanzable)
    ('a0000001-0000-0000-0000-000000000001', 'valeria.code@sim.cofu.app', 'Valeria_Code', 'Frontend Architect', 'México', 'mx', 'dragon', 'samurai', 'shadow_blade', TRUE, 1250, 3120, 118, 95, 4, 18, 24, 5, 2, 2, 1, 1),
    ('a0000001-0000-0000-0000-000000000002', 'mateo.focus@sim.cofu.app', 'Mateo_Focus', 'UX/UI Designer', 'España', 'es', 'buho', 'zen', 'katana_wood', TRUE, 980, 2840, 102, 88, 6, 14, 19, 4, 1, 2, 1, 2),
    ('a0000001-0000-0000-0000-000000000003', 'lucas.zen@sim.cofu.app', 'Lucas_Zen', 'Escritor & Filósofo', 'Argentina', 'ar', 'lobo', 'zen', 'shadow_blade', TRUE, 890, 2610, 94, 76, 5, 21, 21, 3, 1, 1, 1, 1),
    ('a0000001-0000-0000-0000-000000000004', 'sofi.dev@sim.cofu.app', 'Sofi_Dev', 'Fullstack Engineer', 'Colombia', 'co', 'zorro', 'cyberpunk', 'cyber_saber', TRUE, 820, 2380, 86, 70, 7, 12, 16, 2, 0, 1, 1, 3),
    ('a0000001-0000-0000-0000-000000000005', 'diego.product@sim.cofu.app', 'Diego_Product', 'Product Manager', 'Chile', 'cl', 'aguila', 'aurora', 'katana_wood', TRUE, 740, 2150, 79, 64, 8, 9, 15, 2, 0, 1, 1, 2),

    -- Tier 2: Usuarios Frecuentes y Competitivos (Compañeros de podio y rankings)
    ('a0000001-0000-0000-0000-000000000006', 'camila.art@sim.cofu.app', 'Camila_Art', 'Ilustradora Digital', 'México', 'mx', 'panda', 'aurora', 'katana_wood', TRUE, 620, 1850, 68, 55, 6, 8, 12, 1, 0, 0, 1, 1),
    ('a0000001-0000-0000-0000-000000000007', 'andrea.writer@sim.cofu.app', 'Andrea_Writer', 'Copywriter & Periodista', 'España', 'es', 'gato', 'zen', 'katana_wood', TRUE, 580, 1690, 62, 51, 5, 11, 14, 1, 0, 1, 0, 4),
    ('a0000001-0000-0000-0000-000000000008', 'leo.cyber@sim.cofu.app', 'Leo_Cyber', 'DevOps & Cloud Ninja', 'Perú', 'pe', 'tigre', 'cyberpunk', 'cyber_saber', TRUE, 510, 1540, 56, 46, 9, 7, 10, 1, 0, 0, 1, 2),
    ('a0000001-0000-0000-0000-000000000009', 'nico.data@sim.cofu.app', 'Nico_Data', 'Data Scientist', 'Uruguay', 'uy', 'leon', 'samurai', 'shadow_blade', TRUE, 490, 1420, 52, 42, 4, 6, 9, 0, 0, 0, 0, 5),
    ('a0000001-0000-0000-0000-000000000010', 'elena.ux@sim.cofu.app', 'Elena_UX', 'Diseñadora de Producto', 'Colombia', 'co', 'lince', 'aurora', 'katana_wood', TRUE, 460, 1310, 48, 40, 6, 10, 10, 0, 0, 0, 0, 1),
    ('a0000001-0000-0000-0000-000000000011', 'martin.k@sim.cofu.app', 'Martin_K', 'Estudiante de Medicina', 'México', 'mx', 'oso', 'zen', 'katana_wood', TRUE, 420, 1220, 45, 38, 7, 5, 8, 0, 0, 0, 0, 6),
    ('a0000001-0000-0000-0000-000000000012', 'lucia.design@sim.cofu.app', 'Lucia_Design', 'Arquitecta', 'España', 'es', 'conejo', 'samurai', 'katana_wood', TRUE, 390, 1140, 42, 35, 5, 8, 11, 0, 0, 0, 0, 2),
    ('a0000001-0000-0000-0000-000000000013', 'javier.flow@sim.cofu.app', 'Javier_Flow', 'Backend Developer', 'Argentina', 'ar', 'perro', 'cyberpunk', 'cyber_saber', TRUE, 370, 1060, 39, 32, 8, 6, 7, 0, 0, 0, 0, 3),
    ('a0000001-0000-0000-0000-000000000014', 'claudia.zen@sim.cofu.app', 'Claudia_Zen', 'Traductora Editorial', 'Costa Rica', 'cr', 'tortuga', 'zen', 'katana_wood', TRUE, 340, 980, 36, 30, 3, 9, 12, 0, 0, 0, 0, 4),
    ('a0000001-0000-0000-0000-000000000015', 'pablo.craft@sim.cofu.app', 'Pablo_Craft', 'Diseñador 3D', 'Chile', 'cl', 'castor', 'samurai', 'shadow_blade', TRUE, 310, 910, 33, 28, 4, 4, 6, 0, 0, 0, 0, 2),

    -- Tier 3: Usuarios Intermedios y Crecientes (Comunidad activa en progreso)
    ('a0000001-0000-0000-0000-000000000016', 'mariana.code@sim.cofu.app', 'Mariana_Code', 'Mobile App Dev', 'Guatemala', 'gt', 'abeja', 'aurora', 'katana_wood', TRUE, 280, 830, 30, 25, 5, 5, 7, 0, 0, 0, 0, 1),
    ('a0000001-0000-0000-0000-000000000017', 'bruno.audio@sim.cofu.app', 'Bruno_Audio', 'Productor Musical', 'México', 'mx', 'loro', 'cyberpunk', 'katana_wood', TRUE, 250, 750, 27, 23, 6, 3, 5, 0, 0, 0, 0, 7),
    ('a0000001-0000-0000-0000-000000000018', 'laura.study@sim.cofu.app', 'Laura_Study', 'Abogada', 'España', 'es', 'hormiga', 'zen', 'katana_wood', TRUE, 230, 680, 25, 21, 4, 7, 8, 0, 0, 0, 0, 3),
    ('a0000001-0000-0000-0000-000000000019', 'sergio.pm@sim.cofu.app', 'Sergio_PM', 'Scrum Master', 'Colombia', 'co', 'elefante', 'samurai', 'katana_wood', TRUE, 210, 610, 22, 19, 5, 4, 6, 0, 0, 0, 0, 8),
    ('a0000001-0000-0000-0000-000000000020', 'paula.brand@sim.cofu.app', 'Paula_Brand', 'Branding Strategist', 'Perú', 'pe', 'rana', 'aurora', 'katana_wood', TRUE, 190, 550, 20, 17, 3, 3, 4, 0, 0, 0, 0, 2),

    -- Tier 4: Miembros Nuevos / Plan Básico (Para dar escala real a la plataforma)
    ('a0000001-0000-0000-0000-000000000021', 'fer.focus@sim.cofu.app', 'Fer_Focus', 'Estudiante Universitario', 'México', 'mx', 'gato', 'samurai', 'katana_wood', FALSE, 140, 420, 15, 12, 4, 3, 3, 0, 0, 0, 0, 9),
    ('a0000001-0000-0000-0000-000000000022', 'gonzalo.d@sim.cofu.app', 'Gonzalo_D', 'Consultor Freelance', 'España', 'es', 'hamster', 'zen', 'katana_wood', FALSE, 120, 360, 13, 10, 2, 2, 3, 0, 0, 0, 0, 12),
    ('a0000001-0000-0000-0000-000000000023', 'clara.notes@sim.cofu.app', 'Clara_Notes', 'Investigadora', 'Argentina', 'ar', 'raton', 'aurora', 'katana_wood', FALSE, 110, 310, 11, 9, 3, 2, 2, 0, 0, 0, 0, 5),
    ('a0000001-0000-0000-0000-000000000024', 'alvaro.coder@sim.cofu.app', 'Alvaro_Coder', 'Junior Developer', 'Colombia', 'co', 'gato', 'cyberpunk', 'katana_wood', FALSE, 90, 260, 9, 7, 4, 1, 2, 0, 0, 0, 0, 14),
    ('a0000001-0000-0000-0000-000000000025', 'dani.zen@sim.cofu.app', 'Dani_Zen', 'Psicóloga', 'Chile', 'cl', 'buho', 'zen', 'katana_wood', FALSE, 80, 220, 8, 6, 2, 2, 2, 0, 0, 0, 0, 16),
    ('a0000001-0000-0000-0000-000000000026', 'miguel.tech@sim.cofu.app', 'Miguel_Tech', 'QA Tester', 'México', 'mx', 'perro', 'samurai', 'katana_wood', FALSE, 60, 170, 6, 5, 2, 1, 1, 0, 0, 0, 0, 18),
    ('a0000001-0000-0000-0000-000000000027', 'ana.editora@sim.cofu.app', 'Ana_Editora', 'Editora de Video', 'España', 'es', 'zorro', 'aurora', 'katana_wood', FALSE, 50, 140, 5, 4, 1, 1, 1, 0, 0, 0, 0, 20),
    ('a0000001-0000-0000-0000-000000000028', 'hugo.startup@sim.cofu.app', 'Hugo_Startup', 'Fundador', 'Estados Unidos', 'us', 'lobo', 'cyberpunk', 'katana_wood', FALSE, 40, 100, 4, 3, 2, 1, 1, 0, 0, 0, 0, 22),
    ('a0000001-0000-0000-0000-000000000029', 'valen.mind@sim.cofu.app', 'Valen_Mind', 'Estudiante', 'Argentina', 'ar', 'gato', 'zen', 'katana_wood', FALSE, 30, 70, 3, 2, 1, 1, 1, 0, 0, 0, 0, 25),
    ('a0000001-0000-0000-0000-000000000030', 'samuel.dev@sim.cofu.app', 'Samuel_Dev', 'Ingeniero de Software', 'Colombia', 'co', 'dragon', 'samurai', 'katana_wood', FALSE, 20, 50, 2, 2, 0, 1, 1, 0, 0, 0, 0, 28);

    -- --------------------------------------------------------------------------
    -- 2.1 INSERTAR EN auth.users Y ACTUALIZAR public.profiles
    -- --------------------------------------------------------------------------
    FOR bot IN SELECT * FROM tmp_seed_bots LOOP
        -- 1. Insertar en auth.users (si no existe)
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES (
            bot.bot_id,
            '00000000-0000-0000-0000-000000000000',
            bot.email,
            crypt('ProcrastinaSeedPass123!', gen_salt('bf')),
            NOW() - (bot.longest_streak || ' days')::interval,
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', bot.username, 'user_name', bot.username),
            NOW() - (bot.longest_streak || ' days')::interval,
            NOW() - (bot.last_focus_offset_hours || ' hours')::interval,
            'authenticated',
            'authenticated'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = EXCLUDED.updated_at;

        -- 2. Upsert en public.profiles con todos los atributos de RPG y telemetría
        INSERT INTO public.profiles (
            id,
            email,
            username,
            profession,
            country,
            country_code,
            language,
            selected_avatar,
            selected_theme,
            selected_weapon,
            selected_timer,
            is_premium,
            pro_coins,
            focus_points,
            focus_tomatoes,
            completed_objectives,
            abandoned_sessions,
            streak_days,
            longest_streak,
            podium_wins,
            gold_medals,
            silver_medals,
            bronze_medals,
            last_focus_date,
            is_simulated,
            onboarding_completed,
            created_at,
            updated_at
        ) VALUES (
            bot.bot_id,
            bot.email,
            bot.username,
            bot.profession,
            bot.country,
            bot.country_code,
            'es',
            bot.selected_avatar,
            bot.selected_theme,
            bot.selected_weapon,
            'digital',
            bot.is_premium,
            bot.pro_coins,
            bot.focus_points,
            bot.focus_tomatoes,
            bot.completed_objectives,
            bot.abandoned_sessions,
            bot.streak_days,
            bot.longest_streak,
            bot.podium_wins,
            bot.gold_medals,
            bot.silver_medals,
            bot.bronze_medals,
            (NOW() - (bot.last_focus_offset_hours || ' hours')::interval)::date,
            TRUE,
            TRUE,
            NOW() - (bot.longest_streak || ' days')::interval,
            NOW() - (bot.last_focus_offset_hours || ' hours')::interval
        )
        ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            profession = EXCLUDED.profession,
            country = EXCLUDED.country,
            country_code = EXCLUDED.country_code,
            selected_avatar = EXCLUDED.selected_avatar,
            selected_theme = EXCLUDED.selected_theme,
            selected_weapon = EXCLUDED.selected_weapon,
            is_premium = EXCLUDED.is_premium,
            pro_coins = EXCLUDED.pro_coins,
            focus_points = EXCLUDED.focus_points,
            focus_tomatoes = EXCLUDED.focus_tomatoes,
            completed_objectives = EXCLUDED.completed_objectives,
            abandoned_sessions = EXCLUDED.abandoned_sessions,
            streak_days = EXCLUDED.streak_days,
            longest_streak = EXCLUDED.longest_streak,
            podium_wins = EXCLUDED.podium_wins,
            gold_medals = EXCLUDED.gold_medals,
            silver_medals = EXCLUDED.silver_medals,
            bronze_medals = EXCLUDED.bronze_medals,
            last_focus_date = EXCLUDED.last_focus_date,
            is_simulated = TRUE,
            onboarding_completed = TRUE,
            updated_at = EXCLUDED.updated_at;
    END LOOP;

    -- --------------------------------------------------------------------------
    -- 2.2 SEMILLA DE SESIONES COMPLETADAS HOY (Para telemetría "Sesiones de hoy")
    -- --------------------------------------------------------------------------
    -- Generar 12-16 sesiones de enfoque completadas durante las últimas 12 horas
    INSERT INTO public.focus_sessions (
        id, nonce_id, user_id, objective_text, status, methodology, coworking_mode,
        energy_level, planned_duration_seconds, actual_duration_seconds,
        objective_completed, completed_at, created_at
    )
    SELECT
        gen_random_uuid(),
        gen_random_uuid(),
        b.bot_id,
        CASE (floor(random() * 5))::int
            WHEN 0 THEN 'Diseño de wireframes y arquitectura UX'
            WHEN 1 THEN 'Refactorización y testing de componentes'
            WHEN 2 THEN 'Escritura de documentación y notas clave'
            WHEN 3 THEN 'Análisis de métricas y roadmap de proyecto'
            ELSE 'Bloque de estudio y lectura profunda'
        END,
        'completed'::public.focus_session_status_enum,
        CASE (floor(random() * 3))::int
            WHEN 0 THEN 'normal'::public.focus_methodology_enum
            WHEN 1 THEN 'sapo'::public.focus_methodology_enum
            ELSE 'pareto'::public.focus_methodology_enum
        END,
        'comunitario'::public.coworking_mode_enum,
        'high'::public.energy_level_enum,
        1500,
        1500,
        'yes',
        NOW() - ((b.last_focus_offset_hours * 50) || ' minutes')::interval,
        NOW() - ((b.last_focus_offset_hours * 50 + 25) || ' minutes')::interval
    FROM tmp_seed_bots b
    WHERE b.last_focus_offset_hours <= 12;

    -- --------------------------------------------------------------------------
    -- 2.3 SEMILLA DE ATAQUES RECIENTES AL JEFE DE RAID (Feed de Combate Vivo)
    -- --------------------------------------------------------------------------
    -- Si el jefe activo tiene vida completa, simular que ya ha recibido algunos golpes realistas
    UPDATE public.community_bosses
    SET current_hp = GREATEST(1000, max_hp - 2450),
        updated_at = NOW()
    WHERE id = v_active_boss_id AND current_hp = max_hp;

    -- Limpiar ataques antiguos simulados para este jefe y dejar los más recientes
    DELETE FROM public.community_boss_attacks 
    WHERE boss_id = v_active_boss_id AND user_name IN (SELECT username FROM tmp_seed_bots);

    -- Insertar feed inicial de ataques variados
    INSERT INTO public.community_boss_attacks (
        boss_id, user_id, user_name, user_avatar, event_type, damage_dealt, message, created_at
    ) VALUES
    (v_active_boss_id, 'a0000001-0000-0000-0000-000000000001', 'Valeria_Code', 'dragon', 'critical', 85, '🔥 ¡GOLPE CRÍTICO! Valeria_Code ejecutó un bloque impecable de 50 min e infligió 85 de daño demoledor.', NOW() - interval '8 minutes'),
    (v_active_boss_id, 'a0000001-0000-0000-0000-000000000004', 'Sofi_Dev', 'zorro', 'attack', 35, '⚔️ Sofi_Dev completó su Pomodoro e infligió 35 de daño.', NOW() - interval '22 minutes'),
    (v_active_boss_id, 'a0000001-0000-0000-0000-000000000002', 'Mateo_Focus', 'buho', 'attack', 30, '⚔️ Mateo_Focus venció una distracción y asestó 30 de daño al jefe.', NOW() - interval '45 minutes'),
    (v_active_boss_id, 'a0000001-0000-0000-0000-000000000006', 'Camila_Art', 'panda', 'critical', 70, '🔥 ¡GOLPE CRÍTICO! Camila_Art completó el Reto Sapo e infligió 70 de daño.', NOW() - interval '1 hour 15 minutes'),
    (v_active_boss_id, 'a0000001-0000-0000-0000-000000000008', 'Leo_Cyber', 'tigre', 'attack', 25, '⚔️ Leo_Cyber terminó su sesión de enfoque e infligió 25 de daño.', NOW() - interval '2 hours'),
    (v_active_boss_id, 'a0000001-0000-0000-0000-000000000003', 'Lucas_Zen', 'lobo', 'attack', 40, '⚔️ Lucas_Zen mantuvo el hiperfoco y descargó 40 de daño al jefe.', NOW() - interval '2 hours 40 minutes');

    RAISE NOTICE '✅ Semilla de comunidad simulada ejecutada con éxito (30 perfiles, sesiones de hoy y feed de combate inicial).';
END $$;
