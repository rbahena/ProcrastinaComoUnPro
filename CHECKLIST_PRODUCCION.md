# 🚀 Checklist de Lanzamiento a Producción - COFU (ProcrastinaComoUnPro)

Guía paso a paso y lista de verificación técnica, operativa y de seguridad para el despliegue a producción de la plataforma.

---

## 📋 Índice
1. [Backend y Base de Datos (Supabase)](#1-backend-y-base-de-datos-supabase)
2. [Configuración de Entornos y Angular](#2-configuración-de-entornos-y-angular)
3. [Monetización y Pagos (Suscripciones Pro)](#3-monetización-y-pagos-suscripciones-pro)
4. [Hosting, Dominio y Redirecciones SPA](#4-hosting-dominio-y-redirecciones-spa)
5. [SEO, Metadatos y PWA](#5-seo-metadatos-y-pwa)
6. [Seguridad y Políticas](#6-seguridad-y-políticas)
7. [Monitorización, Logs y Analítica](#7-monitorización-logs-y-analítica)
8. [Cumplimiento Legal y Términos](#8-cumplimiento-legal-y-términos)

---

## 1. Backend y Base de Datos (Supabase)

- [ ] **Políticas RLS (Row Level Security)**:
  - [ ] Verificar que RLS esté activo en todas las tablas principales:
    - `profiles`: Solo lectura pública de datos básicos (avatar, username, puntos); solo el dueño puede editar su propio perfil.
    - `focus_sessions`: Los usuarios solo pueden insertar y leer sus propias sesiones.
    - `ideas`: Privado al 100% por usuario (`auth.uid() = user_id`).
    - `user_quality_progress`: Lectura y escritura restringida al usuario autenticado.
    - `motivations`: Lectura pública de frases aprobadas; inserción y eliminación restringida al autor.
    - `boss_battles`: Lectura pública; curación y daño controlado por funciones del servidor.
- [ ] **Autenticación y Correos**:
  - [ ] Configurar un servidor SMTP personalizado en Supabase (Resend, SendGrid, Amazon SES o Mailgun) para evitar el límite de 3 correos/hora del servidor gratuito por defecto.
  - [ ] Personalizar plantillas de correo de Auth (Confirmación de cuenta, Restablecimiento de contraseña, Invitaciones).
  - [ ] En *Authentication > URL Configuration > Site URL*, establecer el dominio final de producción (ej. `https://cofu.app`).
  - [ ] Agregar a **Redirect URLs** permitidas las rutas de callback: `https://tudominio.com/**` y `https://tudominio.com/login`.
- [ ] **Funciones RPC y Seguridad de Gamificación**:
  - [ ] Mover la adjudicación de ProCoins, XP y daño/curación al Boss a funciones PostgreSQL (`SECURITY DEFINER`) o Supabase Edge Functions para evitar que usuarios manipulen llamadas directas desde la consola del navegador.
- [ ] **Canales Realtime**:
  - [ ] Validar cuotas y límites de presencia en el canal `community_focus_room` para alta concurrencia.

---

## 2. Configuración de Entornos y Angular

- [ ] **Archivo de Entorno de Producción (`src/environments/environment.ts`)**:
  - [ ] Cambiar la bandera: `production: true`.
  - [ ] Verificar que `supabaseUrl` y `supabaseAnonKey` apunten al proyecto de producción de Supabase.
- [ ] **Presupuestos y Optimización en `angular.json`**:
  - [ ] Ajustar los `budgets` de compilación para que no generen warnings al ejecutar `ng build --configuration production`.
  - [ ] Verificar que la minificación y el `outputHashing: "all"` estén activos.
- [ ] **Optimización de Assets (Multimedia y Sonido)**:
  - [ ] Audios de fondo (`.mp3`, `.m4a`): Comprobar que tengan un bitrate balanceado (64kbps - 128kbps) para streaming rápido.
  - [ ] Videos Zen de fondo (`.mp4`): Asegurar compresión web (H.264, WebM) y tamaño reducido (< 5 MB).
  - [ ] Ilustraciones de temas y avatares en formato `.webp` optimizado.

---

## 3. Monetización y Pagos (Suscripciones Pro)

- [ ] **Pasarela de Pago (Stripe / LemonSqueezy / Mercado Pago)**:
  - [ ] Reemplazar la simulación de cliente en `membresia.ts` por una llamada a sesión de Checkout real.
  - [ ] Crear los productos y planes (Mensual / Anual) en el dashboard de la pasarela.
- [ ] **Webhooks de Suscripción**:
  - [ ] Crear Edge Function de Supabase para recibir webhooks de pago:
    - Evento `checkout.session.completed` -> Activa `is_premium = true` en la tabla `profiles`.
    - Evento `customer.subscription.deleted` -> Desactiva `is_premium = false`.
    - Evento `invoice.payment_failed` -> Notifica al usuario o pasa a estado de gracia.
  - [ ] Proteger el webhook validando la firma criptográfica (`webhook secret`).

---

## 4. Hosting, Dominio y Redirecciones SPA

- [ ] **Reglas de Reescritura / Redirección SPA**:
  - Para evitar error 404 al recargar rutas como `/enfoque`, `/medallero`, `/ideas` o `/login`:
    - **Vercel** (`vercel.json`):
      ```json
      {
        "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
      }
      ```
    - **Netlify** (`public/_redirects`):
      ```text
      /*    /index.html   200
      ```
    - **Firebase Hosting** (`firebase.json`):
      ```json
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
      ```
- [ ] **Dominio Personalizado y Certificado SSL**:
  - [ ] Configurar registros DNS (tipo A / CNAME) en tu proveedor de dominio (Cloudflare, Namecheap, GoDaddy).
  - [ ] Activar HTTPS forzado y HSTS.

---

## 5. SEO, Metadatos y PWA

- [ ] **Metadatos en `index.html`**:
  - [ ] Título final atractivo: `<title>COFU - Pomodoro Gamificado y Concentración Profunda</title>`.
  - [ ] Meta description descriptiva y palabras clave.
  - [ ] Open Graph Tags (WhatsApp, Facebook, LinkedIn):
    - `<meta property="og:title" content="COFU - Procrastina Como un Pro" />`
    - `<meta property="og:description" content="Supera la procrastinación con sesiones de enfoque, avatares y batallas comunitarias." />`
    - `<meta property="og:image" content="https://tudominio.com/assets/og-preview.png" />`
    - `<meta property="og:url" content="https://tudominio.com" />`
  - [ ] Twitter Cards (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
- [ ] **Favicon e Iconografía**:
  - [ ] Favicon en `public/favicon.ico`.
  - [ ] Iconos de Apple Touch (`apple-touch-icon.png`).
- [ ] **Manifest Web / PWA (Opcional recomendado)**:
  - [ ] Archivo `manifest.webmanifest` con nombre, tema de color y `display: standalone`.

---

## 6. Seguridad y Políticas

- [ ] **Cabeceras de Seguridad HTTP**:
  - `Content-Security-Policy (CSP)`
  - `X-Frame-Options: DENY` o `SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] **Permisos del Navegador**:
  - [ ] Verificar solicitud no invasiva de permisos de Notificaciones de Escritorio y Reproducción de Audio.
- [ ] **Manejo de Tokens y Sesión**:
  - [ ] Sesiones persistentes de Supabase almacenadas con refresco automático de token (`autoRefreshToken: true`).

---

## 7. Monitorización, Logs y Analítica

- [ ] **Captura de Errores en Tiempo Real**:
  - [ ] Integrar **Sentry** (`@sentry/angular`) o **GlitchTip** para recibir alertas de fallos en producción antes de que los reporten los usuarios.
- [ ] **Analítica Web**:
  - [ ] Instalar herramienta de métricas (Google Analytics 4, PostHog, Plausible o Umami) respetando la privacidad del usuario.
  - [ ] Configurar eventos clave: `registro_completado`, `sesion_enfoque_finalizada`, `upgrade_pro_click`.

---

## 8. Cumplimiento Legal y Términos

- [ ] **Términos y Condiciones de Servicio**:
  - [ ] Explicar reglas de uso, derechos de propiedad intelectual y políticas de cancelación/reembolsos de la membresía Pro.
- [ ] **Política de Privacidad**:
  - [ ] Detallar qué datos se guardan (correo, objetivos de concentración, progreso de juego) y cómo se protegen.
- [ ] **Banner de Consentimiento de Cookies** (si se utilizan herramientas de rastreo analítico de terceros).

---

### ✅ Comando Final de Verificación de Compilación
Ejecuta antes de desplegar:
```bash
npm run build
```
Asegúrate de que la salida final genere el directorio `dist/ProcrastinaComoUnPro` sin errores críticos.
