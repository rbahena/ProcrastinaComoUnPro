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

- [x] **Políticas RLS (Row Level Security)**:
  - [x] Verificar que RLS esté activo en todas las tablas principales:
    - `profiles`: Solo lectura pública; solo el dueño puede editar su configuración estética (trigger blindado que resetea y prohíbe alteración de `pro_coins`, `focus_points`, `is_premium`, medallas y rachas).
    - `user_unlocked_items`: Solo lectura pública; inserciones directas revocadas para evitar bypass de ProCoins (compras exclusivas vía `buy_catalog_item`).
    - `user_quality_progress`: Solo lectura pública; escrituras directas revocadas (avance exclusivo vía `advance_user_quality_progress`).
    - `focus_sessions`: Los usuarios solo pueden insertar y leer sus propias sesiones.
    - `ideas`: Privado al 100% por usuario (`auth.uid() = user_id`).
    - `motivations`: Lectura pública; inserción validada (5-280 caracteres), actualización y eliminación estrictamente restringidas al autor original.
    - `boss_battles`: Lectura pública; feed de daño restringido al autor real (`auth.uid() = user_id`) y curación/daño controlado por RPC.
- [x] **Autenticación y Correos**:
  - [x] Configurado servidor SMTP personalizado en Supabase con Resend (`smtp.resend.com:587`, dominio `cofu.io` verificado con SPF, DKIM y DMARC en Hostinger).
  - [x] Personalizadas plantillas de correo con branding de COFU (Invitaciones, Confirmación de cuenta y Recuperación de contraseña).
  - [x] En *Authentication > URL Configuration > Site URL*, establecido `https://cofu.io`.
  - [x] Agregadas a **Redirect URLs** permitidas: `https://cofu.io/**`, `https://cofu.io/login` y `http://localhost:4200/**`.
  - [x] Implementado flujo y modal automático en `/login` para captura de token de recuperación (`type=recovery`) y actualización segura de contraseña.
- [x] **Funciones RPC y Seguridad de Gamificación**:
  - [x] Mover la adjudicación de ProCoins, XP y daño/curación al Boss a funciones PostgreSQL (`SECURITY DEFINER`) (`settle_focus_session`, `deal_boss_damage`, `heal_boss_from_distraction`, `buy_catalog_item`, etc.) para evitar que usuarios manipulen llamadas directas desde la consola del navegador.
- [x] **Canales Realtime**:
  - [x] Validar cuotas y límites de presencia/WebSockets (200 conexiones concurrentes y 2M mensajes/mes validados como suficientes para la fase de lanzamiento).

---

## 2. Configuración de Entornos y Angular

- [x] **Archivo de Entorno de Producción (`src/environments/environment.ts`)**:
  - [x] Cambiar la bandera: `production: true`.
  - [x] Configurar `fileReplacements` en `angular.json` para que `environment.development.ts` (`production: false`) se use automáticamente en modo desarrollo.
  - [x] Verificar que `supabaseUrl` y `supabaseAnonKey` estén listos para producción.
- [x] **Presupuestos y Optimización en `angular.json`**:
  - [x] Ajustar los `budgets` de compilación (`initial`: 1MB / 2MB, `anyComponentStyle`: 150kB / 300kB) para generar `0 warnings` al ejecutar `npm run build`.
  - [x] Verificar que la minificación y el `outputHashing: "all"` estén activos.
- [x] **Optimización de Assets (Multimedia y Sonido)**:
  - [x] Audios de fondo (`.mp3`, `.m4a`): Verificado streaming y bitrates ligeros.
  - [x] Videos Zen de fondo (`.mp4`): Verificado video `auto.mp4` (< 4 MB).
  - [x] Identificar assets pesados (imágenes PNG/GIF > 10MB) para compresión web o carga diferida según sea necesario.

---

## 3. Monetización y Pagos (Suscripciones Pro)

- [x] **Precios en Dólares (USD) con Conversión Automática**:
  - [x] Precios unificados y directos en USD ($4.49 USD/mes y $2.99 USD/mes en plan anual con 33% de ahorro).
  - [x] Conversión automática a moneda local gestionada por Stripe Checkout y el banco emisor de la tarjeta.
  - [x] Interfaz limpia sin selectores manuales de divisa ni fluctuación de tipos de cambio.
- [x] **Pasarela de Pago (Stripe Checkout) & Período de Prueba de 7 Días**:
  - [x] Reemplazada la simulación cliente por integración con Edge Function `stripe-checkout` y llamadas seguras mediante `SupabaseService.createStripeCheckoutSession()`.
  - [x] Configurado período de prueba gratuito nativo de 7 días (`trial_period_days: 7`) con cobro de $0.00 al inicio y cobro recurrente automático al 7mo día.
  - [x] Soporte para creación automática o vinculación de clientes Stripe (`stripe_customer_id`) y generación de sesiones de suscripción periódicas con Stripe Checkout.
  - [x] Portal de Clientes de Stripe integrado (`stripe-portal` / `SupabaseService.createStripePortalSession()`) para autoservicio, cambio de tarjeta o cancelación inmediata.
