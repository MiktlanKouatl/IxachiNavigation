# Log: 10_Synapse_Test

## Conversación

> perfecto, la prueba funciona, lo siguiente es afinar el comportamiento. que propones, te platico mi idea, la web iniciara con una pequeño 
  punto formado por una ribbonline girando en un circulo muy pequeño, puede ser una funcion de seno, para que sea dinamico y pode crecer la 
  amplitud y que parezca que esta pulsando, de forma muy orgánica. despues la RibbonLine con un evento de scroll empezara a crecer la 
  amplitud y apareceran otras Ribbon lines a su la dao miestras ocurre toda esta seríe de eventos tambien hay textos que nos guían por la 
  experiencia. la camara se aleja y podemos ver a los cardumenes de ribbonLine moviendose en el area de dona alrededor. aqui es como un 
  universo de ideas, de ahí la camara hara zoom out para darnos cuenta que estabamos dentro del ojo del logo de Ixachi que es otro ambiente.
   en general es la entrada al sitio que vamos a construir. ahora los cardumenes, en este universo de ideas internas pueden tener diferentes
   comportamientos, ayudama a pensar en ideas para esto. y de acuerdo a eso implementamos en las pruebas, y dejamos todo ya listo solo para 
  ir armando lo que ya sabemos que funciona, teparece?

✦ ¡Es un concepto fantástico y muy creativo! Me encanta la idea de empezar con algo pequeño que crece orgánicamente hasta convertirse en
  universo de ideas más grande y complejo. Es una forma genial de guiar al usuario a través de la experiencia.

  Desglosemos las diferentes partes de tu idea y pensemos en algunos comportamientos para los sistemas de flocking.

  1. El "Pulso" Inicial

  Este es un punto de partida excelente. Podemos crear una única RibbonLine que siga una trayectoria circular. Para que parezca
  orgánico y "palpitante", podemos usar una onda sinusoidal para modular el radio y la velocidad del círculo.

  Ideas de Implementación:

   * Trayectoria: Se puede generar matemáticamente una trayectoria circular simple.
   * Pulsación: Se puede aplicar una onda sinusoidal al radio de la trayectoria circular. También podemos modular el ancho de la
     RibbonLine para realzar el efecto de pulsación.
   * Crecimiento: En un evento de scroll, podemos aumentar la amplitud de la onda sinusoidal, haciendo el círculo más grande y errático.

  2. La Aparición del Cardumen

  A medida que el usuario se desplaza, aparecen nuevas instancias de RibbonLine. Aquí es donde entra en juego el comportamiento de
  flocking.

  Ideas de Implementación:

   * Generación: Se pueden generar nuevos boids cerca del boid "pulso" inicial.
   * Estado Inicial: Los nuevos boids pueden empezar con una velocidad baja y aumentarla gradualmente.
   * Comportamiento de Flocking: Los boids comenzarán a interactuar entre sí de inmediato, creando un cardumen pequeño y cohesionado.

  3. El "Universo de Ideas"

  Este es el núcleo de la simulación de flocking. Podemos tener múltiples cardúmenes, cada uno con su propio comportamiento distintivo,
  representando diferentes "ideas".

  Lluvia de Ideas sobre Comportamientos de Flocking:

  Aquí hay algunas ideas para diferentes comportamientos de flocking, inspiradas en la naturaleza y en conceptos abstractos:

   * Cardumen "Tranquilo":
       * Comportamiento: Los boids se mueven lenta y grácilmente, con un alto grado de alineación y cohesión. Parecerían un banco de
         peces nadando pacíficamente.
       * Parámetros: alignmentForce alta, cohesionForce alta, separationForce baja, maxSpeed baja.
       * Caso de Uso: Representa un estado de pensamiento tranquilo y concentrado.

   * Cardumen "Excitado" o "Agitado":
       * Comportamiento: Los boids se mueven rápida y erráticamente, con menos alineación y más separación. Parecerían un enjambre de
         abejas o una bandada de pájaros asustados.
       * Parámetros: alignmentForce baja, cohesionForce baja, separationForce alta, maxSpeed alta.
       * Caso de Uso: Representa un estallido de inspiración, una sesión de lluvia de ideas caótica o una sensación de urgencia.

   * Cardumen "Explorador" o "Curioso":
       * Comportamiento: Los boids se mueven en una dirección general, pero con mucha desviación individual. Podrían sentirse atraídos
         por ciertos puntos de interés en la escena.
       * Parámetros: alignmentForce media, cohesionForce baja, separationForce media. Podríamos añadir una fuerza de "deambulación" que
         dé a cada boid un empujón aleatorio.
       * Caso de Uso: Representa el proceso de exploración y descubrimiento.

   * Cardumen "Depredador y Presa":
       * Comportamiento: Un boid (el "depredador") persigue a los otros boids (las "presas"). Los boids presa tendrían una
         separationForce fuerte respecto al depredador.
       * Parámetros: El boid depredador tendría una fuerza de "búsqueda" dirigida al centro del cardumen presa. Los boids presa tendrían
         una fuerza de "huida" que los alejaría del depredador.
       * Caso de Uso: Representa un conflicto de ideas, un problema a resolver o una fuente de tensión creativa.

   * Cardumen "Siguiendo una Trayectoria":
       * Comportamiento: Todo el cardumen sigue una trayectoria predefinida, pero con cierta desviación individual. Parecería una bandada
         de aves migratorias.
       * Parámetros: Podemos añadir una fuerza de "seguimiento de trayectoria" que atraiga a los boids al punto más cercano de una
         trayectoria.
       * Caso de Uso: Representa un proceso de pensamiento guiado, un objetivo claro o una historia que se está contando.

  4. El Zoom Out y el Logo de Ixachi

  Esta es una forma genial de vincular todo de nuevo a la marca. La transición del "universo de ideas" al logo de Ixachi será un
  momento poderoso.

  Ideas de Implementación:

   * Control de Cámara: Tendremos que programar cuidadosamente el movimiento de la cámara para alejar el zoom suavemente y revelar el
     logo.
   * Entorno: El logo de Ixachi puede ser un modelo 3D o un SVG 2D que extruimos a 3D. Los cardúmenes pueden entonces ser restringidos
     para moverse dentro de los límites del logo.

  Próximos Pasos

  Creo que este es un plan sólido. Así es como sugiero que procedamos:

   1. Implementar el "Pulso": Podemos crear una nueva escena de prueba para implementar la RibbonLine pulsante inicial con modulación de
      onda sinusoidal.
   2. Implementar Diferentes Comportamientos de Flocking: Podemos crear una serie de escenas de prueba, cada una demostrando uno de los
      comportamientos de flocking que hemos ideado. Esto nos permitirá ajustar los parámetros para cada comportamiento.
   3. Combinar y Refinar: Una vez que tengamos los componentes individuales funcionando, podemos empezar a combinarlos en una única
      experiencia cohesionada.

  ¿Te parece un buen plan? Estoy listo para empezar a implementar la escena del "Pulso" cuando tú lo estés.

