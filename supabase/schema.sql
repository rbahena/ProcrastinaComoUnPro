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
-- GUÍA DE MIGRACIONES Y PANTALLAS EN EL FRONTEND:
-- [x] PASO 1: Auth & Perfiles -> /login, /registro, /home (Navbar), Configuración de Identidad
-- [x] PASO 2: Desbloqueables RPG -> /membresia (Tienda y Casillero), /enfoque (Bonos de Avatares)
-- [x] PASO 3: Cualidades Maestras -> /cualidades (Dojo de 7 Virtudes), /enfoque (Retos de Foco)
-- [x] PASO 4: Sesiones de Enfoque -> /enfoque (Pomodoro & Metodologías), /bitacora (Diario de Notas)
-- [x] PASO 5: Jefes de Raid -> /enfoque (Coworking Comunitario & Boss), /bestiario (Catálogo de Jefes)
-- [x] PASO 6: Productividad Auxiliar -> /fechas (Deadlines), /bloqueador (Cortafuegos), /ideas (Baúl)
-- [x] PASO 7: Telemetría Global -> /home (Cards en Vivo, Podio Semanal, Récords Históricos), /medallero
-- ==============================================================================


-- ==============================================================================
-- 📦 PASO 1: AUTENTICACIÓN Y PERFILES DE USUARIO
-- ==============================================================================
-- 🎯 PANTALLAS Y MÓDULOS DE USO EN EL FRONTEND:
-- • /login y /registro: Registro seguro con Email/Contraseña y Google OAuth, creación automática de perfil.
-- • /home (Navbar y Encabezado): Renderizado de nombre de usuario, avatar activo, balance de Pro Coins y tomates.
-- • Modal de Configuración de Identidad: Edición de nombre, país, profesión, idioma y días de enfoque activo.
-- • /membresia: Estado de suscripción Pro (is_premium), palmarés competitivo y medallas ganadas.
--
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
-- 🎯 PANTALLAS Y MÓDULOS DE USO EN EL FRONTEND:
-- • /membresia (Tienda del Dojo): Catálogo de 24 avatares, temas, cronómetros y armas con compra por Pro Coins.
-- • /membresia (Casillero / Inventario): Visualización de cosméticos desbloqueados y equipamiento activo.
-- • /enfoque (Zona de Concentración): Cálculo de monedas ganadas por bloque y daño al jefe según el avatar equipado.
-- • Modal de Zoom de Avatar (en /home y /medallero): Ficha técnica RPG con atributos, frase táctica y pasivas.
--
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



-- ==============================================================================
-- 📦 PASO 3: CATÁLOGO Y PROGRESO DE CUALIDADES MAESTRAS (MASTER QUALITIES & CHALLENGES)
-- ==============================================================================
-- 🎯 PANTALLAS Y MÓDULOS DE USO EN EL FRONTEND:
-- • /cualidades (Dojo de Honor): Visualización de las 7 virtudes maestras, porcentaje de avance cuantitativo y medallas.
-- • /enfoque (Zona de Concentración): Disparo de telemetría y desbloqueo automático de los 7 avatares guardianes al cumplir metas.
-- • /medallero: Progreso de hazañas individuales, retos superados y virtudes dominadas.
--
-- Propósito:
-- Definir el sistema de virtudes, retos y méritos de concentración ("Cualidades Maestras")
-- en formato nativo multilingüe JSONB {"es": "...", "en": "..."}.
-- Administra el progreso individual de cada usuario hacia la maestría y desbloquea
-- automáticamente a los 7 Guardianes de Reto (Tortuga, Hormiga, Búho, Rana, Águila, Abeja, Castor)
-- al cumplir los objetivos mediante procedimientos almacenados seguros y atómicos (RPC).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CATÁLOGO GLOBAL DE CUALIDADES MAESTRAS (MULTILINGÜE JSONB)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? Catálogo maestro de las 7 virtudes/cualidades de honor de la aplicación.
-- ¿Para qué sirve? Almacena la definición universal de cada cualidad, su animal representativo,
-- el guardián vinculado que se desbloquea al completarla, los textos explicativos en español e inglés,
-- la meta cuantitativa requerida (target_total) y el tipo de métrica a registrar.
CREATE TABLE IF NOT EXISTS public.master_qualities (
    -- [COLUMNA: IDENTIFICADOR ÚNICO DE LA CUALIDAD]
    -- id: Slug semántico único (ej. 'constancia', 'disciplina', 'sabiduria', 'superacion', 'vision', 'colaboracion', 'construccion').
    id VARCHAR(50) PRIMARY KEY,
    
    -- [COLUMNAS: VINCULACIÓN ZOOLÓGICA Y COSMÉTICA]
    -- animal_id: Slug del animal representativo (ej. 'tortuga', 'hormiga', 'buho', 'rana', 'aguila', 'abeja', 'castor').
    animal_id VARCHAR(50) NOT NULL,
    -- associated_avatar_id: Guardián que se otorga como recompensa al completar el reto (FK hacia catalog_items).
    associated_avatar_id VARCHAR(50) REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    
    -- [COLUMNAS: BALANCE DE RETOS Y MÉTRICAS]
    -- target_total: Cantidad de repeticiones o unidades requeridas para alcanzar el 100% y desbloquear el avatar.
    target_total INTEGER NOT NULL CHECK (target_total > 0),
    -- metric_type: Tipo de telemetría a medir ('streak_days', 'total_pomodoros', 'pareto_pomodoros', 'sapo_pomodoros', 'normal_pomodoros', 'community_pomodoros', 'chained_objective_pomodoros').
    metric_type VARCHAR(50) NOT NULL,
    -- icon: Clase de icono FontAwesome representativo para la tarjeta o píldora de cualidad.
    icon VARCHAR(50) NOT NULL DEFAULT 'fa-solid fa-award',
    -- color: Código hexadecimal distintivo de la cualidad.
    color VARCHAR(20) NOT NULL DEFAULT '#10b981',
    -- display_order: Orden de presentación en la interfaz gráfica.
    display_order SMALLINT NOT NULL DEFAULT 1,
    
    -- [COLUMNAS MULTILINGÜES JSONB: {"es": "...", "en": "..."}]
    -- name: Nombre público de la virtud o cualidad (ej. 'Constancia', 'Disciplina').
    name JSONB NOT NULL,
    -- description: Lema o enseñanza filosófica vinculada a la cualidad.
    description JSONB NOT NULL,
    -- unlock_requirement: Instrucción explícita del reto a superar para el usuario.
    unlock_requirement JSONB NOT NULL,
    
    -- [COLUMNAS: AUDITORÍA Y ESTADO]
    -- is_active: Permite habilitar o deshabilitar cualidades del dojo sin borrar datos históricos.
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    -- created_at: Fecha y hora exacta (UTC) de registro de la cualidad.
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ------------------------------------------------------------------------------
-- 2. TABLA DE PROGRESO INDIVIDUAL DE CUALIDADES (RELACIÓN N:M)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (RELACIÓN N:M / INTERSECCIÓN CON ESTADO)]
-- ¿Qué es? Tabla intermedia que conecta a cada usuario (profiles) con sus retos de cualidades (master_qualities).
-- ¿Para qué sirve? Guarda el avance numérico actual (current_progress), si el reto ya fue superado (is_unlocked),
-- la fecha exacta de coronación (unlocked_at) y la última actualización para sincronización en tiempo real.
CREATE TABLE IF NOT EXISTS public.user_quality_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quality_id VARCHAR(50) NOT NULL REFERENCES public.master_qualities(id) ON DELETE CASCADE,
    current_progress INTEGER NOT NULL DEFAULT 0 CHECK (current_progress >= 0),
    is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, quality_id)
);

-- [TIPO DE OBJETO: ÍNDICE B-TREE (INDEX)]
-- ¿Qué es? Estructura de indexación en PostgreSQL.
-- ¿Para qué sirve? Acelera las consultas al renderizar el perfil del usuario o verificar si una cualidad está desbloqueada.
CREATE INDEX IF NOT EXISTS idx_user_quality_progress_user ON public.user_quality_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quality_progress_quality ON public.user_quality_progress(quality_id);
CREATE INDEX IF NOT EXISTS idx_user_quality_progress_unlocked ON public.user_quality_progress(user_id, is_unlocked);

