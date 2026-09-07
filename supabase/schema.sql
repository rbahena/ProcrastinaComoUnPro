-- ==============================================================================
-- 🛡️ PROCRASTINA COMO UN PRO (COFU) - ESQUEMA DE BASE DE DATOS EN SUPABASE
-- ==============================================================================
-- Este archivo contiene la definición completa del esquema de PostgreSQL para
-- Supabase. Cada elemento incluye una etiqueta con su TIPO DE OBJETO DE BASE DE DATOS
-- (Tabla, Función, Trigger, Tipo ENUM, Política RLS, Índice, RPC, etc.),
-- qué representa y para qué sirve en la arquitectura de la aplicación.
--
-- ARQUITECTURA MULTILINGÜE (i18n):
-- Todos los campos descriptivos y de lore utilizan el estándar JSONB {"es": "...", "en": "..."}
-- permitiendo consultas ultrarrápidas en una sola petición sin JOINs y soporte
-- nativo para agregar cualquier idioma futuro sin alterar el esquema ni romper la base de datos.
--
-- CONTROL DE PROGRESO DE MIGRACIONES:
-- [x] PASO 1: Autenticación, Perfiles & Preferencias de Idioma -> COMPLETADO
-- [x] PASO 2: Desbloqueables, Cosméticos & Atributos RPG Multilingüe (N:M) -> COMPLETADO
-- [ ] PASO 3: Catálogo y Progreso de Cualidades Maestras -> PENDIENTE
-- [ ] PASO 4: Sesiones de Enfoque, Bitácora & Blindaje Anti-Exploits -> PENDIENTE
-- [ ] PASO 5: Jefes de Raid Comunitarios & WebSockets Realtime -> PENDIENTE
-- [ ] PASO 6: Arena Temporal (/fechas), Cortafuegos (/bloqueador) y Baúl de Ideas -> PENDIENTE
-- ==============================================================================


-- ==============================================================================
-- 📦 PASO 1: AUTENTICACIÓN Y PERFILES DE USUARIO
-- ==============================================================================
-- Propósito:
-- Gestionar la identidad, personalización estética, telemetría de productividad,
-- idioma de interfaz, suscripción y palmarés competitivo de cada usuario registrado.
-- Se vincula 1:1 con el esquema interno de autenticación de Supabase (auth.users).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONES BÁSICAS DE POSTGRESQL
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: EXTENSIÓN (EXTENSION)]
-- ¿Qué es? Módulos que añaden funcionalidades y algoritmos avanzados al motor de PostgreSQL.
-- ¿Para qué sirve? 
--   - uuid-ossp: Permite generar identificadores únicos universales (UUID v4).
--   - pgcrypto: Proporciona funciones criptográficas para hashing y tokens de seguridad.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ------------------------------------------------------------------------------
-- 2. TIPOS DE DATOS PERSONALIZADOS
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: ENUM / TIPO ENUMERADO (ENUMERATED TYPE)]
-- ¿Qué es? Un tipo de dato personalizado que restringe los valores de una columna a una lista estricta y cerrada.
-- ¿Para qué sirve? Garantiza la integridad en la interfaz, permitiendo solo temas visuales válidos en la app:
--   - 'samurai': Tema clásico japonés oscuro con detalles esmeralda/rojos.
--   - 'cyberpunk': Tema futurista neón con acentos fucsia y cian.
--   - 'aurora': Tema moderno con gradientes boreales y tonos violetas.
--   - 'zen': Tema minimalista, sobrio y relajante en tonos teal y neutros.
DO $$ BEGIN
    CREATE TYPE user_theme_enum AS ENUM ('samurai', 'cyberpunk', 'aurora', 'zen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ------------------------------------------------------------------------------
-- 3. TABLA PRINCIPAL DE PERFILES
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? La estructura principal de almacenamiento relacional (filas y columnas).
-- ¿Para qué sirve? Extiende la tabla auth.users de Supabase (relación 1:1). Almacena el perfil público,
-- personalización estética, telemetría de concentración, monedas ganadas, rachas, idioma y palmarés del usuario.
CREATE TABLE IF NOT EXISTS public.profiles (
    -- [COLUMNA / RESTRICCIÓN: LLAVE PRIMARIA Y FORÁNEA (PRIMARY KEY & FOREIGN KEY)]
    -- Vinculación 1:1 con auth.users(id). Al eliminar la cuenta en Auth, se borra el perfil en cascada.
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- [COLUMNAS: INFORMACIÓN DE PERFIL Y COMUNIDAD]
    -- email: Correo electrónico sincronizado y validado como único.
    email TEXT UNIQUE NOT NULL,
    -- username: Nombre visible en clasificaciones, salas comunitarias y perfil.
    username TEXT NOT NULL,
    -- profession: Ocupación o profesión del usuario (completada en el onboarding).
    profession TEXT DEFAULT NULL,
    -- country: País de residencia del usuario.
    country TEXT DEFAULT NULL,
    -- country_code: Código ISO del país (ej. 'MX', 'ES', 'CO') para renderizar la bandera nacional.
    country_code VARCHAR(10) DEFAULT NULL,
    -- language: Idioma preferido por el usuario ('es' para Español, 'en' para Inglés).
    language VARCHAR(10) NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
    -- active_days: Array con los días de enfoque semanal elegidos (1: Lunes, ..., 7: Domingo).
    active_days INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5],
    
    -- [COLUMNAS: COSMÉTICOS Y PERSONALIZACIÓN EQUIPADA]
    -- selected_avatar: Identificador del avatar actualmente equipado (ej. 'gato', 'lobo', 'dragon').
    selected_avatar VARCHAR(50) DEFAULT 'gato',
    -- selected_theme: Identificador del tema de interfaz equipado (validado por user_theme_enum).
    selected_theme user_theme_enum DEFAULT 'samurai',
    -- selected_weapon: Identificador del arma equipada actualmente (ej. 'katana_wood', 'shadow_blade').
    selected_weapon VARCHAR(50) DEFAULT 'katana_wood',
    
    -- [COLUMNAS: ESTADO DE CUENTA, MONETIZACIÓN Y ONBOARDING]
    -- is_premium: Flag booleano que indica si el usuario tiene suscripción Pro activa.
    is_premium BOOLEAN DEFAULT FALSE,
    -- premium_until: Timestamp de vencimiento del acceso premium.
    premium_until TIMESTAMPTZ,
    -- stripe_customer_id: ID de cliente en Stripe para sincronización de pagos recurrentes.
    stripe_customer_id TEXT,
    -- onboarding_completed: Flag para verificar si completó la configuración inicial de la cuenta.
    onboarding_completed BOOLEAN DEFAULT FALSE,
    
    -- [COLUMNAS / RESTRICCIONES CHECK: GAMIFICACIÓN Y TELEMETRÍA DE ENFOQUE]
    -- pro_coins: Monedas virtuales acumuladas para comprar artículos en la tienda.
    pro_coins BIGINT DEFAULT 0 CHECK (pro_coins >= 0),
    -- focus_points: Puntos de experiencia (XP) para calcular el nivel y posición en rankings.
    focus_points BIGINT DEFAULT 0 CHECK (focus_points >= 0),
    -- focus_tomatoes: Total histórico de pomodoros completados con éxito.
    focus_tomatoes INTEGER DEFAULT 0 CHECK (focus_tomatoes >= 0),
    -- streak_days: Racha de días consecutivos completando metas de enfoque.
    streak_days INTEGER DEFAULT 0 CHECK (streak_days >= 0),
    -- longest_streak: Récord personal de racha más larga alcanzada.
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
    -- last_focus_date: Fecha del último día con sesión registrada (para calcular si la racha continúa o se rompió).
    last_focus_date DATE,
    
    -- [COLUMNAS / RESTRICCIONES CHECK: PALMARÉS COMPETITIVO]
    -- podium_wins: Total de veces que el usuario alcanzó el Top 3 en ligas o torneos.
    podium_wins INTEGER DEFAULT 0 CHECK (podium_wins >= 0),
    -- gold_medals: Medallas de oro obtenidas (1er lugar en eventos semanales).
    gold_medals INTEGER DEFAULT 0 CHECK (gold_medals >= 0),
    -- silver_medals: Medallas de plata obtenidas (2do lugar).
    silver_medals INTEGER DEFAULT 0 CHECK (silver_medals >= 0),
    -- bronze_medals: Medallas de bronce obtenidas (3er lugar).
    bronze_medals INTEGER DEFAULT 0 CHECK (bronze_medals >= 0),
    
    -- [COLUMNAS: AUDITORÍA TEMPORAL]
    -- created_at: Fecha y hora exacta (UTC) de creación del perfil.
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    -- updated_at: Fecha y hora exacta (UTC) de la última modificación del perfil.
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ------------------------------------------------------------------------------
-- 4. FUNCIONES Y TRIGGERS PARA AUDITORÍA
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: FUNCIÓN (FUNCTION / PLPGSQL)]
-- ¿Qué es? Código procedural almacenado en la base de datos.
-- ¿Para qué sirve? Intercepta sentencias UPDATE y establece la hora actual en la columna updated_at.
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [TIPO DE OBJETO: TRIGGER / DISPARADOR (TRIGGER)]
-- ¿Qué es? Un mecanismo automático que detecta eventos en una tabla y dispara una función.
-- ¿Para qué sirve? Ejecuta la función set_current_timestamp_updated_at() antes de cada UPDATE en public.profiles.
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- ------------------------------------------------------------------------------
-- 5. FUNCIONES Y TRIGGERS PARA REGISTRO DE USUARIOS
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: FUNCIÓN (FUNCTION / PLPGSQL CON PRIVILEGIOS SECURITY DEFINER)]
-- ¿Qué es? Función ejecutada con permisos elevados de administrador del sistema.
-- ¿Para qué sirve? Lee los datos del usuario recién registrado en auth.users (Google OAuth, GitHub, Email),
-- extrae su nombre o prefijo de correo y crea automáticamente su perfil inicial en public.profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
    clean_name TEXT;
