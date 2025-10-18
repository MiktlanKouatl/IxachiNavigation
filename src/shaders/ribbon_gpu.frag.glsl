// ribbon.frag.glsl (Versión Final para RibbonLineGPU)

uniform vec3 uColor;
uniform vec3 uColorEnd;
uniform int uFadeStyle;
uniform int uRenderMode;
uniform float uOpacity;
uniform float uColorMix;
uniform float uTransitionSize;
uniform float uFadeTransitionSize;

varying vec2 vUv;
// [!code ++] La declaración clave que faltaba en tu archivo
varying float vTrailUv;

void main() {
  // --- 1. CÁLCULO DE COLOR BASE ---
  // El ColorMix sigue usando vUv.x porque se aplica a la textura completa
  float mixFactor = clamp(smoothstep(uColorMix - uTransitionSize, uColorMix, vUv.x), 0.0, 1.0);
  vec3 finalRgb = mix(uColor, uColorEnd, mixFactor);
  
  // --- 2. CÁLCULO DE OPACIDAD BASE (RenderMode) ---
  float finalAlpha = uOpacity;
  if (uRenderMode == 0) { // Modo Glow
    float distanceToCenter = abs(vUv.y - 0.5) * 2.0;
    float strength = 1.0 - distanceToCenter;
    float glow = pow(strength, 2.5);
    finalAlpha *= glow;
  }
  
  // --- 3. CÁLCULO DE VISIBILIDAD (FadeStyle) ---
  float visibility = 1.0;
  
  float fadeFactor = 1.0;
  float t = uFadeTransitionSize;

  // [!code ++] Lógica de FADE corregida para usar vTrailUv
  float fadeIn = smoothstep(0.0, t, vTrailUv);
  float fadeOut = 1.0 - smoothstep(1.0 - t, 1.0, vTrailUv);

  if (uFadeStyle == 1) { // FadeIn
      fadeFactor = fadeIn;
  } else if (uFadeStyle == 2) { // FadeInOut
      fadeFactor = min(fadeIn, fadeOut);
  } else if (uFadeStyle == 3) { // FadeOut
      fadeFactor = fadeOut;
  }
  visibility = fadeFactor;

  // --- 4. COMBINACIÓN FINAL ---
  finalAlpha *= visibility;

  if (finalAlpha < 0.001) {
    discard;
  }
  
  gl_FragColor = vec4(finalRgb, finalAlpha);
}