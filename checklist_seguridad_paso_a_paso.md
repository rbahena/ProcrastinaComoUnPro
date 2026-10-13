# 🛡️ Checklist de Seguridad Paso a Paso: Replicación, Solución y Verificación

Este documento contiene la lista detallada de vulnerabilidades y áreas de riesgo identificadas en **COFU (ProcrastinaComoUnPro)**. Cada sección incluye:
1. **Contexto Original**: ¿Qué se hizo y por qué se diseñó así inicialmente?
2. **Riesgo e Impacto**: Qué puede explotar un usuario o atacante.
3. **Pasos para Replicar**: Código o acciones exactas para comprobar la falla en vivo.
4. **Solución Técnica (¿Qué se hace y por qué?)**: Script SQL o cambios de código exactos con su justificación técnica.
5. **Prueba de Verificación**: Cómo comprobar que la vulnerabilidad quedó 100% cerrada.

---

## 📋 Índice de Casos

- [x] [1. Manipulación de ProCoins, XP, Tomates y Rachas](#1-manipulación-de-procoins-xp-tomates-y-rachas)
- [x] [2. Robo Directo de Cosméticos de la Tienda (Bypass de Compra)](#2-robo-directo-de-cosméticos-de-la-tienda-bypass-de-compra)
- [x] [3. Auto-Desbloqueo Arbitrario de Virtudes y Retos](#3-auto-desbloqueo-arbitrario-de-virtudes-y-retos)
- [x] [4. Vandalismo, Spam y Borrado en Frases Motivacionales](#4-vandalismo-spam-y-borrado-en-frases-motivacionales)
- [x] [5. Funciones `SECURITY DEFINER` sin `search_path` (PostgreSQL)](#5-funciones-security-definer-sin-search_path-postgresql)
- [x] [6. Cabeceras HTTP, CSP y Protección de Archivos en Servidor (.htaccess)](#6-cabeceras-http-csp-y-protección-de-archivos-en-servidor-htaccess)
- [x] [7. Auto-Activación de Cuenta Pro en Cliente (Monetización)](#7-auto-activación-de-cuenta-pro-en-cliente-monetización)
- [x] [8. Higiene del Repositorio y Dependencias Vulnerables](#8-higiene-del-repositorio-y-dependencias-vulnerables)

---

## 1. Manipulación de ProCoins, XP, Tomates y Rachas ✅ (Resuelto)

### 🧐 Contexto Original: ¿Qué se hizo y por qué se hizo así?
- **¿Qué se hizo?**: Se configuró una política RLS de `UPDATE` en la tabla `profiles` que permite a cualquier usuario autenticado modificar su propia fila (`auth.uid() = id`). Además, se creó el disparador [`check_profile_column_permissions`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L318-L328), pero este solo protegía `is_premium`, `premium_until` y `stripe_customer_id`.
- **¿Por qué se hizo así?**: Para permitir que el frontend en Angular ([`membership.service.ts`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/src/app/services/membership.service.ts#L461)) sincronizara de forma rápida los puntos calculados en el navegador hacia la base de datos mediante [`syncGamificationToSupabase()`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/src/app/services/membership.service.ts#L461). Se asumió que la regla `auth.uid() = id` era suficiente para que un usuario no alterara los datos de otros.

### 🔴 Riesgo e Impacto
Aunque un usuario no puede alterar el perfil de otros, **sí puede alterar el suyo propio**. Al no estar protegidas las columnas de balances ni estadísticas en el disparador, cualquier persona puede usar las herramientas de desarrollador del navegador (DevTools) para asignarse millones de monedas virtuales, colocarse en el primer puesto del Podio de Honor y falsificar cualquier racha sin haber completado un solo bloque Pomodoro.

### 🧪 Pasos para Replicar
1. Inicia sesión en la aplicación en tu navegador.
2. Abre la consola de Desarrollador (**F12 > Console**).
3. Pega y ejecuta el siguiente script:
```javascript
// Obtener token y sesión del usuario activo desde el almacenamiento local
const authKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
const authData = JSON.parse(localStorage.getItem(authKey));
const token = authData.access_token;
const userId = authData.user.id;

// Intentar inyectar 999,999 monedas y XP directamente al perfil
const res = await fetch('https://sanznzybjytfgcbaytzx.supabase.co/rest/v1/profiles?id=eq.' + userId, {
  method: 'PATCH',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbnpuenlianl0ZmdjYmF5dHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDg5NjMsImV4cCI6MjEwNDMyNDk2M30.N-Cmu3uvKWzNla9b5JYP9ZdGjxgoryrqROTU45xcXU4',
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    pro_coins: 999999,
    focus_points: 999999,
    focus_tomatoes: 9999,
    streak_days: 365,
    longest_streak: 365
  })
});

console.log('Resultado del intento:', await res.json());
```
4. **Resultado actual**: La petición responde con código `200 OK` y el perfil se actualiza con 999,999 monedas y puntos, corrompiendo la economía y el ranking competitivo.

### 🛡️ Solución Técnica: ¿Qué se hace y por qué?
- **¿Qué se hace?**: Se amplía el disparador de base de datos para que intercepte cualquier `UPDATE` ejecutado por un usuario con rol `authenticated` y fuerce que todas las columnas de economía, puntos y medallas conserven su valor previo (`OLD`).
- **¿Por qué se hace?**: Aplica el principio de **"Cliente Cero Confianza" (Zero-Trust Client)**: el navegador web nunca debe ser la fuente de verdad de saldos ni clasificaciones. Estas columnas solo podrán ser modificadas legítimamente por funciones RPC autorizadas en el servidor (`SECURITY DEFINER`), como [`settle_focus_session`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L1772).

Ejecuta en el **SQL Editor de Supabase**:

```sql
-- Actualizar trigger para blindar todas las columnas de economía, ranking y telemetría
CREATE OR REPLACE FUNCTION public.check_profile_column_permissions()
RETURNS TRIGGER 
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.role() = 'authenticated' THEN
        -- Facturación y suscripción
        NEW.is_premium := OLD.is_premium;
        NEW.premium_until := OLD.premium_until;
        NEW.stripe_customer_id := OLD.stripe_customer_id;
        
        -- Economía y gamificación (solo modificables por funciones RPC del servidor)
        NEW.pro_coins := OLD.pro_coins;
        NEW.focus_points := OLD.focus_points;
        NEW.focus_tomatoes := OLD.focus_tomatoes;
        NEW.streak_days := OLD.streak_days;
        NEW.longest_streak := OLD.longest_streak;
        NEW.completed_objectives := OLD.completed_objectives;
        NEW.abandoned_sessions := OLD.abandoned_sessions;
        NEW.last_focus_date := OLD.last_focus_date;
        
        -- Palmarés competitivo
        NEW.podium_wins := OLD.podium_wins;
        NEW.gold_medals := OLD.gold_medals;
        NEW.silver_medals := OLD.silver_medals;
        NEW.bronze_medals := OLD.bronze_medals;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### ✅ Prueba de Verificación
1. Vuelve a ejecutar el script de replicación en la consola del navegador.
2. Comprueba el resultado devuelto: `pro_coins`, `focus_points` y `streak_days` mantienen exactamente sus valores anteriores. El servidor descarta silenciosamente los valores fraudulentos.

---

## 2. Robo Directo de Cosméticos de la Tienda (Bypass de Compra) ✅ (Resuelto)

### 🧐 Contexto Original: ¿Qué se hizo y por qué se hizo así?
- **¿Qué se hizo?**: Se creó la política RLS `"Usuarios desbloquean sus propios items"` en `public.user_unlocked_items`, permitiendo `INSERT` si `auth.uid() = user_id`.
- **¿Por qué se hizo así?**: Para permitir que el frontend pudiera persistir directamente en Supabase qué artículos iba desbloqueando el usuario en su casillero personal.

### 🔴 Riesgo e Impacto
Aunque en el backend se programó la función segura [`buy_catalog_item`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L1056) (que valida saldo suficiente y descuenta ProCoins), la presencia de la política de `INSERT` directo crea una puerta trasera: un atacante no necesita llamar a la función de compra; puede simplemente hacer un `INSERT` directo en `user_unlocked_items` y adjudicarse cualquier avatar Legendario o tema sin pagar una sola moneda.

### 🧪 Pasos para Replicar
1. Con la sesión iniciada, ejecuta en la consola de Desarrollador:
```javascript
const authKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
const authData = JSON.parse(localStorage.getItem(authKey));

// Intentar registrar un avatar legendario directamente sin pagar ProCoins
const res = await fetch('https://sanznzybjytfgcbaytzx.supabase.co/rest/v1/user_unlocked_items', {
  method: 'POST',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbnpuenlianl0ZmdjYmF5dHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDg5NjMsImV4cCI6MjEwNDMyNDk2M30.N-Cmu3uvKWzNla9b5JYP9ZdGjxgoryrqROTU45xcXU4',
    'Authorization': 'Bearer ' + authData.access_token,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    user_id: authData.user.id,
    item_id: 'dragon_dorado',
    unlock_source: 'coin_purchase'
  })
});

console.log('Resultado del intento de robo:', await res.json());
```
2. **Resultado actual**: Responde `201 Created`. Al visitar `/membresia`, el ítem aparece en el inventario/casillero como adquirido legítimamente sin haber gastado monedas.

### 🛡️ Solución Técnica: ¿Qué se hace y por qué?
- **¿Qué se hace?**: Se elimina la política de `INSERT` directo de usuarios sobre la tabla `public.user_unlocked_items`.
- **¿Por qué se hace?**: Principio de **Medación Completa (Complete Mediation)**: ninguna fila de inventario debe poder crearse en la base de datos sin pasar por la transacción autorizada [`buy_catalog_item`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L1056) (que descuenta monedas) o [`handle_initial_user_inventory`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L1020) (al registrarse la cuenta).

Ejecuta en el **SQL Editor de Supabase**:

```sql
-- Eliminar la política de inserción directa para usuarios
DROP POLICY IF EXISTS "Usuarios desbloquean sus propios items" ON public.user_unlocked_items;

-- A partir de ahora, solo la lectura es pública.
-- Las inserciones DEBEN realizarse mediante buy_catalog_item (SECURITY DEFINER)
-- o mediante los disparadores del registro inicial.
```

### ✅ Prueba de Verificación
1. Vuelve a ejecutar el script de replicación.
2. **Resultado esperado**: Responde con error `403 Forbidden` (`new row violates row-level security policy for table "user_unlocked_items"`). El ítem no se registra.

---

## 3. Auto-Desbloqueo Arbitrario de Virtudes y Retos ✅ (Resuelto)

### 🧐 Contexto Original: ¿Qué se hizo y por qué se hizo así?
- **¿Qué se hizo?**: Se definieron políticas RLS en `public.user_quality_progress` que permiten a un usuario `INSERT` y `UPDATE` con la condición `auth.uid() = user_id`.
- **¿Por qué se hizo así?**: Para permitir que el frontend calculara localmente el avance de cada una de las 7 virtudes del dojo (ej. 15 pomodoros para disciplina, 5 métodos sapo para superación) y guardara el porcentaje directamente.

### 🔴 Riesgo e Impacto
Cualquier usuario puede enviar un `PATCH` directo estableciendo `current_progress = 100`, `is_completed = true` y fecha de finalización. Esto permite falsificar medallas de honor y desbloquear los avatares correspondientes a esas virtudes (como Tortuga Fase 3 o Vargas) sin haber cumplido los retos.

### 🧪 Pasos para Replicar
1. Con la sesión iniciada, ejecuta en consola:
```javascript
const authKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
const authData = JSON.parse(localStorage.getItem(authKey));

// Intentar marcar la cualidad de constancia al 100% y completada
const res = await fetch('https://sanznzybjytfgcbaytzx.supabase.co/rest/v1/user_quality_progress?user_id=eq.' + authData.user.id + '&quality_id=eq.constancia', {
  method: 'PATCH',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbnpuenlianl0ZmdjYmF5dHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDg5NjMsImV4cCI6MjEwNDMyNDk2M30.N-Cmu3uvKWzNla9b5JYP9ZdGjxgoryrqROTU45xcXU4',
    'Authorization': 'Bearer ' + authData.access_token,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    current_progress: 100,
    is_completed: true,
    completed_at: new Date().toISOString()
  })
});

console.log('Resultado:', await res.json());
```
2. **Resultado actual**: Responde `200 OK` y la virtud queda falsificada al 100%.

### 🛡️ Solución Técnica: ¿Qué se hace y por qué?
- **¿Qué se hace?**:
  1. Se eliminan los permisos directos de inserción y modificación de los usuarios sobre `user_quality_progress`.
  2. Se blinda el procedimiento RPC [`advance_user_quality_progress`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L1378) forzando incremento unitario estricto (`+ 1`) y `search_path = public, pg_temp` para impedir que un usuario inyecte incrementos gigantes arbitrarios desde la consola.
- **¿Por qué se hace?**: Para proteger la integridad del sistema de progreso del dojo. El avance de virtudes debe gestionarse exclusivamente de 1 en 1 mediante la función autorizada [`advance_user_quality_progress`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L1378), llamada internamente cuando se liquidan sesiones legítimas.

Ejecuta en el **SQL Editor de Supabase**:

```sql
-- 1. Eliminar políticas de escritura directa para usuarios
DROP POLICY IF EXISTS "Usuarios insertan su propio progreso de cualidades" ON public.user_quality_progress;
DROP POLICY IF EXISTS "Usuarios actualizan su propio progreso de cualidades" ON public.user_quality_progress;

-- 2. Blindar el RPC con incremento unitario forzado (+ 1) y search_path inmutable
CREATE OR REPLACE FUNCTION public.advance_user_quality_progress(
    p_quality_id VARCHAR,
    p_increment INTEGER DEFAULT 1
)
RETURNS JSON 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_quality RECORD;
    v_progress RECORD;
    v_new_progress INTEGER;
    v_is_now_unlocked BOOLEAN := FALSE;
    v_newly_unlocked BOOLEAN := FALSE;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'No autenticado');
    END IF;

    SELECT * INTO v_quality FROM public.master_qualities WHERE id = p_quality_id AND is_active = TRUE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'La cualidad no existe o está inactiva');
    END IF;

    INSERT INTO public.user_quality_progress (user_id, quality_id, current_progress, is_unlocked)
    VALUES (v_user_id, p_quality_id, 0, FALSE)
    ON CONFLICT (user_id, quality_id) DO NOTHING;

    SELECT * INTO v_progress FROM public.user_quality_progress 
    WHERE user_id = v_user_id AND quality_id = p_quality_id 
    FOR UPDATE;

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

    -- Incremento unitario forzado (+ 1): previene trampas
    v_new_progress := LEAST(v_quality.target_total, v_progress.current_progress + 1);
    v_is_now_unlocked := (v_new_progress >= v_quality.target_total);
    v_newly_unlocked := v_is_now_unlocked AND NOT v_progress.is_unlocked;

    UPDATE public.user_quality_progress
    SET 
        current_progress = v_new_progress,
        is_unlocked = v_is_now_unlocked,
        unlocked_at = CASE WHEN v_newly_unlocked THEN TIMEZONE('utc'::text, NOW()) ELSE unlocked_at END,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE user_id = v_user_id AND quality_id = p_quality_id;

    IF v_newly_unlocked AND v_quality.associated_avatar_id IS NOT NULL THEN
        INSERT INTO public.user_unlocked_items (user_id, item_id, unlock_source)
        VALUES (v_user_id, v_quality.associated_avatar_id, 'quality_reward')
        ON CONFLICT (user_id, item_id) DO NOTHING;
    END IF;

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
```

### ✅ Prueba de Verificación
1. Vuelve a ejecutar el script de replicación.
2. **Resultado esperado**: Responde con error de RLS. No se permite la alteración directa del progreso.

---

## 4. Vandalismo, Spam y Borrado en Frases Motivacionales ✅ (Resuelto)

### 🧐 Contexto Original: ¿Qué se hizo y por qué se hizo así?
- **¿Qué se hizo?**: En `public.community_motivations`, se definieron políticas con:
  - `INSERT`: `WITH CHECK (true)`
  - `UPDATE`: `USING (true)`
  - `DELETE`: `USING (auth.uid() = user_id OR user_id IS NULL)`
- **¿Por qué se hizo así?**: Para prototipar rápidamente el muro comunitario en desarrollo, permitiendo que cualquier visitante probara la creación de frases y que el botón de *Like* pudiera incrementar el contador sin requerir autenticación compleja.

### 🔴 Riesgo e Impacto
- **Spam / Phishing**: Cualquier bot anónimo puede inundar la base de datos con enlaces maliciosos o texto inapropiado.
- **Defacement (Modificación no autorizada)**: Cualquier visitante puede editar el texto de **cualquier frase de cualquier autor**.
- **Destrucción de datos del sistema**: La condición `user_id IS NULL` en el borrado permite que cualquier usuario anónimo elimine todas las frases predeterminadas del sistema con una sola petición.

### 🧪 Pasos para Replicar
1. Abre una ventana de incógnito (sin autenticación).
2. Abre la consola y ejecuta:
```javascript
// Intentar borrar las frases por defecto del sistema
const res = await fetch('https://sanznzybjytfgcbaytzx.supabase.co/rest/v1/community_motivations?user_id=is.null', {
  method: 'DELETE',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbnpuenlianl0ZmdjYmF5dHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDg5NjMsImV4cCI6MjEwNDMyNDk2M30.N-Cmu3uvKWzNla9b5JYP9ZdGjxgoryrqROTU45xcXU4'
  }
});

console.log('Status de borrado anónimo:', res.status);
```
3. **Resultado actual**: Devuelve `204 No Content` y borra todas las frases semilla del sistema.

### 🛡️ Solución Técnica: ¿Qué se hace y por qué?
- **¿Qué se hace?**: Se reemplazan las tres políticas por directivas que exigen autenticación estricta, validación de autoría para edición y borrado, y blindaje de las frases del sistema. Para los likes, se delega al RPC seguro [`toggle_motivation_like`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L3561).
- **¿Por qué se hace?**: Para proteger la integridad del contenido comunitario y asegurar la trazabilidad de cada publicación (nadie puede suplantar la autoría ni destruir el contenido base de la plataforma).

Ejecuta en el **SQL Editor de Supabase**:

```sql
-- 1. Eliminar políticas inseguras
DROP POLICY IF EXISTS "Permitir crear motivaciones" ON public.community_motivations;
DROP POLICY IF EXISTS "Permitir actualizar likes de motivaciones" ON public.community_motivations;
DROP POLICY IF EXISTS "Permitir eliminar mi propia motivacion" ON public.community_motivations;

-- 2. Solo usuarios autenticados pueden crear frases y con user_id coincidente
CREATE POLICY "Solo usuarios autenticados crean frases"
    ON public.community_motivations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id AND char_length(text) BETWEEN 5 AND 280);

-- 3. Solo el autor puede editar su propia frase (el texto no puede ser editado por terceros)
CREATE POLICY "Solo el autor edita su frase"
    ON public.community_motivations FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Solo el autor puede eliminar su propia frase (las del sistema con user_id NULL quedan protegidas)
CREATE POLICY "Solo el autor elimina su frase"
    ON public.community_motivations FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
```

### ✅ Prueba de Verificación
1. Vuelve a ejecutar la llamada `DELETE` anónima del paso de replicación.
2. **Resultado esperado**: Responde con código de denegación o afecta 0 registros. Las frases del sistema permanecen intactas.

---

## 5. Funciones `SECURITY DEFINER` sin `search_path` (PostgreSQL) ✅ (Resuelto)

### 🧐 Contexto Original: ¿Qué se hizo y por qué se hizo así?
- **¿Qué se hizo?**: Se crearon múltiples procedimientos PL/pgSQL con la cláusula `SECURITY DEFINER` ([`handle_new_user_registration`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L218), [`settle_focus_session`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L1772), [`deal_boss_damage`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/schema.sql#L2291), etc.).
- **¿Por qué se hizo así?**: Para permitir que estas funciones ejecuten operaciones con privilegios de administrador del sistema (ignorando las restricciones RLS normales para insertar historiales o actualizar saldos de forma controlada).

### 🔴 Riesgo e Impacto
En PostgreSQL, una función `SECURITY DEFINER` se ejecuta con los privilegios del propietario (superusuario/postgres). Si no fija un `search_path` inmutable, PostgreSQL resuelve los nombres de tablas y funciones en los esquemas según la configuración del usuario que la invoca. Un atacante podría crear objetos en esquemas temporales (`pg_temp`) con los mismos nombres para secuestrar el flujo de ejecución y ejecutar código arbitrario como superusuario (*search_path hijacking*). Supabase Linter lo clasifica como vulnerabilidad de severidad alta.

### 🧪 Pasos para Replicar
1. En **Supabase Studio > SQL Editor**, ejecuta esta consulta de auditoría:
```sql
SELECT proname, prosecdef, proconfig
FROM pg_proc
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE nspname = 'public' 
  AND prosecdef = TRUE 
  AND (proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY(proconfig)));
```
2. **Resultado actual**: Devuelve múltiples funciones del sistema sin configuración de `search_path`.

### 🛡️ Solución Técnica: ¿Qué se hace y por qué?
- **¿Qué se hace?**: Se ejecuta `ALTER FUNCTION ... SET search_path = public, pg_temp;` en todas las funciones `SECURITY DEFINER`.
- **¿Por qué se hace?**: Es la mejor práctica estándar de seguridad recomendada por el equipo de PostgreSQL y Supabase: garantiza que todas las llamadas dentro de la función resuelvan de forma determinista y estricta en el esquema `public` o `pg_temp`, neutralizando cualquier vector de secuestro de ruta.

Ejecuta en el **SQL Editor de Supabase**:

```sql
-- Blindar el search_path en todas las funciones SECURITY DEFINER
ALTER FUNCTION public.handle_new_user_registration() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_initial_user_inventory() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_initial_user_qualities() SET search_path = public, pg_temp;
ALTER FUNCTION public.buy_catalog_item(VARCHAR) SET search_path = public, pg_temp;
ALTER FUNCTION public.advance_user_quality_progress(VARCHAR, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.settle_focus_session(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR, VARCHAR, UUID, TEXT, JSONB, DATE, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.add_focus_log_entry(UUID, TEXT, TEXT, VARCHAR) SET search_path = public, pg_temp;
ALTER FUNCTION public.deal_boss_damage(VARCHAR, INTEGER, BOOLEAN, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.heal_boss_from_distraction(VARCHAR, INTEGER, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.switch_active_boss(VARCHAR) SET search_path = public, pg_temp;
ALTER FUNCTION public.toggle_motivation_like(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.register_firewall_block(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.convert_idea_to_objective(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.add_dedicated_time_to_idea(UUID, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.complete_captured_idea(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.reactivate_captured_idea(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.recalculate_user_streak(UUID) SET search_path = public, pg_temp;
```

### ✅ Prueba de Verificación
1. Vuelve a ejecutar la consulta de auditoría SQL del paso de replicación.
2. **Resultado esperado**: Retorna 0 filas. Las alertas del linter de Supabase quedan resueltas.

---

## 6. Cabeceras HTTP, CSP y Protección de Archivos en Servidor (.htaccess) ✅ (Resuelto)

### 🧐 Contexto Original: ¿Qué se hizo y por qué se hizo así?
- **¿Qué se hizo?**: Se configuró [`public/.htaccess`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/public/.htaccess) con reglas de reescritura SPA para Apache, forzado HTTPS, compresión gzip y cabeceras básicas (`X-Frame-Options`, `X-Content-Type-Options`, HSTS).
- **¿Por qué se hizo así?**: Para asegurar que las rutas de Angular (`/enfoque`, `/login`, etc.) no dieran error 404 al recargar la página en Hostinger y para proporcionar seguridad web básica.

### 🔴 Riesgo e Impacto
1. **Falta de CSP**: Sin `Content-Security-Policy`, el navegador no restringe qué dominios pueden cargar scripts o recibir conexiones, aumentando el riesgo ante inyecciones de terceros.
2. **Listado de directorios**: Al no tener `Options -Indexes`, si una carpeta como `assets/` carece de `index.html`, Apache puede mostrar el explorador de archivos con todo el contenido.
3. **Archivos sensibles expuestos**: Si accidentalmente se sube un archivo `.sql`, `.env` o `.md` al servidor web, Apache lo servirá como texto plano.
4. **Conflicto en pagos**: `Permissions-Policy` tiene `payment=()`, lo que bloqueará Stripe Elements, Apple Pay y Google Pay cuando se conecten los pagos.

### 🧪 Pasos para Replicar
1. Revisa [`public/.htaccess`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/public/.htaccess#L47):
   ```apache
   Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
   ```
   Observa la ausencia de `Content-Security-Policy` y de `Options -Indexes`.
2. Al desplegar a Apache, una solicitud a un archivo `.sql` o un directorio sin index puede responder con contenido descargable o listado público.

### 🛡️ Solución Técnica: ¿Qué se hace y por qué?
- **¿Qué se hace?**: Se actualiza [`public/.htaccess`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/public/.htaccess) agregando `Options -Indexes`, la regla `<FilesMatch>` que deniega acceso a archivos de configuración/desarrollo, CSP restrictivo y permiso para pagos (`payment=*`).
- **¿Por qué se hace?**: Principio de **Defensa en Profundidad (Defense in Depth)** a nivel de servidor web, blindando la infraestructura contra enumeración de archivos, robo de esquemas y ataques XSS.

Actualizar [`public/.htaccess`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/public/.htaccess) con:

```apache
# 0. DESACTIVAR LISTADO DE DIRECTORIOS
Options -Indexes

# 1. BLOQUEAR ACCESO A ARCHIVOS SENSIBLES O DE CONFIGURACIÓN
<FilesMatch "\.(env|sql|git|md|bak|config|log)$">
  Order allow,deny
  Deny from all
</FilesMatch>

# 2. CABECERAS DE SEGURIDAD MEJORADAS
<IfModule mod_headers.c>
  Header always set X-Frame-Options "DENY"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-XSS-Protection "1; mode=block"

  # Permitir pasarela de pago para Stripe / Google Pay / Apple Pay
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=*"

  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

  # CONTENT SECURITY POLICY (CSP)
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; media-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com;"
</IfModule>
```

### ✅ Prueba de Verificación
1. En terminal o mediante herramientas de inspección HTTP:
   ```bash
   curl -I https://cofu.io/
   ```
2. Verificar la presencia de `Content-Security-Policy` y `Permissions-Policy: payment=*`.
3. Intentar acceder a `https://cofu.io/schema.sql` -> Responde `403 Forbidden`.

---

## 7. Auto-Activación de Cuenta Pro en Cliente (Monetización) ✅ (Resuelto)

### 🧐 Contexto Original: ¿Qué se hizo y por qué se hizo así?
- **¿Qué se hizo?**: En [`src/app/pages/membresia/membresia.ts`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/src/app/pages/membresia/membresia.ts#L28-L40), el botón de suscripción invoca directamente `membership.setPremium(!isPremium())` y guarda el estado en `localStorage`.
- **¿Por qué se hizo así?**: Para permitir probar rápidamente la interfaz y las ventajas cosméticas de los usuarios Pro durante la etapa de maquetación y diseño visual sin requerir una cuenta de Stripe activa.

### 🔴 Riesgo e Impacto
Cualquier visitante en producción puede hacer clic en el botón y convertirse inmediatamente en usuario Pro sin pagar. Además, en la consola puede alterar `localStorage` para desbloquear funciones de pago de forma arbitraria.

### 🧪 Pasos para Replicar
1. Visita la ruta `/membresia`.
2. Haz clic en "Desbloquear Plan Pro".
3. **Resultado actual**: Se muestra un toast de felicitación y la cuenta se convierte en Pro en el estado local del navegador.

### 🛡️ Solución Técnica: ¿Qué se hace y por qué?
- **¿Qué se hace?**: En el entorno de producción, se sustituye la simulación por un modal de **"Acceso Anticipado / Próximamente"** hasta que se conecte el Webhook oficial de Stripe en Supabase Edge Functions. Además, la comprobación de si un usuario es Pro debe basarse exclusivamente en el campo `profiles.is_premium` del servidor.
- **¿Por qué se hace?**: Protección del modelo de ingresos de la plataforma; el acceso a funciones de pago debe estar supeditado a una confirmación criptográfica del webhook de facturación en el backend.

---

## 8. Higiene del Repositorio y Dependencias Vulnerables ✅ (Resuelto)

### 🧐 Contexto Original: ¿Qué se hizo y por qué se hizo así?
- **¿Qué se hizo?**: Se instalaron dependencias de Angular CLI y utilidades de compilación, y durante pruebas de rutas relativas en PowerShell se creó accidentalmente un directorio `Users/` en la raíz.
- **¿Por qué se hizo así?**: Es habitual durante fases de desarrollo acelerado que queden carpetas temporales locales y que las dependencias requieran parches periódicos de seguridad.

### 🔴 Riesgo e Impacto
- **Dependencias**: `npm audit` reporta 15 vulnerabilidades (3 críticas en herramientas de compilación).
- **Fuga de datos locales**: La carpeta `Users/` contiene fragmentos de rutas y logs del entorno local de desarrollo que no deben subirse a repositorios públicos ni al servidor de hosting.

### 🧪 Pasos para Replicar
1. Ejecuta en terminal:
   ```bash
   npm audit
   Test-Path Users
   ```
2. Se confirman las 15 vulnerabilidades y la presencia del directorio residual.

### 🛡️ Solución Técnica: ¿Qué se hace y por qué?
- **¿Qué se hace?**: Se ejecuta `npm audit fix`, se elimina el directorio residual `Users/` y se agregan las reglas correspondientes a [`.gitignore`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/.gitignore).
- **¿Por qué se hace?**: Seguridad de la Cadena de Suministro (**Supply Chain Security**) y prevención de fugas de información interna.

```powershell
# 1. Corregir dependencias
npm audit fix

# 2. Eliminar carpeta residual
Remove-Item -Recurse -Force Users

# 3. Blindar .gitignore con:
# .env
# .env.*
# Users/
# scratch/
```

### ✅ Prueba de Verificación
1. `npm audit`: reduce o elimina las vulnerabilidades críticas y altas.
2. `Test-Path Users`: retorna `False`. El árbol de Git queda completamente limpio.