BEGIN
    -- Obtener nombre desde metadata de OAuth o prefijo del correo
    clean_name := COALESCE(
        NEW.raw_user_meta_data->>'user_name',
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(NEW.email, '@', 1)
    );

    -- Insertar fila en public.profiles con valores iniciales seguros
    INSERT INTO public.profiles (
        id,
        email,
        username,
        profession,
        country,
        country_code,
        language,
        active_days,
        selected_avatar,
        selected_theme,
        selected_weapon,
        is_premium,
        pro_coins,
        focus_points,
        focus_tomatoes,
        streak_days,
        longest_streak,
        onboarding_completed
    ) VALUES (
        NEW.id,
        NEW.email,
        clean_name,
        NULL,
        NULL,
        NULL,
        'es',
        ARRAY[1, 2, 3, 4, 5],
        'gato',
        'samurai',
        'katana_wood',
        FALSE,
        0,
        0,
        0,
        0,
        0,
        FALSE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [TIPO DE OBJETO: TRIGGER / DISPARADOR (TRIGGER)]
-- ¿Qué es? Disparador de eventos en el esquema auth de Supabase.
-- ¿Para qué sirve? Detecta cuando se inserta una nueva fila en auth.users y dispara handle_new_user_registration().
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();


-- ------------------------------------------------------------------------------
-- 6. SEGURIDAD Y PERMISOS: RLS EN PERFILES - PENDIENTE POR APLICAR
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: DIRECTIVA DE SEGURIDAD (ROW LEVEL SECURITY - RLS)]
-- ¿Qué es? Mecanismo de PostgreSQL que controla qué filas de una tabla puede ver o modificar cada usuario.
-- ¿Para qué sirve? Impide que usuarios malintencionados lean o alteren datos privados desde el cliente frontend.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - SELECT)]
-- ¿Qué es? Una regla de acceso de solo lectura.
-- ¿Para qué sirve? Permite que todos los usuarios autenticados o anónimos consulten perfiles públicos
-- (necesario para tablas de clasificación, salas comunitarias y visualización de avatares).
DROP POLICY IF EXISTS "Perfiles visibles públicamente" ON public.profiles;
CREATE POLICY "Perfiles visibles públicamente"
    ON public.profiles FOR SELECT
    USING (true);

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - UPDATE)]
-- ¿Qué es? Una regla de modificación de registros basada en la identidad del usuario (auth.uid()).
-- ¿Para qué sirve? Garantiza que un usuario únicamente pueda editar los datos de su propio perfil.
DROP POLICY IF EXISTS "Los usuarios solo pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios solo pueden actualizar su propio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);


-- ------------------------------------------------------------------------------
-- 7. SUSCRIPCIÓN EN TIEMPO REAL (WEBSOCKETS)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PUBLICACIÓN REALTIME (SUPABASE REALTIME PUBLICATION)]
-- ¿Qué es? Un canal de eventos de PostgreSQL que transmite cambios a Supabase Realtime vía WebSockets.
-- ¿Para qué sirve? Permite que el frontend Angular escuche cambios en la tabla profiles y actualice
-- en tiempo real los contadores de monedas, rachas o tema equipado sin necesidad de recargar la página.
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;



-- ==============================================================================
-- 📦 PASO 2: DESBLOQUEABLES, COSMÉTICOS E INVENTARIOS MULTILINGÜE (N:M)
-- ==============================================================================
-- Propósito:
-- Catálogo universal de artículos (avatares, armas, temas, cronómetros) con soporte
-- nativo multilingüe en JSONB {"es": "...", "en": "..."} y relación N:M con perfiles.
-- Incluye RPC transaccional para compras seguras sin riesgo de trampas o saldo negativo.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CATÁLOGO GLOBAL DE ARTÍCULOS (CON SOPORTE MULTILINGÜE JSONB)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? Catálogo maestro universal de cosméticos, avatares, armas, cronómetros y temas.
-- ¿Para qué sirve? Centraliza todos los artículos disponibles en la aplicación. Gracias a los campos
-- JSONB, almacena tanto la versión en español como en inglés de nombres, descripciones y habilidades RPG,
-- entregando los datos en una sola consulta ultrarrápida sin requerir tablas de traducción secundarias ni JOINs.
CREATE TABLE IF NOT EXISTS public.catalog_items (
    -- [COLUMNA: IDENTIFICADOR ÚNICO DEL ARTÍCULO]
    -- id: Slug semántico único e invariante (ej. 'gato', 'tortuga_phase3', 'katana_wood', 'cyberpunk').
    id VARCHAR(50) PRIMARY KEY,
    
    -- [COLUMNAS: CATEGORIZACIÓN Y CLASIFICACIÓN]
    -- category: Tipo de artículo ('avatar', 'weapon', 'theme', 'timer').
    category VARCHAR(20) NOT NULL CHECK (category IN ('avatar', 'weapon', 'theme', 'timer')),
    -- tier: Nivel de rareza del artículo ('Común', 'Raro', 'Épico', 'Legendario').
    tier VARCHAR(20) NOT NULL DEFAULT 'Común' CHECK (tier IN ('Común', 'Raro', 'Épico', 'Legendario')),
    -- stars: Rango visual de 1 a 5 estrellas para la tarjeta RPG.
    stars SMALLINT NOT NULL DEFAULT 1 CHECK (stars BETWEEN 1 AND 5),
    -- emoji: Icono representativo o glifo visual del artículo.
    emoji TEXT NOT NULL DEFAULT '⭐',
    -- color: Código hexadecimal del color de acento o brillo del ítem.
    color VARCHAR(20) NOT NULL DEFAULT '#10b981',
    -- cost_coins: Costo en Pro Coins para desbloqueo en la tienda (0 = gratuito o por reto).
    cost_coins INTEGER NOT NULL DEFAULT 0 CHECK (cost_coins >= 0),
    -- is_initial: Si es TRUE, se desbloquea automáticamente al registrarse el usuario.
    is_initial BOOLEAN NOT NULL DEFAULT FALSE,
    -- has_evolution: Indica si este avatar posee fases evolutivas superiores.
    has_evolution BOOLEAN NOT NULL DEFAULT FALSE,
    -- required_quality_id: Slug de la cualidad maestra requerida para desbloquearlo por mérito.
    required_quality_id VARCHAR(50) DEFAULT NULL,
    
    -- [COLUMNAS: ATRIBUTOS RPG Y BALANCE DE JUEGO]
    -- coins_per_pomodoro: Recompensa base de monedas por sesión de enfoque completada.
    coins_per_pomodoro INTEGER NOT NULL DEFAULT 10,
    -- pause_penalty_coins: Monedas deducidas por pausa o distracción durante el temporizador.
    pause_penalty_coins INTEGER NOT NULL DEFAULT 5,
    -- boss_damage_points: Puntos de daño infligidos al Jefe de Raid por bloque completado.
    boss_damage_points INTEGER NOT NULL DEFAULT 20,
    -- boss_heal_points: Puntos de recuperación aplicados a la defensa comunitaria.
    boss_heal_points INTEGER NOT NULL DEFAULT 10,
    
    -- [COLUMNAS MULTILINGÜES JSONB: {"es": "...", "en": "..."}]
    -- name: Nombre público del ítem (ej. 'Kuro', 'Genbu Titán del Tiempo').
    name JSONB NOT NULL,
    -- description: Descripción corta de la especialidad del ítem.
    description JSONB DEFAULT NULL,
    -- species: Especie y subtipo zoológico/místico del avatar.
    species JSONB DEFAULT NULL,
    -- role: Rol táctico en el equipo o sesión (ej. 'Explorador Curioso', 'Titán de la Racha').
    role JSONB DEFAULT NULL,
    -- archetype: Arquetipo de desbloqueo ('Común', 'Retado', 'Cazador', 'Alto Riesgo').
    archetype JSONB DEFAULT NULL,
    -- weapon_name: Nombre del arma insignia equipada por el avatar.
    weapon_name JSONB DEFAULT NULL,
    -- focus_application: Consejo práctico de productividad asociado a este guardián.
    focus_application JSONB DEFAULT NULL,
    -- tactical_quote: Cita o mantra de combate contra la procrastinación.
    tactical_quote JSONB DEFAULT NULL,
    -- passive_name: Nombre de la habilidad pasiva RPG del avatar.
    passive_name JSONB DEFAULT NULL,
    -- passive_advantage: Efecto y beneficio concreto de la habilidad pasiva.
    passive_advantage JSONB DEFAULT NULL,
    -- quality_name: Nombre de la cualidad que encarna este avatar.
    quality_name JSONB DEFAULT NULL,
    -- quality_req: Descripción del reto de concentración necesario para desbloquearlo.
    quality_req JSONB DEFAULT NULL,
    
    -- [COLUMNAS: ESTADO Y AUDITORÍA]
    -- is_active: Flag para activar o deshabilitar artículos del catálogo sin borrarlos.
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    -- created_at: Fecha y hora exacta (UTC) de registro del artículo.
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ------------------------------------------------------------------------------
-- 2. TABLA DE INVENTARIO DE USUARIOS (RELACIÓN N:M)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (RELACIÓN N:M / INTERSECCIÓN)]
-- ¿Qué es? Tabla intermedia que implementa la relación de Muchos a Muchos entre profiles y catalog_items.
-- ¿Para qué sirve? Registra qué artículos específicos ha desbloqueado cada usuario, el origen del
-- desbloqueo ('initial', 'quality_reward', 'coin_purchase', 'admin') y la fecha exacta de adquisición.
CREATE TABLE IF NOT EXISTS public.user_unlocked_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    unlock_source VARCHAR(30) NOT NULL DEFAULT 'initial' CHECK (unlock_source IN ('initial', 'quality_reward', 'coin_purchase', 'admin')),
    UNIQUE(user_id, item_id)
);

