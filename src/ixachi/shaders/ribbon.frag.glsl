
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
            if (uFadeStyle == 1) { fadeFactor = vUv.x; }
            else if (uFadeStyle == 2) { fadeFactor = sin(vUv.x * PI); }
            else if (uFadeStyle == 3) { fadeFactor = 1.0 - vUv.x; }
            visibility = fadeFactor;
          }
          
          // --- 4. COMBINACIÓN FINAL ---
          if (visibility < 0.001) {
            discard;
          }
          
          gl_FragColor = vec4(finalRgb, finalAlpha * visibility);
        }
      