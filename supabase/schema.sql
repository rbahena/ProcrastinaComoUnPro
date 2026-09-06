-- ==============================================================================
-- 🛡️ PROCRASTINA COMO UN PRO (COFU) - ESQUEMA DE BASE DE DATOS EN SUPABASE
-- ==============================================================================
-- CONTROL DE PROGRESO DE MIGRACIONES:
-- [x] PASO 1: Autenticación & Perfiles de Usuario (Login y Registro) -> COMPLETADO
-- [x] PASO 2: Desbloqueables & Cosméticos (Catálogo e Inventario N:M) -> ACTIVO
-- [ ] PASO 3: Catálogo y Progreso de Cualidades Maestras
-- [ ] PASO 4: Sesiones de Enfoque, Bitácora & Blindaje Anti-Exploits
-- [ ] PASO 5: Jefes de Raid Comunitarios & WebSockets Realtime
-- [ ] PASO 6: Arena Temporal (/fechas), Cortafuegos (/bloqueador) y Baúl de Ideas
-- ==============================================================================

-- ==============================================================================
-- 📦 PASO 1: AUTENTICACIÓN Y PERFILES DE USUARIO
-- ==============================================================================
-- Este bloque crea la infraestructura de usuarios vinculada a Supabase Auth.
-- Ejecutar en el SQL Editor de tu proyecto Supabase.
-- ==============================================================================

-- 1. EXTENSIONES BÁSICAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUM PARA EL PERFIL
DO $$ BEGIN
    CREATE TYPE user_theme_enum AS ENUM ('samurai', 'cyberpunk', 'aurora', 'zen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA: public.profiles (Extensión 1 a 1 de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    profession TEXT DEFAULT NULL,
    country TEXT DEFAULT NULL,
    country_code VARCHAR(10) DEFAULT NULL,
    active_days INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5], -- 1: Lun, 2: Mar, ..., 7: Dom
    
    -- Configuración estética inicial
    selected_avatar VARCHAR(50) DEFAULT 'gato',
    selected_theme user_theme_enum DEFAULT 'samurai',
    selected_weapon VARCHAR(50) DEFAULT 'katana_wood',
    
    -- Estado de cuenta y Onboarding
    is_premium BOOLEAN DEFAULT FALSE,
    premium_until TIMESTAMPTZ,
    stripe_customer_id TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    
    -- Billetera y Telemetría básica inicial
    pro_coins BIGINT DEFAULT 0 CHECK (pro_coins >= 0),
    focus_points BIGINT DEFAULT 0 CHECK (focus_points >= 0),
    focus_tomatoes INTEGER DEFAULT 0 CHECK (focus_tomatoes >= 0),
    streak_days INTEGER DEFAULT 0 CHECK (streak_days >= 0),
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
    last_focus_date DATE,
    
    -- Palmarés
    podium_wins INTEGER DEFAULT 0 CHECK (podium_wins >= 0),
    gold_medals INTEGER DEFAULT 0 CHECK (gold_medals >= 0),
    silver_medals INTEGER DEFAULT 0 CHECK (silver_medals >= 0),
    bronze_medals INTEGER DEFAULT 0 CHECK (bronze_medals >= 0),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TRIGGER: Actualización automática de updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 5. TRIGGER: Creación automática de Perfil al registrarse en Supabase Auth
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

    -- Insertar fila en public.profiles (sin profesión ni país preestablecidos)
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

-- Enlazar trigger a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