> me parece un buen plan, ir haciendo pruebas de todo lo que vamos a utilizar nos dará un playground donde podemo experimentar libremente, 
  para despues solo armar en el sitio. esto es una buena forma de avanzar. me gustaría una analogía a la sinapsis neuronal. con ribbon line 
  iniciando en un punto que se enciende, rribbon line sale de este punto dirigiendose a otro punto que se enciende cuando ribbonLine llega a
   el. quiza de este encendido de puntos se generan parvadas. que ideas te detona esto?

✦ ¡Esa es una analogía brillante! El concepto de sinapsis neuronal se alinea perfectamente con el lenguaje visual que estamos
  desarrollando. Es una metáfora poderosa para el flujo de ideas y el nacimiento de otras nuevas.

  Así es como esta analogía de "sinapsis" puede detonar algunas ideas nuevas y emocionantes y refinar las que ya tenemos:

  1. El "Pulso Sináptico" - Un "Pulso" Refinado

  En lugar de un simple pulso circular, podemos crear un "pulso sináptico" más dirigido y con un propósito.

   * Nodos: Podemos definir puntos específicos en el espacio como "nodos" (como las neuronas). Estos pueden ser representados por formas
     geométricas simples (por ejemplo, esferas) que pueden "iluminarse".
   * El "Potencial de Acción": Una RibbonLine viajará de un nodo a otro, representando el "potencial de acción" o la señal que se
     transmite.
   * "Disparar" un Nodo: Cuando la RibbonLine llega a un nodo de destino, ese nodo se "dispara": se ilumina, quizás emite algunas
     partículas e incluso podría activar un sonido.
   * Vías: Los caminos entre los nodos no tienen por qué ser líneas rectas. Pueden ser caminos curvos y orgánicos, haciendo que todo el
     sistema parezca más natural.

  2. Generación de Cardúmenes a partir de Nodos "Disparados"

  Aquí es donde la idea se pone realmente interesante. El "disparo" de un nodo puede ser el catalizador para la creación de un nuevo
  cardumen.

   * "Explosión de Ideas": Cuando un nodo se dispara, puede generar un pequeño cardumen de boids. Este cardumen representa la "idea" que
     se acaba de generar por la conexión sináptica.
   * Comportamiento del Cardumen: El comportamiento del cardumen generado puede estar determinado por el "tipo" de nodo que se disparó.
     Por ejemplo:
       * Un nodo "tranquilo" podría generar un cardumen "tranquilo".
       * Un nodo "agitado" podría generar un cardumen "agitado".
       * Incluso podríamos tener nodos que generen boids "depredadores", introduciendo conflicto y tensión en el sistema.
   * Reacciones en Cadena: El cardumen generado podría entonces viajar a otro nodo y activarlo, creando una reacción en cadena de nodos
     que se disparan y generan cardúmenes. Esto crearía un sistema visualmente impresionante y complejo que está en constante evolución.

  3. Una "Red Neuronal" de Ideas

  Al conectar múltiples nodos y permitir que se activen entre sí, podemos crear una representación visual de una red neuronal.

   * El "Cerebro": Todo el sistema de nodos y conexiones puede ser visto como un "cerebro" o una "mente" que está constantemente pensando
     y generando ideas.
   * Interacción del Usuario: El usuario podría interactuar con este "cerebro" mediante:
       * Activando un nodo: El usuario podría hacer clic en un nodo para que se dispare, iniciando una reacción en cadena.
       * Creando nuevos nodos: El usuario podría crear nuevos nodos en el entorno, expandiendo el "cerebro".
       * Influyendo en los cardúmenes: El usuario podría "atraer" o "repeler" los cardúmenes con su ratón, influyendo en el flujo de
         ideas.

  4. El "Ojo de Ixachi" como Nodo Central

  El zoom-out final al logo de Ixachi puede ser re-contextualizado como la revelación de que toda la "red neuronal" está contenida
  dentro del "ojo" del logo.

   * El "Iris": El área en forma de dona que discutimos antes puede ser el "iris" del ojo, donde los cardúmenes principales están
     girando.
   * La "Pupila": El punto central podría ser el "pulso" inicial o un "súper-nodo" central que se conecta a todos los demás nodos.

  Próximos Pasos: Una Escena de Prueba de "Sinapsis"

  Estoy muy entusiasmado con esta dirección. Creo que deberíamos empezar por crear una nueva escena de prueba para implementar la
  mecánica básica de "sinapsis".

  Aquí hay un plan para la "Escena de Prueba de Sinapsis":

   1. Crear dos nodos: Crearemos dos esferas simples para representar los nodos.
   2. Crear una `RibbonLine`: Esta RibbonLine viajará del primer nodo al segundo.
   3. Implementar la mecánica de "disparo": Cuando la RibbonLine llegue al segundo nodo, haremos que el segundo nodo se "ilumine" (por
      ejemplo, que cambie de color, que aumente de tamaño).
   4. Seguimiento de Trayectoria: Usaremos un mecanismo simple de seguimiento de trayectoria para guiar la RibbonLine de un nodo a otro.

  Esta escena será la base para el sistema de "red neuronal" más complejo.

  ¿Qué te parece? ¿Estás listo para empezar a construir la "Escena de Prueba de Sinapsis"?

