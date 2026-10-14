-- ==============================================================================
-- ACTUALIZACIÓN Y BALANCE DE AVATARES Y CUALIDADES MAESTRAS (COFU RPG)
-- ==============================================================================
-- Este script actualiza de forma atómica y segura las estadísticas de combate,
-- generación de Pro Coins, penalizaciones proporcionales de abandono y metas
-- calibradas de las 7 Cualidades Maestras sin borrar ni afectar datos de usuarios.
--
-- REGLAS APLICADAS:
-- 1. Multa por Abandono < Ganancia de Monedas (Rango entre 30% y 76%).
-- 2. Avatares con más monedas arriesgan la mayor penalización absoluta.
-- 3. Hámster y Perro protegen al principiante con riesgo reducido.
-- 4. Las 7 Cualidades amplían sus metas para evitar el grindeo en 1 solo día (5 a 10 días reales).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ACTUALIZAR ESTADÍSTICAS DE LOS 24 AVATARES EN public.catalog_items
-- ------------------------------------------------------------------------------

-- A. LOS 6 INICIALES (GRATUITOS)
UPDATE public.catalog_items
SET coins_per_pomodoro = 12, pause_penalty_coins = 8, boss_damage_points = 20, boss_heal_points = 10
WHERE id = 'gato';

UPDATE public.catalog_items
SET coins_per_pomodoro = 10, pause_penalty_coins = 4, boss_damage_points = 18, boss_heal_points = 5
WHERE id = 'perro';

UPDATE public.catalog_items
SET coins_per_pomodoro = 14, pause_penalty_coins = 9, boss_damage_points = 30, boss_heal_points = 12
WHERE id = 'conejo';

UPDATE public.catalog_items
SET coins_per_pomodoro = 16, pause_penalty_coins = 10, boss_damage_points = 12, boss_heal_points = 6
WHERE id = 'hamster';

UPDATE public.catalog_items
SET coins_per_pomodoro = 12, pause_penalty_coins = 8, boss_damage_points = 28, boss_heal_points = 15
WHERE id = 'loro';

UPDATE public.catalog_items
SET coins_per_pomodoro = 10, pause_penalty_coins = 6, boss_damage_points = 22, boss_heal_points = 8
WHERE id = 'raton';


-- B. LOS 7 GUARDIANES DE CUALIDAD / RETO (DESBLOQUEO POR MÉRITO)
UPDATE public.catalog_items
SET coins_per_pomodoro = 20, pause_penalty_coins = 8, boss_damage_points = 45, boss_heal_points = 15
WHERE id = 'tortuga';

UPDATE public.catalog_items
SET coins_per_pomodoro = 26, pause_penalty_coins = 10, boss_damage_points = 60, boss_heal_points = 20
WHERE id = 'tortuga_evolved';

UPDATE public.catalog_items
SET coins_per_pomodoro = 35, pause_penalty_coins = 14, boss_damage_points = 95, boss_heal_points = 30
WHERE id = 'tortuga_phase3';

UPDATE public.catalog_items
SET coins_per_pomodoro = 20, pause_penalty_coins = 14, boss_damage_points = 35, boss_heal_points = 14
WHERE id = 'hormiga';

UPDATE public.catalog_items
SET coins_per_pomodoro = 22, pause_penalty_coins = 15, boss_damage_points = 40, boss_heal_points = 25
WHERE id = 'buho';

UPDATE public.catalog_items
SET coins_per_pomodoro = 22, pause_penalty_coins = 16, boss_damage_points = 45, boss_heal_points = 35
WHERE id = 'rana';

UPDATE public.catalog_items
SET coins_per_pomodoro = 18, pause_penalty_coins = 12, boss_damage_points = 38, boss_heal_points = 12
WHERE id = 'aguila';

UPDATE public.catalog_items
SET coins_per_pomodoro = 20, pause_penalty_coins = 13, boss_damage_points = 36, boss_heal_points = 12
WHERE id = 'abeja';

UPDATE public.catalog_items
SET coins_per_pomodoro = 22, pause_penalty_coins = 15, boss_damage_points = 38, boss_heal_points = 14
WHERE id = 'castor';


-- C. LOS 8 GUARDIANES ÉPICOS DE LA TIENDA (COMPRABLES CON PRO COINS)
UPDATE public.catalog_items
SET coins_per_pomodoro = 35, pause_penalty_coins = 25, boss_damage_points = 48, boss_heal_points = 30
WHERE id = 'zorro';

UPDATE public.catalog_items
SET coins_per_pomodoro = 25, pause_penalty_coins = 16, boss_damage_points = 55, boss_heal_points = 20
WHERE id = 'lince';

UPDATE public.catalog_items
SET coins_per_pomodoro = 20, pause_penalty_coins = 6, boss_damage_points = 40, boss_heal_points = 10
WHERE id = 'panda';

