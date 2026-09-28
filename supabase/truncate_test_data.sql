-- ==============================================================================
-- 🛡️ PROCRASTINA COMO UN PRO (COFU)
-- SCRIPT DE LIMPIEZA / PURGA DE DATOS DE USUARIO Y PRUEBAS (DATABASE RESET)
-- Archivo: supabase/truncate_test_data.sql
-- ==============================================================================
-- Este script permite vaciar de forma segura, atómica y completa TODA la
-- información transaccional y personal de los usuarios, dejando intactos
-- únicamente los catálogos maestros del sistema.
--
-- ------------------------------------------------------------------------------
-- 📚 TABLAS QUE SE PRESERVAN INTACTAS (Catálogos y Lore del Sistema):
-- ------------------------------------------------------------------------------
-- [✓] public.catalog_items      -> Catálogo maestro de 30+ avatares, armas, temas y relojes.
-- [✓] public.master_qualities    -> Definición maestra de las 7 cualidades del Dojo.
-- [✓] public.community_bosses   -> Catálogo de jefes de Raid (solo se restaura su HP y escudo).
--
-- ------------------------------------------------------------------------------
-- 🗑️ TABLAS QUE SE PURGAN / TRUNCAN (Datos generados por usuarios):
-- ------------------------------------------------------------------------------
-- [x] public.captured_ideas          -> Baúl de ideas y pendientes de usuarios.
-- [x] public.focus_logs              -> Diario de notas, aprendizajes y distracciones.
-- [x] public.focus_sessions          -> Historial de sesiones pomodoro y tomates.
-- [x] public.community_boss_attacks  -> Historial de ataques y daño a los jefes.
-- [x] public.user_quality_progress   -> Progreso individual en el dojo de cualidades.
-- [x] public.user_unlocked_items     -> Inventario de compras y cosméticos desbloqueados.
-- [x] public.temporal_deadlines      -> Metas y fechas límite creadas por usuarios.
-- [x] public.firewall_blocked_sites  -> Sitios web bloqueados en el cortafuegos.
-- [x] public.profiles                -> Perfiles de usuario (preferencias, monedas, rachas).
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. PURGA COMPLETA DE TODAS LAS TABLAS DE USUARIOS (CASCADE)
-- ==============================================================================

-- A. Baúl de Ideas y Tareas Capturadas
TRUNCATE TABLE public.captured_ideas CASCADE;

-- B. Diario de Reflexiones y Registro de Distracciones
TRUNCATE TABLE public.focus_logs CASCADE;

-- C. Sesiones de Pomodoro y Métricas de Enfoque
TRUNCATE TABLE public.focus_sessions CASCADE;

-- D. Feed de Ataques y Daño al Jefe de la Comunidad
TRUNCATE TABLE public.community_boss_attacks CASCADE;

-- E. Progreso Individual de Cualidades del Dojo
TRUNCATE TABLE public.user_quality_progress CASCADE;

-- F. Inventario y Cosméticos Comprados por Usuarios
TRUNCATE TABLE public.user_unlocked_items CASCADE;

-- G. Fechas Límite y Metas Temporales
TRUNCATE TABLE public.temporal_deadlines CASCADE;

-- H. Sitios Web Bloqueados por el Firewall
TRUNCATE TABLE public.firewall_blocked_sites CASCADE;

-- I. Perfiles de Usuario (Preferencias de Enfoque, Monedas, Rachas, etc.)
TRUNCATE TABLE public.profiles CASCADE;


-- ==============================================================================
-- 2. RESTABLECER SALUD Y ESCUDO DE LOS JEFES COMUNITARIOS
-- ==============================================================================
-- Restablece la barra de vida completa y el escudo a los bosses del catálogo.

UPDATE public.community_bosses
SET 
    current_hp = max_hp,
    community_shield = max_community_shield,
    status = 'active',
    defeated_at = NULL,
    respawn_at = NULL,
    updated_at = NOW();


-- ==============================================================================
-- 3. (OPCIONAL) LIMPIEZA DE USUARIOS EN AUTH (SUPABASE AUTHENTICATION)
-- ==============================================================================
-- Si deseas también borrar las cuentas de correo/contraseña y logins de Google
-- para poder registrar los mismos correos desde cero, descomenta la siguiente línea:
--
-- DELETE FROM auth.users;

COMMIT;


-- ==============================================================================
-- 🧪 VERIFICACIÓN TRAS EJECUTAR EL SCRIPT:
-- ==============================================================================
-- Ejecuta estas consultas para confirmar que los catálogos siguen intactos
-- y que las tablas de usuario quedaron en 0:
--
-- SELECT 'catalog_items' AS tabla, COUNT(*) AS registros FROM public.catalog_items
-- UNION ALL
-- SELECT 'master_qualities', COUNT(*) FROM public.master_qualities
-- UNION ALL
-- SELECT 'community_bosses', COUNT(*) FROM public.community_bosses
-- UNION ALL
-- SELECT 'profiles', COUNT(*) FROM public.profiles
-- UNION ALL
-- SELECT 'focus_sessions', COUNT(*) FROM public.focus_sessions
-- UNION ALL
-- SELECT 'captured_ideas', COUNT(*) FROM public.captured_ideas;
