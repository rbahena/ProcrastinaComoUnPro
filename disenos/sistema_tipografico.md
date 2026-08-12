# COFU - Sistema Tipográfico de Marca y Guía de Estilo
**Especialista en Tipografía & Diseñador de Identidad de Marca**
*Agosto 2026*

---

![Guía del Sistema Tipográfico de COFU](file:///C:/Users/ramiro.bahena/.gemini/antigravity-cli/brain/37820e67-a373-4f02-adeb-5559da13b91a/cofu_typography_guide_1786566601639.jpg)

---

## 🎯 Filosofía Tipográfica: Comunicación y Neurociencia

Para un público de **estudiantes y oficinistas** con altas cargas cognitivas que pasan largas horas frente a la pantalla:
1.  **Titulares de Alto Impacto:** Deben motivar, canalizar energía y proyectar innovación tecnológica (*Space Grotesk*).
2.  **Cuerpo de Texto de Alta Legibilidad:** Debe evitar la fatiga visual de lectura extendida mediante espacios amplios entre caracteres y una tipografía limpia y orgánica (*Plus Jakarta Sans*).
3.  **Reflexión / Pausas:** Para los momentos de diagnóstico emocional y de introspección conductual, se utiliza una tipografía clásica de transición que evoca elegancia y autoridad zen (*Lora*).

Afortunadamente, el proyecto ya cuenta con las importaciones necesarias de Google Fonts en su núcleo, por lo que su implementación es directa y con latencia cero.

---

## ✒️ Definición de Fuentes

### 1. Fuente Principal de Exhibición: Space Grotesk
*   **Origen:** Google Fonts (Gratuita y de Código Abierto).
*   **Por qué coincide:** Es una tipografía Sans-Serif con rasgos tecnológicos marcadamente geométricos y proporciones brutalistas refinadas. Proyecta **innovación, energía y autoridad moderna**. Los pequeños "detalles computacionales" de su diseño resuenan profundamente con el público de programadores y entusiastas del entorno gaming.
*   **Uso Recomendado:** Logotipo, H1, H2, contadores de tiempo grandes (Pomodoro) y botones principales de interfaz.

### 2. Fuente Secundaria para Cuerpo: Plus Jakarta Sans
*   **Origen:** Google Fonts (Gratuita y de Código Abierto).
*   **Por qué combina:** Plus Jakarta Sans es un Sans-Serif geométrico contemporáneo con aperturas abiertas y un gran ojo medio (altura de la equis). Combina de manera excepcional con *Space Grotesk* porque suaviza la dureza tecnológica de esta con curvas más cálidas, amigables y legibles. Es sumamente cómoda para leer textos largos en pantallas de computadoras.
*   **Uso Recomendado:** Párrafos de texto, tablas, elementos de formularios, menús laterales, estadísticas y contenido principal de lectura.

### 3. Fuente de Acento: Lora (Serif)
*   **Origen:** Google Fonts (Gratuita y de Código Abierto).
*   **Por qué coincide:** Lora es una tipografía Serif contemporánea con curvas suaves y elegantes. Ofrece un contraste sofisticado e inmediato contra la rigidez de las dos fuentes Sans-Serif. Activa la emoción de **calma, introspección y autoridad humana**.
*   **Uso Recomendado:** Citas motivacionales en el Dojo, consejos de diagnóstico para evitar la procrastinación, tooltips de ayuda y tarjetas reflexivas en "El Espejo" (Fechas).

---

## 📐 Jerarquía y Reglas de Maquetación (Escala Tipográfica)

Para mantener la proporción y balance visual de la interfaz de **COFU**, se establece la siguiente escala de estilos de fuente en CSS:

| Elemento | Fuente | Peso (Weight) | Tamaño (Size) | Altura de Línea (Line-Height) | Espaciado (Letter-Spacing) | Uso |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Title / H1** | Space Grotesk | 700 (Bold) | `38px` / `2.375rem` | `1.2` (46px) | `-0.8px` (tracking cerrado) | Títulos principales de sección |
| **Section Title / H2**| Space Grotesk | 600 (Semi-Bold) | `26px` / `1.625rem` | `1.3` (34px) | `-0.5px` | Títulos de tarjetas o bloques |
| **Widget Title / H3** | Space Grotesk | 500 (Medium) | `18px` / `1.125rem` | `1.4` (25px) | `-0.2px` | Cabeceras de paneles pequeños |
| **Body Text (P)** | Plus Jakarta Sans| 400 (Regular) | `14px` / `0.875rem` | `1.6` (22px) | `0px` | Párrafos generales y lecturas |
| **Sidebar Menu Link**| Plus Jakarta Sans| 500 (Medium) | `13px` / `0.8125rem` | `1.5` (20px) | `0.1px` | Enlaces del menú lateral |
| **Reflection / Quote**| Lora | 500 (Italic) | `16px` / `1.0rem` | `1.6` | `0px` | Textos de apoyo / consejos zen |
| **Micro Text (Muted)**| Plus Jakarta Sans| 400 (Regular) | `11px` / `0.6875rem` | `1.4` | `0.2px` | Metadatos y notas secundarias |

---

## ⚙️ Mejores Prácticas y Combinación

1.  **Contraste de Pesos:** Al emparejar un título en *Space Grotesk* con un texto en *Plus Jakarta Sans*, asegúrate de que el título tenga al menos 200 puntos más de peso tipográfico (ej: Título en weight 700 vs. Cuerpo en weight 400 o 500).
2.  **No abusar del Tracking:** Nunca abras el espaciado entre letras (*letter-spacing*) en tipografías display como *Space Grotesk* a menos que sea para un micro-subtítulo decorativo en mayúsculas. Los títulos grandes siempre se ven mejor con un tracking ligeramente negativo (`-0.8px`) para mayor impacto y cohesión visual.
3.  **Espacio en Blanco Activo:** Deja un margen vertical amplio alrededor de las citas de Lora. Esto da "respiro" y señala visualmente al cerebro que ese bloque de texto requiere una lectura lenta e introspectiva.

---

## 🚨 El Error Común de la Competencia y Cómo lo Evita COFU

*   **El Error:** Abusar de tipografías monoespaciadas rígidas (tipo consola de comandos) o tipografías muy genéricas como *Arial* / *system-ui*. Las primeras cansan el ojo rápidamente debido a su ancho de letra fijo (ideal para programar, terrible para leer prosa), mientras que las segundas le restan emoción e identidad al sitio, haciendo que parezca una herramienta de oficina genérica más.
*   **La Solución de COFU:** *Space Grotesk* mantiene el sabor tecnológico-gamer de forma elegante en los titulares sin penalizar la lectura, mientras que *Plus Jakarta Sans* y *Lora* se encargan de proveer confort visual y humanizar la interacción con la plataforma.