- [x] **Webhooks de Suscripción Blindados (`stripe-webhook`)**:
  - [x] Creada Edge Function de Supabase (`supabase/functions/stripe-webhook/index.ts`) con verificación criptográfica de firma `stripe-signature` y `STRIPE_WEBHOOK_SECRET`.
  - [x] Manejo de eventos:
    - Evento `checkout.session.completed` -> Activa `is_premium = true`, guarda `stripe_customer_id`, `stripe_subscription_id` y `premium_until` en `profiles`.
    - Evento `customer.subscription.updated` -> Sincroniza estado de suscripción y nueva fecha de vencimiento.
    - Evento `customer.subscription.deleted` -> Desactiva suscripción (`is_premium = false`).
    - Evento `invoice.payment_succeeded` -> Extiende `premium_until`.
    - Evento `invoice.payment_failed` -> Registra alerta de cobro.
  - [x] Índices creados en PostgreSQL (`idx_profiles_stripe_customer_id`, `idx_profiles_stripe_subscription_id`) y blindaje de columnas en el trigger `check_profile_column_permissions()`.

---

## 4. Hosting, Dominio y Redirecciones SPA

- [x] **Reglas de Reescritura / Redirección SPA**:
  - [x] Configurado archivo `.htaccess` en `public/` para **Hostinger (Apache/LiteSpeed)** con redirección automática de todas las rutas (`/enfoque`, `/medallero`, `/ideas`, `/login`) hacia `index.html` para evitar error 404.
- [ ] **Dominio Personalizado y Certificado SSL**:
  - [ ] Configurar dominio en el panel de Hostinger y activar SSL gratuito (Let's Encrypt).
  - [x] Reglas de forzado HTTPS y HSTS incluidas en `.htaccess`.

---

## 5. SEO, Metadatos y PWA

- [x] **Metadatos en `index.html`**:
  - [x] Título final: `<title>COFU - Pomodoro Gamificado y Concentración Profunda</title>`.
  - [x] Meta description y keywords configuradas.
  - [x] Open Graph Tags configuradas para WhatsApp, Facebook, LinkedIn (`og:title`, `og:description`, `og:image`, `og:site_name`).
  - [x] Twitter Cards configuradas (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
- [x] **Favicon e Iconografía**:
  - [x] Favicon y Apple Touch Icon vinculados.
- [x] **Manifest Web / PWA y Optimización de Dispositivo**:
  - [x] Archivo `public/manifest.webmanifest` creado con colores y metadatos PWA.
  - [x] Implementado aviso elegante para dispositivos móviles recomendando la experiencia óptima en pantalla de escritorio/laptop.

---

## 6. Seguridad y Políticas

- [x] **Cabeceras de Seguridad HTTP y Servidor (en `.htaccess` de Hostinger)**:
  - [x] `Options -Indexes` (Desactiva exploración de directorios).
  - [x] Bloqueo `<FilesMatch>` para archivos sensibles (`.env`, `.sql`, `.md`, `.git`, `.log`).
  - [x] `X-Frame-Options: DENY` (Anti-Clickjacking).
  - [x] `X-Content-Type-Options: nosniff` (Anti-MIME Sniffing).
  - [x] `Referrer-Policy: strict-origin-when-cross-origin`.
  - [x] `Strict-Transport-Security` (HSTS para forzado de HTTPS).
  - [x] `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=*` (Permite checkout Stripe).
  - [x] `Content-Security-Policy` (CSP configurada para Supabase, Google Analytics y Google Fonts).
- [x] **Permisos del Navegador**:
  - [x] Reproducción de alarmas y sonidos ambientales vinculados a gestos y acciones del usuario (cumple con políticas de autoplay del navegador).
- [x] **Manejo de Tokens y Sesión**:
  - [x] Sesiones persistentes de Supabase con refresco automático de token (`persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`).
- [x] **Guardas de Rutas Angular (Route Guards)**:
  - [x] `authGuard`: Bloqueo y protección de las 11 rutas privadas (`/home`, `/enfoque`, `/medallero`, `/ideas`, `/membresia`, etc.) para usuarios no autenticados, redirigiendo a `/login`.
  - [x] `guestGuard`: Redirección automática a `/home` para usuarios ya autenticados al visitar `/login` o `/registro`.
  - [x] `focusDeactivateGuard`: Protección anti-abandono en `/enfoque` para prevenir salida accidental durante un Pomodoro activo.

---

## 7. Monitorización, Logs y Analítica

- [x] **Analítica Web y Telemetría (Google Analytics 4 / Telemetría Ligera)**:
  - [x] Implementado servicio [analytics.service.ts](file:///C:/Users/ramiro.bahena/Desktop/Codes/RBAHENA/ProcrastinaComoUnPro/src/app/services/analytics.service.ts) con inyección dinámica y soporte para ID de medición `G-XXXXXXXXXX`.
  - [x] Registro automático de vistas de página (`page_view`) en cada cambio de ruta Angular SPA.
  - [x] Eventos de negocio configurados: `trackSignup` (email/Google), `trackLogin`, `trackFocusCompleted` y `trackUpgradeProClick`.
- [ ] **Captura de Errores en Tiempo Real (Sentry / GlitchTip)**:
  - Aplazado para etapas avanzadas de escalado con alto volumen de tráfico.

---

## 8. Cumplimiento Legal y Términos

- [x] **Términos y Condiciones de Servicio**:
  - [x] Implementado modal interactivo con reglas de juego limpio, naturaleza del servicio, propiedad intelectual y políticas de membresía Pro y cancelación.
- [x] **Política de Privacidad**:
  - [x] Detallado el tratamiento de datos (correo, progreso, notas), seguridad en Supabase (RLS y cifrado) y procesamiento seguro de pagos con Stripe.
- [x] **Accesibilidad y Enlaces Legales**:
  - [x] Enlaces interactivos integrados en la pantalla de `/registro` y en el pie de página de `/landing`.

---

### ✅ Comando Final de Verificación de Compilación
Ejecuta antes de desplegar:
```bash
npm run build
```
Asegúrate de que la salida final genere el directorio `dist/ProcrastinaComoUnPro` sin errores críticos.