-- [TIPO DE OBJETO: ÍNDICE B-TREE (INDEX)]
-- ¿Qué es? Estructura de acceso acelerado para PostgreSQL.
-- ¿Para qué sirve? Permite consultas instantáneas al filtrar por user_id (inventario del usuario)
-- o por item_id (contar cuántos usuarios poseen un cosmético particular).
CREATE INDEX IF NOT EXISTS idx_user_unlocked_items_user ON public.user_unlocked_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_items_item ON public.user_unlocked_items(item_id);


-- ------------------------------------------------------------------------------
-- 3. SEMILLA DE DATOS COMPLETA (26 AVATARES + TEMAS + ARMAS + CRONÓMETROS)
-- ------------------------------------------------------------------------------
-- [TIPO DE OBJETO: SENTENCIA DML DE INSERCIÓN MASIVA CON UPSERT (INSERT ... ON CONFLICT)]
-- ¿Qué es? El conjunto maestro de datos predeterminados de la aplicación en español e inglés.
-- ¿Para qué sirve? Carga la totalidad de los 26 avatares con sus atributos RPG, los 4 temas visuales,
-- los 3 cronómetros y las 4 armas. Es idempotente gracias a ON CONFLICT (id) DO UPDATE.

INSERT INTO public.catalog_items (
    id, category, tier, stars, emoji, color, cost_coins, is_initial, has_evolution, required_quality_id,
    coins_per_pomodoro, pause_penalty_coins, boss_damage_points, boss_heal_points,
    name, description, species, role, archetype, weapon_name, focus_application, tactical_quote,
    passive_name, passive_advantage, quality_name, quality_req
) VALUES
-- ==============================================================================
-- A. AVATARES COMUNES / INICIALES GRATUITOS (6)
-- ==============================================================================
(
    'gato', 'avatar', 'Común', 1, '🐱', '#10b981', 0, TRUE, FALSE, NULL,
    10, 5, 20, 10,
    '{"es": "Kuro", "en": "Kuro"}',
    '{"es": "Veloz y ágil en sesiones cortas", "en": "Fast and agile in short sessions"}',
    '{"es": "Gato Sombra (Explorador Felino)", "en": "Shadow Cat (Feline Scout)"}',
    '{"es": "Explorador Curioso", "en": "Curious Scout"}',
    '{"es": "Común", "en": "Common"}',
    '{"es": "Daga de Medianoche", "en": "Midnight Dagger"}',
    '{"es": "Inicia con curiosidad: solo 5 minutos para romper la inercia.", "en": "Start with curiosity: just 5 minutes to break inertia."}',
    '{"es": "Los pasos silenciosos cruzan las sombras más densas.", "en": "Silent steps cross the densest shadows."}',
    '{"es": "Paso Sigiloso", "en": "Stealth Step"}',
    '{"es": "Genera +10 Pro Coins y +20 de daño al jefe por sesión completada.", "en": "Generates +10 Pro Coins and +20 boss damage per completed session."}',
    NULL, NULL
),
(
    'perro', 'avatar', 'Común', 1, '🐶', '#3b82f6', 0, TRUE, FALSE, NULL,
    10, 5, 20, 10,
    '{"es": "Barky", "en": "Barky"}',
    '{"es": "Leal y protector de tus metas de estudio", "en": "Loyal and protective of your study goals"}',
    '{"es": "Perro Guardián (Cánido Leal)", "en": "Guard Dog (Loyal Canine)"}',
    '{"es": "Guardián de la Lealtad", "en": "Loyalty Guardian"}',
    '{"es": "Común", "en": "Common"}',
    '{"es": "Escudo de Hueso Rúnico", "en": "Runic Bone Shield"}',
    '{"es": "Mantén la fidelidad a tu horario pactado.", "en": "Stay faithful to your agreed schedule."}',
    '{"es": "La lealtad hacia tus metas es el escudo más fuerte.", "en": "Loyalty to your goals is the strongest shield."}',
    '{"es": "Lealtad Inquebrantable", "en": "Unshakable Loyalty"}',
    '{"es": "+10 Pro Coins y +20 daño constante por cada bloque de estudio.", "en": "+10 Pro Coins and +20 constant damage per study block."}',
    NULL, NULL
),
(
    'conejo', 'avatar', 'Común', 1, '🐰', '#ec4899', 0, TRUE, FALSE, NULL,
    10, 5, 20, 10,
    '{"es": "Bunny", "en": "Bunny"}',
    '{"es": "Especialista en ráfagas de concentración rápida", "en": "Specialist in quick bursts of concentration"}',
    '{"es": "Conejo Veloz (Lepórido Ágil)", "en": "Swift Rabbit (Agile Leporid)"}',
    '{"es": "Impulso Veloz", "en": "Swift Impulse"}',
    '{"es": "Común", "en": "Common"}',
    '{"es": "Botas de Viento", "en": "Wind Boots"}',
    '{"es": "Aplica la regla de los 2 minutos: si toma menos de 2 minutos, hazlo ya.", "en": "Apply the 2-minute rule: if it takes less than 2 min, do it now."}',
    '{"es": "El primer salto es el que vence la gravedad de la duda.", "en": "The first leap is the one that overcomes doubt."}',
    '{"es": "Salto Rápido", "en": "Quick Leap"}',
    '{"es": "+10 Pro Coins y bonus de velocidad en el arranque de sesión.", "en": "+10 Pro Coins and speed bonus at session start."}',
    NULL, NULL
),
(
    'raton', 'avatar', 'Común', 1, '🐭', '#94a3b8', 0, TRUE, FALSE, NULL,
    10, 5, 20, 10,
    '{"es": "Mickey", "en": "Mickey"}',
    '{"es": "Capacidad táctica y enfoque ante la distracción", "en": "Tactical ability and focus against distraction"}',
    '{"es": "Ratón Ingenioso (Roedor Ágil)", "en": "Crafty Mouse (Agile Rodent)"}',
    '{"es": "Especialista en Detalles", "en": "Detail Specialist"}',
    '{"es": "Común", "en": "Common"}',
    '{"es": "Aguja de Precisión", "en": "Precision Needle"}',
    '{"es": "Divide tareas colosales en micro-pasos diminutos.", "en": "Break colossal tasks into tiny micro-steps."}',
    '{"es": "Incluso la montaña más alta se desgasta grano a grano.", "en": "Even the tallest mountain wears down grain by grain."}',
    '{"es": "Micro-Enfoque", "en": "Micro-Focus"}',
    '{"es": "+10 Pro Coins y efectividad táctica contra tareas complejas.", "en": "+10 Pro Coins and tactical effectiveness against complex tasks."}',
    NULL, NULL
),
(
    'hamster', 'avatar', 'Común', 1, '🐹', '#f59e0b', 0, TRUE, FALSE, NULL,
    10, 5, 20, 10,
    '{"es": "Pipo", "en": "Pipo"}',
    '{"es": "Energía inagotable para sprints cortos y productivos", "en": "Endless energy for short and productive sprints"}',
    '{"es": "Hámster Ahorrador (Roedor Laborioso)", "en": "Thrifty Hamster (Hardworking Rodent)"}',
    '{"es": "Acumulador de Hábitos", "en": "Habit Accumulator"}',
    '{"es": "Común", "en": "Common"}',
    '{"es": "Rueda de Impulso", "en": "Momentum Wheel"}',
    '{"es": "Aprovecha cada pequeño bloque de 25 min para sumar.", "en": "Seize every small 25 min block to add up."}',
    '{"es": "La constancia silenciosa llena el granero de victorias.", "en": "Silent consistency fills the barn of victories."}',
    '{"es": "Reserva de Enfoque", "en": "Focus Reserve"}',
    '{"es": "+10 Pro Coins por pomodoro con bajo riesgo de penalización.", "en": "+10 Pro Coins per pomodoro with low penalty risk."}',
    NULL, NULL
),
(
    'loro', 'avatar', 'Común', 1, '🦜', '#10b981', 0, TRUE, FALSE, NULL,
    10, 5, 20, 10,
    '{"es": "Kiko", "en": "Kiko"}',
    '{"es": "Explorador comunicativo de nuevas metas", "en": "Communicative explorer of new goals"}',
    '{"es": "Loro Comunicador (Psitácido Tropical)", "en": "Communicator Parrot (Tropical Psittacine)"}',
    '{"es": "Voz de la Comunidad", "en": "Community Voice"}',
    '{"es": "Común", "en": "Common"}',
    '{"es": "Pluma Sonora", "en": "Sonic Feather"}',
    '{"es": "Declara tu compromiso en voz alta antes de iniciar.", "en": "Declare your commitment out loud before starting."}',
    '{"es": "La palabra dicha con convicción disipa la distracción.", "en": "The word spoken with conviction dispels distraction."}',
    '{"es": "Eco Positivo", "en": "Positive Echo"}',
    '{"es": "+10 Pro Coins y sintonía comunitaria en el templo.", "en": "+10 Pro Coins and community harmony in the temple."}',
    NULL, NULL
),

