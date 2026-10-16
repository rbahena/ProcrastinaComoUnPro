-- ==============================================================================
-- 🕹️ COFU LOUNGE: CATÁLOGO DE MINIJUEGOS ARCADE Y MONETIZACIÓN (FREE / COINS / PRO)
-- ==============================================================================
-- Este script realiza las siguientes acciones de forma atómica e idempotente:
-- 1. Actualiza el CHECK constraint de 'category' en public.catalog_items para admitir 'game'.
-- 2. Asegura que los 9 minijuegos tengan CERO recompensas RPG (0 monedas, 0 penalización, 0 daño boss, 0 curación).
-- 3. Inserta o actualiza los 9 minijuegos en public.catalog_items con sus respectivas categorías:
--    - GRATIS / INICIALES: gato, snake, memory
--    - CON PRO COINS: flappy (150), breaker (200), space (250)
--    - EXCLUSIVOS PRO (VIP): dodge, tetris, samurai
-- NOTA: Se usa jsonb_build_object() para prevenir errores 22P02 por caracteres 0x0d (\r) de Windows.
-- ==============================================================================

BEGIN;

-- 1. Asegurar que la columna 'category' acepte la categoría 'game'
ALTER TABLE public.catalog_items 
    DROP CONSTRAINT IF EXISTS catalog_items_category_check;

ALTER TABLE public.catalog_items 
    ADD CONSTRAINT catalog_items_category_check 
    CHECK (category IN ('avatar', 'weapon', 'theme', 'timer', 'game'));

-- 2. Insertar o actualizar los 9 minijuegos del Break Lounge garantizando 0 recompensas RPG
INSERT INTO public.catalog_items (
    id,
    category,
    tier,
    stars,
    emoji,
    color,
    cost_coins,
    is_initial,
    is_premium,
    coins_per_pomodoro,
    pause_penalty_coins,
    boss_damage_points,
    boss_heal_points,
    name,
    description,
    is_active
) VALUES
-- ==========================================
-- A. MINIJUEGOS GRATIS / INICIALES (3)
-- ==========================================
(
    'gato',
    'game',
    'Común',
    1,
    '⚔️',
    '#10b981',
    0,
    TRUE,
    FALSE,
    0, 0, 0, 0,
    jsonb_build_object('es', 'Gato Clásico', 'en', 'Tic-Tac-Toe'),
    jsonb_build_object('es', 'El duelo mental ancestral. Rápido, táctico y perfecto para despejar la mente.', 'en', 'The ancestral mind duel. Fast, tactical, and perfect to clear your head.'),
    TRUE
),
(
    'snake',
    'game',
    'Común',
    1,
    '🐍',
    '#00f2fe',
    0,
    TRUE,
    FALSE,
    0, 0, 0, 0,
    jsonb_build_object('es', 'Cyber Culebrita', 'en', 'Cyber Snake'),
    jsonb_build_object('es', 'Guía el flujo digital, devora datos y evita colisiones en la cuadrícula.', 'en', 'Guide the digital flow, devour data, and avoid collisions on the grid.'),
    TRUE
),
(
    'memory',
    'game',
    'Común',
    1,
    '🧠',
    '#a855f7',
    0,
    TRUE,
    FALSE,
    0, 0, 0, 0,
    jsonb_build_object('es', 'Memoria Zen', 'en', 'Zen Memory'),
    jsonb_build_object('es', 'Encuentra los pares de glifos en armonía. Enfoque visual y retención pura.', 'en', 'Find pairs of glyphs in harmony. Visual focus and pure retention.'),
    TRUE
),