UPDATE public.catalog_items
SET coins_per_pomodoro = 26, pause_penalty_coins = 17, boss_damage_points = 65, boss_heal_points = 24
WHERE id = 'oso';

UPDATE public.catalog_items
SET coins_per_pomodoro = 28, pause_penalty_coins = 18, boss_damage_points = 50, boss_heal_points = 22
WHERE id = 'elefante';

UPDATE public.catalog_items
SET coins_per_pomodoro = 30, pause_penalty_coins = 20, boss_damage_points = 58, boss_heal_points = 26
WHERE id = 'leon';

UPDATE public.catalog_items
SET coins_per_pomodoro = 32, pause_penalty_coins = 22, boss_damage_points = 52, boss_heal_points = 28
WHERE id = 'tigre';

UPDATE public.catalog_items
SET coins_per_pomodoro = 32, pause_penalty_coins = 22, boss_damage_points = 50, boss_heal_points = 30
WHERE id = 'lobo';


-- D. LAS 3 BESTIAS MÍTICAS / LEGENDARIAS (5 ESTRELLAS)
UPDATE public.catalog_items
SET coins_per_pomodoro = 50, pause_penalty_coins = 38, boss_damage_points = 140, boss_heal_points = 65
WHERE id = 'dragon';

UPDATE public.catalog_items
SET coins_per_pomodoro = 42, pause_penalty_coins = 28, boss_damage_points = 110, boss_heal_points = 40
WHERE id = 'fenix';

UPDATE public.catalog_items
SET coins_per_pomodoro = 60, pause_penalty_coins = 45, boss_damage_points = 125, boss_heal_points = 55
WHERE id = 'grifo';


-- ------------------------------------------------------------------------------
-- 2. ACTUALIZAR METAS Y REQUISITOS DE LAS 7 CUALIDADES MAESTRAS
-- ------------------------------------------------------------------------------

-- 1. Constancia (Tortuga): 10 días de racha consecutivos (mínimo 10 días reales)
UPDATE public.master_qualities
SET 
    target_total = 10,
    unlock_requirement = '{"es": "Mantener una racha de 10 días consecutivos completando al menos 1 pomodoro diario.", "en": "Maintain a 10-day consecutive streak completing at least 1 daily pomodoro."}'::jsonb
WHERE id = 'constancia';

-- 2. Disciplina (Hormiga): 35 pomodoros en total (5 a 7 días reales)
UPDATE public.master_qualities
SET 
    target_total = 35,
    unlock_requirement = '{"es": "Completar 35 pomodoros en total a lo largo de tu trayectoria.", "en": "Complete 35 total pomodoros across your journey."}'::jsonb
WHERE id = 'disciplina';

-- 3. Sabiduría (Búho): 15 pomodoros Pareto (5 a 8 días reales)
UPDATE public.master_qualities
SET 
    target_total = 15,
    unlock_requirement = '{"es": "Completar 15 pomodoros con la metodología Pareto (80/20) en tareas de alto impacto.", "en": "Complete 15 pomodoros using the Pareto (80/20) methodology on high-impact tasks."}'::jsonb
WHERE id = 'sabiduria';

-- 4. Superación (Rana): 12 pomodoros Sapo (6 a 12 días reales)
UPDATE public.master_qualities
SET 
    target_total = 12,
    unlock_requirement = '{"es": "Completar 12 pomodoros con la metodología Sapo/Rana y objetivo cumplido.", "en": "Complete 12 pomodoros using the Frog methodology and goal accomplished."}'::jsonb
WHERE id = 'superacion';

-- 5. Visión (Águila): 25 pomodoros Normal (5 a 7 días reales)
UPDATE public.master_qualities
SET 
    target_total = 25,
    unlock_requirement = '{"es": "Completar 25 pomodoros con la metodología Normal manteniendo el rumbo.", "en": "Complete 25 pomodoros using the Normal methodology staying on track."}'::jsonb
WHERE id = 'vision';

-- 6. Colaboración (Abeja): 15 sesiones de Coworking Comunitario (5 a 8 días reales)
UPDATE public.master_qualities
SET 
    target_total = 15,
    unlock_requirement = '{"es": "Participar en 15 sesiones de Coworking Comunitario en la sala compartida.", "en": "Participate in 15 community coworking sessions in the shared room."}'::jsonb
WHERE id = 'colaboracion';

-- 7. Construcción (Castor): 5 días diferentes con pomodoros encadenados (5 días reales)
UPDATE public.master_qualities
SET 
    target_total = 5,
    unlock_requirement = '{"es": "Completar 5 días diferentes logrando al menos 3 pomodoros encadenados para la misma meta.", "en": "Complete 5 different days achieving at least 3 chained pomodoros for the same goal."}'::jsonb
WHERE id = 'construccion';

COMMIT;

-- ==============================================================================
-- FIN DEL SCRIPT: Balance y Cualidades actualizadas exitosamente.
-- ==============================================================================