-- [TIPO DE OBJETO: TRIGGER DE AUDITORÍA (TRIGGER)]
-- ¿Para qué sirve? Actualiza automáticamente la columna updated_at antes de cada UPDATE en user_quality_progress.
DROP TRIGGER IF EXISTS set_user_quality_progress_updated_at ON public.user_quality_progress;
CREATE TRIGGER set_user_quality_progress_updated_at
    BEFORE UPDATE ON public.user_quality_progress
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- ------------------------------------------------------------------------------
-- 3. SEMILLA DE DATOS COMPLETA (7 CUALIDADES DE HONOR MULTILINGÜE)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: SENTENCIA DML DE INSERCIÓN MASIVA CON UPSERT (INSERT ... ON CONFLICT)]
-- ¿Qué es? Conjunto de datos base para las 7 cualidades maestras en español e inglés.
-- ¿Para qué sirve? Carga todas las virtudes del dojo con sus metas calibradas y las vincula con sus avatares correspondientes.
INSERT INTO public.master_qualities (
    id, animal_id, associated_avatar_id, target_total, metric_type, icon, color, display_order,
    name, description, unlock_requirement
) VALUES
(
    'constancia', 'tortuga', 'tortuga', 7, 'streak_days', 'fa-solid fa-fire', '#10b981', 1,
    '{"es": "Constancia", "en": "Consistency"}',
    '{"es": "Cada día cuenta. Mantén el ritmo firme sin importar la velocidad.", "en": "Every day counts. Keep a steady pace regardless of speed."}',
    '{"es": "Mantener una racha de 7 días consecutivos completando pomodoros.", "en": "Maintain a 7-day consecutive streak completing pomodoros."}'
),
(
    'disciplina', 'hormiga', 'hormiga', 15, 'total_pomodoros', 'fa-solid fa-dumbbell', '#ef4444', 2,
    '{"es": "Disciplina", "en": "Discipline"}',
    '{"es": "Los pequeños pasos construyen grandes resultados. La disciplina supera a la motivación.", "en": "Small steps build great results. Discipline overcomes motivation."}',
    '{"es": "Completar 15 pomodoros en total.", "en": "Complete 15 total pomodoros."}'
),
(
    'sabiduria', 'buho', 'buho', 5, 'pareto_pomodoros', 'fa-solid fa-brain', '#3b82f6', 3,
    '{"es": "Sabiduría", "en": "Wisdom"}',
    '{"es": "La estrategia supera a la fuerza bruta. Identifica el 20% que genera el 80% del resultado.", "en": "Strategy overcomes brute force. Identify the 20% that produces 80% of the result."}',
    '{"es": "Completar 5 pomodoros con la metodología Pareto (80/20).", "en": "Complete 5 pomodoros using the Pareto (80/20) methodology."}'
),
(
    'superacion', 'rana', 'rana', 5, 'sapo_pomodoros', 'fa-solid fa-mountain-sun', '#84cc16', 4,
    '{"es": "Superación", "en": "Overcoming"}',
    '{"es": "Enfréntate a lo más difícil de inmediato. Trágate el sapo a primera hora.", "en": "Face the hardest task immediately. Eat the frog first thing in the morning."}',
    '{"es": "Completar 5 pomodoros con la metodología Sapo/Rana y objetivo cumplido.", "en": "Complete 5 pomodoros using the Frog methodology and goal accomplished."}'
),
(
    'vision', 'aguila', 'aguila', 5, 'normal_pomodoros', 'fa-solid fa-eye', '#06b6d4', 5,
    '{"es": "Visión", "en": "Vision"}',
    '{"es": "No pierdas de vista hacia dónde vas. Eleva tu perspectiva sobre el ruido exterior.", "en": "Never lose sight of where you are going. Elevate your perspective above outside noise."}',
    '{"es": "Completar 5 pomodoros con la metodología Normal.", "en": "Complete 5 pomodoros using the Normal methodology."}'
),
(
    'colaboracion', 'abeja', 'abeja', 5, 'community_pomodoros', 'fa-solid fa-users', '#eab308', 6,
    '{"es": "Colaboración", "en": "Collaboration"}',
    '{"es": "El enfoque también puede compartirse. Acompaña y déjate acompañar en el dojo.", "en": "Focus can also be shared. Accompany and be accompanied in the dojo."}',
    '{"es": "Participar en 5 sesiones de coworking comunitario.", "en": "Participate in 5 community coworking sessions."}'
),
(
    'construccion', 'castor', 'castor', 3, 'chained_objective_pomodoros', 'fa-solid fa-hammer', '#78350f', 7,
    '{"es": "Construcción", "en": "Construction"}',
    '{"es": "Construye hoy lo que quieres terminar mañana. Cierra bloques con entregables reales.", "en": "Build today what you want to finish tomorrow. Close blocks with real deliverables."}',
    '{"es": "Completar 3 pomodoros seguidos para un mismo objetivo en un solo día.", "en": "Complete 3 pomodoros in a row for the same goal in a single day."}'
)
ON CONFLICT (id) DO UPDATE SET
    animal_id = EXCLUDED.animal_id,
    associated_avatar_id = EXCLUDED.associated_avatar_id,
    target_total = EXCLUDED.target_total,
    metric_type = EXCLUDED.metric_type,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    unlock_requirement = EXCLUDED.unlock_requirement;


-- ------------------------------------------------------------------------------
-- 4. FUNCIONES Y TRIGGERS PARA INICIALIZACIÓN DE CUALIDADES
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: FUNCIÓN (FUNCTION / PLPGSQL CON SECURITY DEFINER)]
-- ¿Qué es? Función automatizada disparada tras registrarse un nuevo perfil.
-- ¿Para qué sirve? Crea los 7 registros de seguimiento en user_quality_progress para el nuevo usuario,
-- garantizando que su casillero de virtudes esté listo con progreso inicial en 0.
CREATE OR REPLACE FUNCTION public.handle_initial_user_qualities()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_quality_progress (user_id, quality_id, current_progress, is_unlocked)
    SELECT NEW.id, id, 0, FALSE
    FROM public.master_qualities
    WHERE is_active = TRUE
    ON CONFLICT (user_id, quality_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [TIPO DE OBJETO: TRIGGER / DISPARADOR (TRIGGER)]
-- ¿Para qué sirve? Ejecuta handle_initial_user_qualities() automáticamente tras cada inserción en public.profiles.
DROP TRIGGER IF EXISTS on_profile_created_init_qualities ON public.profiles;
CREATE TRIGGER on_profile_created_init_qualities
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_initial_user_qualities();


-- ------------------------------------------------------------------------------
-- 5. PROCEDIMIENTOS ALMACENADOS RPC (AVANCE Y DESBLOQUEO ATÓMICO)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PROCEDIMIENTO RPC / FUNCIÓN TRANSACCIONAL (SECURITY DEFINER FUNCTION)]
-- ¿Qué es? Función invocable desde el frontend vía supabase.rpc('advance_user_quality_progress').
-- ¿Para qué sirve? Realiza el avance seguro de una cualidad en el servidor:
--   1. Valida autenticación del usuario (auth.uid()).
--   2. Obtiene la meta de la cualidad desde master_qualities.
--   3. Bloquea la fila del usuario en user_quality_progress para evitar colisiones.
--   4. Suma el incremento con tope máximo en target_total.
--   5. Si se alcanza la meta y no estaba desbloqueada, marca is_unlocked = TRUE, asigna unlocked_at
--      y DESBLOQUEA AUTOMÁTICAMENTE el guardián asociado en user_unlocked_items ('quality_reward').
--   6. Retorna un JSON con el estado de avance, si fue recién desbloqueado y el avatar obtenido.
CREATE OR REPLACE FUNCTION public.advance_user_quality_progress(
    p_quality_id VARCHAR,
    p_increment INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_quality RECORD;
    v_progress RECORD;
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

    -- 4. Si ya estaba desbloqueada, retornar estado actual sin alterar
    IF v_progress.is_unlocked THEN
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

    -- 5. Calcular nuevo progreso acotado al objetivo
    v_new_progress := LEAST(v_quality.target_total, v_progress.current_progress + p_increment);
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
    IF v_newly_unlocked AND v_quality.associated_avatar_id IS NOT NULL THEN
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


-- ------------------------------------------------------------------------------
-- 6. SEGURIDAD Y PERMISOS: RLS EN CUALIDADES Y PROGRESO
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: DIRECTIVA DE SEGURIDAD (ROW LEVEL SECURITY - RLS)]
-- ¿Para qué sirve? Activa la protección granular por fila en ambas tablas.
ALTER TABLE public.master_qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quality_progress ENABLE ROW LEVEL SECURITY;

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - SELECT)]
-- ¿Para qué sirve? Permite que todos los usuarios puedan consultar el catálogo de cualidades maestras.
DROP POLICY IF EXISTS "Cualidades maestras visibles públicamente" ON public.master_qualities;
CREATE POLICY "Cualidades maestras visibles públicamente"
    ON public.master_qualities FOR SELECT
    USING (is_active = TRUE);

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - SELECT)]
-- ¿Para qué sirve? Permite consultar el progreso de cualidades (necesario para medallas visibles en perfil y comunidad).
DROP POLICY IF EXISTS "Progreso de cualidades visible públicamente" ON public.user_quality_progress;
CREATE POLICY "Progreso de cualidades visible públicamente"
    ON public.user_quality_progress FOR SELECT
    USING (true);

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - INSERT)]
-- ¿Para qué sirve? Garantiza que un usuario solo pueda registrar progreso para su propio ID.
DROP POLICY IF EXISTS "Usuarios insertan su propio progreso de cualidades" ON public.user_quality_progress;
CREATE POLICY "Usuarios insertan su propio progreso de cualidades"
    ON public.user_quality_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - UPDATE)]
-- ¿Para qué sirve? Garantiza que un usuario solo pueda modificar sus propias filas de cualidad.
DROP POLICY IF EXISTS "Usuarios actualizan su propio progreso de cualidades" ON public.user_quality_progress;
CREATE POLICY "Usuarios actualizan su propio progreso de cualidades"
    ON public.user_quality_progress FOR UPDATE
    USING (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 7. SUSCRIPCIÓN EN TIEMPO REAL (WEBSOCKETS)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PUBLICACIÓN REALTIME (SUPABASE REALTIME PUBLICATION)]
-- ¿Qué es? Canal de eventos WebSockets.
-- ¿Para qué sirve? Notifica reactivamente al frontend cuando un usuario avanza o desbloquea una cualidad,
-- actualizando la barra de progreso y el medallero en vivo sin recargar la página.
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_quality_progress;


-- ------------------------------------------------------------------------------
-- 8. MIGRACIÓN DE DATOS RETROACTIVA Y SINCRONIZACIÓN DE LOGROS
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: SENTENCIA DML DE MIGRACIÓN RETROACTIVA (CROSS JOIN INSERT)]
-- ¿Para qué sirve? Si ya existen perfiles registrados, les crea automáticamente las 7 filas de cualidad con progreso 0.
INSERT INTO public.user_quality_progress (user_id, quality_id, current_progress, is_unlocked)
SELECT p.id, q.id, 0, FALSE
FROM public.profiles p
CROSS JOIN public.master_qualities q
WHERE q.is_active = TRUE
ON CONFLICT (user_id, quality_id) DO NOTHING;

-- [TIPO DE OBJETO: SENTENCIA DML DE SINCRONIZACIÓN RETROACTIVA (UPDATE CON JOIN)]
-- ¿Para qué sirve? Si algún usuario ya tenía desbloqueado uno de los guardianes de reto en su inventario,
-- marca automáticamente la cualidad correspondiente como completada al 100% (is_unlocked = TRUE).
UPDATE public.user_quality_progress uqp
SET 
    is_unlocked = TRUE,
    current_progress = mq.target_total,
    unlocked_at = COALESCE(uui.unlocked_at, TIMEZONE('utc'::text, NOW()))
FROM public.master_qualities mq
JOIN public.user_unlocked_items uui 
    ON uui.item_id = mq.associated_avatar_id
WHERE uqp.quality_id = mq.id 
  AND uqp.user_id = uui.user_id 
  AND uqp.is_unlocked = FALSE;