-- ==========================================
-- B. MINIJUEGOS CON PRO COINS (3)
-- ==========================================
(
    'flappy',
    'game',
    'Raro',
    2,
    '🚀',
    '#fbbf24',
    150,
    FALSE,
    FALSE,
    0, 0, 0, 0,
    jsonb_build_object('es', 'Astro Flap', 'en', 'Astro Flap'),
    jsonb_build_object('es', 'Impulso vertical anti-gravedad. Maniobra entre las columnas cuánticas.', 'en', 'Vertical anti-gravity thrust. Maneuver through quantum pillars.'),
    TRUE
),
(
    'breaker',
    'game',
    'Raro',
    3,
    '🧱',
    '#f59e0b',
    200,
    FALSE,
    FALSE,
    0, 0, 0, 0,
    jsonb_build_object('es', 'Rompeladrillos Neon', 'en', 'Neon Brick Breaker'),
    jsonb_build_object('es', 'Destruye barreras con física luminosa. Mantén el orbe de plasma en juego.', 'en', 'Smash barriers with luminous physics. Keep the plasma orb in play.'),
    TRUE
),
(
    'space',
    'game',
    'Épico',
    3,
    '👾',
    '#ec4899',
    250,
    FALSE,
    FALSE,
    0, 0, 0, 0,
    jsonb_build_object('es', 'Invasores Galácticos', 'en', 'Galactic Invaders'),
    jsonb_build_object('es', 'Defensa perimetral contra oleadas estelares. Fuego rápido y reflejos láser.', 'en', 'Perimeter defense against stellar waves. Rapid fire and laser reflexes.'),
    TRUE
),

-- ==========================================
-- C. MINIJUEGOS EXCLUSIVOS PRO / VIP (3)
-- ==========================================
(
    'dodge',
    'game',
    'Épico',
    4,
    '⚡',
    '#ef4444',
    0,
    FALSE,
    TRUE,
    0, 0, 0, 0,
    jsonb_build_object('es', 'Esquiva Veloz', 'en', 'Cyber Dodge'),
    jsonb_build_object('es', 'Tormenta de proyectiles neón. Velocidad de reacción y reflejos al límite.', 'en', 'Storm of neon projectiles. Reaction speed and reflexes pushed to the limit.'),
    TRUE
),
(
    'tetris',
    'game',
    'Legendario',
    4,
    '🧩',
    '#6366f1',
    0,
    FALSE,
    TRUE,
    0, 0, 0, 0,
    jsonb_build_object('es', 'Tetris Relax', 'en', 'Zen Tetris'),
    jsonb_build_object('es', 'Apila geometría perfecta y despeja líneas en un estado de flujo continuo.', 'en', 'Stack perfect geometry and clear lines in a state of continuous flow.'),
    TRUE
),
(
    'samurai',
    'game',
    'Legendario',
    5,
    '🗡️',
    '#f43f5e',
    0,
    FALSE,
    TRUE,
    0, 0, 0, 0,
    jsonb_build_object('es', 'Reflejo Samurai', 'en', 'Samurai Reflex'),
    jsonb_build_object('es', 'Un solo corte en el instante exacto. Precisión milimétrica y temple de acero.', 'en', 'A single strike at the exact instant. Millisecond precision and nerves of steel.'),
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    tier = EXCLUDED.tier,
    stars = EXCLUDED.stars,
    emoji = EXCLUDED.emoji,
    color = EXCLUDED.color,
    cost_coins = EXCLUDED.cost_coins,
    is_initial = EXCLUDED.is_initial,
    is_premium = EXCLUDED.is_premium,
    coins_per_pomodoro = EXCLUDED.coins_per_pomodoro,
    pause_penalty_coins = EXCLUDED.pause_penalty_coins,
    boss_damage_points = EXCLUDED.boss_damage_points,
    boss_heal_points = EXCLUDED.boss_heal_points,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 3. Limpiar y forzar CERO recompensas a cualquier minijuego existente
UPDATE public.catalog_items
SET 
    coins_per_pomodoro = 0,
    pause_penalty_coins = 0,
    boss_damage_points = 0,
    boss_heal_points = 0
WHERE category = 'game';

COMMIT;
