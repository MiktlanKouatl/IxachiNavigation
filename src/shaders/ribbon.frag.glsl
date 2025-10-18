
        uniform vec3 uColor;
        uniform vec3 uColorEnd;
        uniform float uTime;
        uniform int uFadeStyle;
        uniform int uRenderMode;
        uniform float uOpacity;
        uniform float uColorMix;
        uniform float uTransitionSize;
        uniform float uDrawProgress;
        uniform float uTraceProgress;
        uniform float uTraceSegmentLength;
        uniform float uFadeTransitionSize;
        uniform int uUseMode;

        varying vec2 vUv;
        const float PI = 3.14159265359;

        void main() {
          // --- 1. CÁLCULO DE COLOR BASE ---
          float mixFactor = clamp(smoothstep(uColorMix - uTransitionSize, uColorMix, vUv.x), 0.0, 1.0);
          vec3 finalRgb = mix(uColor, uColorEnd, mixFactor);
          
          // --- 2. CÁLCULO DE OPACIDAD BASE (RenderMode) ---
          float finalAlpha = uOpacity;
          if (uRenderMode == 0) { // Modo Glow
            float distanceToCenter = abs(vUv.y - 0.5) * 2.0;
            float strength = 1.0 - distanceToCenter;
            float glow = pow(strength, 2.5);
            float pulse = (sin(uTime * 5.0) + 1.0) / 2.0;
            pulse = pulse * 0.4 + 0.6;
            finalAlpha *= glow * pulse;
          }
          
          // --- 3. CÁLCULO DE VISIBILIDAD (Reveal & Trace & FadeStyle) ---
          float visibility = 1.0;

        // MODO 0: STATIC
        // Dibuja una línea completa, aplicando los fades de los extremos si se especifica.
        if (uUseMode == 0) {
            float t = uFadeTransitionSize;
            if (t > 0.0) {
                float fadeIn = smoothstep(0.0, t, vUv.x);
                float fadeOut = 1.0 - smoothstep(1.0 - t, 1.0, vUv.x);

                if (uFadeStyle == 1) { visibility = fadeIn; }
                else if (uFadeStyle == 2) { visibility = min(fadeIn, fadeOut); }
                else if (uFadeStyle == 3) { visibility = fadeOut; }
            }
        }
        // MODO 1: REVEAL
        // Anima el dibujado de la línea de principio a fin.
        else if (uUseMode == 1) {
            float feather = 0.05; // Un borde suave y constante
            // La lógica correcta para "dibujar hasta" el punto de progreso.
            visibility = 1.0 - smoothstep(uDrawProgress - feather, uDrawProgress, vUv.x);
        }
        // MODO 2: TRAIL
        // Para una estela dinámica, la visibilidad es siempre 1.0. La longitud
        // se controla desde TypeScript cambiando el número de puntos.
        else if (uUseMode == 2) {
            visibility = 1.0;
        }
        // MODO 3: TRACE
        // Anima una "chispa" que recorre una línea ya dibujada.
        else if (uUseMode == 3) {
            // 1. Creamos una nueva coordenada UV que "se desplaza" hacia atrás en el tiempo.
    // La función fract() asegura que el valor siempre esté entre 0 y 1, creando un loop perfecto.
    float movingUv = fract(vUv.x - uTraceProgress);

    // 2. Definimos dónde está la chispa en este nuevo sistema de coordenadas.
    // La dibujaremos siempre al final del rango (de 0.85 a 1.0, si el largo es 0.15).
    float sparkStart = 1.0 - uTraceSegmentLength;
    float feather = 0.01; // Un borde muy pequeño y nítido para la chispa

    // 3. Usamos smoothstep para dibujar la chispa.
    // Es un "pulso" que se activa cuando movingUv está en el rango correcto.
    float spark = smoothstep(sparkStart - feather, sparkStart, movingUv) - smoothstep(1.0 - feather, 1.0, movingUv);
    
    visibility = spark;
        }

        // --- 4. COMBINACIÓN FINAL ---
        finalAlpha *= visibility;
        if (finalAlpha < 0.001) {
            discard;
        }

        gl_FragColor = vec4(finalRgb, finalAlpha);
}
      