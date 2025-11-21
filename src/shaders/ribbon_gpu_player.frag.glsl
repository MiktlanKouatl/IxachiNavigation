// ribbon_gpu_player.frag.glsl

uniform vec3 uColor;
uniform vec3 uColorEnd;
uniform int uFadeStyle;
uniform int uRenderMode;
uniform float uOpacity;
uniform float uColorMix;
uniform float uTransitionSize;
uniform float uFadeTransitionSize;

varying vec2 vUv;
varying float vTrailUv;
varying float v_visibility;

void main() {
  // If the vertex shader determined this particle is not visible, discard immediately.
  // This is a more robust way to handle visibility.
  if (v_visibility < 0.5) {
    discard;
  }

  // --- 1. CÁLCULO DE COLOR BASE ---
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