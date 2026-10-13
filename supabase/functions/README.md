# 💳 Guía 100% Manual: Conectar Stripe y Supabase desde la Web (Sin Terminal ni CLI)

Esta guía está diseñada paso a paso para configurar **Stripe** y las **Edge Functions en Supabase** utilizando exclusivamente las páginas web de ambos paneles (sin necesidad de instalar comandos ni usar la consola/CLI).

---

## 🧭 Resumen de lo que vas a configurar
* **Plan Pro:** $4.49 USD/mes o $35.88 USD/año (Ahorro del 33%).
* **Prueba Gratis de 7 Días:** Al hacer clic en "Probar 7 días gratis", hoy el usuario paga **$0.00**.
* **Cobro Automático:** Si el usuario no cancela antes del día 7, el cobro se realiza automáticamente. Si cancela antes, **no se le cobra nada**.

---

## 📌 PASO 1: Obtener tus Claves en Stripe (Web)

1. Abre tu navegador e inicia sesión en [dashboard.stripe.com](https://dashboard.stripe.com).
2. Asegúrate de estar en **Modo de Prueba (Test Mode)** (verás un interruptor naranja activado en la esquina superior derecha).
3. En el menú superior o lateral, haz clic en **Desarrolladores (Developers)** > **Claves de API (API Keys)**.
4. En la fila **Clave secreta (Secret key)**, haz clic en **Revelar clave (Reveal key)**.
5. Copia esa clave. Empieza con: `sk_test_...` (guárdala momentáneamente en un bloc de notas).

---

## 📌 PASO 2: Guardar la Clave Secreta en Supabase (Web)

1. Abre otra pestaña e inicia sesión en [supabase.com/dashboard](https://supabase.com/dashboard).
2. Entra a tu proyecto.
3. En la barra lateral izquierda, haz clic en el ícono de **Edge Functions** (ícono de un rayo ⚡).
4. En la parte superior de la pantalla, haz clic en la pestaña **Secrets** (o **Manage Secrets**).
5. Haz clic en el botón **Add new secret** (o **New Secret**):
   * **Name (Nombre):** `STRIPE_SECRET_KEY`
   * **Value (Valor):** Pega la clave que copiaste en el Paso 1 (`sk_test_...`)
6. Haz clic en **Save** (Guardar).

---

## 📌 PASO 3: Crear las 3 Edge Functions en Supabase (Web)

Crearás 3 funciones desde el navegador. En cada una, solo tienes que copiar el archivo que ya dejamos preparado en el proyecto y pegarlo en el editor web de Supabase:

### ⚡ Función 1: `stripe-checkout`
1. En la barra lateral izquierda de Supabase, ve a **Edge Functions** (⚡).
2. Haz clic en el botón **Create a new function** (o **New Function**).
3. En el campo de nombre escribe exactamente: **`stripe-checkout`**.
4. En el editor de código web que se abre en pantalla, borra todo el código que venga por defecto.
5. Abre en tu editor de código local el archivo:
   [`supabase/functions/stripe-checkout/index.ts`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/functions/stripe-checkout/index.ts)
6. Selecciona todo (`Ctrl + A`), copia (`Ctrl + C`) y pégalo en el editor web de Supabase.
7. Haz clic en el botón **Deploy** (o **Save**).

---

### ⚡ Función 2: `stripe-webhook`
1. Vuelve a la lista de **Edge Functions** en Supabase y haz clic en **Create a new function**.
2. En el nombre escribe exactamente: **`stripe-webhook`**.
3. Borra el código de ejemplo del editor web.
4. Abre en tu editor de código local el archivo:
   [`supabase/functions/stripe-webhook/index.ts`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/functions/stripe-webhook/index.ts)
5. Selecciona todo (`Ctrl + A`), copia (`Ctrl + C`) y pégalo en el editor web de Supabase.
6. **MUY IMPORTANTE:** Si en pantalla te aparece la casilla de verificación **"Enforce JWT Verification"**, asegúrate de que quede **DESMARCADA (OFF)**, ya que los servidores de Stripe necesitan enviar eventos directamente sin login.
7. Haz clic en **Deploy**.
8. Una vez desplegada, copia la URL que Supabase te muestra para esta función. Tiene esta forma:
   `https://<TU-ID-DE-PROYECTO>.supabase.co/functions/v1/stripe-webhook`

---

### ⚡ Función 3: `stripe-portal`
1. Vuelve a **Edge Functions** en Supabase y haz clic en **Create a new function**.
2. En el nombre escribe exactamente: **`stripe-portal`**.
3. Borra el código de ejemplo del editor web.
4. Abre en tu editor de código local el archivo:
   [`supabase/functions/stripe-portal/index.ts`](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/supabase/functions/stripe-portal/index.ts)
5. Selecciona todo (`Ctrl + A`), copia (`Ctrl + C`) y pégalo en el editor web de Supabase.
6. Haz clic en **Deploy**.

---

## 📌 PASO 4: Conectar el Webhook en Stripe (Web)

1. Regresa a tu panel de Stripe en [dashboard.stripe.com](https://dashboard.stripe.com).
2. En el menú de **Desarrolladores (Developers)**, haz clic en **Webhooks**.
3. Haz clic en el botón **Añadir extremo (Add endpoint)**.
4. En el campo **URL del extremo (Endpoint URL)**, pega la URL que copiaste en el Paso 3 para `stripe-webhook`:
   `https://<TU-ID-DE-PROYECTO>.supabase.co/functions/v1/stripe-webhook`
5. Haz clic en **Seleccionar eventos (Select events)** y marca las siguientes 5 casillas:
   * ✅ `checkout.session.completed` (Cuando el usuario inicia su prueba de 7 días)
   * ✅ `customer.subscription.updated` (Cuando se renueva o cambia de plan)
   * ✅ `customer.subscription.deleted` (Cuando cancela o expira su suscripción)
   * ✅ `invoice.payment_succeeded` (Cuando se cobra exitosamente)
   * ✅ `invoice.payment_failed` (Si la tarjeta falla)
6. Haz clic en el botón **Añadir extremo (Add endpoint)** al fondo de la pantalla.
7. En la página que se abre, busca el apartado **Clave para firmar (Signing secret)** y haz clic en **Revelar (Reveal)**.
8. Copia esa clave. Empieza con: `whsec_...`.

---

## 📌 PASO 5: Guardar el Secreto del Webhook en Supabase (Web)

1. Regresa a tu pestaña de Supabase Dashboard.
2. Ve a **Edge Functions** > Pestaña **Secrets**.
3. Haz clic en **Add new secret**:
   * **Name (Nombre):** `STRIPE_WEBHOOK_SECRET`
   * **Value (Valor):** Pega la clave que copiaste en el Paso 4 (`whsec_...`)
4. Haz clic en **Save** (Guardar).

---

## 📌 PASO 6: Aplicar las Columnas e Índices en SQL Editor (Web)

Para que la base de datos reconozca el ID de suscripción de Stripe y acelere las búsquedas:

1. En el menú lateral izquierdo de Supabase, haz clic en el ícono de **SQL Editor** (terminal con `>_`).
2. Haz clic en el botón verde **New query** (Nueva consulta).
3. Copia y pega el siguiente script SQL tal cual:

```sql
-- 1. Agregar columna de suscripción en profiles si no existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 2. Crear índices de búsqueda ultrarrápida para webhooks
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);

-- 3. Blindar la columna en el trigger de seguridad
CREATE OR REPLACE FUNCTION public.check_profile_column_permissions()
RETURNS TRIGGER 
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.role() = 'authenticated' THEN
        NEW.is_premium := OLD.is_premium;
        NEW.premium_until := OLD.premium_until;
        NEW.stripe_customer_id := OLD.stripe_customer_id;
        NEW.stripe_subscription_id := OLD.stripe_subscription_id;
        NEW.pro_coins := OLD.pro_coins;
        NEW.focus_points := OLD.focus_points;
        NEW.focus_tomatoes := OLD.focus_tomatoes;
        NEW.completed_objectives := OLD.completed_objectives;
        NEW.abandoned_sessions := OLD.abandoned_sessions;
        NEW.streak_days := OLD.streak_days;
        NEW.longest_streak := OLD.longest_streak;
        NEW.last_focus_date := OLD.last_focus_date;
        NEW.podium_wins := OLD.podium_wins;
        NEW.gold_medals := OLD.gold_medals;
        NEW.silver_medals := OLD.silver_medals;
        NEW.bronze_medals := OLD.bronze_medals;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

4. Haz clic en el botón **Run** (Ejecutar) abajo a la derecha. Debe responder: *"Success. No rows returned"*.

---

## 🧪 PASO 7: Cómo Probar Todo en Vivo (100% Gratis)

1. En tu aplicación web, inicia sesión con cualquier cuenta y ve a `/membresia`.
2. Haz clic en **"Probar 7 días gratis ⚡"**.
3. Se abrirá la pasarela segura. Observarás que dice:
   * **Total a pagar hoy:** `$0.00`
   * **Prueba gratis:** `7 días`
4. Llena los datos con la tarjeta oficial de prueba de Stripe:
   * **Número de tarjeta:** `4242 4242 4242 4242`
   * **Vencimiento:** Cualquier mes/año futuro (ej. `10/28`)
   * **CVC:** `123`
   * **Nombre y Código Postal:** Cualquier dato (ej. `06000`)
5. Haz clic en **Suscribirse**.
6. Serás devuelto a la app con el mensaje de éxito y tu cuenta tendrá activado **COFU Pro** de inmediato por 7 días.