-- ==============================================================================
-- B. GUARDIANES DE RETO (CUALIDADES DEMOSTRADAS Y EVOLUCIONES) (9)
-- ==============================================================================
(
    'tortuga', 'avatar', 'Raro', 2, '🐢', '#10b981', 0, FALSE, TRUE, 'constancia',
    18, 7, 36, 14,
    '{"es": "Genbu", "en": "Genbu"}',
    '{"es": "Encarna la cualidad de la constancia (Racha de 7 días)", "en": "Embodies the quality of consistency (7-day streak)"}',
    '{"es": "Tortuga de la Constancia (Reptil Acorazado)", "en": "Turtle of Consistency (Armored Reptile)"}',
    '{"es": "Guardián de la Racha", "en": "Streak Guardian"}',
    '{"es": "Retado", "en": "Challenged"}',
    '{"es": "Caparazón de Obsidiana", "en": "Obsidian Shell"}',
    '{"es": "Paso firme sin importar la velocidad.", "en": "Steady step regardless of speed."}',
    '{"es": "Lento pero implacable: la meta siempre llega al que no se detiene.", "en": "Slow but relentless: the finish line always reaches the one who never stops."}',
    '{"es": "Escudo de Racha", "en": "Streak Shield"}',
    '{"es": "+18 Pro Coins y +36 daño al jefe. Mitiga el daño por distracción.", "en": "+18 Pro Coins and +36 boss damage. Mitigates distraction damage."}',
    '{"es": "Constancia", "en": "Consistency"}',
    '{"es": "Mantén una racha de 7 días consecutivos completando pomodoros.", "en": "Maintain a 7-day consecutive streak completing pomodoros."}'
),
(
    'tortuga_evolved', 'avatar', 'Épico', 3, '🐢', '#059669', 0, FALSE, TRUE, 'constancia',
    26, 10, 52, 20,
    '{"es": "Genbu Ancestro", "en": "Genbu Ancestor"}',
    '{"es": "Evolución intermedia de la Tortuga de la Constancia", "en": "Intermediate evolution of the Turtle of Consistency"}',
    '{"es": "Tortuga Ancestral (Evolución Fase 2)", "en": "Ancestral Turtle (Evolution Phase 2)"}',
    '{"es": "Titán de la Racha", "en": "Titan of the Streak"}',
    '{"es": "Retado (Evolución)", "en": "Challenged (Evolution)"}',
    '{"es": "Caparazón Adamantino", "en": "Adamantine Shell"}',
    '{"es": "Tu disciplina se consolida: 30 bloques de estudio completados.", "en": "Your discipline solidifies: 30 study blocks completed."}',
    '{"es": "La roca pulida por el tiempo resiste cualquier tormenta.", "en": "Rock polished by time withstands any storm."}',
    '{"es": "Coraza Ancestral", "en": "Ancestral Shell"}',
    '{"es": "+26 Coins y +52 daño masivo al jefe por pomodoro.", "en": "+26 Coins and +52 massive boss damage per pomodoro."}',
    '{"es": "Constancia II", "en": "Consistency II"}',
    '{"es": "Completa 30 pomodoros en total en tu cuenta.", "en": "Complete 30 total pomodoros on your account."}'
),
(
    'tortuga_phase3', 'avatar', 'Legendario', 5, '🐢', '#047857', 0, FALSE, FALSE, 'constancia',
    45, 18, 95, 35,
    '{"es": "Genbu Titán del Tiempo", "en": "Genbu Time Titan"}',
    '{"es": "Evolución máxima del dominio temporal", "en": "Max evolution of temporal mastery"}',
    '{"es": "Guardián Primordial (Evolución Máxima)", "en": "Primordial Guardian (Max Evolution)"}',
    '{"es": "Señor del Tiempo", "en": "Lord of Time"}',
    '{"es": "Retado (Fase Final)", "en": "Challenged (Final Phase)"}',
    '{"es": "Bastión Cronos", "en": "Chronos Bastion"}',
    '{"es": "Maestría suprema del tiempo: 75 pomodoros finalizados.", "en": "Supreme time mastery: 75 pomodoros completed."}',
    '{"es": "El tiempo no pasa para quien domina su propio flujo.", "en": "Time does not pass for the one who masters their own flow."}',
    '{"es": "Inmunidad Temporal", "en": "Temporal Immunity"}',
    '{"es": "+45 Coins y +95 Daño Primordial directo al Jefe.", "en": "+45 Coins and +95 Primordial Direct Damage to the Boss."}',
    '{"es": "Constancia III", "en": "Consistency III"}',
    '{"es": "Completa 75 pomodoros en total en tu cuenta.", "en": "Complete 75 total pomodoros on your account."}'
),
(
    'hormiga', 'avatar', 'Raro', 2, '🐜', '#ef4444', 0, FALSE, FALSE, 'disciplina',
    18, 7, 36, 14,
    '{"es": "Vargas", "en": "Vargas"}',
    '{"es": "Encarna la disciplina inquebrantable (15 pomodoros)", "en": "Embodies unyielding discipline (15 pomodoros)"}',
    '{"es": "Hormiga Guerrera (Mirmécido Marcial)", "en": "Warrior Ant (Martial Myrmecid)"}',
    '{"es": "Fuerza Colectiva", "en": "Collective Strength"}',
    '{"es": "Retado", "en": "Challenged"}',
    '{"es": "Mandíbula de Acero", "en": "Steel Mandible"}',
    '{"es": "La disciplina supera a la motivación efímera.", "en": "Discipline overcomes fleeting motivation."}',
    '{"es": "El grano que cargas hoy construye el palacio de mañana.", "en": "The grain you carry today builds the palace of tomorrow."}',
    '{"es": "Carga Imparable", "en": "Unstoppable Load"}',
    '{"es": "+18 Pro Coins y +36 daño por sesión finalizada.", "en": "+18 Pro Coins and +36 damage per finished session."}',
    '{"es": "Disciplina", "en": "Discipline"}',
    '{"es": "Completa 15 pomodoros en total.", "en": "Complete 15 total pomodoros."}'
),
(
    'buho', 'avatar', 'Raro', 2, '🦉', '#3b82f6', 0, FALSE, FALSE, 'sabiduria',
    18, 7, 36, 14,
    '{"es": "Noctis", "en": "Noctis"}',
    '{"es": "Estratega del enfoque con metodología Pareto", "en": "Focus strategist with Pareto methodology"}',
    '{"es": "Búho Arcano (Estrígido Sabio)", "en": "Arcane Owl (Wise Strigid)"}',
    '{"es": "Estratega Pareto", "en": "Pareto Strategist"}',
    '{"es": "Retado", "en": "Challenged"}',
    '{"es": "Tomo de la Noche", "en": "Tome of the Night"}',
    '{"es": "Identifica el 20% de esfuerzo que genera el 80% del resultado.", "en": "Identify the 20% of effort that produces 80% of the result."}',
    '{"es": "La visión en la oscuridad distingue lo esencial de lo trivial.", "en": "Sight in the dark distinguishes the essential from the trivial."}',
    '{"es": "Foco Pareto", "en": "Pareto Focus"}',
    '{"es": "+18 Pro Coins y bonificación táctica en metodología Pareto.", "en": "+18 Pro Coins and tactical bonus in Pareto methodology."}',
    '{"es": "Sabiduría", "en": "Wisdom"}',
    '{"es": "Completa 5 pomodoros con la metodología Pareto (80/20).", "en": "Complete 5 pomodoros using the Pareto (80/20) methodology."}'
),
(
    'rana', 'avatar', 'Raro', 2, '🐸', '#84cc16', 0, FALSE, FALSE, 'superacion',
    18, 7, 36, 14,
    '{"es": "Kero", "en": "Kero"}',
    '{"es": "Vencedor del sapo diario en pomodoros difíciles", "en": "Conqueror of the daily frog in tough pomodoros"}',
    '{"es": "Rana Cazadora (Anuro de Pantano)", "en": "Hunter Frog (Swamp Anuran)"}',
    '{"es": "Comemiedos", "en": "Fear-Eater"}',
    '{"es": "Retado", "en": "Challenged"}',
    '{"es": "Dardo de Loto", "en": "Lotus Dart"}',
    '{"es": "Trágate el sapo primero: haz lo más difícil a primera hora.", "en": "Eat the frog first: do the hardest task first thing in the morning."}',
    '{"es": "El sapo más temido se vuelve ligero tras el primer bocado.", "en": "The most feared frog becomes light after the first bite."}',
    '{"es": "Golpe al Sapo", "en": "Frog Strike"}',
    '{"es": "+18 Pro Coins y daño crítico a jefes matutinos.", "en": "+18 Pro Coins and critical damage to morning bosses."}',
    '{"es": "Superación", "en": "Overcoming"}',
    '{"es": "Completa 5 pomodoros con la metodología Sapo/Rana.", "en": "Complete 5 pomodoros using the Frog methodology."}'
),
(
    'aguila', 'avatar', 'Raro', 2, '🦅', '#06b6d4', 0, FALSE, FALSE, 'vision',
    18, 7, 36, 14,
    '{"es": "Valkor", "en": "Valkor"}',
    '{"es": "Enfoque panorámico y claridad de objetivos", "en": "Panoramic focus and clarity of objectives"}',
    '{"es": "Águila Real (Accipítrido de Altura)", "en": "Golden Eagle (Highland Accipitrid)"}',
    '{"es": "Visión de Cumbre", "en": "Summit Vision"}',
    '{"es": "Retado", "en": "Challenged"}',
    '{"es": "Garra Astral", "en": "Astral Claw"}',
    '{"es": "Eleva tu perspectiva por encima de las distracciones menores.", "en": "Elevate your perspective above minor distractions."}',
    '{"es": "Desde las alturas, las trampas del camino se vuelven invisibles.", "en": "From the heights, the path traps become invisible."}',
    '{"es": "Mirada de Altura", "en": "Highland Gaze"}',
    '{"es": "+18 Pro Coins y +36 daño constante.", "en": "+18 Pro Coins and +36 constant damage."}',
    '{"es": "Visión", "en": "Vision"}',
    '{"es": "Completa 5 pomodoros con la metodología Normal.", "en": "Complete 5 pomodoros using the Normal methodology."}'
),
(
    'abeja', 'avatar', 'Raro', 2, '🐝', '#eab308', 0, FALSE, FALSE, 'colaboracion',
    18, 7, 36, 14,
    '{"es": "Vespia", "en": "Vespia"}',
    '{"es": "Poder del trabajo comunitario y acompañado", "en": "Power of community and accompanied work"}',
    '{"es": "Abeja Reina (Himenóptero Solar)", "en": "Queen Bee (Solar Hymenopteran)"}',
    '{"es": "Espíritu Comunitario", "en": "Community Spirit"}',
    '{"es": "Retado", "en": "Challenged"}',
    '{"es": "Aguijón de Ámbar", "en": "Amber Stinger"}',
    '{"es": "El enfoque también se contagia: acompaña y déjate acompañar.", "en": "Focus is contagious: accompany and be accompanied."}',
    '{"es": "Una sola gota de néctar alimenta a toda la colmena.", "en": "A single drop of nectar feeds the whole hive."}',
    '{"es": "Sinergia de Colmena", "en": "Hive Synergy"}',
    '{"es": "+18 Pro Coins y bonificador de daño en asedios comunitarios.", "en": "+18 Pro Coins and damage bonus in community raids."}',
    '{"es": "Colaboración", "en": "Collaboration"}',
    '{"es": "Participa en 5 sesiones de enfoque comunitario.", "en": "Participate in 5 community focus sessions."}'
),
(
    'castor', 'avatar', 'Raro', 2, '🦫', '#78350f', 0, FALSE, FALSE, 'construccion',
    18, 7, 36, 14,
    '{"es": "Barris", "en": "Barris"}',
    '{"es": "Construcción tenaz de proyectos largos", "en": "Tenacious building of long-term projects"}',
    '{"es": "Castor Ingeniero (Roedor de Presa)", "en": "Engineer Beaver (Dam Rodent)"}',
    '{"es": "Maestro Constructor", "en": "Master Builder"}',
    '{"es": "Retado", "en": "Challenged"}',
    '{"es": "Maza de Roble", "en": "Oak Mace"}',
    '{"es": "Construye hoy el hábito que sostendrá tus metas del año.", "en": "Build today the habit that will sustain your goals for the year."}',
    '{"es": "Tronco a tronco se frena el río más caudaloso.", "en": "Log by log the mightiest river is dammed."}',
    '{"es": "Dique de Acero", "en": "Steel Dam"}',
    '{"es": "+18 Pro Coins y bonificación al encadenar 3 pomodoros seguidos.", "en": "+18 Pro Coins and bonus when chaining 3 pomodoros in a row."}',
    '{"es": "Construcción", "en": "Construction"}',
    '{"es": "Completa 3 pomodoros al hilo para un mismo objetivo en un día.", "en": "Complete 3 pomodoros in a row for the same goal in one day."}'
),

