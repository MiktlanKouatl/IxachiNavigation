
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

          if (uDrawProgress < 1.0) { // Modo Reveal
            float feather = 0.05 / uDrawProgress;
            visibility = smoothstep(uDrawProgress - feather, uDrawProgress, vUv.x);
          } else if (uTraceSegmentLength > 0.0) { // Modo Trace
            float tail = uTraceProgress - uTraceSegmentLength;
            float segmentUv = fract(vUv.x - tail); 
            
            if (segmentUv > uTraceSegmentLength) {
              visibility = 0.0;
            } else {
              float relativeUv = segmentUv / uTraceSegmentLength;
              float fadeFactor = 1.0;
              if (uFadeStyle == 1) { fadeFactor = relativeUv; }
              else if (uFadeStyle == 2) { fadeFactor = sin(relativeUv * PI); }
              else if (uFadeStyle == 3) { fadeFactor = 1.0 - relativeUv; }
              
              visibility = fadeFactor;
            }
          } else { // Caso de línea estática o FollowingLine
            float fadeFactor = 1.0;
            float t = uFadeTransitionSize;

            // Calculamos ambos fades matemáticamente
            float fadeIn = smoothstep(0.0, t, vUv.x);
            float fadeOut = 1.0 - smoothstep(1.0 - t, 1.0, vUv.x);

            // Seleccionamos el factor a usar según el estilo
            if (uFadeStyle == 1) { // FadeIn
                fadeFactor = fadeIn;
            } else if (uFadeStyle == 2) { // FadeInOut
                // Para FadeInOut, queremos el valor más pequeño de los dos fades
                fadeFactor = min(fadeIn, fadeOut);
            } else if (uFadeStyle == 3) { // FadeOut
                fadeFactor = fadeOut;
            }
            visibility = fadeFactor;
          }
          // --- 4. COMBINACIÓN FINAL ---
          finalAlpha *= visibility;
          if (visibility < 0.001) {
            discard;
          }
          gl_FragColor = vec4(finalRgb, finalAlpha);
        }
      