Ixachi Navigation - Arquitectura y Hoja de Ruta del Proyecto
1. Visión General y Propósito
Ixachi Navigation es un motor cinemático web diseñado para crear experiencias narrativas inmersivas y de alto rendimiento. El propósito de este proyecto es dar vida al logo y la misión de Ixachi a través de una animación coreografiada en 4 actos, contando una historia visual que va "De la Visión Interna a la Proyección Externa".

El motor está construido sobre una arquitectura modular y orientada a objetos, priorizando la reutilización de componentes, la escalabilidad y la separación de responsabilidades.

2. Arquitectura del Motor Cinemático
El sistema se organiza en torno a un director de escena (SceneDirector) que orquesta varios módulos especializados.

main.ts (Punto de Entrada):

Inicializa el entorno 3D básico (Renderer, Scene, Camera).

Crea una instancia del SceneDirector.

Inicia el bucle de animación principal, que delega cada update al SceneDirector.

SceneDirector (El Director de Orquesta):

Es el cerebro de la cinemática. Gestiona la secuencia de actos y escenas.

Utiliza una máquina de estados para controlar el acto actual (LOADING, INTRO, ACT_1_EYE, ACT_2_HANDS, ACT_3_TEMPLE, OUTRO).

Coordina a los demás managers para ejecutar las acciones de cada escena.

AssetManager (El Ut utilero):

Responsable de la carga de todos los recursos externos (.glb, .svg, texturas, etc.).

Utiliza el LoadingManager de Three.js para rastrear el progreso de la carga.

Emite eventos cuando los recursos están listos, permitiendo al UIManager mostrar una barra de progreso.

TimelineManager (El Coreógrafo):

Utiliza una librería como GSAP para crear y controlar líneas de tiempo complejas.

Define las animaciones de cámara, las transiciones de shaders, la aparición/desaparición de líneas y otros eventos sincronizados para cada acto.

SceneManager (El Escenógrafo):

Gestiona los elementos visuales de la escena 3D.

Controla el entorno: color de fondo, niebla, luces.

Contiene y dirige al LineManager y al CameraController.

LineManager (El Director de Personajes):

Orquesta la creación, actualización y destrucción de todos los sistemas de líneas (RibbonLine).

Recibe órdenes del SceneDirector (ej. "crear enjambre para el ojo", "dibujar el templo").

CameraController (El Operador de Cámara):

Gestiona la posición, rotación y movimientos de la cámara.

Ejecuta las animaciones de cámara definidas en el TimelineManager (ej. zoom in, travelling, paneo).

UIManager (El Comunicador):

Gestiona todos los elementos de la interfaz de usuario en HTML/CSS.

Muestra la pantalla de carga, el botón de "Iniciar Experiencia" y cualquier otro texto o elemento interactivo.

3. Estructura de Archivos Propuesta
Propongo la siguiente organización de carpetas para mantener nuestro código limpio y escalable:

/src
├── /assets
│   ├── /models (ixachi_logo.glb, etc.)
│   └── /svg (paths.svg)
│
├── /ixachi
│   ├── /core (Clases fundamentales y reutilizables)
│   │   ├── IMotionSource.ts
│   │   ├── ILineController.ts
│   │   ├── RibbonLine.ts
│   │   └── PathData.ts
│   │
│   ├── /managers (Los orquestadores de alto nivel)
│   │   ├── SceneDirector.ts
│   │   ├── AssetManager.ts
│   │   ├── TimelineManager.ts
│   │   ├── SceneManager.ts
│   │   └── LineManager.ts
│   │
│   ├── /strategies (Implementaciones concretas de movimiento)
│   │   ├── PathFollower.ts
│   │   ├── TrailController.ts
│   │   └── ... (otros controladores futuros)
│   │
│   ├── /utils (Clases de ayuda)
│   │   ├── SVGParser.ts
│   │   └── ModelPathExtractor.ts
│   │
│   ├── /ui (Componentes de la interfaz de usuario)
│   │   └── UIManager.ts
│   │
│   └── main.ts (Punto de entrada principal)
│
└── /shaders
    ├── ribbon.vert.glsl
    └── ribbon.frag.glsl
4. Hoja de Ruta de Desarrollo (Roadmap)
Avanzaremos de forma segura y estructurada, acto por acto.

Fase 0: Pre-Producción (¡Completada!)
[x]  Definición de la arquitectura base (RibbonLine, PathData, PathFollower, TrailController, LineManager).

[x]  Creación de parsers para SVG y modelos GLB.

[x]  Estabilización y prueba de los componentes centrales.

Fase 1: El Director y la Puesta en Escena
Crear el AssetManager:

Implementar la lógica para cargar todos los modelos y SVGs necesarios para la cinemática completa.

Configurar el LoadingManager de Three.js.

Crear el UIManager:

Diseñar una pantalla de carga con una barra de progreso que se actualice con el AssetManager.

Añadir un botón "Iniciar Experiencia" que aparezca al finalizar la carga.

Implementar el SceneDirector:

Crear la máquina de estados básica para los actos.

Conectar el AssetManager y el UIManager. La experiencia no comenzará hasta que todo esté cargado y el usuario haga clic.

Refactorizar main.ts:

Limpiar el punto de entrada para que solo cree e inicie el SceneDirector.

Fase 2: Acto I - El Microcosmos del Ojo
Timeline del Acto 1: Usar GSAP en el TimelineManager para definir la secuencia:

Fade in desde negro.

La cámara inicia muy cerca, dentro del "microcosmos" oscuro.

El SceneDirector ordena al LineManager crear el enjambre de partículas que forman el ojo (createLineSwarm).

Animar la cámara para que se aleje lentamente, revelando la forma completa del ojo.

Efectos Visuales:

Asegurar que las RibbonLine del enjambre tengan el RenderMode.Glow para crear un efecto etéreo y vibrante.

Jugar con la animación de pulso (ribbon.pulse(true)) para dar vida al ojo.

Fase 3: Acto II y III - Las Manos y el Templo
Transición al "Lienzo":

El SceneDirector ordenará al SceneManager una transición suave del fondo de negro a blanco.

Simultáneamente, cambiar el blending de las RibbonLine de AdditiveBlending a NormalBlending para que se vean sólidas sobre el fondo blanco.

Timeline de los Actos 2 y 3:

El SceneDirector ordena al LineManager que destruya el enjambre del ojo.

Inmediatamente, se ordena la creación de las formas estáticas de las manos y luego el templo, usando createStaticShape o una variante.

Coreografiar el "dibujado" de estas formas usando el uniform uDrawProgress en el shader, animado vía GSAP.

La cámara continúa su movimiento hacia atrás para enmarcar el logo completo.

Fase 4: El Final y los Detalles
Texto y Outro:

Una vez que el logo está completamente formado, usar TextPlugin de GSAP o TextGeometry de Three.js para mostrar el nombre "Ixachi".

Definir la animación final: mantener el logo en pantalla por un momento y luego hacer un fade out a blanco.

Optimización y Pulido:

Revisar el rendimiento en cada fase, especialmente durante las transiciones.

Ajustar el timing, los easings y los colores para lograr el máximo impacto emocional y visual.