-- ==============================================================================
-- C. CAZADORES ESPECIALES (TIENDA PRO COINS) (8)
-- ==============================================================================
(
    'zorro', 'avatar', 'Épico', 3, '🦊', '#f97316', 100, FALSE, FALSE, NULL,
    22, 9, 44, 18,
    '{"es": "Renard", "en": "Renard"}',
    '{"es": "Sigiloso contra las tentaciones digitales", "en": "Stealthy against digital temptations"}',
    '{"es": "Zorro Astuto (Cánido Sigiloso)", "en": "Clever Fox (Stealth Canine)"}',
    '{"es": "Espía de Sombras", "en": "Shadow Spy"}',
    '{"es": "Cazador", "en": "Hunter"}',
    '{"es": "Kopis Fantasma", "en": "Ghost Kopis"}',
    '{"es": "Cambia de entorno si notas que la desidia se arraigó en tu mesa.", "en": "Change your environment if you notice procrastination took root at your desk."}',
    '{"es": "La astucia rodea la trampa antes de que se active.", "en": "Cunning circles the trap before it springs."}',
    '{"es": "Paso Fantasma", "en": "Ghost Step"}',
    '{"es": "+22 Coins directas con alto daño de asedio al jefe.", "en": "+22 Direct Coins with high siege damage to the boss."}',
    NULL, NULL
),
(
    'lince', 'avatar', 'Épico', 3, '🐱', '#a855f7', 180, FALSE, FALSE, NULL,
    26, 11, 52, 22,
    '{"es": "Silas", "en": "Silas"}',
    '{"es": "Visión aguda en objetivos de alta complejidad", "en": "Sharp vision on high complexity goals"}',
    '{"es": "Lince Cazador (Felino Boreal)", "en": "Hunter Lynx (Boreal Feline)"}',
    '{"es": "Alta Precisión", "en": "High Precision"}',
    '{"es": "Cazador", "en": "Hunter"}',
    '{"es": "Garras de Cuarzo", "en": "Quartz Claws"}',
    '{"es": "Elimina cualquier pestaña secundaria: tolerancia cero al error.", "en": "Close any secondary tab: zero tolerance for error."}',
    '{"es": "La mirada congelada antes del zarpazo infalible.", "en": "The frozen gaze before the infallible strike."}',
    '{"es": "Enfoque Puntería", "en": "Aim Focus"}',
    '{"es": "Altísimo multiplicador de daño (+52 Pts al Jefe).", "en": "High damage multiplier (+52 Pts to the Boss)."}',
    NULL, NULL
),
(
    'panda', 'avatar', 'Épico', 3, '🐼', '#6b7280', 150, FALSE, FALSE, NULL,
    24, 8, 48, 16,
    '{"es": "Tao", "en": "Tao"}',
    '{"es": "Serenidad total y calma en medio del caos", "en": "Total serenity and calm in the midst of chaos"}',
    '{"es": "Panda Maestro (Úrsido Zen)", "en": "Master Panda (Zen Ursid)"}',
    '{"es": "Maestro de la Calma", "en": "Master of Calm"}',
    '{"es": "Cazador", "en": "Hunter"}',
    '{"es": "Vara de Bambú Zen", "en": "Zen Bamboo Staff"}',
    '{"es": "Inhala 4s y exhala 6s antes de iniciar para calmar el cortisol.", "en": "Inhale 4s and exhale 6s before starting to calm cortisol."}',
    '{"es": "La mente en paz es un escudo impermeable.", "en": "The peaceful mind is an impermeable shield."}',
    '{"es": "Paz de Bambú", "en": "Bamboo Peace"}',
    '{"es": "Protección equilibrada con gran rendimiento de monedas.", "en": "Balanced protection with high coin yield."}',
    NULL, NULL
),
(
    'oso', 'avatar', 'Épico', 3, '🐻', '#78350f', 200, FALSE, FALSE, NULL,
    28, 12, 56, 24,
    '{"es": "Bjorn", "en": "Bjorn"}',
    '{"es": "Resistencia brutal en sesiones maratónicas de estudio", "en": "Brutal endurance in study marathon sessions"}',
    '{"es": "Oso Implacable (Úrsido Titánico)", "en": "Relentless Bear (Titanic Ursid)"}',
    '{"es": "Fuerza Inquebrantable", "en": "Unbreakable Strength"}',
    '{"es": "Cazador", "en": "Hunter"}',
    '{"es": "Maza de Granito", "en": "Granite Mace"}',
    '{"es": "No te levantes de la silla hasta que el cronómetro llegue a cero.", "en": "Do not get out of your chair until the timer reaches zero."}',
    '{"es": "La montaña no se inmuta ante el aullido del viento.", "en": "The mountain does not flinch at the howling wind."}',
    '{"es": "Zarpazo Telúrico", "en": "Telluric Claw"}',
    '{"es": "Golpes masivos directos a la barra de vida del Jefe.", "en": "Massive direct hits to the Boss health bar."}',
    NULL, NULL
),
(
    'elefante', 'avatar', 'Épico', 3, '🐘', '#6b7280', 220, FALSE, FALSE, NULL,
    30, 14, 60, 26,
    '{"es": "Titanis", "en": "Titanis"}',
    '{"es": "Memoria de hierro y perseverancia inmutable", "en": "Iron memory and immutable perseverance"}',
    '{"es": "Elefante Titán (Proboscídeo Ancestral)", "en": "Titan Elephant (Ancestral Proboscidean)"}',
    '{"es": "Memoria Ancestral", "en": "Ancestral Memory"}',
    '{"es": "Cazador", "en": "Hunter"}',
    '{"es": "Colmillos Rúnicos", "en": "Runic Tusks"}',
    '{"es": "Registra tus aprendizajes en tu bitácora tras cada bloque.", "en": "Log your learnings in your logbook after each block."}',
    '{"es": "Los pasos firmes del gigante dejan huellas imborrables.", "en": "The giant steady steps leave indelible footprints."}',
    '{"es": "Memoria de Roca", "en": "Rock Memory"}',
    '{"es": "Recompensa de élite con +30 monedas por sesión completada.", "en": "Elite reward with +30 coins per completed session."}',
    NULL, NULL
),
(
    'leon', 'avatar', 'Épico', 3, '🦁', '#fbbf24', 250, FALSE, FALSE, NULL,
    32, 15, 64, 28,
    '{"es": "Leónidas", "en": "Leonidas"}',
    '{"es": "Liderazgo absoluto en la arena comunitaria", "en": "Absolute leadership in the community arena"}',
    '{"es": "León Monarca (Felino Real)", "en": "Monarch Lion (Royal Feline)"}',
    '{"es": "Rey de la Comunidad", "en": "King of the Community"}',
    '{"es": "Cazador", "en": "Hunter"}',
    '{"es": "Cetro Imperial", "en": "Imperial Scepter"}',
    '{"es": "Responsabilidad total: nadie vendrá a hacer el trabajo por ti.", "en": "Total accountability: no one will come to do the work for you."}',
    '{"es": "El rugido del rey ordena el caos del reino.", "en": "The king roar brings order to the kingdom chaos."}',
    '{"es": "Rugido Imperial", "en": "Imperial Roar"}',
    '{"es": "Multiplicador de ataque de asedio masivo contra el Jefe.", "en": "Massive siege attack multiplier against the Boss."}',
    NULL, NULL
),
(
    'tigre', 'avatar', 'Épico', 3, '🐅', '#f97316', 300, FALSE, FALSE, NULL,
    35, 16, 70, 30,
    '{"es": "Rakan", "en": "Rakan"}',
    '{"es": "Ataque implacable contra la procrastinación", "en": "Relentless attack against procrastination"}',
    '{"es": "Tigre Feroz (Felino Rayado)", "en": "Fierce Tiger (Striped Feline)"}',
    '{"es": "Fuerza de Voluntad", "en": "Willpower"}',
    '{"es": "Cazador", "en": "Hunter"}',
    '{"es": "Cuchillas Dentadas", "en": "Serrated Blades"}',
    '{"es": "Visualiza la meta antes de que el cansancio te convenza de parar.", "en": "Visualize the finish line before fatigue convinces you to stop."}',
    '{"es": "El cazador no pestañea cuando la presa está a tiro.", "en": "The hunter does not blink when the prey is in sight."}',
    '{"es": "Furia Determinada", "en": "Determined Fury"}',
    '{"es": "+70 Puntos de daño directo por cada pomodoro finalizado.", "en": "+70 Points of direct damage per completed pomodoro."}',
    NULL, NULL
),
(
    'lobo', 'avatar', 'Épico', 3, '🐺', '#ef4444', 350, FALSE, FALSE, NULL,
    38, 18, 76, 32,
    '{"es": "Fenrir", "en": "Fenrir"}',
    '{"es": "Honor, manada y enfoque solitario letal", "en": "Honor, pack, and lethal solitary focus"}',
    '{"es": "Lobo Alfa (Cánido Salvaje)", "en": "Alpha Wolf (Wild Canine)"}',
    '{"es": "Guía de Manada", "en": "Pack Leader"}',
    '{"es": "Cazador", "en": "Hunter"}',
    '{"es": "Garras Tácticas", "en": "Tactical Claws"}',
    '{"es": "Cumple el pacto contigo: si dijiste que estudiarías, hazlo.", "en": "Honor your pact: if you said you would study, do it."}',
    '{"es": "La manada avanza unida bajo el aullido del líder.", "en": "The pack moves as one under the roar of the alpha."}',
    '{"es": "Aullido Alfa", "en": "Alpha Howl"}',
    '{"es": "La cúspide de los cazadores: +38 Coins y +76 daño.", "en": "The peak of hunters: +38 Coins and +76 damage."}',
    NULL, NULL
),

