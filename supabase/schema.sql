-- ==============================================================================
-- 🛡️ PROCRASTINA COMO UN PRO (COFU) - ESQUEMA DE BASE DE DATOS EN SUPABASE
-- ==============================================================================
-- Este archivo contiene la definición completa del esquema de PostgreSQL para
-- Supabase. Cada elemento incluye una etiqueta con su TIPO DE OBJETO DE BASE DE DATOS
-- (Tabla, Función, Trigger, Tipo ENUM, Política RLS, Índice, RPC, etc.),
-- qué representa y para qué sirve en la arquitectura de la aplicación.
--
-- CONTROL DE PROGRESO DE MIGRACIONES:
-- [x] PASO 1: Autenticación & Perfiles de Usuario (Login y Registro) -> COMPLETADO
-- [x] PASO 2: Desbloqueables & Cosméticos (Catálogo e Inventario N:M) -> COMPLETADO
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
-- estado de suscripción y palmarés competitivo de cada usuario registrado.
-- Se vincula de forma 1 a 1 con el esquema interno de autenticación de Supabase (auth.users).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONES BÁSICAS DE POSTGRESQL
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: EXTENSIÓN (EXTENSION)]
-- ¿Qué es? Módulo adicional que amplía las funciones nativas del motor PostgreSQL.
-- ¿Para qué sirve? Permite generar identificadores únicos universales (UUIDv4) en la base de datos.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- [TIPO DE OBJETO: EXTENSIÓN (EXTENSION)]
-- ¿Qué es? Módulo criptográfico para PostgreSQL.
-- ¿Para qué sirve? Provee funciones de hashing y generación de UUIDs aleatorios criptográficamente seguros (gen_random_uuid).
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
-- 3. TABLAS PRINCIPALES
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA (TABLE)]
-- ¿Qué es? La estructura principal de almacenamiento relacional (filas y columnas).
-- ¿Para qué sirve? Extiende la tabla auth.users de Supabase (relación 1:1). Almacena el perfil público,
-- personalización estética, telemetría de concentración, monedas ganadas, rachas y palmarés del usuario.
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
-- ¿Qué es? Disparador de eventos en la tabla auth.users.
-- ¿Para qué sirve? Invoca automáticamente handle_new_user_registration() inmediatamente después de que
-- un usuario completa su registro (INSERT) en Supabase Auth.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();


-- ------------------------------------------------------------------------------
-- 6. SEGURIDAD Y PERMISOS: SEGURIDAD A NIVEL DE FILA (RLS)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: DIRECTIVA DE SEGURIDAD (ROW LEVEL SECURITY - RLS)]
-- ¿Qué es? Mecanismo de control de acceso que filtra qué filas puede ver o modificar un usuario.
-- ¿Para qué sirve? Bloquea el acceso no autorizado por defecto a la tabla public.profiles.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - SELECT / LECTURA)]
-- ¿Qué es? Regla de consulta para la tabla profiles.
-- ¿Para qué sirve? Permite que cualquier usuario (autenticado o anónimo) pueda leer datos de perfiles,
-- lo cual es indispensable para renderizar el ranking comunitario, podios y perfiles públicos.
DROP POLICY IF EXISTS "Perfiles visibles públicamente" ON public.profiles;
CREATE POLICY "Perfiles visibles públicamente"
    ON public.profiles FOR SELECT
    USING (true);

-- [TIPO DE OBJETO: POLÍTICA RLS (SECURITY POLICY - UPDATE / MODIFICACIÓN)]
-- ¿Qué es? Regla de actualización para la tabla profiles.
-- ¿Para qué sirve? Garantiza que un usuario solo pueda modificar su propia información (auth.uid() = id),
-- evitando que modifique las monedas, avatar o datos de otros competidores.
DROP POLICY IF EXISTS "Los usuarios solo pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios solo pueden actualizar su propio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);


-- ------------------------------------------------------------------------------
-- 7. SUSCRIPCIÓN EN TIEMPO REAL (WEBSOCKETS)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: PUBLICACIÓN REALTIME (SUPABASE REALTIME PUBLICATION)]
-- ¿Qué es? Configuración de publicación para suscripciones en vivo vía WebSockets.
-- ¿Para qué sirve? Emite eventos en tiempo real hacia la aplicación web cuando cambie cualquier dato
-- de public.profiles (ej. al subir de nivel, ganar monedas o cambiar de tema).
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;