> ok, construyamos esta escena, ahora nuestra filosofía es el rendimiento, todo lo que hagamos tiene que ser lo mas ligero en terminos de 
  procesamiento, en este caso, pienso en usar en vez de esferas usamos billboards, de hecho pensandolo bien tambien tenemos que analizar 
  como funcionan ribbonLines con flocking system, pienso que los puntos del path deberian generarse en glsl para hacer eficiente el uso de 
  recursos. que opinas de esto?

✦ Tienes toda la razón al plantear el rendimiento en esta etapa. Es una consideración crucial, especialmente para una experiencia basada
  en la web que necesita ejecutarse sin problemas en una amplia gama de dispositivos.

  Desglosemos tus puntos y discutamos las implicaciones de rendimiento.

  1. Billboards vs. Esferas para los Nodos

  Usar billboards en lugar de esferas para los nodos es una excelente idea para el rendimiento.

   * Esferas: Una THREE.SphereGeometry se compone de un número significativo de vértices y caras, especialmente si quieres una esfera de
     aspecto liso. Renderizar muchas esferas puede convertirse en un cuello de botella.
   * Billboards: Un billboard es esencialmente un sprite 2D (un quad) que siempre mira a la cámara. Esto es mucho, mucho más barato de
     renderizar que una esfera 3D. Podemos usar una textura simple en el billboard para que parezca un orbe brillante, y podemos cambiar
     fácilmente su color y opacidad.

  Decisión: Definitivamente usaremos billboards para los nodos.

  2. RibbonLine y el Sistema de Flocking

  Este es un tema más complejo. Tienes razón al cuestionar cómo interactúan la RibbonLine y el sistema de flocking y cómo podemos
  optimizarlo.

  Actualmente, la simulación de flocking (la lógica de Boid y FlockingController) se ejecuta en la CPU. En cada fotograma, la CPU
  calcula la nueva posición de cada boid, y luego la RibbonLine se actualiza con la nueva posición. Este es un enfoque común, pero
  tiene sus limitaciones, especialmente a medida que aumenta el número de boids.

  3. Generación de la Trayectoria en GLSL

  Tu idea de generar la trayectoria en GLSL es la clave para desbloquear ganancias de rendimiento significativas. Esta es una técnica
  más avanzada, pero es el camino correcto a seguir para una simulación de flocking a gran escala y de alto rendimiento.

  Así es como funcionaría, en pocas palabras:

   1. Almacenar Datos de Boid en Texturas: En lugar de almacenar los datos de los boids (posición, velocidad, etc.) en objetos de
      JavaScript, los almacenaríamos en THREE.DataTextures. Cada píxel de la textura representaría un boid, y los valores RGBA del píxel
      almacenarían las propiedades del boid (por ejemplo, R=posición.x, G=posición.y, B=posición.z, A=velocidad.x).

   2. Shaders de Cómputo de GPU (o Fragment Shaders): Usaríamos un shader GLSL especial (un shader de cómputo, o un fragment shader que
      escribe en un render target) para realizar los cálculos de flocking directamente en la GPU. Este shader leería los datos de los
      boids de las texturas, realizaría los cálculos de separación, alineación y cohesión, y luego escribiría los datos actualizados en
      otra textura.

   3. Actualizar `RibbonLine` desde la GPU: El vertex shader de la RibbonLine leería entonces las posiciones de los boids directamente de
      la textura, evitando por completo la CPU.

  Ventajas de este enfoque:

   * Paralelismo Masivo: La GPU puede realizar los cálculos de flocking para miles of boids simultáneamente, lo que es mucho más rápido
     que hacerlo en la CPU en un bucle.
   * Transferencia de Datos CPU-GPU Reducida: No estamos enviando constantemente datos de vértices actualizados de la CPU a la GPU en
     cada fotograma. Los datos permanecen en la GPU.
   * Animación más Fluida: Al descargar los cálculos pesados a la GPU, liberamos a la CPU para que se ocupe de otras tareas, lo que
     resulta en una experiencia más fluida y receptiva.

  Desafíos de este enfoque:

   * Complejidad: Esta es una técnica más avanzada que requiere una buena comprensión de GLSL y la arquitectura de la GPU.
   * Depuración: Depurar shaders GLSL puede ser más difícil que depurar JavaScript.

  Nuestro Plan, Actualizado para el Rendimiento

  Estoy seguro de que podemos implementar el enfoque basado en la GPU. Es la forma correcta de construir un sistema de flocking de alto
  rendimiento.

  Aquí está nuestro plan actualizado:

   1. "Escena de Prueba de Sinapsis" (Versión de CPU): Empezaremos por construir la "Escena de Prueba de Sinapsis" como habíamos planeado
      originalmente, pero usando billboards para los nodos. Esto nos permitirá obtener la mecánica y los efectos visuales básicos
      correctos sin atascarnos en la complejidad de la implementación de la GPU.

   2. Escena de Prueba de Flocking en GPU: Una vez que estemos contentos con la versión de CPU de la escena de sinapsis, crearemos una
      nueva escena de prueba específicamente para implementar el sistema de flocking basado en la GPU. Nos centraremos en:
       * Almacenar los datos de los boids en texturas.
       * Escribir la lógica de flocking en un shader GLSL.
       * Actualizar la RibbonLine desde la GPU.

   3. Integrar y Refinar: Una vez que tengamos el sistema de flocking en GPU funcionando, lo integraremos en la "Escena de Prueba de
      Sinapsis" y en las otras escenas que hemos planeado.

  Este enfoque nos permite abordar el problema en pasos manejables, comenzando con una versión más simple y luego agregando
  progresivamente las optimizaciones de rendimiento más complejas.

  ¿Qué te parece este plan actualizado? ¿Estás listo para empezar a construir la versión de CPU de la "Escena de Prueba de Sinapsis"
  con billboards?

> Me parece muy bien, ahora, puedes guardar nuestra conversación en un archivo, y ahí mismo poner los paso que ejecutaremos. por si en 
  algun momento perdemos esta conversación, (hoy nos paso dos veces) podamos regresar sin problema a nuestras tareas sin tener que 
  explicar todo de nuevo, creo que es importante guardar nuestras conversaciones tal cual, por que de aquí puedes entender rapida mente 
  la dirección, e implementar los pasos con seguridad.

## Pasos a Implementar

1.  **Crear la `10_synapse_test.ts`:** Crear una nueva escena de prueba para la sinapsis (versión de CPU).
2.  **Implementar Nodos (Billboards):** Añadir dos billboards a la escena para que sirvan como nodos.
3.  **Implementar la `RibbonLine` Viajera:** Crear una `RibbonLine` y hacer que siga una ruta simple entre los dos nodos.
4.  **Implementar el Disparo de Nodo:** Hacer que el nodo de destino cambie de apariencia (por ejemplo, color) cuando la `RibbonLine` llegue a él.