-- ==============================================================================
-- D. LEGENDARIOS DE ALTO RIESGO (TIENDA PRO COINS) (3)
-- ==============================================================================
(
    'dragon', 'avatar', 'Legendario', 5, '🐉', '#10b981', 600, FALSE, FALSE, NULL,
    60, 35, 130, 60,
    '{"es": "Bahamut", "en": "Bahamut"}',
    '{"es": "Dominio supremo de la mente y las distracciones", "en": "Supreme mastery over mind and distractions"}',
    '{"es": "Dragón del Ego (Sierpe Cósmica)", "en": "Ego Dragon (Cosmic Wyrm)"}',
    '{"es": "Señor del Ego", "en": "Lord of the Ego"}',
    '{"es": "Alto Riesgo", "en": "High Risk"}',
    '{"es": "Katana de Plasma", "en": "Plasma Katana"}',
    '{"es": "Domina tu ego: el rival real no es la tarea, es tu resistencia.", "en": "Master your ego: the real opponent is not the task, but your resistance."}',
    '{"es": "Quien doblega su propio ego gobierna su destino.", "en": "He who subdues his own ego governs his destiny."}',
    '{"es": "Llama del Vórtice", "en": "Vortex Flame"}',
    '{"es": "+60 Coins y +130 Daño fulminante al Jefe.", "en": "+60 Coins and +130 Cosmic direct damage to the Boss."}',
    NULL, NULL
),
(
    'fenix', 'avatar', 'Legendario', 5, '🔥', '#f97316', 500, FALSE, FALSE, NULL,
    55, 30, 120, 50,
    '{"es": "Ignis", "en": "Ignis"}',
    '{"es": "Renace de cada racha rota con más fuerza y poder", "en": "Reborn from every broken streak with more strength and power"}',
    '{"es": "Fénix Inmortal (Ave de Fuego)", "en": "Immortal Phoenix (Fire Bird)"}',
    '{"es": "Inmortal de Fuego", "en": "Fire Immortal"}',
    '{"es": "Alto Riesgo", "en": "High Risk"}',
    '{"es": "Lanza Solar", "en": "Solar Spear"}',
    '{"es": "Renace sin culpa ni remordimientos de cualquier mal día.", "en": "Reborn without guilt or regret from any bad day."}',
    '{"es": "De las cenizas del tropiezo brota la llama de la victoria.", "en": "From the ashes of stumble rises the flame of victory."}',
    '{"es": "Corona Solar", "en": "Solar Crown"}',
    '{"es": "Generación estelar de +55 Coins y +120 Daño Solar.", "en": "Stellar generation of +55 Coins and +120 Solar Damage."}',
    NULL, NULL
),
(
    'grifo', 'avatar', 'Legendario', 5, '🦅', '#eab308', 550, FALSE, FALSE, NULL,
    58, 32, 125, 55,
    '{"es": "Aethel", "en": "Aethel"}',
    '{"es": "Guardián supremo de la productividad legendaria", "en": "Supreme guardian of legendary productivity"}',
    '{"es": "Grifo Celestial (Híbrido de Luz)", "en": "Celestial Griffin (Light Hybrid)"}',
    '{"es": "Guardián Celestial", "en": "Celestial Guardian"}',
    '{"es": "Alto Riesgo", "en": "High Risk"}',
    '{"es": "Alabarda Sagrada", "en": "Sacred Halberd"}',
    '{"es": "Honor impecable: cero ventanas trampa durante el hiperfoco.", "en": "Impeccable honor: zero trap windows during hyperfocus."}',
    '{"es": "La alabarda sagrada solo corta cuando el alma es pura.", "en": "The sacred halberd only strikes true when the soul is pure."}',
    '{"es": "Rueda Astral", "en": "Astral Wheel"}',
    '{"es": "+58 Coins y +125 Daño Astral directo al Jefe.", "en": "+58 Coins and +125 Astral damage directly to the Boss."}',
    NULL, NULL
),

