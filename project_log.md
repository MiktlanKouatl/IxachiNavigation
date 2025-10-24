# Project Log - Ixachi Navigation

## Vision General

Estamos construyendo una experiencia web interactiva para el sitio de Ixachi. La idea principal es crear un "universo de ideas" que guíe al usuario a través de una narrativa visual, comenzando con una simple "sinapsis" y creciendo hasta convertirse en un complejo sistema de cardúmenes de `RibbonLine` que finalmente revelan el logo de Ixachi.

La filosofía clave es el **rendimiento**. Todas las decisiones de implementación deben priorizar la eficiencia para garantizar una experiencia fluida en una amplia gama de dispositivos.

## Plan de Desarrollo

Nuestro plan de desarrollo se divide en los siguientes pasos:

1.  **Escena de Prueba de Sinapsis (Versión de CPU):**
    *   **Objetivo:** Implementar la mecánica básica de la "sinapsis" para validar el concepto visual y la interacción.
    *   **Componentes:**
        *   **Nodos:** Se implementarán como **billboards** (quads 2D que siempre miran a la cámara) para un rendimiento óptimo, en lugar de esferas 3D.
        *   **Pulso Sináptico:** Una `RibbonLine` viajará de un nodo a otro.
        *   **Disparo de Nodo:** El nodo de destino se "iluminará" cuando la `RibbonLine` llegue.
        *   **Seguimiento de Trayectoria:** Se utilizará un mecanismo simple de seguimiento de ruta para guiar la `RibbonLine`.

2.  **Escena de Prueba de Flocking en GPU:**
    *   **Objetivo:** Implementar un sistema de flocking de alto rendimiento que se ejecute completamente en la GPU.
    *   **Componentes:**
        *   **Almacenamiento de Datos:** Los datos de los boids (posición, velocidad, etc.) se almacenarán en `THREE.DataTexture`s.
        *   **Cálculos en GPU:** La lógica de flocking (separación, alineación, cohesión) se escribirá en un shader GLSL (compute shader o fragment shader).
        *   **Actualización de `RibbonLine`:** El vertex shader de la `RibbonLine` leerá las posiciones de los boids directamente desde las texturas de datos.

3.  **Integración y Refinamiento:**
    *   **Objetivo:** Combinar el sistema de flocking en GPU con la escena de sinapsis y otras escenas planificadas.
    *   **Tareas:**
        *   Generar cardúmenes a partir de nodos "disparados".
        *   Implementar diferentes comportamientos de cardúmenes (tranquilo, agitado, etc.).
        *   Crear la transición final de zoom-out para revelar el logo de Ixachi.

## Próximos Pasos Inmediatos

1.  **Crear la `10_synapse_test.ts`:** Crear una nueva escena de prueba para la sinapsis (versión de CPU).
2.  **Implementar Nodos (Billboards):** Añadir dos billboards a la escena para que sirvan como nodos.
3.  **Implementar la `RibbonLine` Viajera:** Crear una `RibbonLine` y hacer que siga una ruta simple entre los dos nodos.
4.  **Implementar el Disparo de Nodo:** Hacer que el nodo de destino cambie de apariencia (por ejemplo, color) cuando la `RibbonLine` llegue a él.
