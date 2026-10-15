-- ==============================================================================
-- 👑 COFU RPG: MIGRACIÓN DE BALANCE DE AVATARES Y CANDADOS (PRO COINS & VIP)
-- ==============================================================================
-- Este script actualiza de manera segura y atómica la tabla public.catalog_items
-- para implementar la nueva economía de avatares:
-- 1. Agrega la columna is_premium (si no existe).
-- 2. Blinda a los 4 Guardianes Élite / Míticos como Exclusivos VIP (Premium).
-- 3. Calibra la Tienda de Pro Coins: 5 Cazadores Épicos + 2 Legendarios (Lobo y Dragón).
-- 4. Garantiza que los 6 Iniciales sean 100% gratuitos.
-- 5. Elimina permanentemente 'tortuga_phase3' y 'tortuga_evolved'.
-- 6. Ratifica que los 7 Guardianes de Cualidad sean mérito puro (nunca VIP ni monedas).
-- 7. Activa el potencial evolutivo oculto para los 7 avatares designados.
-- ==============================================================================

BEGIN;

-- 1. Agregar columna is_premium si no existe
ALTER TABLE public.catalog_items 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Blinda los 6 Guardianes Exclusivos VIP / Membresía Premium (4 Legendarios + 2 Épicos)
UPDATE public.catalog_items
SET 
    is_premium = TRUE,
    cost_coins = 0,
    tier = 'Legendario',
    archetype = '{"es": "Exclusivo VIP", "en": "VIP Exclusive"}'
WHERE id IN ('leon', 'tigre', 'fenix', 'grifo');

UPDATE public.catalog_items
SET 
    is_premium = TRUE,
    cost_coins = 0,
    tier = 'Épico',
    archetype = '{"es": "Cazador VIP", "en": "VIP Hunter"}'
WHERE id IN ('lince', 'elefante');

-- 3. Calibra los Cazadores y Legendarios de la Tienda de Pro Coins
-- Cazadores Épicos:
UPDATE public.catalog_items
SET cost_coins = 1250, is_premium = FALSE, is_initial = FALSE, required_quality_id = NULL
WHERE id = 'zorro';

UPDATE public.catalog_items
SET cost_coins = 1650, is_premium = FALSE, is_initial = FALSE, required_quality_id = NULL
WHERE id = 'panda';

UPDATE public.catalog_items
SET cost_coins = 2200, is_premium = FALSE, is_initial = FALSE, required_quality_id = NULL
WHERE id = 'oso';

-- Legendarios por Pro Coins:
UPDATE public.catalog_items
SET cost_coins = 3200, is_premium = FALSE, is_initial = FALSE, required_quality_id = NULL, tier = 'Legendario'
WHERE id = 'lobo';

UPDATE public.catalog_items
SET cost_coins = 4500, is_premium = FALSE, is_initial = FALSE, required_quality_id = NULL, tier = 'Legendario'
WHERE id = 'dragon';

-- 4. Ratifica que los 6 Iniciales sean 100% Gratuitos
UPDATE public.catalog_items
SET cost_coins = 0, is_initial = TRUE, is_premium = FALSE, required_quality_id = NULL
WHERE id IN ('gato', 'perro', 'conejo', 'raton', 'hamster', 'loro');

-- 5. Eliminar el avatar Genbu Titán del Tiempo (tortuga_phase3) y evoluciones
DELETE FROM public.user_unlocked_items WHERE item_id IN ('tortuga_phase3', 'tortuga_evolved');
DELETE FROM public.catalog_items WHERE id IN ('tortuga_phase3', 'tortuga_evolved');

-- 6. Ratifica que los 7 Guardianes de Reto / Cualidad sean estrictamente de Mérito (costo 0, no premium)
UPDATE public.catalog_items
SET cost_coins = 0, is_initial = FALSE, is_premium = FALSE
WHERE id IN (
    'tortuga', 'hormiga', 'buho', 'rana', 'aguila', 'abeja', 'castor'
);

-- 7. Activa el potencial evolutivo para los 7 avatares designados (metamorfosis por desempeño)
UPDATE public.catalog_items
SET has_evolution = TRUE
WHERE id IN ('tortuga', 'buho', 'zorro', 'dragon', 'lobo', 'rana', 'leon');

UPDATE public.catalog_items
SET has_evolution = FALSE
WHERE id NOT IN ('tortuga', 'buho', 'zorro', 'dragon', 'lobo', 'rana', 'leon');

COMMIT;