-- ==============================================================================
-- E. TEMAS VISUALES DE LA APLICACIÓN (4)
-- ==============================================================================
(
    'samurai', 'theme', 'Común', 1, '🏯', '#10b981', 0, TRUE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Tema Samurái", "en": "Samurai Theme"}',
    '{"es": "Estilo clásico del camino del guerrero con acentos esmeralda", "en": "Classic style of the warrior way with emerald accents"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
    'cyberpunk', 'theme', 'Raro', 2, '⚡', '#ec4899', 250, FALSE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Tema Cyberpunk", "en": "Cyberpunk Theme"}',
    '{"es": "Neón, hologramas y energía futurista con acentos magenta", "en": "Neon, holograms, and futuristic energy with magenta accents"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
    'aurora', 'theme', 'Raro', 2, '🌌', '#8b5cf6', 250, FALSE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Tema Aurora", "en": "Aurora Theme"}',
    '{"es": "Gradientes boreales relajantes y modernos en tonos violetas", "en": "Relaxing and modern northern lights gradients in violet tones"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
    'zen', 'theme', 'Raro', 2, '🍃', '#14b8a6', 250, FALSE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Tema Zen", "en": "Zen Theme"}',
    '{"es": "Minimalismo absoluto, sobriedad y tranquilidad en tonos teal", "en": "Absolute minimalism, sobriety, and tranquility in teal tones"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),

-- ==============================================================================
-- F. ESTILOS VISUALES DEL CRONÓMETRO (3)
-- ==============================================================================
(
    'digital', 'timer', 'Común', 1, '⏱️', '#3b82f6', 0, TRUE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Cronómetro Digital", "en": "Digital Timer"}',
    '{"es": "Reloj digital clásico nítido de alta precisión", "en": "Classic crisp high-precision digital clock"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
    'ring', 'timer', 'Raro', 2, '⭕', '#10b981', 100, FALSE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Cronómetro de Anillo", "en": "Ring Timer"}',
    '{"es": "Círculo de progreso continuo con efecto respiración", "en": "Continuous progress circle with breathing effect"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
    'line', 'timer', 'Raro', 2, '➖', '#fbbf24', 100, FALSE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Cronómetro de Barra", "en": "Bar Timer"}',
    '{"es": "Línea de progreso horizontal minimalista y despejada", "en": "Minimalist and uncluttered horizontal progress line"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),

-- ==============================================================================
-- G. ARMAS Y COMPAÑEROS VISUALES (4)
-- ==============================================================================
(
    'katana_wood', 'weapon', 'Común', 1, '🗡️', '#10b981', 0, TRUE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Katana de Madera (Bokken)", "en": "Wooden Katana (Bokken)"}',
    '{"es": "El arma de entrenamiento de todo novicio en el templo", "en": "The training weapon of every novice in the temple"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
    'katana_steel', 'weapon', 'Raro', 2, '⚔️', '#3b82f6', 300, FALSE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Katana de Acero Templado", "en": "Tempered Steel Katana"}',
    '{"es": "Filo agudo para cortar cualquier procrastinación", "en": "Sharp edge to cut through any procrastination"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
    'lance_silver', 'weapon', 'Épico', 3, '🔱', '#a855f7', 500, FALSE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Lanza Plateada", "en": "Silver Lance"}',
    '{"es": "Alcance extendido para metas de largo plazo y asedio", "en": "Extended reach for long-term goals and siege"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
    'shadow_blade', 'weapon', 'Legendario', 5, '🗡️', '#ef4444', 1000, FALSE, FALSE, NULL,
    0, 0, 0, 0,
    '{"es": "Hoja de las Sombras", "en": "Shadow Blade"}',
    '{"es": "Arma legendaria forjada en la máxima concentración", "en": "Legendary weapon forged in deep focus"}',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
)
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    tier = EXCLUDED.tier,
    stars = EXCLUDED.stars,
    emoji = EXCLUDED.emoji,
    color = EXCLUDED.color,
    cost_coins = EXCLUDED.cost_coins,
    is_initial = EXCLUDED.is_initial,
    has_evolution = EXCLUDED.has_evolution,
    required_quality_id = EXCLUDED.required_quality_id,
    coins_per_pomodoro = EXCLUDED.coins_per_pomodoro,
    pause_penalty_coins = EXCLUDED.pause_penalty_coins,
    boss_damage_points = EXCLUDED.boss_damage_points,
    boss_heal_points = EXCLUDED.boss_heal_points,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    species = EXCLUDED.species,
    role = EXCLUDED.role,
    archetype = EXCLUDED.archetype,
    weapon_name = EXCLUDED.weapon_name,
    focus_application = EXCLUDED.focus_application,
    tactical_quote = EXCLUDED.tactical_quote,
    passive_name = EXCLUDED.passive_name,
    passive_advantage = EXCLUDED.passive_advantage,
    quality_name = EXCLUDED.quality_name,
    quality_req = EXCLUDED.quality_req;


-- ------------------------------------------------------------------------------
-- 4. FUNCIONES Y TRIGGERS PARA INVENTARIO INICIAL
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: FUNCIÓN (FUNCTION / PLPGSQL CON SECURITY DEFINER)]
-- ¿Qué es? Función automatizada que se ejecuta al registrarse un perfil.
-- ¿Para qué sirve? Consulta todos los cosméticos marcados como gratuitos iniciales (is_initial = TRUE)
-- y los inserta de inmediato en user_unlocked_items para el usuario recién creado.
CREATE OR REPLACE FUNCTION public.handle_initial_user_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
    SELECT NEW.id, id, 'initial'
    FROM public.catalog_items
    WHERE is_initial = TRUE
    ON CONFLICT (user_id, item_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [TIPO DE OBJETO: TRIGGER / DISPARADOR (TRIGGER)]
-- ¿Qué es? Disparador de eventos en public.profiles.
-- ¿Para qué sirve? Ejecuta handle_initial_user_inventory() tras cada inserción de un nuevo perfil en public.profiles.
DROP TRIGGER IF EXISTS on_profile_created_grant_initials ON public.profiles;
CREATE TRIGGER on_profile_created_grant_initials
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_initial_user_inventory();


-- ------------------------------------------------------------------------------
-- 5. PROCEDIMIENTOS ALMACENADOS RPC (COMPRAS TRANSACCIONALES)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PROCEDIMIENTO RPC / FUNCIÓN TRANSACCIONAL (SECURITY DEFINER FUNCTION)]
-- ¿Qué es? Una función que puede ser invocada remotamente desde el cliente frontend vía Supabase RPC (supabase.rpc('buy_catalog_item')).
-- ¿Para qué sirve? Realiza la compra de cosméticos de forma atómica y segura en el servidor:
--   1. Valida que el usuario esté autenticado mediante auth.uid().
--   2. Verifica la existencia del artículo en catalog_items.
--   3. Valida que el usuario no posea ya el artículo.
--   4. Bloquea la fila del perfil (FOR UPDATE) y valida saldo suficiente de pro_coins (previniendo condiciones de carrera / Race Conditions).
--   5. Descuenta el precio del cosmético.
--   6. Agrega el cosmético al inventario (user_unlocked_items).
--   7. Retorna la respuesta en formato JSON estructurado.
CREATE OR REPLACE FUNCTION public.buy_catalog_item(p_item_id VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_item RECORD;
    v_user_coins BIGINT;
BEGIN
    -- 1. Validar autenticación
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    -- 2. Obtener item del catálogo maestro
    SELECT * INTO v_item FROM public.catalog_items WHERE id = p_item_id AND is_active = TRUE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'El artículo no existe o está inactivo');
    END IF;

    -- 3. Verificar si el usuario ya posee el cosmético
    IF EXISTS (SELECT 1 FROM public.user_unlocked_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
        RETURN json_build_object('success', TRUE, 'message', 'Ya posees este artículo');
    END IF;

    -- 4. Obtener monedas y bloquear fila para evitar condiciones de carrera (Race Condition)
    SELECT pro_coins INTO v_user_coins FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    
    -- Validar fondos suficientes
    IF v_user_coins < v_item.cost_coins THEN
        RETURN json_build_object('success', FALSE, 'error', 'Monedas insuficientes');
    END IF;

    -- 5. Descontar monedas del perfil
    UPDATE public.profiles
    SET pro_coins = pro_coins - v_item.cost_coins
    WHERE id = v_user_id;

    -- 6. Insertar en el inventario del usuario
    INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
    VALUES (v_user_id, p_item_id, 'coin_purchase');

    -- 7. Respuesta exitosa con telemetría de saldo restante
    RETURN json_build_object(
        'success', TRUE,
        'item_id', p_item_id,
        'cost', v_item.cost_coins,
        'remaining_coins', v_user_coins - v_item.cost_coins
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 6. SEGURIDAD Y PERMISOS: RLS EN CATÁLOGO E INVENTARIO
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: DIRECTIVA DE SEGURIDAD (ROW LEVEL SECURITY - RLS)]
-- ¿Qué es? Activación de seguridad a nivel de filas.
-- ¿Para qué sirve? Protege las tablas catalog_items y user_unlocked_items contra accesos no reglamentados.
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_items ENABLE ROW LEVEL SECURITY;

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - SELECT)]
-- ¿Qué es? Regla de lectura pública para el catálogo.
-- ¿Para qué sirve? Permite que todos los usuarios puedan explorar el catálogo y precios de la tienda.
DROP POLICY IF EXISTS "Catálogo visible públicamente" ON public.catalog_items;
CREATE POLICY "Catálogo visible públicamente"
    ON public.catalog_items FOR SELECT
    USING (is_active = TRUE);

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - SELECT)]
-- ¿Qué es? Regla de lectura pública para el inventario.
-- ¿Para qué sirve? Permite consultar qué cosméticos posee un usuario para renderizar correctamente su perfil y avatar en la comunidad.
DROP POLICY IF EXISTS "Inventarios visibles públicamente" ON public.user_unlocked_items;
CREATE POLICY "Inventarios visibles públicamente"
    ON public.user_unlocked_items FOR SELECT
    USING (true);

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - INSERT)]
-- ¿Qué es? Regla de inserción para el inventario.
-- ¿Para qué sirve? Asegura que un usuario únicamente pueda registrar ítems vinculados a su propio ID (auth.uid() = user_id).
DROP POLICY IF EXISTS "Usuarios desbloquean sus propios items" ON public.user_unlocked_items;
CREATE POLICY "Usuarios desbloquean sus propios items"
    ON public.user_unlocked_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 7. SUSCRIPCIÓN EN TIEMPO REAL PARA INVENTARIOS
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PUBLICACIÓN REALTIME (SUPABASE REALTIME PUBLICATION)]
-- ¿Qué es? Publicación de eventos en tiempo real.
-- ¿Para qué sirve? Notifica al frontend vía WebSockets en el instante en que se añade un nuevo ítem a user_unlocked_items,
-- permitiendo que la interfaz del casillero o tienda se refresque al instante sin recargar la página.
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_unlocked_items;


-- ------------------------------------------------------------------------------
-- 8. MIGRACIÓN DE DATOS RETROACTIVA
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: SENTENCIA DML DE MIGRACIÓN (CROSS JOIN INSERT CON IDEMPOTENCIA)]
-- ¿Qué es? Una sentencia SQL que cruza todos los perfiles existentes con todos los ítems iniciales gratuitos.
-- ¿Para qué sirve? Si ya existían usuarios registrados antes de ejecutar este script, les entrega retroactivamente
-- todos los artículos gratuitos iniciales sin generar duplicados (ON CONFLICT DO NOTHING).
INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
SELECT p.id, c.id, 'initial'
FROM public.profiles p
CROSS JOIN public.catalog_items c
WHERE c.is_initial = TRUE
ON CONFLICT (user_id, item_id) DO NOTHING;
