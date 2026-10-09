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
    - `profiles`: Solo lectura pública de datos básicos (avatar, username, puntos); solo el dueño puede editar su propio perfil (con trigger de protección de columnas administrativas `is_premium`, `stripe_customer_id`).
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

- [x] **Cabeceras de Seguridad HTTP (en `.htaccess` de Hostinger)**:
  - [x] `X-Frame-Options: DENY` (Anti-Clickjacking).
  - [x] `X-Content-Type-Options: nosniff` (Anti-MIME Sniffing).
  - [x] `Referrer-Policy: strict-origin-when-cross-origin`.
  - [x] `Strict-Transport-Security` (HSTS para forzado de HTTPS).
  - [x] `Permissions-Policy` (Bloqueo de sensores innecesarios).
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

- [ ] **Captura de Errores en Tiempo Real**:
  - [ ] Integrar **Sentry** (`@sentry/angular`) o **GlitchTip** para recibir alertas de fallos en producción antes de que los reporten los usuarios.
- [ ] **Analítica Web**:
  - [ ] Instalar herramienta de métricas (Google Analytics 4, PostHog, Plausible o Umami) respetando la privacidad del usuario.
  - [ ] Configurar eventos clave: `registro_completado`, `sesion_enfoque_finalizada`, `upgrade_pro_click`.

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