-- 6. POLÍTICAS DE SEGURIDAD (ROW-LEVEL SECURITY - RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6.1 Lectura pública (Permite mostrar perfiles y rankings en la comunidad)
DROP POLICY IF EXISTS "Perfiles visibles públicamente" ON public.profiles;
CREATE POLICY "Perfiles visibles públicamente"
    ON public.profiles FOR SELECT
    USING (true);

-- 6.2 Modificación restringida (Solo el propio usuario puede editar sus datos)
DROP POLICY IF EXISTS "Los usuarios solo pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios solo pueden actualizar su propio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 7. SUSCRIPCIÓN EN TIEMPO REAL (Opcional para profiles)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ==============================================================================
-- 📦 PASO 2: DESBLOQUEABLES, COSMÉTICOS E INVENTARIOS (RELACIÓN N:M)
-- ==============================================================================

-- 1. TABLA: public.catalog_items (Catálogo Maestro de Cosméticos)
CREATE TABLE IF NOT EXISTS public.catalog_items (
    id VARCHAR(50) PRIMARY KEY, -- 'gato', 'katana_wood', 'cyberpunk', 'digital', etc.
    category VARCHAR(20) NOT NULL CHECK (category IN ('avatar', 'weapon', 'theme', 'timer')),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color VARCHAR(20),
    cost_coins INTEGER DEFAULT 0 CHECK (cost_coins >= 0),
    is_initial BOOLEAN DEFAULT FALSE,
    required_quality_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABLA: public.user_unlocked_items (Inventario N:M de cada Usuario)
CREATE TABLE IF NOT EXISTS public.user_unlocked_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_unlocked_items_user ON public.user_unlocked_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_items_item ON public.user_unlocked_items(item_id);

-- 3. SEMILLA DE DATOS DEL CATÁLOGO MAESTRO (Upsert seguro)
INSERT INTO public.catalog_items (id, category, name, description, icon, color, cost_coins, is_initial, required_quality_id) VALUES
    -- Avatares Iniciales (Gratis)
    ('gato', 'avatar', 'Gato Lancero', 'Veloz y ágil en sesiones cortas', 'fa-cat', '#10b981', 0, TRUE, NULL),
    ('perro', 'avatar', 'Perro Guardián', 'Leal y protector de tus metas', 'fa-dog', '#3a86f0', 0, TRUE, NULL),
    ('conejo', 'avatar', 'Conejo Ágil', 'Especialista en ráfagas de concentración', 'fa-rabbit', '#9ca3af', 0, TRUE, NULL),
    ('loro', 'avatar', 'Loro Alado', 'Explorador de nuevas ideas', 'fa-dove', '#fbbf24', 0, TRUE, NULL),
    ('hamster', 'avatar', 'Hámster Veloz', 'Energía inagotable para sprints', 'fa-paw', '#f97316', 0, TRUE, NULL),
    ('raton', 'avatar', 'Ratón Astuto', 'Capacidad táctica ante la distracción', 'fa-paw', '#ec4899', 0, TRUE, NULL),

    -- Avatares de Cualidades Maestras (Se desbloquean por reto o monedas)
    ('tortuga', 'avatar', 'Tortuga de la Constancia', 'Encarna la cualidad de la constancia (Racha de 7 días)', 'fa-turtle', '#22c55e', 150, FALSE, 'constancia'),
    ('hormiga', 'avatar', 'Hormiga de la Disciplina', 'Encarna la disciplina inquebrantable (15 pomodoros)', 'fa-bug', '#78350f', 150, FALSE, 'disciplina'),
    ('buho', 'avatar', 'Búho de la Sabiduría', 'Estratega del enfoque con metodología Pareto', 'fa-owl', '#6366f1', 200, FALSE, 'sabiduria'),
    ('rana', 'avatar', 'Rana de la Superación', 'Vencedor del sapo diario en pomodoros difíciles', 'fa-frog', '#22c55e', 200, FALSE, 'superacion'),
    ('aguila', 'avatar', 'Águila de la Visión', 'Enfoque panorámico y claridad de objetivos', 'fa-dove', '#3b82f6', 200, FALSE, 'vision'),
    ('abeja', 'avatar', 'Abeja de la Colaboración', 'Poder del trabajo comunitario y acompañado', 'fa-bee', '#eab308', 200, FALSE, 'colaboracion'),
    ('castor', 'avatar', 'Castor de la Construcción', 'Construcción tenaz de proyectos largos', 'fa-paw', '#b45309', 200, FALSE, 'construccion'),

    -- Avatares Épicos y Legendarios
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

    -- Temas Visuales
    ('samurai', 'theme', 'Tema Samurái', 'Estilo clásico del camino del guerrero', 'fa-sun', '#10b981', 0, TRUE, NULL),
    ('cyberpunk', 'theme', 'Tema Cyberpunk', 'Neón, hologramas y energía futurista', 'fa-bolt', '#ec4899', 250, FALSE, NULL),
    ('aurora', 'theme', 'Tema Aurora', 'Gradientes boreales relajantes y modernos', 'fa-moon', '#8b5cf6', 250, FALSE, NULL),
    ('zen', 'theme', 'Tema Zen', 'Minimalismo absoluto y tranquilidad', 'fa-leaf', '#14b8a6', 250, FALSE, NULL),

    -- Estilos de Cronómetro
    ('digital', 'timer', 'Cronómetro Digital', 'Reloj digital nítido clásico', 'fa-clock', '#3a86f0', 0, TRUE, NULL),
    ('ring', 'timer', 'Cronómetro de Anillo', 'Círculo de progreso continuo', 'fa-circle-notch', '#10b981', 100, FALSE, NULL),
    ('line', 'timer', 'Cronómetro de Barra', 'Línea de progreso horizontal minimalista', 'fa-minus', '#fbbf24', 100, FALSE, NULL),

    -- Armas
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

-- 4. TRIGGER: Asignar cosméticos iniciales al crear usuario
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

DROP TRIGGER IF EXISTS on_profile_created_grant_initials ON public.profiles;
CREATE TRIGGER on_profile_created_grant_initials
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_initial_user_inventory();

-- 5. PROCEDIMIENTO RPC SEGURO: Comprar cosmético con Pro Coins
CREATE OR REPLACE FUNCTION public.buy_catalog_item(p_item_id VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_item RECORD;
    v_user_coins BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    -- Obtener item del catálogo
    SELECT * INTO v_item FROM public.catalog_items WHERE id = p_item_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'El cosmético no existe');
    END IF;

    -- Verificar si ya lo tiene desbloqueado
    IF EXISTS (SELECT 1 FROM public.user_unlocked_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
        RETURN json_build_object('success', TRUE, 'message', 'Ya posees este cosmético');
    END IF;

    -- Obtener monedas del usuario
    SELECT pro_coins INTO v_user_coins FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    
    IF v_user_coins < v_item.cost_coins THEN
        RETURN json_build_object('success', FALSE, 'error', 'Monedas insuficientes');
    END IF;

    -- Descontar monedas
    UPDATE public.profiles
    SET pro_coins = pro_coins - v_item.cost_coins
    WHERE id = v_user_id;

    -- Insertar en inventario
    INSERT INTO public.user_unlocked_items (user_id, item_id)
    VALUES (v_user_id, p_item_id);

    RETURN json_build_object(
        'success', TRUE,
        'item_id', p_item_id,
        'cost', v_item.cost_coins,
        'remaining_coins', v_user_coins - v_item.cost_coins
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_items ENABLE ROW LEVEL SECURITY;

-- Catálogo: Lectura pública para todos
DROP POLICY IF EXISTS "Catálogo visible públicamente" ON public.catalog_items;
CREATE POLICY "Catálogo visible públicamente"
    ON public.catalog_items FOR SELECT
    USING (true);

-- Inventario: Lectura pública (para poder ver perfiles completos de otros)
DROP POLICY IF EXISTS "Inventarios visibles públicamente" ON public.user_unlocked_items;
CREATE POLICY "Inventarios visibles públicamente"
    ON public.user_unlocked_items FOR SELECT
    USING (true);

-- Inventario: Inserción solo mediante el propio usuario o trigger
DROP POLICY IF EXISTS "Usuarios desbloquean sus propios items" ON public.user_unlocked_items;
CREATE POLICY "Usuarios desbloquean sus propios items"
    ON public.user_unlocked_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 7. SUSCRIPCIÓN EN TIEMPO REAL
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_unlocked_items;