-- ==============================================================================
-- 📦 PASO 2: DESBLOQUEABLES, COSMÉTICOS E INVENTARIOS (RELACIÓN N:M)
-- ==============================================================================
-- Propósito:
-- Administrar el catálogo global de cosméticos (avatares, temas, armas y cronómetros)
-- y el inventario personal de cada usuario mediante una relación N:M (Muchos a Muchos),
-- con soporte para compras seguras con Pro Coins mediante RPC transaccional.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CATÁLOGO GLOBAL DE ARTÍCULOS
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA MAESTRA (MASTER CATALOG TABLE)]
-- ¿Qué es? Tabla estática que define todos los ítems cosméticos que existen en la plataforma.
-- ¿Para qué sirve? Centraliza la configuración de avatares, armas, temas y estilos de cronómetro con
-- sus precios en Pro Coins, iconos, descripciones y requisitos de cualidad maestra.
CREATE TABLE IF NOT EXISTS public.catalog_items (
    -- id: Identificador único tipo slug (ej. 'gato', 'katana_steel', 'cyberpunk', 'digital').
    id VARCHAR(50) PRIMARY KEY,
    -- category: Categoría del cosmético con restricción CHECK ('avatar', 'weapon', 'theme', 'timer').
    category VARCHAR(20) NOT NULL CHECK (category IN ('avatar', 'weapon', 'theme', 'timer')),
    -- name: Nombre descriptivo visible para el usuario en la tienda.
    name TEXT NOT NULL,
    -- description: Lore o descripción temática del cosmético.
    description TEXT,
    -- icon: Clase de icono (FontAwesome o Lucide) para renderizado en UI.
    icon TEXT,
    -- color: Código de color hexadecimal o CSS del artículo.
    color VARCHAR(20),
    -- cost_coins: Costo en Pro Coins para desbloquear el artículo (0 = gratuito o inicial).
    cost_coins INTEGER DEFAULT 0 CHECK (cost_coins >= 0),
    -- is_initial: Si es TRUE, el artículo se entrega gratis a todo usuario nuevo al registrarse.
    is_initial BOOLEAN DEFAULT FALSE,
    -- required_quality_id: Cualidad maestra previa requerida para poder comprar el ítem (opcional).
    required_quality_id VARCHAR(50),
    -- created_at: Marca de tiempo de registro del cosmético.
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ------------------------------------------------------------------------------
-- 2. TABLA DE INVENTARIO DE USUARIOS (RELACIÓN N:M)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: TABLA INTERMEDIA O DE UNIÓN (JUNCTION TABLE / N:M RELATION)]
-- ¿Qué es? Tabla relacional que conecta usuarios con cosméticos (un usuario tiene muchos cosméticos y un cosmético pertenece a muchos usuarios).
-- ¿Para qué sirve? Representa el casillero / inventario personal de artículos que cada usuario ha desbloqueado o comprado.
CREATE TABLE IF NOT EXISTS public.user_unlocked_items (
    -- id: Identificador único del registro de posesión.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- user_id: Referencia de llave foránea a public.profiles(id) con borrado en cascada.
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- item_id: Referencia de llave foránea a public.catalog_items(id) con borrado en cascada.
    item_id VARCHAR(50) NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    -- unlocked_at: Fecha y hora exacta en la que se adquirió el ítem.
    unlocked_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    -- [RESTRICCIÓN DE UNICIDAD (UNIQUE CONSTRAINT)]
    -- Evita duplicados: Un usuario no puede tener el mismo cosmético dos veces en su inventario.
    UNIQUE(user_id, item_id)
);

-- [TIPO DE OBJETO: ÍNDICE DE BASE DE DATOS (INDEX - B-TREE)]
-- ¿Qué es? Estructura de búsqueda rápida en disco para PostgreSQL.
-- ¿Para qué sirve? Acelera drásticamente la carga del casillero e inventario completo de un usuario.
CREATE INDEX IF NOT EXISTS idx_user_unlocked_items_user ON public.user_unlocked_items(user_id);

-- [TIPO DE OBJETO: ÍNDICE DE BASE DE DATOS (INDEX - B-TREE)]
-- ¿Qué es? Estructura de búsqueda rápida para referencias de ítems.
-- ¿Para qué sirve? Acelera consultas analíticas de popularidad y uso de cada cosmético en la plataforma.
CREATE INDEX IF NOT EXISTS idx_user_unlocked_items_item ON public.user_unlocked_items(item_id);