-- ==============================================================================
-- 📦 PASO 4: SESIONES DE ENFOQUE, BITÁCORA & BLINDAJE ANTI-EXPLOITS
-- ==============================================================================
-- 🎯 PANTALLAS Y MÓDULOS DE USO EN EL FRONTEND:
-- • /enfoque (Arena de Hiperfoco): Temporizador Pomodoro, selección de metodologías (Normal, Sapo, Pareto) y liquidación segura con monedas/XP.
-- • /bitacora (Diario de Productividad): Registro histórico de reflexiones, aprendizajes, distracciones y estado de ánimo post-sesión.
-- • /estadisticas: Gráficos de tiempo efectivo enfocado, distribución de metodologías y rachas semanales.
--
-- Propósito:
-- Gestionar el ciclo de vida completo de cada sesión de hiperfoco (Pomodoro),
-- el registro histórico de reflexiones/aprendizajes en la Bitácora y el motor
-- de liquidación algorítmica con blindaje anti-trampas (Snapshots inmutables,
-- idempotencia mediante Nonce UUID, piso de billetera Floor 0 y periodo de gracia).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS PARA SESIONES DE ENFOQUE
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: ENUM / TIPOS ENUMERADOS (ENUMERATED TYPES)]
-- ¿Para qué sirven? Garantizan integridad estricta en los estados y modos de sesión permitidos.
DO $$ BEGIN
    CREATE TYPE focus_session_status_enum AS ENUM ('completed', 'abandoned', 'interrupted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE focus_methodology_enum AS ENUM ('normal', 'sapo', 'pareto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE coworking_mode_enum AS ENUM ('individual', 'comunitario');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE energy_level_enum AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ------------------------------------------------------------------------------
-- 2. TABLA DE SESIONES DE ENFOQUE (TELEMETRÍA REAL E INMUTABLE)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? Registro histórico inmutable de cada bloque de concentración ejecutado.
-- ¿Para qué sirve? Almacena la telemetría de tiempos planeados vs reales, pausas, metodología utilizada,
-- modo de sesión, nivel de energía inicial, snapshot del avatar activo y recompensas/daños liquidados.
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    -- [COLUMNA: IDENTIFICADORES Y VINCULACIÓN]
    -- id: Identificador único autogenerado de la sesión en base de datos.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- nonce_id: Identificador único de idempotencia para prevenir cobros o recompensas duplicadas.
    nonce_id UUID UNIQUE NOT NULL,
    -- user_id: Usuario que ejecutó la sesión (FK hacia profiles).
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- [COLUMNAS: CONFIGURACIÓN Y METADATOS DE SESIÓN]
    -- objective_text: Meta o tarea declarada por el usuario antes de desenvainar el reloj.
    objective_text TEXT NOT NULL DEFAULT 'Sesión de Enfoque',
    -- status: Resultado final ('completed', 'abandoned', 'interrupted').
    status focus_session_status_enum NOT NULL DEFAULT 'completed',
    -- methodology: Metodología aplicada ('normal', 'sapo', 'pareto').
    methodology focus_methodology_enum NOT NULL DEFAULT 'normal',
    -- coworking_mode: Entorno de sesión ('individual', 'comunitario').
    coworking_mode coworking_mode_enum NOT NULL DEFAULT 'individual',
    -- energy_level: Nivel de batería/energía declarado al inicio ('low', 'medium', 'high').
    energy_level energy_level_enum NOT NULL DEFAULT 'medium',
    
    -- [COLUMNAS: TELEMETRÍA TEMPORAL Y CONTROL DE PAUSAS]
    -- planned_duration_seconds: Duración programada en segundos (ej. 1500 para 25 min).
    planned_duration_seconds INTEGER NOT NULL DEFAULT 1500 CHECK (planned_duration_seconds >= 60),
    -- actual_duration_seconds: Tiempo real efectivo transcurrido en el temporizador antes de finalizar.
    actual_duration_seconds INTEGER NOT NULL DEFAULT 1500 CHECK (actual_duration_seconds >= 0),
    -- pause_count: Total de pausas o interrupciones registradas durante el bloque.
    pause_count SMALLINT NOT NULL DEFAULT 0 CHECK (pause_count >= 0),
    -- total_pause_seconds: Tiempo acumulado consumido en pausas de emergencia.
    total_pause_seconds INTEGER NOT NULL DEFAULT 0 CHECK (total_pause_seconds >= 0),
    -- objective_completed: Respuesta en el cierre dopamínico ('yes', 'no', 'progress', 'partial').
    objective_completed VARCHAR(10) DEFAULT 'yes' CHECK (objective_completed IN ('yes', 'no', 'progress', 'partial')),
    
    -- [COLUMNAS: SNAPSHOT INMUTABLE DE AVATAR Y RECOMPENSAS]
    -- avatar_id: Identificador del guardián equipado al momento exacto de arrancar (Snapshot inmutable).
    avatar_id VARCHAR(50) NOT NULL REFERENCES public.catalog_items(id),
    -- coins_earned: Monedas acreditadas en la sesión.
    coins_earned BIGINT NOT NULL DEFAULT 0 CHECK (coins_earned >= 0),
    -- coins_penalized: Monedas deducidas por abandono o interrupción prolongada.
    coins_penalized BIGINT NOT NULL DEFAULT 0 CHECK (coins_penalized >= 0),
    -- xp_earned: Puntos de honor/experiencia obtenidos.
    xp_earned INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
    -- boss_damage_dealt: Daño asestado al Oni / Jefe de Raid de la comunidad.
    boss_damage_dealt INTEGER NOT NULL DEFAULT 0 CHECK (boss_damage_dealt >= 0),
    -- boss_hp_healed: Puntos de salud que el Oni recuperó si el usuario abandonó tras el periodo de gracia.
    boss_hp_healed INTEGER NOT NULL DEFAULT 0 CHECK (boss_hp_healed >= 0),
    -- is_critical_hit: Flag booleano que indica si se activó un golpe crítico (ej. Metodología Sapo).
    is_critical_hit BOOLEAN NOT NULL DEFAULT FALSE,
    -- grit_bonus_applied: Flag booleano que indica si se acreditó el Bono de Coraje por vencer baja energía.
    grit_bonus_applied BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- [COLUMNAS: MARCAS TEMPORALES]
    -- idea_id: Referencia opcional a la tarea del baúl asociada a esta sesión de concentración.
    idea_id UUID REFERENCES public.captured_ideas(id) ON DELETE SET NULL,
    -- started_at: Momento exacto en que comenzó el temporizador.
    started_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    -- completed_at: Momento en que la sesión fue liquidada.
    completed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    -- created_at: Fecha y hora de inserción en base de datos.
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Asegurar que la columna idea_id exista en bases de datos existentes
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS idea_id UUID REFERENCES public.captured_ideas(id) ON DELETE SET NULL;

-- [TIPO DE OBJETO: ÍNDICES B-TREE (INDEXES)]
-- ¿Para qué sirven? Aceleran la carga del historial en la bitácora, estadísticas semanales y validación de idempotencia.
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON public.focus_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON public.focus_sessions(status);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_nonce ON public.focus_sessions(nonce_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_idea_id ON public.focus_sessions(idea_id);


-- ------------------------------------------------------------------------------
-- 3. TABLA DE BITÁCORA DE APRENDIZAJES (FOCUS LOGS)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? Registro de notas, reflexiones, distracciones capturadas y aprendizajes post-sesión.
-- ¿Para qué sirve? Permite al usuario consultar su diario de evolución personal y retener lo aprendido.
CREATE TABLE IF NOT EXISTS public.focus_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.focus_sessions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    learnings TEXT DEFAULT NULL,
    distractions_recorded JSONB DEFAULT '[]'::jsonb,
    mood_score SMALLINT DEFAULT 3 CHECK (mood_score BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- [TIPO DE OBJETO: ÍNDICE B-TREE (INDEX)]
-- ¿Para qué sirve? Agiliza la consulta cronológica de notas en la sección /bitacora.
CREATE INDEX IF NOT EXISTS idx_focus_logs_user_date ON public.focus_logs(user_id, created_at DESC);


-- ------------------------------------------------------------------------------
-- 4. PROCEDIMIENTO RPC MAESTRO DE LIQUIDACIÓN Y BLINDAJE ANTI-EXPLOITS
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PROCEDIMIENTO RPC / FUNCIÓN TRANSACCIONAL (SECURITY DEFINER FUNCTION)]
-- ¿Qué es? El motor de liquidación algorítmica de sesiones de enfoque en el servidor.
-- ¿Para qué sirve? Aplica las 5 reglas de blindaje anti-trampas:
--   1. Idempotencia con Nonce UUID: Si el nonce ya fue procesado, retorna el resultado previo sin alterar saldos.
--   2. Snapshot Inmutable: Valida los atributos RPG del avatar registrado al iniciar, previniendo alteraciones intermedias.
--   3. Periodo de Gracia (120 Segundos): Cancelaciones en los primeros 2 minutos no aplican multa ni curan al jefe.
--   4. Escalado Proporcional de Tiempo: factor = Math.min(1.0, actual_seconds / 1500). Sesiones < 120s no dan monedas.
--   5. Piso de Billetera Floor 0: new_balance = Math.max(0, current_coins - penalty). Jamás genera saldos negativos.
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
    p_distractions JSONB DEFAULT '[]'::jsonb
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
    v_today DATE := CURRENT_DATE;
    v_new_streak INTEGER;
    v_new_longest_streak INTEGER;
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
        -- Fallback seguro a gato común si el ID no se encuentra
        SELECT * INTO v_avatar FROM public.catalog_items WHERE id = 'gato';
    END IF;

    -- 4. Bloquear perfil para actualización atómica sin condiciones de carrera
    SELECT * INTO v_user FROM public.profiles WHERE id = v_user_id FOR UPDATE;

    -- 5. Lógica de Liquidación según Estado
    IF p_status = 'completed' THEN
        -- Anti-Exploit de tiempo: mínimo 120 segundos para otorgar recompensas
        IF p_actual_seconds >= 120 THEN
            -- Recompensa estándar por pomodoro completado: 1 tomate y 1 moneda
            v_coins_earned := 1;
            
            -- Daño base al Boss escalado
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

            -- Pasiva Táctica: Bono de Coraje (Baja energía vencida)
            IF p_energy_level = 'low' THEN
                v_grit_bonus := TRUE;
                IF v_user.is_premium THEN
                    v_xp_earned := v_xp_earned + 50;
                END IF;
            END IF;

            -- Pasiva Táctica: Cero Pausas (Sombra / Lince / Aethel)
            IF p_pause_count = 0 THEN
                v_boss_damage := ROUND(v_boss_damage * 1.15);
            END IF;

            -- Bono de Objetivo Cumplido
            IF p_objective_completed = 'yes' THEN
                IF v_user.is_premium THEN
                    v_xp_earned := v_xp_earned + 30;
                END IF;
            END IF;

            -- XP base de enfoque
            IF v_user.is_premium THEN
                v_xp_earned := v_xp_earned + 10;
            END IF;
        ELSE
            -- Sesión completada en menos de 2 minutos: sin monedas (prevención de granja)
            v_coins_earned := 0;
            v_boss_damage := 5;
        END IF;

        -- Cálculo seguro de Racha (Streak)
        IF v_user.last_focus_date IS NULL THEN
            v_new_streak := 1;
        ELSIF v_user.last_focus_date = v_today THEN
            v_new_streak := v_user.streak_days;
        ELSIF v_user.last_focus_date = v_today - INTERVAL '1 day' THEN
            v_new_streak := v_user.streak_days + 1;
        ELSE
            v_new_streak := 1;
        END IF;
        v_new_longest_streak := GREATEST(v_user.longest_streak, v_new_streak);

        -- Actualizar perfil con ganancias
        UPDATE public.profiles
        SET 
            pro_coins = pro_coins + v_coins_earned,
            focus_tomatoes = focus_tomatoes + 1,
            focus_points = focus_points + v_xp_earned,
            streak_days = v_new_streak,
            longest_streak = v_new_longest_streak,
            last_focus_date = v_today
        WHERE id = v_user_id;

    ELSE
        -- Estado: Abandonado o Interrumpido
        -- Regla Anti-Exploit: Periodo de Gracia de 120 segundos
        IF p_actual_seconds < 120 THEN
            v_coins_penalized := 0;
            v_boss_heal := 0;
        ELSE
            -- Penalización calculada según el avatar del snapshot
            v_coins_penalized := v_avatar.pause_penalty_coins + 15;
            v_boss_heal := v_avatar.boss_heal_points + 20;

            -- Regla Floor 0: La billetera jamás queda en números negativos
            UPDATE public.profiles
            SET 
                pro_coins = GREATEST(0, pro_coins - v_coins_penalized),
                focus_points = CASE WHEN is_premium THEN GREATEST(0, focus_points - 50) ELSE focus_points END
            WHERE id = v_user_id;
        END IF;
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


-- ------------------------------------------------------------------------------
-- 5. PROCEDIMIENTO RPC PARA GUARDAR ENTRADAS EN LA BITÁCORA
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PROCEDIMIENTO RPC / FUNCIÓN SEGURA (SECURITY DEFINER FUNCTION)]
-- ¿Para qué sirve? Permite guardar notas y reflexiones en focus_logs de forma directa desde la vista /bitacora.
CREATE OR REPLACE FUNCTION public.add_focus_log_entry(
    p_title TEXT,
    p_learnings TEXT,
    p_distractions JSONB DEFAULT '[]'::jsonb,
    p_mood_score SMALLINT DEFAULT 3
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_log_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    INSERT INTO public.focus_logs (user_id, title, learnings, distractions_recorded, mood_score)
    VALUES (v_user_id, p_title, p_learnings, p_distractions, p_mood_score)
    RETURNING id INTO v_log_id;

    RETURN json_build_object('success', TRUE, 'log_id', v_log_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 6. SEGURIDAD Y PERMISOS: RLS EN SESIONES Y BITÁCORA
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: DIRECTIVA DE SEGURIDAD (ROW LEVEL SECURITY - RLS)]
-- ¿Para qué sirve? Aísla y protege los registros de sesiones y notas personales.
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_logs ENABLE ROW LEVEL SECURITY;

-- [TIPO DE OBJETO: POLÍTICAS RLS EN FOCUS_SESSIONS]
DROP POLICY IF EXISTS "Sesiones visibles por su propietario" ON public.focus_sessions;
CREATE POLICY "Sesiones visibles por su propietario"
    ON public.focus_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios registran sus propias sesiones" ON public.focus_sessions;
CREATE POLICY "Usuarios registran sus propias sesiones"
    ON public.focus_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- [TIPO DE OBJETO: POLÍTICAS RLS EN FOCUS_LOGS]
DROP POLICY IF EXISTS "Bitácora visible por su propietario" ON public.focus_logs;
CREATE POLICY "Bitácora visible por su propietario"
    ON public.focus_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios insertan sus propias notas de bitácora" ON public.focus_logs;
CREATE POLICY "Usuarios insertan sus propias notas de bitácora"
    ON public.focus_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios eliminan sus propias notas de bitácora" ON public.focus_logs;
CREATE POLICY "Usuarios eliminan sus propias notas de bitácora"
    ON public.focus_logs FOR DELETE
    USING (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 7. SUSCRIPCIÓN EN TIEMPO REAL (WEBSOCKETS)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PUBLICACIÓN REALTIME (SUPABASE REALTIME PUBLICATION)]
-- ¿Para qué sirve? Notifica en tiempo real al registrar sesiones o notas en la bitácora.
ALTER PUBLICATION supabase_realtime ADD TABLE public.focus_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.focus_logs;



-- ==============================================================================
-- 📦 PASO 5: JEFES DE RAID COMUNITARIOS & WEBSOCKETS REALTIME
-- ==============================================================================
-- 🎯 PANTALLAS Y MÓDULOS DE USO EN EL FRONTEND:
-- • /enfoque (Modo Coworking Comunitario): Barra de salud colectiva del Jefe de Raid, asalto cooperativo y feed de batalla en vivo.
-- • /home (Card 2 - Jefe de la Comunidad): Widget de estado del jefe en tiempo real, HP restante y porcentaje de daño.
-- • /bestiario: Catálogo de amenazas psicológicas, debilidades y recompensas de raid.
--
-- Propósito:
-- Implementar el motor de combate cooperativo masivo (Raid Boss de la Comunidad).
-- Todos los usuarios enfocados en coworking comunitario infligen daño colectivo a un
-- Jefe colosal (ej. La Sirena de las Distracciones, El Kraken del Caos, El Dragón del Ego).
-- Si un usuario abandona o se distrae, el Jefe recupera salud y golpea el Escudo Comunitario.
-- Los cambios de vida y el feed de batalla se transmiten en milisegundos vía WebSockets Realtime.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS PARA EL SISTEMA DE JEFES DE RAID
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: ENUM / TIPOS ENUMERADOS (ENUMERATED TYPES)]
-- ¿Para qué sirven? Clasifican el estado de la raid y los tipos de eventos en el feed de combate.
DO $$ BEGIN
    CREATE TYPE boss_status_enum AS ENUM ('active', 'defeated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE boss_event_type_enum AS ENUM ('attack', 'critical', 'heal', 'shield_absorb', 'shield_break', 'victory', 'spawn');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ------------------------------------------------------------------------------
-- 2. TABLA DE ESTADO GLOBAL DE JEFES DE RAID (COMMUNITY BOSSES)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? La entidad de combate central que almacena la vida actual, vida máxima, escudo de comunidad y estado de victoria.
-- ¿Para qué sirve? Permite que todos los clientes sincronizados consulten la misma barra de vida comunitaria.
-- La columna boss_type es VARCHAR(50) para permitir agregar libremente cualquier jefe futuro sin alterar esquemas.
CREATE TABLE IF NOT EXISTS public.community_bosses (
    -- [COLUMNA: IDENTIFICADOR ÚNICO DEL JEFE]
    -- id: Slug semántico del oponente (ej. 'siren', 'kraken', etc.).
    id VARCHAR(50) PRIMARY KEY,
    
    -- [COLUMNAS MULTILINGÜES JSONB: {"es": "...", "en": "..."}]
    -- name: Nombre descriptivo y temático del Jefe.
    name JSONB NOT NULL,
    -- description: Explicación de la amenaza psicológica que encarna este oponente.
    description JSONB NOT NULL,
    
    -- [COLUMNAS: ESTADÍSTICAS DE COMBATE RPG]
    -- boss_type: Tipo/arquetipo del jefe (ej. 'siren', 'hidra', 'kraken', etc.).
    boss_type VARCHAR(50) NOT NULL UNIQUE,
    -- max_hp: Puntos de salud máximos de la raid.
    max_hp INTEGER NOT NULL CHECK (max_hp > 0),
    -- current_hp: Salud actual restante (0 = derrotado).
    current_hp INTEGER NOT NULL CHECK (current_hp >= 0),
    -- status: Estado actual ('active' o 'defeated').
    status boss_status_enum NOT NULL DEFAULT 'active',
    -- community_shield: Puntos del escudo defensivo compartido (0 a 1000).
    community_shield INTEGER NOT NULL DEFAULT 1000 CHECK (community_shield >= 0 AND community_shield <= 1000),
    -- max_community_shield: Capacidad máxima del escudo colectivo.
    max_community_shield INTEGER NOT NULL DEFAULT 1000,
    -- defeat_reward_coins: Monedas otorgadas a los guerreros al vencerlo.
    defeat_reward_coins INTEGER NOT NULL DEFAULT 150 CHECK (defeat_reward_coins >= 0),
    
    -- [COLUMNAS: ROTACIÓN Y CONTROL TEMPORAL]
    -- is_current_active: Si es TRUE, este es el jefe actualmente invocado en la sala de coworking.
    is_current_active BOOLEAN NOT NULL DEFAULT FALSE,
    -- defeated_at: Momento exacto en que fue derrocado.
    defeated_at TIMESTAMPTZ DEFAULT NULL,
    -- respawn_at: Momento programado para el resurgimiento de un nuevo desafío.
    respawn_at TIMESTAMPTZ DEFAULT NULL,
    -- updated_at: Marca temporal de la última modificación para WebSockets.
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- [TIPO DE OBJETO: ÍNDICE B-TREE (INDEX)]
-- ¿Para qué sirve? Permite obtener instantáneamente el jefe activo sin escanear toda la tabla.
CREATE INDEX IF NOT EXISTS idx_community_bosses_active ON public.community_bosses(is_current_active, status);

-- [TIPO DE OBJETO: TRIGGER DE AUDITORÍA (TRIGGER)]
-- ¿Para qué sirve? Actualiza updated_at antes de cada golpe o curación.
DROP TRIGGER IF EXISTS set_community_bosses_updated_at ON public.community_bosses;
CREATE TRIGGER set_community_bosses_updated_at
    BEFORE UPDATE ON public.community_bosses
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- ------------------------------------------------------------------------------
-- 3. TABLA DE FEED DE COMBATE Y EVENTOS EN VIVO (COMMUNITY BOSS ATTACKS)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? Registro cronológico en tiempo real de todos los ataques, golpes críticos y curaciones.
-- ¿Para qué sirve? Alimenta el terminal de combate de la sala comunitaria en la vista de enfoque.
CREATE TABLE IF NOT EXISTS public.community_boss_attacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boss_id VARCHAR(50) NOT NULL REFERENCES public.community_bosses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'Guerrero Anónimo',
    user_avatar VARCHAR(50) DEFAULT 'gato',
    event_type boss_event_type_enum NOT NULL DEFAULT 'attack',
    damage_dealt INTEGER NOT NULL DEFAULT 0 CHECK (damage_dealt >= 0),
    hp_healed INTEGER NOT NULL DEFAULT 0 CHECK (hp_healed >= 0),
    shield_damage INTEGER NOT NULL DEFAULT 0 CHECK (shield_damage >= 0),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- [TIPO DE OBJETO: ÍNDICE B-TREE (INDEX)]
-- ¿Para qué sirve? Acelera la consulta de los últimos 30 eventos para el feed de batalla.
CREATE INDEX IF NOT EXISTS idx_community_boss_attacks_boss_date ON public.community_boss_attacks(boss_id, created_at DESC);


-- ------------------------------------------------------------------------------
-- 4. SEMILLA DE DATOS INICIAL (LA SIRENA DE LAS DISTRACCIONES)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: SENTENCIA DML DE INSERCIÓN CON UPSERT (INSERT ... ON CONFLICT)]
-- ¿Qué es? Carga únicamente a La Sirena como oponente activo inicial del dojo con 100% de vida (9000/9000 HP).
-- ¿Nota de Extensibilidad? La tabla queda lista para recibir cualquier nuevo jefe que definas en el futuro.
INSERT INTO public.community_bosses (
    id, boss_type, max_hp, current_hp, status, community_shield, max_community_shield,
    defeat_reward_coins, is_current_active, name, description
) VALUES
(
    'siren', 'siren', 9000, 9000, 'active', 1000, 1000, 150, TRUE,
    '{"es": "La Sirena de las Distracciones", "en": "The Siren of Distractions"}',
    '{"es": "Canta con notificaciones y pestañas infinitas para romper tu concentración.", "en": "Sings with infinite notifications and tabs to break your focus."}'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    max_hp = EXCLUDED.max_hp,
    current_hp = EXCLUDED.current_hp,
    community_shield = EXCLUDED.community_shield,
    defeat_reward_coins = EXCLUDED.defeat_reward_coins;

-- ==============================================================================
-- 💡 PLANTILLA PARA AGREGAR NUEVOS JEFES EN EL FUTURO (CUANDO LOS DEFINAS):
-- ==============================================================================
-- INSERT INTO public.community_bosses (id, boss_type, max_hp, current_hp, status, community_shield, max_community_shield, defeat_reward_coins, is_current_active, name, description)
-- VALUES ('slug_jefe', 'slug_jefe', 10000, 10000, 'active', 1000, 1000, 150, FALSE, '{"es": "Nombre", "en": "Name"}', '{"es": "Descripción", "en": "Description"}')
-- ON CONFLICT (id) DO NOTHING;
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 5. PROCEDIMIENTOS ALMACENADOS RPC (COMBATE TRANSACCIONAL)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PROCEDIMIENTO RPC / FUNCIÓN TRANSACCIONAL (SECURITY DEFINER FUNCTION)]
-- ¿Para qué sirve? Aplica daño masivo al jefe activo de forma atómica y segura en el servidor.
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
    v_new_hp INTEGER;
    v_is_defeated BOOLEAN := FALSE;
    v_message TEXT;
    v_event_type boss_event_type_enum := 'attack';
BEGIN
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

        -- Acreditar recompensa a quien asestó el golpe final
        IF v_user_id IS NOT NULL THEN
            UPDATE public.profiles
            SET pro_coins = pro_coins + v_boss.defeat_reward_coins
            WHERE id = v_user_id;
        END IF;
    END IF;

    -- 7. Retornar payload
    RETURN json_build_object(
        'success', TRUE,
        'boss_id', v_boss.id,
        'current_hp', v_new_hp,
        'max_hp', v_boss.max_hp,
        'is_defeated', v_is_defeated,
        'damage_dealt', p_damage,
        'status', CASE WHEN v_is_defeated THEN 'defeated' ELSE 'active' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- [TIPO DE OBJETO: PROCEDIMIENTO RPC / FUNCIÓN TRANSACCIONAL (SECURITY DEFINER FUNCTION)]
-- ¿Para qué sirve? Cura al jefe y reduce el escudo colectivo cuando un usuario abandona o se distrae en comunidad.
CREATE OR REPLACE FUNCTION public.heal_boss_from_distraction(
    p_boss_id VARCHAR,
    p_player_name TEXT DEFAULT 'Un Guerrero'
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_boss RECORD;
    v_heal_amount INTEGER;
    v_new_hp INTEGER;
    v_new_shield INTEGER;
    v_message TEXT;
BEGIN
    -- 1. Obtener y bloquear la fila del Boss
    SELECT * INTO v_boss FROM public.community_bosses WHERE id = p_boss_id FOR UPDATE;
    IF NOT FOUND THEN
        SELECT * INTO v_boss FROM public.community_bosses WHERE is_current_active = TRUE LIMIT 1 FOR UPDATE;
    END IF;

    IF v_boss.status = 'defeated' THEN
        RETURN json_build_object('success', TRUE, 'status', 'defeated');
    END IF;

    -- 2. Calcular curación (2% del HP Máximo) y desgaste de escudo
    v_heal_amount := ROUND(v_boss.max_hp * 0.02);
    v_new_hp := LEAST(v_boss.max_hp, v_boss.current_hp + v_heal_amount);
    v_new_shield := GREATEST(0, v_boss.community_shield - 40);

    v_message := '🩸 El jefe recuperó +' || v_heal_amount || ' HP debido a la distracción de ' || p_player_name || '.';

    -- 3. Actualizar estado
    UPDATE public.community_bosses
    SET 
        current_hp = v_new_hp,
        community_shield = v_new_shield,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = v_boss.id;

    -- 4. Insertar eventos en el feed
    INSERT INTO public.community_boss_attacks (
        boss_id, user_id, user_name, event_type, hp_healed, message
    ) VALUES (
        v_boss.id, v_user_id, p_player_name, 'heal', v_heal_amount, v_message
    );

    IF v_new_shield = 0 THEN
        INSERT INTO public.community_boss_attacks (
            boss_id, user_id, user_name, event_type, shield_damage, message
        ) VALUES (
            v_boss.id, NULL, 'Sistema de Comunidad', 'shield_break',
            '⚠️ ¡El Escudo de la Comunidad ha colapsado! El Jefe ataca directamente.'
        );
    ELSE
        INSERT INTO public.community_boss_attacks (
            boss_id, user_id, user_name, event_type, shield_damage, message
        ) VALUES (
            v_boss.id, NULL, 'Sistema de Comunidad', 'shield_absorb',
            '🛡️ El escudo comunitario absorbió el contraataque (-40 de escudo).'
        );
    END IF;

    -- 5. Retornar payload
    RETURN json_build_object(
        'success', TRUE,
        'boss_id', v_boss.id,
        'current_hp', v_new_hp,
        'hp_healed', v_heal_amount,
        'community_shield', v_new_shield
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- [TIPO DE OBJETO: PROCEDIMIENTO RPC PARA CAMBIAR O REINICIAR JEFE ACTIVO]
CREATE OR REPLACE FUNCTION public.switch_active_boss(p_boss_type VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_boss RECORD;
BEGIN
    UPDATE public.community_bosses SET is_current_active = FALSE;
    
    UPDATE public.community_bosses
    SET 
        is_current_active = TRUE,
        status = 'active',
        current_hp = CASE WHEN status = 'defeated' OR current_hp <= 0 THEN max_hp ELSE current_hp END,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE boss_type::text = p_boss_type
    RETURNING * INTO v_boss;

    IF NOT FOUND THEN
        UPDATE public.community_bosses SET is_current_active = TRUE WHERE id = 'siren' RETURNING * INTO v_boss;
    END IF;

    INSERT INTO public.community_boss_attacks (
        boss_id, user_id, user_name, event_type, message
    ) VALUES (
        v_boss.id, NULL, 'Sistema de Comunidad', 'spawn',
        '👾 Ha aparecido un nuevo oponente en el templo: ' || (v_boss.name->>'es') || '.'
    );

    RETURN json_build_object(
        'success', TRUE,
        'boss_id', v_boss.id,
        'name', v_boss.name,
        'max_hp', v_boss.max_hp,
        'current_hp', v_boss.current_hp,
        'community_shield', v_boss.community_shield
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 6. SEGURIDAD Y PERMISOS: RLS EN JEFES Y FEED DE COMBATE
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: DIRECTIVA DE SEGURIDAD (ROW LEVEL SECURITY - RLS)]
ALTER TABLE public.community_bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_boss_attacks ENABLE ROW LEVEL SECURITY;

-- [TIPO DE OBJETO: POLÍTICAS RLS (SECURITY POLICIES - SELECT PÚBLICO)]
-- ¿Para qué sirve? Permite que todos los participantes vean la barra de vida del Jefe y el feed en vivo.
DROP POLICY IF EXISTS "Jefes comunitarios visibles públicamente" ON public.community_bosses;
CREATE POLICY "Jefes comunitarios visibles públicamente"
    ON public.community_bosses FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Feed de combate visible públicamente" ON public.community_boss_attacks;
CREATE POLICY "Feed de combate visible públicamente"
    ON public.community_boss_attacks FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados registran eventos de combate" ON public.community_boss_attacks;
CREATE POLICY "Usuarios autenticados registran eventos de combate"
    ON public.community_boss_attacks FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);


-- ------------------------------------------------------------------------------
-- 7. SUSCRIPCIÓN EN TIEMPO REAL (WEBSOCKETS REALTIME)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PUBLICACIÓN REALTIME (SUPABASE REALTIME PUBLICATION)]
-- ¿Qué es? Canal de WebSockets para combate multijugador masivo.
-- ¿Para qué sirve? Transmite cada milisegundo los golpes asestados, curas y estado de victoria a todos los navegadores conectados.
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_bosses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_boss_attacks;



-- ==============================================================================
-- 📦 PASO 6: ARENA TEMPORAL (/fechas), CORTAFUEGOS (/bloqueador) Y BAÚL DE IDEAS (/ideas)
-- ==============================================================================
-- 🎯 PANTALLAS Y MÓDULOS DE USO EN EL FRONTEND:
-- • /fechas (Arena Temporal): Entregables inaplazables con fechas límite estrictas, cálculo de urgencia y pomodoros estimados.
-- • /bloqueador (Cortafuegos): Lista negra de sitios web distractores, interruptores de bloqueo y telemetría de intentos frenados.
-- • /ideas (Baúl de Ideas & Brain Dump): Captura instantánea de pensamientos durante el estudio y conversión a objetivo activo con 1 solo clic.
-- • Botón Flotante / Atajo Alt + I: Captura de ideas rápida desde cualquier vista de la plataforma.
--
-- Propósito:
-- Completar la suite de productividad con los 3 módulos auxiliares de enfoque:
-- 1. Arena Temporal (/fechas): Tareas con fechas límite estrictas (Deadlines) y cuenta atrás.
-- 2. Cortafuegos (/bloqueador): Lista negra de sitios web distractores y telemetría de bloqueos.
-- 3. Baúl de Ideas (/ideas): Brain Dump rápido para capturar pensamientos fugaces y convertirlos en objetivos.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA DE ARENA TEMPORAL (DEADLINES ESTRICTOS Y CUENTA ATRÁS)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? Registro de metas, proyectos y tareas con fechas de entrega inaplazables.
-- ¿Para qué sirve? Combate el sesgo del presente y la Ley de Parkinson calculando en tiempo real
-- la urgencia y el tiempo exacto restante (días, horas, minutos) antes del vencimiento.
CREATE TABLE IF NOT EXISTS public.temporal_deadlines (
    -- [COLUMNA: IDENTIFICADORES Y VINCULACIÓN]
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- [COLUMNAS: DETALLES DE LA META O ENTREGA]
    -- title: Título del entregable o proyecto (ej. 'Entrega del Reporte Trimestral').
    title TEXT NOT NULL,
    -- description: Alcance y especificaciones de la tarea.
    description TEXT DEFAULT NULL,
    -- deadline_at: Fecha y hora exacta (UTC) de vencimiento.
    deadline_at TIMESTAMPTZ NOT NULL,
    -- priority: Nivel de urgencia ('baja', 'media', 'alta', 'critica').
    priority VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'critica')),
    -- category: Área de la vida o trabajo ('trabajo', 'estudio', 'personal', 'proyecto').
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    
    -- [COLUMNAS: ESTADO Y POMODOROS ESTIMADOS]
    -- is_completed: Flag que indica si el entregable fue terminado antes o después del deadline.
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    -- completed_at: Marca de tiempo exacta en que se marcó como completado.
    completed_at TIMESTAMPTZ DEFAULT NULL,
    -- estimated_pomodoros: Cantidad de bloques de 25 min estimados para completar la tarea.
    estimated_pomodoros SMALLINT NOT NULL DEFAULT 4 CHECK (estimated_pomodoros >= 1),
    -- completed_pomodoros: Bloques de enfoque efectivamente invertidos en esta meta.
    completed_pomodoros SMALLINT NOT NULL DEFAULT 0 CHECK (completed_pomodoros >= 0),
    
    -- [COLUMNAS: AUDITORÍA TEMPORAL]
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- [TIPO DE OBJETO: ÍNDICE B-TREE (INDEX)]
-- ¿Para qué sirve? Permite ordenar cronológicamente las entregas más próximas y urgentes.
CREATE INDEX IF NOT EXISTS idx_temporal_deadlines_user_date ON public.temporal_deadlines(user_id, deadline_at ASC);
CREATE INDEX IF NOT EXISTS idx_temporal_deadlines_completed ON public.temporal_deadlines(user_id, is_completed);

-- [TIPO DE OBJETO: TRIGGER DE AUDITORÍA (TRIGGER)]
DROP TRIGGER IF EXISTS set_temporal_deadlines_updated_at ON public.temporal_deadlines;
CREATE TRIGGER set_temporal_deadlines_updated_at
    BEFORE UPDATE ON public.temporal_deadlines
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- ------------------------------------------------------------------------------
-- 2. TABLA DE CORTAFUEGOS Y SITIOS BLOQUEADOS (FIREWALL BLOCKED SITES)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? Lista de dominios distractores configurados por el usuario para bloqueo.
-- ¿Para qué sirve? Alimenta el escudo del navegador y registra cuántas veces se impidió caer en tentación.
CREATE TABLE IF NOT EXISTS public.firewall_blocked_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- [COLUMNA: DOMINIO A BLOQUEAR]
    -- domain: URL o dominio distractor (ej. 'youtube.com', 'x.com', 'instagram.com', 'reddit.com').
    domain TEXT NOT NULL,
    -- category: Clasificación del distractor ('redes_sociales', 'video_streaming', 'noticias', 'videojuegos', 'personalizado').
    category VARCHAR(50) NOT NULL DEFAULT 'redes_sociales',
    -- is_active: Interruptor para pausar o reactivar el bloqueo sin borrar el registro.
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- [COLUMNAS: TELEMETRÍA Y MÉTRICAS DE ESCUDO]
    -- blocked_attempts_count: Cantidad total de veces que el cortafuegos frenó al usuario.
    blocked_attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (blocked_attempts_count >= 0),
    -- last_blocked_at: Momento del intento de distracción más reciente.
    last_blocked_at TIMESTAMPTZ DEFAULT NULL,
    
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, domain)
);

-- [TIPO DE OBJETO: ÍNDICE B-TREE (INDEX)]
-- ¿Para qué sirve? Agiliza la validación instantánea del cortafuegos activo.
CREATE INDEX IF NOT EXISTS idx_firewall_user_domain ON public.firewall_blocked_sites(user_id, is_active);


-- ------------------------------------------------------------------------------
-- 3. TABLA DEL BAÚL DE IDEAS Y OBJETIVOS (BRAIN DUMP & TASK ACCUMULATOR)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? Depósito rápido de pensamientos fugaces capturados durante el hiperfoco y acumulador de tareas.
-- ¿Para qué sirve? Permite aparcar ideas al vuelo, organizarlas por prioridad ('alta', 'media', 'baja'),
-- registrar el tiempo total de concentración invertido sesión a sesión (dedicated_minutes),
-- y gestionar su ciclo de vida hasta marcarlas como completadas (is_completed) con filtrado y reapertura.
CREATE TABLE IF NOT EXISTS public.captured_ideas (
    -- [COLUMNA: IDENTIFICADORES Y VINCULACIÓN]
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- [COLUMNAS: CONTENIDO Y PRIORIDAD]
    -- content: Texto o pensamiento anotado (ej. 'Revisar presupuesto para el servidor').
    content TEXT NOT NULL,
    -- priority: Nivel de prioridad ('alta' | 'media' | 'baja').
    priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baja')),
    -- display_order: Orden personalizado en la lista.
    display_order INTEGER NOT NULL DEFAULT 1,
    
    -- [COLUMNAS: CONTROL DE TIEMPO DEDICADO Y CONVERSIÓN A ENFOQUE]
    -- dedicated_minutes: Minutos acumulados de concentración invertidos en este objetivo a lo largo de pomodoros.
    dedicated_minutes INTEGER NOT NULL DEFAULT 0 CHECK (dedicated_minutes >= 0),
    -- is_converted_to_objective: Flag para marcar si la idea fue seleccionada para una sala de enfoque.
    is_converted_to_objective BOOLEAN NOT NULL DEFAULT FALSE,
    -- converted_at: Momento exacto de la conversión.
    converted_at TIMESTAMPTZ DEFAULT NULL,
    
    -- [COLUMNAS: ESTADO DE COMPLETADO Y ARCHIVADO]
    -- is_completed: Flag que indica si la tarea fue finalizada con éxito (ocultándose del baúl activo).
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    -- completed_at: Marca de tiempo exacta en que fue marcada como completada.
    completed_at TIMESTAMPTZ DEFAULT NULL,
    
    -- [COLUMNAS: AUDITORÍA TEMPORAL]
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Asegurar que las columnas priority, dedicated_minutes, is_completed y completed_at existan en bases de datos existentes
ALTER TABLE public.captured_ideas ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'media';
ALTER TABLE public.captured_ideas ADD COLUMN IF NOT EXISTS dedicated_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.captured_ideas ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.captured_ideas ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- [TIPO DE OBJETO: ÍNDICES B-TREE (INDEXES)]
-- ¿Para qué sirven? Aceleran la carga de notas activas por fecha y el filtrado instantáneo por estado completado/pendiente.
CREATE INDEX IF NOT EXISTS idx_captured_ideas_user ON public.captured_ideas(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_captured_ideas_user_completed ON public.captured_ideas(user_id, is_completed, created_at DESC);


-- ------------------------------------------------------------------------------
-- 4. PROCEDIMIENTOS ALMACENADOS RPC (OPERACIONES TRANSACCIONALES)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PROCEDIMIENTO RPC PARA REGISTRAR INTENTO DE DISTRACCIÓN BLOQUEADO]
CREATE OR REPLACE FUNCTION public.register_firewall_block(p_domain TEXT)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_new_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    UPDATE public.firewall_blocked_sites
    SET 
        blocked_attempts_count = blocked_attempts_count + 1,
        last_blocked_at = TIMEZONE('utc'::text, NOW())
    WHERE user_id = v_user_id AND domain = p_domain
    RETURNING blocked_attempts_count INTO v_new_count;

    IF NOT FOUND THEN
        INSERT INTO public.firewall_blocked_sites (user_id, domain, blocked_attempts_count, last_blocked_at)
        VALUES (v_user_id, p_domain, 1, TIMEZONE('utc'::text, NOW()))
        RETURNING blocked_attempts_count INTO v_new_count;
    END IF;

    RETURN json_build_object('success', TRUE, 'domain', p_domain, 'blocked_count', v_new_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- [TIPO DE OBJETO: PROCEDIMIENTO RPC PARA CONVERTIR IDEA EN OBJETIVO ACTIVO]
CREATE OR REPLACE FUNCTION public.convert_idea_to_objective(p_idea_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_idea RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    UPDATE public.captured_ideas
    SET 
        is_converted_to_objective = TRUE,
        converted_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_idea_id AND user_id = v_user_id
    RETURNING * INTO v_idea;

    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'Idea no encontrada');
    END IF;

    RETURN json_build_object(
        'success', TRUE,
        'idea_id', v_idea.id,
        'objective_text', v_idea.content
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- [TIPO DE OBJETO: PROCEDIMIENTO RPC PARA ACUMULAR TIEMPO DEDICADO A UNA IDEA/OBJETIVO]
CREATE OR REPLACE FUNCTION public.add_dedicated_time_to_idea(p_idea_id UUID, p_minutes INTEGER)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_idea RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    UPDATE public.captured_ideas
    SET dedicated_minutes = GREATEST(0, dedicated_minutes + COALESCE(p_minutes, 0))
    WHERE id = p_idea_id AND user_id = v_user_id
    RETURNING * INTO v_idea;

    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'Idea no encontrada');
    END IF;

    RETURN json_build_object(
        'success', TRUE,
        'idea_id', v_idea.id,
        'dedicated_minutes', v_idea.dedicated_minutes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- [TIPO DE OBJETO: PROCEDIMIENTO RPC PARA MARCAR IDEA COMO COMPLETADA]
CREATE OR REPLACE FUNCTION public.complete_captured_idea(p_idea_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_idea RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    UPDATE public.captured_ideas
    SET 
        is_completed = TRUE,
        completed_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_idea_id AND user_id = v_user_id
    RETURNING * INTO v_idea;

    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'Idea no encontrada');
    END IF;

    RETURN json_build_object(
        'success', TRUE,
        'idea_id', v_idea.id,
        'is_completed', TRUE,
        'completed_at', v_idea.completed_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- [TIPO DE OBJETO: PROCEDIMIENTO RPC PARA REABRIR TAREA COMPLETADA]
CREATE OR REPLACE FUNCTION public.reactivate_captured_idea(p_idea_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_idea RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    UPDATE public.captured_ideas
    SET 
        is_completed = FALSE,
        completed_at = NULL
    WHERE id = p_idea_id AND user_id = v_user_id
    RETURNING * INTO v_idea;

    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'Idea no encontrada');
    END IF;

    RETURN json_build_object(
        'success', TRUE,
        'idea_id', v_idea.id,
        'is_completed', FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 5. SEGURIDAD Y PERMISOS: RLS EN ARENA TEMPORAL, CORTAFUEGOS Y BAÚL DE IDEAS
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: DIRECTIVAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)]
ALTER TABLE public.temporal_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firewall_blocked_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_ideas ENABLE ROW LEVEL SECURITY;

-- [TIPO DE OBJETO: POLÍTICAS RLS EN TEMPORAL_DEADLINES]
DROP POLICY IF EXISTS "Usuarios gestionan sus propios deadlines" ON public.temporal_deadlines;
CREATE POLICY "Usuarios gestionan sus propios deadlines"
    ON public.temporal_deadlines FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- [TIPO DE OBJETO: POLÍTICAS RLS EN FIREWALL_BLOCKED_SITES]
DROP POLICY IF EXISTS "Usuarios gestionan su lista de cortafuegos" ON public.firewall_blocked_sites;
CREATE POLICY "Usuarios gestionan su lista de cortafuegos"
    ON public.firewall_blocked_sites FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- [TIPO DE OBJETO: POLÍTICAS RLS EN CAPTURED_IDEAS]
DROP POLICY IF EXISTS "Usuarios gestionan su propio baúl de ideas" ON public.captured_ideas;
CREATE POLICY "Usuarios gestionan su propio baúl de ideas"
    ON public.captured_ideas FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 6. SUSCRIPCIÓN EN TIEMPO REAL (WEBSOCKETS REALTIME)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PUBLICACIÓN REALTIME (SUPABASE REALTIME PUBLICATION)]
ALTER PUBLICATION supabase_realtime ADD TABLE public.temporal_deadlines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.firewall_blocked_sites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.captured_ideas;


-- ==============================================================================
-- 📦 PASO 7: TELEMETRÍA GLOBAL, PODIO SEMANAL Y RÉCORDS EN VIVO (/home & /medallero)
-- ==============================================================================
-- 🎯 PANTALLAS Y MÓDULOS DE USO EN EL FRONTEND:
-- • /home (Pantalla Principal):
--   - Card 1 (Personas Enfocadas): Total de guerreros activos y stack dinámico de avatares en vivo.
--   - Card 3 (Desempeño de Hoy): Posición real del usuario (#rank), percentil de comunidad y monedas potenciales.
--   - Card 4 (Templo de Enfoque Colectivo): Conteo de objetivos completados hoy y nombres de compañeros en sala.
--   - Card 5 (Podio Semanal): Top 3 de guerreros por puntos de enfoque (1º, 2º, 3º lugar en hilera con medallas).
--   - Card 6 (Récords Históricos): Top 5 histórico de maestros con más pomodoros completados en la plataforma.
-- • /medallero: Tablas de clasificación histórica de la comunidad y podios conquistados.
--
-- Propósito:
-- Consolidar mediante un procedimiento RPC de alto rendimiento (get_community_home_dashboard)
-- todas las métricas agregadas en tiempo real para alimentar la pantalla principal (Home),
-- el podio semanal y los récords históricos de la comunidad en una sola llamada atómica.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROCEDIMIENTO RPC PARA TELEMETRÍA Y MÉTRICAS DEL HOME DASHBOARD
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PROCEDIMIENTO RPC / FUNCIÓN DE TELEMETRÍA GLOBAL (SECURITY DEFINER FUNCTION)]
-- ¿Qué es? Procedimiento almacenado que agrega y consolida todas las métricas en vivo para la pantalla principal (Home).
-- ¿Para qué sirve? Alimenta con una sola llamada eficiente y atómica:
--   1. Total de guerreros de la comunidad y sesiones completadas hoy.
--   2. Posición y percentil real del usuario autenticado en el ranking global.
--   3. Podio Semanal (Top 3 por puntos de enfoque / focus_points).
--   4. Récords Históricos (Top 5 por pomodoros acumulados / focus_tomatoes).
--   5. Lista de usuarios activos recientes con avatares para el carrusel de presencia en vivo.
CREATE OR REPLACE FUNCTION public.get_community_home_dashboard()
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_total_users INTEGER := 0;
    v_today_sessions INTEGER := 0;
    v_user_rank INTEGER := 1;
    v_podium JSON;
    v_top_records JSON;
    v_recent_avatars JSON;
BEGIN
    -- 1. Total de usuarios registrados en la comunidad
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;

    -- 2. Total de sesiones de enfoque completadas hoy
    SELECT COUNT(*) INTO v_today_sessions 
    FROM public.focus_sessions 
    WHERE status = 'completed' AND completed_at >= CURRENT_DATE;

    -- 3. Calcular posición exacta del usuario en el ranking global
    IF v_user_id IS NOT NULL THEN
        SELECT rank INTO v_user_rank FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY focus_points DESC, focus_tomatoes DESC, created_at ASC) as rank
            FROM public.profiles
        ) ranks
        WHERE id = v_user_id;
        
        IF v_user_rank IS NULL THEN
            v_user_rank := 1;
        END IF;
    END IF;

    -- 4. Podio Semanal: Top 3 usuarios por puntos de enfoque
    SELECT COALESCE(json_agg(p), '[]'::json) INTO v_podium FROM (
        SELECT id, username, selected_avatar, selected_theme, focus_points, focus_tomatoes, streak_days, podium_wins, gold_medals, silver_medals, bronze_medals
        FROM public.profiles
        ORDER BY focus_points DESC, focus_tomatoes DESC, created_at ASC
        LIMIT 3
    ) p;

    -- 5. Récords Históricos: Top 5 maestros del pomodoro
    SELECT COALESCE(json_agg(r), '[]'::json) INTO v_top_records FROM (
        SELECT id, username, selected_avatar, selected_theme, focus_tomatoes, focus_points, streak_days, podium_wins, gold_medals
        FROM public.profiles
        ORDER BY focus_tomatoes DESC, focus_points DESC, created_at ASC
        LIMIT 5
    ) r;

    -- 6. Usuarios recientes para presencia comunitaria en vivo
    SELECT COALESCE(json_agg(a), '[]'::json) INTO v_recent_avatars FROM (
        SELECT id, username, selected_avatar, selected_theme, focus_tomatoes, podium_wins
        FROM public.profiles
        ORDER BY last_focus_date DESC NULLS LAST, updated_at DESC
        LIMIT 6
    ) a;

    RETURN json_build_object(
        'success', TRUE,
        'total_users', v_total_users,
        'completed_today', v_today_sessions,
        'user_rank', COALESCE(v_user_rank, 1),
        'podium', v_podium,
        'top_records', v_top_records,
        'recent_avatars', v_recent_avatars
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 📦 PASO 8: SALÓN DE LA FAMA, MEDALLERO Y RÉCORDS HISTÓRICOS (/medallero)
-- ==============================================================================
-- 🎯 PANTALLAS Y MÓDULOS DE USO EN EL FRONTEND:
-- • /medallero (Vista de Récords & Salón de la Fama):
--   - Slider de 4 Récords Históricos Destacados:
--     * Récord 1: "Mejor Racha" (Usuario con mayor racha consecutiva de días de enfoque).
--     * Récord 2: "Sesiones de Concentración" (Usuario con más pomodoros completados).
--     * Récord 3: "El Magnate de Focus" (Usuario con más Pro Coins acumuladas).
--     * Récord 4: "Podios Conquistados" (Usuario con más victorias en podios comunitarios).
--   - 4 Pestañas de Tablas y Rankings de la Comunidad:
--     * Tab 'objectives': Ranking ordenado por puntos de enfoque (focus_points DESC).
--     * Tab 'pomodoros': Ranking ordenado por bloques de pomodoros completados (focus_tomatoes DESC).
--     * Tab 'streaks': Ranking ordenado por días de racha activa/máxima (longest_streak DESC).
--     * Tab 'boss': Ranking ordenado por daño total infligido al Jefe de Raid Comunitario (damage_dealt DESC).
--
-- Propósito:
-- Proporcionar un procedimiento almacenado seguro, atómico y optimizado (get_medallero_records_dashboard)
-- que calcula simultáneamente los líderes históricos de cada categoría y los 4 rankings competitivos
-- de la comunidad para renderizar la pantalla del Medallero sin realizar múltiples consultas dispersas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROCEDIMIENTO RPC PARA TELEMETRÍA DE RÉCORDS Y SALÓN DE LA FAMA
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PROCEDIMIENTO RPC / FUNCIÓN DE TELEMETRÍA GLOBAL (SECURITY DEFINER FUNCTION)]
-- ¿Qué es? Procedimiento almacenado que agrega las marcas históricas y rankings del medallero.
-- ¿Para qué sirve? Retorna en un solo objeto JSON:
--   1. records.best_streak: Datos del usuario con la racha más larga de la plataforma.
--   2. records.most_tomatoes: Datos del usuario con mayor cantidad de sesiones terminadas.
--   3. records.most_coins: Datos del usuario con mayor saldo histórico de Pro Coins.
--   4. records.most_podiums: Datos del usuario con más podios semanales conquistados.
--   5. rankings.objectives: Top 10 usuarios ordenados por puntos de honor y objetivos cumplidos.
--   6. rankings.pomodoros: Top 10 usuarios ordenados por pomodoros totales.
--   7. rankings.streaks: Top 10 usuarios ordenados por días de racha consecutiva.
--   8. rankings.boss: Top 10 guerreros con mayor daño histórico asestado a los jefes de raid.
CREATE OR REPLACE FUNCTION public.get_medallero_records_dashboard()
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_best_streak JSON;
    v_most_tomatoes JSON;
    v_most_coins JSON;
    v_most_podiums JSON;
    v_ranking_objectives JSON;
    v_ranking_pomodoros JSON;
    v_ranking_streaks JSON;
    v_ranking_boss JSON;
BEGIN
    -- 1. Récord Histórico: Mejor Racha
    SELECT json_build_object(
        'holder', username,
        'avatar', selected_avatar,
        'flag', COALESCE(LOWER(country_code), 'mx'),
        'streak', GREATEST(longest_streak, streak_days),
        'user_id', id
    ) INTO v_best_streak
    FROM public.profiles
    ORDER BY GREATEST(longest_streak, streak_days) DESC, created_at ASC
    LIMIT 1;

    -- 2. Récord Histórico: Más Sesiones de Concentración (Pomodoros)
    SELECT json_build_object(
        'holder', username,
        'avatar', selected_avatar,
        'flag', COALESCE(LOWER(country_code), 'mx'),
        'tomatoes', focus_tomatoes,
        'user_id', id
    ) INTO v_most_tomatoes
    FROM public.profiles
    ORDER BY focus_tomatoes DESC, created_at ASC
    LIMIT 1;

    -- 3. Récord Histórico: El Magnate de Focus (Pro Coins)
    SELECT json_build_object(
        'holder', username,
        'avatar', selected_avatar,
        'flag', COALESCE(LOWER(country_code), 'mx'),
        'coins', pro_coins,
        'user_id', id
    ) INTO v_most_coins
    FROM public.profiles
    ORDER BY pro_coins DESC, created_at ASC
    LIMIT 1;

    -- 4. Récord Histórico: Podios Conquistados
    SELECT json_build_object(
        'holder', username,
        'avatar', selected_avatar,
        'flag', COALESCE(LOWER(country_code), 'mx'),
        'podiums', podium_wins,
        'user_id', id
    ) INTO v_most_podiums
    FROM public.profiles
    ORDER BY podium_wins DESC, gold_medals DESC, created_at ASC
    LIMIT 1;

    -- 5. Ranking por Puntos de Enfoque y Objetivos (Top 10)
    SELECT COALESCE(json_agg(r), '[]'::json) INTO v_ranking_objectives FROM (
        SELECT id, username, selected_avatar, COALESCE(LOWER(country_code), 'mx') as country_code,
               focus_points, focus_tomatoes, podium_wins, streak_days
        FROM public.profiles
        ORDER BY focus_points DESC, created_at ASC
        LIMIT 10
    ) r;

    -- 6. Ranking por Pomodoros Completados (Top 10)
    SELECT COALESCE(json_agg(r), '[]'::json) INTO v_ranking_pomodoros FROM (
        SELECT id, username, selected_avatar, COALESCE(LOWER(country_code), 'mx') as country_code,
               focus_tomatoes, focus_points, streak_days
        FROM public.profiles
        ORDER BY focus_tomatoes DESC, created_at ASC
        LIMIT 10
    ) r;

    -- 7. Ranking por Rachas Consecutivas (Top 10)
    SELECT COALESCE(json_agg(r), '[]'::json) INTO v_ranking_streaks FROM (
        SELECT id, username, selected_avatar, COALESCE(LOWER(country_code), 'mx') as country_code,
               GREATEST(longest_streak, streak_days) as streak_count, streak_days
        FROM public.profiles
        ORDER BY GREATEST(longest_streak, streak_days) DESC, streak_days DESC, created_at ASC
        LIMIT 10
    ) r;

    -- 8. Ranking por Aporte y Daño a Villanos (Top 10)
    SELECT COALESCE(json_agg(b), '[]'::json) INTO v_ranking_boss FROM (
        SELECT 
            COALESCE(p.id::text, ba.user_name) as id,
            COALESCE(p.username, ba.user_name) as username,
            COALESCE(p.selected_avatar, ba.user_avatar, 'lobo') as selected_avatar,
            COALESCE(LOWER(p.country_code), 'mx') as country_code,
            SUM(ba.damage_dealt)::BIGINT as total_damage
        FROM public.community_boss_attacks ba
        LEFT JOIN public.profiles p ON p.id = ba.user_id
        WHERE ba.damage_dealt > 0
        GROUP BY p.id, p.username, p.selected_avatar, p.country_code, ba.user_name, ba.user_avatar
        ORDER BY total_damage DESC
        LIMIT 10
    ) b;

    RETURN json_build_object(
        'success', TRUE,
        'records', json_build_object(
            'best_streak', v_best_streak,
            'most_tomatoes', v_most_tomatoes,
            'most_coins', v_most_coins,
            'most_podiums', v_most_podiums
        ),
        'rankings', json_build_object(
            'objectives', v_ranking_objectives,
            'pomodoros', v_ranking_pomodoros,
            'streaks', v_ranking_streaks,
            'boss', v_ranking_boss
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 📦 PASO 9: MÉTRICAS INDIVIDUALES, RENDIMIENTO Y MAPA DE HÁBITOS (/estadisticas)
-- ==============================================================================
-- 🎯 PANTALLAS Y MÓDULOS DE USO EN EL FRONTEND:
-- • /estadisticas (Tu Avance de Enfoque):
--   - 4 Tarjetas KPI Principales:
--     * KPI 1: "Hoy" (Pomodoros completados hoy y horas/minutos de concentración pura).
--     * KPI 2: "Esta Semana" (Total de pomodoros de la semana y promedio diario).
--     * KPI 3: "Racha de Disciplina" (Días consecutivos activos del usuario).
--     * KPI 4: "Total Acumulado" (Sesiones históricas y total de horas enfocadas).
--   - Gráfico de Columnas: "Rendimiento de Esta Semana" (Desglose real Lun-Dom).
--   - Mapa de Calor / Calendario de Hábito: "Mapa de Hábitos" (Día por día del mes actual 1..31 con niveles de calor).
--   - Gráfico Anual: "Historial y Tendencia Anual" (12 meses Ene-Dic).
--   - Modal de Compartir Insignia en LinkedIn.
--
-- Propósito:
-- Agregar y calcular las métricas personales del usuario autenticado en base a sus sesiones
-- reales registradas en focus_sessions y su perfil en profiles.
-- Cuando un usuario nuevo se registra, sus métricas inician en 0 real y aumentan
-- progresivamente conforme completa pomodoros, eliminando datos simulados o ficticios.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROCEDIMIENTO RPC PARA TELEMETRÍA Y MÉTRICAS PERSONALES DEL USUARIO
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PROCEDIMIENTO RPC / FUNCIÓN DE TELEMETRÍA INDIVIDUAL (SECURITY DEFINER FUNCTION)]
-- ¿Qué es? Procedimiento almacenado para consultar las estadísticas completas del usuario autenticado.
-- ¿Para qué sirve? Agrega y estructura en un solo payload JSON:
--   1. Intentos de sesión del día actual con hora y estado.
--   2. Conteo y tiempo efectivo de enfoque de hoy.
--   3. Desglose diario de la semana en curso (Lunes a Domingo).
--   4. Mapa diario del mes actual para el calendario de constancia.
--   5. Desglose mensual del año actual (12 meses).
--   6. Racha activa, racha histórica máxima y total acumulado de pomodoros y horas.
CREATE OR REPLACE FUNCTION public.get_user_focus_statistics()
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_today DATE := CURRENT_DATE;
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

    -- 3. Intentos de hoy
    SELECT COALESCE(json_agg(json_build_object(
        'status', status::text,
        'time', to_char(completed_at AT TIME ZONE 'UTC', 'HH24:MI'),
        'duration_seconds', actual_duration_seconds
    ) ORDER BY completed_at ASC), '[]'::json) INTO v_today_attempts
    FROM public.focus_sessions
    WHERE user_id = v_user_id AND completed_at::date = v_today;

    -- 4. Métricas completadas hoy
    SELECT 
        COUNT(*),
        COALESCE(SUM(actual_duration_seconds), 0)
    INTO v_today_completed, v_today_focus_seconds
    FROM public.focus_sessions
    WHERE user_id = v_user_id AND status = 'completed' AND completed_at::date = v_today;

    -- 5. Métricas de la semana actual (Lunes a Domingo)
    v_week_start := date_trunc('week', v_today)::date;

    FOR v_rec IN 
        SELECT (completed_at::date - v_week_start) as day_offset, COUNT(*) as cnt
        FROM public.focus_sessions
        WHERE user_id = v_user_id 
          AND status = 'completed' 
          AND completed_at::date >= v_week_start 
          AND completed_at::date < v_week_start + INTERVAL '7 days'
        GROUP BY (completed_at::date - v_week_start)
    LOOP
        v_day_idx := v_rec.day_offset + 1;
        IF v_day_idx >= 1 AND v_day_idx <= 7 THEN
            v_weekly_by_day[v_day_idx] := v_rec.cnt;
        END IF;
    END LOOP;

    -- 6. Métricas del mes actual por día (1..31)
    SELECT COALESCE(json_object_agg(day_num, cnt), '{}'::json) INTO v_monthly_by_day FROM (
        SELECT EXTRACT(DAY FROM completed_at)::integer as day_num, COUNT(*) as cnt
        FROM public.focus_sessions
        WHERE user_id = v_user_id 
          AND status = 'completed' 
          AND date_trunc('month', completed_at)::date = date_trunc('month', v_today)::date
        GROUP BY EXTRACT(DAY FROM completed_at)::integer
    ) m;

    -- 7. Métricas del año actual por mes (1..12)
    FOR v_rec IN 
        SELECT EXTRACT(MONTH FROM completed_at)::integer as month_num, COUNT(*) as cnt
        FROM public.focus_sessions
        WHERE user_id = v_user_id 
          AND status = 'completed' 
          AND EXTRACT(YEAR FROM completed_at) = EXTRACT(YEAR FROM v_today)
        GROUP BY EXTRACT(MONTH FROM completed_at)::integer
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
        'total_focus_seconds', v_total_focus_seconds
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;







