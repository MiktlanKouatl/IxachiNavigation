
        attribute vec3 previous;
        attribute vec3 next;
        attribute float side;

        varying vec2 vUv;

        uniform vec2 uResolution;
        uniform float uWidth;

        void main() {
          vUv = uv;

          // --- 1. Proyectamos los 3 puntos al espacio de la pantalla ---
          vec4 prevProjected = projectionMatrix * modelViewMatrix * vec4(previous, 1.0);
          vec4 currentProjected = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec4 nextProjected = projectionMatrix * modelViewMatrix * vec4(next, 1.0);

          // --- 2. Calculamos la dirección y la normal en el espacio 2D de la pantalla ---
          vec2 currentScreen = currentProjected.xy / currentProjected.w;
          vec2 prevScreen = prevProjected.xy / prevProjected.w;
          vec2 nextScreen = nextProjected.xy / nextProjected.w;

          vec2 dir;
          if (abs(currentScreen.x - prevScreen.x) < 0.0001 && abs(currentScreen.y - prevScreen.y) < 0.0001) {
            // Si el punto actual y el anterior son el mismo (inicio de la línea)
            dir = normalize(nextScreen - currentScreen);
          } else if (abs(currentScreen.x - nextScreen.x) < 0.0001 && abs(currentScreen.y - nextScreen.y) < 0.0001) {
            // Si el punto actual y el siguiente son el mismo (fin de la línea)
            dir = normalize(currentScreen - prevScreen);
          } else {
            // Mitering: promediamos las direcciones para suavizar las esquinas
            vec2 dir1 = normalize(currentScreen - prevScreen);
            vec2 dir2 = normalize(nextScreen - currentScreen);
            dir = normalize(dir1 + dir2);
          }

          
          
          vec2 normal = vec2(-dir.y, dir.x);

          // --- 3. Corregimos el aspecto de la pantalla y aplicamos el ancho ---
          normal.x /= uResolution.x / uResolution.y; // Corrección de aspect ratio
          float width = uWidth * (1.0 / currentProjected.w); // Hacemos el ancho más pequeño si está lejos
          
          // --- 4. Desplazamos el vértice y lo devolvemos al espacio 3D ---
          currentProjected.xy += normal * side * width;
          
          gl_Position = currentProjected;
        }
      