-- ------------------------------------------------------------------------------
-- 3. SEMILLA DE DATOS (SEED DATA / SENTENCIA UPSERT)
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: SENTENCIA DML DE INSERCIÓN IDEMPOTENTE (SEED DATA / UPSERT)]
-- ¿Qué es? Carga inicial de datos que pobla la tabla catalog_items.
-- ¿Para qué sirve? Llena el catálogo con todos los avatares, temas, cronómetros y armas disponibles.
-- La cláusula ON CONFLICT (id) DO UPDATE asegura que se puedan actualizar nombres o costos sin generar errores ni duplicados.
INSERT INTO public.catalog_items (id, category, name, description, icon, color, cost_coins, is_initial, required_quality_id) VALUES
    -- 🐱 AVATARES INICIALES (Gratuitos para todo nuevo usuario)
    ('gato', 'avatar', 'Gato Lancero', 'Veloz y ágil en sesiones cortas', 'fa-cat', '#10b981', 0, TRUE, NULL),
    ('perro', 'avatar', 'Perro Guardián', 'Leal y protector de tus metas', 'fa-dog', '#3a86f0', 0, TRUE, NULL),
    ('conejo', 'avatar', 'Conejo Ágil', 'Especialista en ráfagas de concentración', 'fa-rabbit', '#9ca3af', 0, TRUE, NULL),
    ('loro', 'avatar', 'Loro Alado', 'Explorador de nuevas ideas', 'fa-dove', '#fbbf24', 0, TRUE, NULL),
    ('hamster', 'avatar', 'Hámster Veloz', 'Energía inagotable para sprints', 'fa-paw', '#f97316', 0, TRUE, NULL),
    ('raton', 'avatar', 'Ratón Astuto', 'Capacidad táctica ante la distracción', 'fa-paw', '#ec4899', 0, TRUE, NULL),

    -- 🏆 AVATARES DE CUALIDADES MAESTRAS (Vinculados a retos o compra tras dominar la cualidad)
    ('tortuga', 'avatar', 'Tortuga de la Constancia', 'Encarna la cualidad de la constancia (Racha de 7 días)', 'fa-turtle', '#22c55e', 150, FALSE, 'constancia'),
    ('hormiga', 'avatar', 'Hormiga de la Disciplina', 'Encarna la disciplina inquebrantable (15 pomodoros)', 'fa-bug', '#78350f', 150, FALSE, 'disciplina'),
    ('buho', 'avatar', 'Búho de la Sabiduría', 'Estratega del enfoque con metodología Pareto', 'fa-owl', '#6366f1', 200, FALSE, 'sabiduria'),
    ('rana', 'avatar', 'Rana de la Superación', 'Vencedor del sapo diario en pomodoros difíciles', 'fa-frog', '#22c55e', 200, FALSE, 'superacion'),
    ('aguila', 'avatar', 'Águila de la Visión', 'Enfoque panorámico y claridad de objetivos', 'fa-dove', '#3b82f6', 200, FALSE, 'vision'),
    ('abeja', 'avatar', 'Abeja de la Colaboración', 'Poder del trabajo comunitario y acompañado', 'fa-bee', '#eab308', 200, FALSE, 'colaboracion'),
    ('castor', 'avatar', 'Castor de la Construcción', 'Construcción tenaz de proyectos largos', 'fa-paw', '#b45309', 200, FALSE, 'construccion'),

    -- 👑 AVATARES ÉPICOS Y LEGENDARIOS (Comprables en la tienda con Pro Coins)
    ('zorro', 'avatar', 'Zorro Ninja', 'Sigiloso contra las tentaciones digitales', 'fa-paw', '#f97316', 300, FALSE, NULL),
    ('lince', 'avatar', 'Lince Explorador', 'Visión aguda en objetivos complejos', 'fa-paw', '#a855f7', 350, FALSE, NULL),
    ('panda', 'avatar', 'Panda Zen', 'Serenidad total en medio del caos', 'fa-paw', '#6b7280', 400, FALSE, NULL),
    ('oso', 'avatar', 'Oso Fuerte', 'Resistencia brutal en sesiones maratónicas', 'fa-paw', '#78350f', 450, FALSE, NULL),
    ('elefante', 'avatar', 'Elefante Sabio', 'Memoria de hierro y perseverancia', 'fa-paw', '#6b7280', 500, FALSE, NULL),
    ('leon', 'avatar', 'León Shogun', 'Liderazgo absoluto en la arena comunitaria', 'fa-paw', '#fbbf24', 600, FALSE, NULL),
    ('tigre', 'avatar', 'Tigre Feroz', 'Ataque implacable contra la procrastinación', 'fa-paw', '#f97316', 700, FALSE, NULL),
    ('lobo', 'avatar', 'Lobo Samurái', 'Honor, manada y enfoque solitario letal', 'fa-paw', '#ef4444', 800, FALSE, NULL),
    ('dragon', 'avatar', 'Dragón del Ego', 'Dominio supremo de la mente y las distracciones', 'fa-dragon', '#d946ef', 1200, FALSE, NULL),
    ('fenix', 'avatar', 'Fénix Inmortal', 'Renace de cada racha rota con más fuerza', 'fa-fire', '#f97316', 1500, FALSE, NULL),
    ('grifo', 'avatar', 'Grifo Celestial', 'Guardián supremo de la productividad legendaria', 'fa-crow', '#eab308', 2000, FALSE, NULL),

    -- 🎨 TEMAS VISUALES DE LA APLICACIÓN
    ('samurai', 'theme', 'Tema Samurái', 'Estilo clásico del camino del guerrero', 'fa-sun', '#10b981', 0, TRUE, NULL),
    ('cyberpunk', 'theme', 'Tema Cyberpunk', 'Neón, hologramas y energía futurista', 'fa-bolt', '#ec4899', 250, FALSE, NULL),
    ('aurora', 'theme', 'Tema Aurora', 'Gradientes boreales relajantes y modernos', 'fa-moon', '#8b5cf6', 250, FALSE, NULL),
    ('zen', 'theme', 'Tema Zen', 'Minimalismo absoluto y tranquilidad', 'fa-leaf', '#14b8a6', 250, FALSE, NULL),

    -- ⏱️ ESTILOS VISUALES DEL CRONÓMETRO
    ('digital', 'timer', 'Cronómetro Digital', 'Reloj digital nítido clásico', 'fa-clock', '#3a86f0', 0, TRUE, NULL),
    ('ring', 'timer', 'Cronómetro de Anillo', 'Círculo de progreso continuo', 'fa-circle-notch', '#10b981', 100, FALSE, NULL),
    ('line', 'timer', 'Cronómetro de Barra', 'Línea de progreso horizontal minimalista', 'fa-minus', '#fbbf24', 100, FALSE, NULL),

    -- ⚔️ ARMAS Y COMPAÑEROS VISUALES
    ('katana_wood', 'weapon', 'Katana de Madera (Bokken)', 'El arma de entrenamiento de todo novicio', 'fa-shield', '#10b981', 0, TRUE, NULL),
    ('katana_steel', 'weapon', 'Katana de Acero Templado', 'Filo agudo para cortar cualquier procrastinación', 'fa-shield-halved', '#3b82f6', 300, FALSE, NULL),
    ('lance_silver', 'weapon', 'Lanza Plateada', 'Alcance extendido para metas de largo plazo', 'fa-wand-magic-sparkles', '#a855f7', 500, FALSE, NULL),
    ('shadow_blade', 'weapon', 'Hoja de las Sombras', 'Arma legendaria forjada en la máxima concentración', 'fa-skull', '#ef4444', 1000, FALSE, NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    cost_coins = EXCLUDED.cost_coins,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_initial = EXCLUDED.is_initial,
    required_quality_id = EXCLUDED.required_quality_id;


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
    INSERT INTO public.user_unlocked_items (user_id, item_id)
    SELECT NEW.id, id
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
    SELECT * INTO v_item FROM public.catalog_items WHERE id = p_item_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'El cosmético no existe');
    END IF;

    -- 3. Verificar si el usuario ya posee el cosmético
    IF EXISTS (SELECT 1 FROM public.user_unlocked_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
        RETURN json_build_object('success', TRUE, 'message', 'Ya posees este cosmético');
    END IF;

    -- 4. Obtener monedas y bloquear fila para evitar condiciones de carrera
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
    INSERT INTO public.user_unlocked_items (user_id, item_id)
    VALUES (v_user_id, p_item_id);

    -- 7. Respuesta exitosa con telemetría de saldo
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
    USING (true);

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
-- 8. MIGRACIÓN DE DATOS Y RETROCOMPATIBILIDAD
-- ------------------------------------------------------------------------------

-- [TIPO DE OBJETO: SENTENCIA DML DE MIGRACIÓN (CROSS JOIN INSERT CON IDEMPOTENCIA)]
-- ¿Qué es? Una sentencia SQL que cruza todos los perfiles existentes con todos los ítems iniciales gratuitos.
-- ¿Para qué sirve? Si ya existían usuarios registrados antes de ejecutar este script, les entrega retroactivamente
-- todos los artículos gratuitos iniciales sin generar duplicados (ON CONFLICT DO NOTHING).
INSERT INTO public.user_unlocked_items (user_id, item_id)
SELECT p.id, c.id
FROM public.profiles p
CROSS JOIN public.catalog_items c
WHERE c.is_initial = TRUE
ON CONFLICT (user_id, item_id) DO NOTHING;
