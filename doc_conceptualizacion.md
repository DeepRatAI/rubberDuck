# Documento de Conceptualización: 
*Red Social Open Source para el ecosistema Tech y Dev*

### 1. Resumen Ejecutivo
Una red social de código abierto diseñada exclusivamente para desarrolladores, ingenieros, investigadores y apasionados de la computación. La plataforma fusiona el espíritu colaborativo del Open Source con herramientas de creación de contenido de estado del arte (SOTA). Busca ser el punto de encuentro definitivo para compartir conocimiento técnico, publicar proyectos, reclutar talento y consumir noticias de alta calidad, dentro de un ecosistema libre de toxicidad, enfocado en el crecimiento profesional y regido por su propia comunidad.

### 2. Filosofía y Reglas de Interacción
*   **Identidad:** Relajada pero rigurosamente científica.
*   **Tolerancia Cero a la Toxicidad:** Eliminación de fricciones negativas. No existen funcionalidades de "Dislike", "Downvote" ni contadores de rechazo.
*   **Interacciones Core Permitidas:**
    *   **Seguir (Follow):** Para suscribirse a la actividad de un usuario.
    *   **Mostrar Interés (Show Interest):** Equivalente a un "Like" para los posteos ligeros del feed.
    *   **Agradecer (Thanks):** Una métrica de alto valor otorgada a creadores por cursos/tutoriales que aportaron valor real.
    *   **Reportar (Report - *Backend*):** Herramienta privada y silenciosa para denunciar spam o código malicioso, manteniendo la limpieza de la red sin generar disputas públicas.

### 3. Audiencia y Onboarding Inteligente
*   **Público Objetivo:** Ingenieros de software, desarrolladores, perfiles de IA/Data, estudiantes y entusiastas tecnológicos.
*   **Proceso de Registro:** A través de Google OAuth, GitHub o correo tradicional.
*   **User Onboarding:** Flujo de primera clase diseñado para perfilar al usuario (stack tecnológico, intereses, nivel de seniority, ubicación, situación laboral). Estos datos son el combustible del algoritmo de recomendación y del sistema de búsqueda de talento (CoWork).

### 4. Identity Hub (Perfil de Usuario)
El centro de operaciones y portafolio digital del usuario.
*   **Personalización UI:** Modificación estética total del perfil (avatar, banner, paleta de colores y texturas de la página).
*   **Información y Métricas:** Nombre, biografía, estado actual (ej. "Buscando empleo", "Enfocado"), disponibilidad, redes externas, métodos de contacto y ubicación.
*   **Inventario de Activos:** Pestañas para "Publicaciones Propias", "Cursos Creados", "Cursos Completados", y "Borradores" (privado).
*   **Gamificación y Reputación:** Visualización del contador histórico de "Thanks" recibidos, cantidad de seguidores y Badges (insignias por hitos en la plataforma).
*   **Privacy Control:** Modal de configuración granular. El usuario tiene control absoluto sobre qué métricas, datos y pestañas son públicas, privadas o visibles solo para seguidores.

### 5. Joya de la Corona: Cursos y Tutoriales
Un ecosistema de aprendizaje bidireccional con un estándar de edición superior al mercado actual.
*   **Creador/Editor SOTA:** 
    *   Interfaz web avanzada con jerarquías de texto, embebido dinámico de video/imágenes y URLs.
    *   **Integración Jupyter Nativa:** Inserción de celdas de código 100% funcionales, permitiendo ejercicios ejecutables y autocorregibles in-situ.
    *   Creación de visualizaciones y gráficos interactivos directamente en el artículo.
    *   Autoguardado y gestión de "Borradores" para sesiones largas de escritura.
*   **Vía de Carga Alternativa (.ipynb):** 
    *   Carga directa de archivos Jupyter desde el ordenador. Se presentan con portada, título y descripción. Incluyen un botón "Open" que despliega el recurso en una nueva pestaña (integración con Google Colab o entorno propio).
*   **Consumo y Visualización (Modo Lectura):**
    *   Estética inmersiva tipo "Documentación Oficial", con índice de contenidos lateral interactivo.
    *   **Botones de Acción:** "Export" (Como Repo de GitHub o a Drive), "Save" (Guardar en perfil), y el botón de "Thanks".
*   **Sistema de Completitud y Telemetría:**
    *   *Feedback Inmediato:* Las celdas notifican el éxito o error de un ejercicio al instante de su ejecución.
    *   *Check de Finalización:* Un curso se marca "Completado" al cumplir dos condiciones: Scroll del 100% en todas las secciones + Ejecución exitosa de todos los ejercicios.
    *   *Triggers Automáticos:* Al completarse, aumenta el contador de "Veces Completado" del curso, se añade al perfil del estudiante, notifica al creador y envía un recordatorio ("Nudge") al estudiante para que deje sus "Thanks".

### 6. Binnacle (El Feed Social e Interactivo)
Un feed cronológico optimizado para consumo rápido, con soporte para imágenes, videos, enlaces y formato de texto básico. 
*   **Sistema de Comentarios (El GAP cerrado):** Cada publicación en Binnacle soporta hilos de respuestas anidadas con soporte para fragmentos de código (Markdown), vital para resolver dudas técnicas.
*   **Categorías de Publicación (Filtros Core):**
    1.  **News:** Compartir artículos y novedades.
    2.  **Project:** Mostrar proyectos, ideas o solicitar feedback.
    3.  **Help:** Solicitudes puntuales de asistencia (debugging, arquitectura, etc.).
    4.  **CoWork:** Matchmaking puro; búsqueda de socios o devs para proyectos.
    5.  **Meta (Nuevo):** Espacio dedicado para discutir el desarrollo Open Source, proponer features y reportar bugs de la propia red social.

### 7. Arquitectura de Descubrimiento y Home
*   **Motores de Búsqueda:** Búsqueda y filtrado independiente para la sección *Cursos* y la sección *Binnacle*, fuertemente basados en **Keywords y Hashtags**.
*   **Landing Page (No Logueados):** Una pieza de ingeniería visual exquisita. Diseñada para enamorar a perfiles técnicos y lograr una altísima tasa de conversión al registro.
*   **Main Feed (Logueados):** 
    *   Un "blend" elegante entre contenido generado por los usuarios (Binnacle + Nuevos Cursos) y **Noticias RSS automatizadas** de fuentes tecnológicas de primer nivel. 
    *   Este sistema resuelve el problema del "feed vacío" en las etapas iniciales y garantiza contenido fresco, curado y legible desde el día uno.

### 8. Infraestructura de Retención (Notificaciones)
*   Un centro de notificaciones (campana) que informa sobre interacciones clave: nuevos seguidores, respuestas en hilos de Binnacle, "Thanks" recibidos, y confirmaciones de cursos completados por terceros.

---
