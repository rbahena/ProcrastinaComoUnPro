-- ==============================================================================
-- 🛡️ PROCRASTINA COMO UN PRO (COFU) - ESQUEMA DE BASE DE DATOS EN SUPABASE
-- ==============================================================================
-- CONTROL DE PROGRESO DE MIGRACIONES:
-- [x] PASO 1: Autenticación & Perfiles de Usuario (Login y Registro) -> ACTIVO
-- [ ] PASO 2: Desbloqueables & Cosméticos (Avatares, Temas, Armas)
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
    username TEXT UNIQUE NOT NULL,
    profession TEXT DEFAULT 'Guerrero del Enfoque',
    country TEXT DEFAULT 'México',
    country_code VARCHAR(10) DEFAULT 'MX',
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

    -- Insertar fila en public.profiles
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
        'Desarrollador de Software',
        'México',
        'MX',
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
