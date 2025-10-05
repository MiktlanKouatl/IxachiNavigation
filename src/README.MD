Proyecto Ixachi: Herramienta de Venta Interactiva
1. Concepto y Visión Creativa
Concepto Central: "El Flujo de la Comunicación"

Narrativa: La experiencia es un viaje cinemático e interactivo que simboliza el proceso de desarrollo personal y profesional que ofrece Ixachi. Partimos de una "chispa" interna de potencial (una idea, una visión) y la acompañamos en su viaje hacia el exterior, dándole forma, estructura y poder a través de las técnicas de "Prescénica". El usuario no navega por una web, sino que dirige y descubre un flujo de energía creativa.

Simbología del Logo como Hilo Conductor:

El logo de Ixachi no es un simple gráfico estático; es el mapa de nuestra experiencia. Cada componente se revela progresivamente para construir un significado más profundo:

El Ojo Central (La Visión): Representa la consciencia, la atención y el potencial interno. Es el punto de partida de toda comunicación efectiva.

Las Manos Protectoras (La Técnica): Simbolizan la práctica, las herramientas y las power skills que Ixachi enseña para guiar y proteger el mensaje.

El Templo Piramidal (La Estructura): Es la base metodológica, el espacio de aprendizaje donde se produce la transformación y desde donde fluye el conocimiento.

El Flujo "Ixachi" (La Abundancia): El resultado final es un flujo constante y generoso de comunicación efectiva que emana de una base sólida, impactando positivamente el entorno.

2. El Viaje del Cliente: Coreografía de la Experiencia
Describimos la interacción del usuario como un viaje continuo a través de una única escena 3D, dividida en cuatro actos.

Acto I: La Chispa (El Ojo) - El Inicio
Escena: El usuario aterriza en un espacio 3D oscuro y minimalista. En el centro, una pequeña esfera de luz pulsa suavemente, como una respiración. Es un ambiente íntimo y expectante. El eslogan principal aparece flotando sutilmente: "Igual de importante que el mensaje es la forma en que lo transmites".

Interacción: Al primer scroll o clic del usuario, la cámara inicia un lento viaje hacia atrás. La esfera de luz central cobra vida y de ella emana una RibbonLine brillante que comienza a trazar un camino, guiando a la cámara.

Mensaje: "Todo empieza con una visión interna."

Acto II: El Camino de la Presencia (Las Manos) - El Taller
Escena: Mientras la cámara sigue a la RibbonLine principal, dos estelas secundarias se dibujan a su alrededor, trazando la forma de las "manos" del logo. Dentro de este espacio protegido, aparecen textos 3D elegantes que nombran los Power Skills (Oratoria, Respiración Consciente, etc.) a medida que la línea pasa junto a ellos. La línea principal puede cambiar sus propiedades (color, grosor, velocidad del pulso) para reflejar cada concepto.

Interacción: El scroll del usuario controla el progreso a lo largo de este camino, permitiéndole explorar a su ritmo.

Mensaje: "Te damos las herramientas prácticas (las manos) para dar forma y poder a tu comunicación."

Acto III: El Ecosistema de Habilidades (El Templo) - Los Módulos
Escena: La cámara completa el camino principal y realiza un último movimiento de retroceso para revelar la imagen completa: el ojo y las manos están en la cima de una base piramidal (el templo). Desde esta base emanan 5 caminos de luz distintos, cada uno representando un módulo opcional.

Interacción: El usuario ahora tiene control orbital para explorar este "mapa de conocimiento". Al pasar el mouse sobre un camino, este se ilumina y muestra el nombre del módulo. Al hacer clic, la cámara viaja de forma cinemática por ese camino para mostrar la información del módulo.

Mensaje: "Nuestra metodología es una base sólida desde la cual puedes expandir tus habilidades."

Acto IV: La Abundancia (El Flujo "Ixachi") - La Misión y Clientes
Escena: Durante todo el viaje, un enjambre de miles de partículas de luz (RibbonLineGPU) emana de la base del templo y fluye hacia el exterior, llenando el fondo de la escena de forma sutil y hermosa. Los logos de los clientes satisfechos aparecen y desaparecen elegantemente dentro de este flujo.

Interacción: Una sección dedicada o un camino final lleva al usuario a los textos de "Misión" y "Contacto". Al llegar a "Contacto", el enjambre de fondo converge hacia la información, creando un poderoso llamado a la acción.

Mensaje: "Compartimos conocimiento en abundancia para generar un impacto real."

3. Roadmap Técnico y Plan de Acción
Este es el desglose de tareas para materializar nuestra visión.

✅ Fase 0: Pre-producción y Activos
[ ] Definir y finalizar todos los textos (copywriting) para cada sección.

[ ] Modelado 3D (Blender):

[ ] Modelar el logo 3D de forma descompuesta: Ojo, Mano Izquierda, Mano Derecha, Base del Templo.

[ ] Crear y nombrar los 6 caminos (Path_): 1 principal y 5 para los módulos.

[ ] Exportar todo en un único archivo .glb optimizado (usando compresión Draco).

🚀 Fase 1: El Lienzo y el Protagonista
[ ] Configurar la escena principal de Three.js (main.ts): renderer, cámara, luces base, atmósfera.

[ ] Implementar el ModelPathExtractor para cargar el .glb y obtener la geometría del logo y los caminos.

[ ] Implementar la animación del "Acto I":

[ ] Posicionar la cámara inicialmente "dentro" del ojo.

[ ] Crear la esfera de luz pulsante inicial.

[ ] Animar la transición de la cámara hacia atrás al interactuar el usuario.

[ ] Animar el nacimiento y movimiento de la RibbonLine principal desde el centro.

🛠️ Fase 2: El Viaje Guiado y la Narrativa Visual
[ ] Implementar la lógica para que la cámara siga a un PathFollower a lo largo del camino principal.

[ ] Sincronizar el scroll del usuario con el progress del PathFollower de la cámara.

[ ] Integrar la librería Troika.js para renderizar texto 3D de alto rendimiento.

[ ] Posicionar los textos de los "Power Skills" en el espacio 3D a lo largo del camino.

[ ] Crear funciones en RibbonLine que permitan transiciones suaves de sus uniforms (ej. ribbon.changeColor(newColor, duration)).

[ ] Implementar los triggers para que la RibbonLine cambie sus propiedades al pasar por los textos.

🎮 Fase 3: Interactividad y Exploración
[ ] Implementar los controles orbitales de cámara para cuando el usuario llegue al "Acto III".

[ ] Implementar Raycasting para detectar el hover del mouse sobre las mallas de los módulos.

[ ] Programar los efectos visuales de hover (iluminación, pulso de la línea, aparición de texto).

[ ] Programar la transición de la cámara para seguir los caminos de los módulos al hacer clic.

[ ] Diseñar y maquetar la vista de información para cada módulo.

✨ Fase 4: Atmósfera y Pulido Final
[ ] Implementar el sistema RibbonLineGPU como enjambre de fondo, asegurándose de que las partículas emanen de la base del templo.

[ ] Integrar la sección de logos de clientes en el "Acto IV".

[ ] Implementar la animación final de convergencia para la sección de "Contacto".

[ ] Realizar pruebas de rendimiento exhaustivas en diferentes dispositivos y optimizar donde sea necesario.