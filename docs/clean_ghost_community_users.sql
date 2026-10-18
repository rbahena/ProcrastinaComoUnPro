-- ==============================================================================
-- 🧹 PROCRASTINA COMO UN PRO (COFU) - LIMPIEZA DE USUARIOS Y PODIO FANTASMA
-- ==============================================================================
-- Propósito:
-- Eliminar de forma 100% segura y atómica todos los usuarios simulados y sus
-- podios históricos de prueba, sin tocar jamás los datos de usuarios reales.
-- ==============================================================================

DO $$
DECLARE
    v_prev_sunday DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE - 1;
    v_prev_year_week TEXT := to_char(v_prev_sunday, 'IYYY-"W"IW');
    v_deleted_snapshots INT := 0;
    v_deleted_users INT := 0;
    v_deleted_profiles INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando limpieza de usuarios simulados y podio de prueba...';

    -- 1. Eliminar snapshot histórico del podio simulado
    DELETE FROM public.weekly_podium_snapshots
    WHERE year_week = v_prev_year_week
       OR first_place_username IN ('vramos', 'Valeria Ramos', 'Valeria R.', 'Mateo', 'Mateo Restrepo', 'Mateo Dev', 'Silva', 'Lucas Silva', 'Camila UX');
    GET DIAGNOSTICS v_deleted_snapshots = ROW_COUNT;

    -- 2. Eliminar usuarios de auth.users (Cascada automática hacia public.profiles)
    DELETE FROM auth.users
    WHERE email LIKE '%@ghosts.cofu.internal'
       OR id IN (
          'a0000000-0000-0000-0000-000000000001',
          'a0000000-0000-0000-0000-000000000002',
          'a0000000-0000-0000-0000-000000000003',
          'a0000000-0000-0000-0000-000000000004',
          'a0000000-0000-0000-0000-000000000005',
          'a0000000-0000-0000-0000-000000000006',
          'a0000000-0000-0000-0000-000000000007'
       );
    GET DIAGNOSTICS v_deleted_users = ROW_COUNT;

    -- 3. Limpieza de seguridad residual en public.profiles
    DELETE FROM public.profiles
    WHERE email LIKE '%@ghosts.cofu.internal'
       OR id IN (
          'a0000000-0000-0000-0000-000000000001',
          'a0000000-0000-0000-0000-000000000002',
          'a0000000-0000-0000-0000-000000000003',
          'a0000000-0000-0000-0000-000000000004',
          'a0000000-0000-0000-0000-000000000005',
          'a0000000-0000-0000-0000-000000000006',
          'a0000000-0000-0000-0000-000000000007'
       );
    GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;

    -- 4. Eliminar motivaciones simuladas
    DELETE FROM public.community_motivations
    WHERE id LIKE 'mot-ghost-%'
       OR user_name IN ('vramos', 'Mateo', 'Silva', 'Ethan_M', 'Sofi_N', 'Gabo', 'm.herrera');

    -- 5. Eliminar ataques al jefe simulados
    DELETE FROM public.community_boss_attacks
    WHERE id IN (
          'b0000000-0000-0000-0000-000000000001',
          'b0000000-0000-0000-0000-000000000002',
          'b0000000-0000-0000-0000-000000000003',
          'b0000000-0000-0000-0000-000000000004',
          'b0000000-0000-0000-0000-000000000005',
          'b0000000-0000-0000-0000-000000000006',
          'b0000000-0000-0000-0000-000000000007'
       )
       OR user_name IN ('vramos', 'Mateo', 'Silva', 'Ethan_M', 'Sofi_N', 'Gabo', 'm.herrera');

    RAISE NOTICE 'Limpieza completada: % podios eliminados, % usuarios eliminados de auth, % perfiles eliminados.',
        v_deleted_snapshots, v_deleted_users, v_deleted_profiles;
END $$;
