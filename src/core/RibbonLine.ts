import * as THREE from 'three';

// --- ENUMS E INTERFACES (SIN CAMBIOS) ---
export enum RenderMode {
  Glow,
  Solid,
}

export enum FadeStyle {
  None,
  FadeIn,
  FadeInOut,
  FadeOut,
}

export interface RibbonConfig {
  color: THREE.Color;
  width: number;
  maxLength: number;
  fadeStyle?: FadeStyle;
  renderMode?: RenderMode;
  opacity?: number;
  colorEnd?: THREE.Color;
  transitionSize?: number;
}


export class RibbonLine {
  public mesh: THREE.Mesh;
  public material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;

  private currentPoints: THREE.Vector3[] = [];

  constructor(config: RibbonConfig) {
    console.log('🚧 Creando RibbonLine v3.0 GPU-Powered...');
    
    this.geometry = new THREE.BufferGeometry();
    
    const maxPoints = config.maxLength;
    // Pre-alocamos los buffers para los nuevos atributos
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPoints * 3 * 2), 3));
    this.geometry.setAttribute('previous', new THREE.BufferAttribute(new Float32Array(maxPoints * 3 * 2), 3));
    this.geometry.setAttribute('next', new THREE.BufferAttribute(new Float32Array(maxPoints * 3 * 2), 3));
    this.geometry.setAttribute('side', new THREE.BufferAttribute(new Float32Array(maxPoints * 1 * 2), 1));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(maxPoints * 2 * 2), 2));
    
    const indices = [];
    for (let i = 0; i < maxPoints - 1; i++) {
        const n = i * 2;
        indices.push(n, n + 1, n + 2);
        indices.push(n + 2, n + 1, n + 3);
    }
    this.geometry.setIndex(indices);


    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      
      uniforms: {
        uColor: { value: config.color },
        uColorEnd: { value: config.colorEnd ?? config.color },
        uTime: { value: 0 },
        uFadeStyle: { value: config.fadeStyle ?? FadeStyle.FadeIn },
        uRenderMode: { value: config.renderMode ?? RenderMode.Glow },
        uOpacity: { value: config.opacity ?? 1.0 },
        uColorMix: { value: 1.0 },
        uTransitionSize: { value: config.transitionSize ?? 0.1 },
        // 👇 NUEVO: El ancho ahora es un uniform, podemos cambiarlo en tiempo real.
        uWidth: { value: config.width },
        // Pasamos la resolución para corregir el aspecto del ancho.
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },

      // 👇 CAMBIO MASIVO: El Vertex Shader ahora construye la geometría.
      vertexShader: `
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
      `,
      
      // El Fragment Shader no necesita cambios, ¡sigue funcionando igual!
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uColorEnd;
        uniform float uTime;
        uniform int uFadeStyle;
        uniform int uRenderMode;
        uniform float uOpacity;
        uniform float uColorMix;
        uniform float uTransitionSize;
        
        varying vec2 vUv;
        const float PI = 3.14159265359;

        void main() {
          // --- 1. CÁLCULO DE COLOR BASE (AHORA ES UNIVERSAL) ---
          float mixFactor = smoothstep(uColorMix - uTransitionSize, uColorMix, vUv.x);
          vec3 finalRgb = mix(uColor, uColorEnd, mixFactor);

          // --- 2. CÁLCULO DE DESVANECIMIENTO (AHORA ES UNIVERSAL) ---
          float tailFade = 1.0;
          if (uFadeStyle == 1) { tailFade = vUv.x; }
          else if (uFadeStyle == 2) { tailFade = sin(vUv.x * PI); }
          else if (uFadeStyle == 3) { tailFade = 1.0 - vUv.x; }

          // --- 3. CÁLCULO DE OPACIDAD DEPENDIENTE DEL MODO ---
          float modeAlpha = 1.0;
          if (uRenderMode == 0) { // MODO GLOW
            float distanceToCenter = abs(vUv.y - 0.5) * 2.0;
            float strength = 1.0 - distanceToCenter;
            float glow = pow(strength, 2.5);
            float pulse = (sin(uTime * 5.0) + 1.0) / 2.0;
            pulse = pulse * 0.4 + 0.6;
            modeAlpha = glow * pulse;
          }
          // Para el Modo Solid (1), modeAlpha se queda en 1.0, así que no necesitamos un else.

          // --- 4. COMBINACIÓN FINAL ---
          float finalAlpha = modeAlpha * tailFade * uOpacity;
          
          gl_FragColor = vec4(finalRgb, finalAlpha);
        }
      `,
    });
    
    if ((config.renderMode ?? RenderMode.Glow) === RenderMode.Glow) {
      this.material.blending = THREE.AdditiveBlending;
    } else {
      this.material.blending = THREE.NormalBlending;
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    
    // 👇 NUEVO: Escuchamos el evento de redimensionar para actualizar la resolución.
    window.addEventListener('resize', () => {
        this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });
    
    console.log('✅ RibbonLine v3.0 creada.');
  }

  public update(points: THREE.Vector3[]): void {
    this.currentPoints = points;
    this.updateGeometry();
  }
  
  public setOpacity(opacity: number): void {
    this.material.uniforms.uOpacity.value = opacity;
  }

  // 👇 CAMBIO: setWidth ahora solo actualiza un uniform. ¡Es instantáneo!
  public setWidth(width: number): void {
    this.material.uniforms.uWidth.value = width;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
  
  // 👇 CAMBIO: `buildMesh` ahora se llama `updateGeometry` y solo prepara los datos.
  private updateGeometry(): void {
    const points = this.currentPoints;
    if (points.length < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const prevAttr = this.geometry.attributes.previous as THREE.BufferAttribute;
    const nextAttr = this.geometry.attributes.next as THREE.BufferAttribute;
    const sideAttr = this.geometry.attributes.side as THREE.BufferAttribute;
    const uvAttr = this.geometry.attributes.uv as THREE.BufferAttribute;

    for (let i = 0; i < points.length; i++) {
        const i2 = i * 2;

        const prevPoint = points[i - 1] || points[0];
        const currentPoint = points[i];
        const nextPoint = points[i + 1] || points[points.length - 1];

        // Vértice izquierdo
        posAttr.setXYZ(i2, currentPoint.x, currentPoint.y, currentPoint.z);
        prevAttr.setXYZ(i2, prevPoint.x, prevPoint.y, prevPoint.z);
        nextAttr.setXYZ(i2, nextPoint.x, nextPoint.y, nextPoint.z);
        sideAttr.setX(i2, -1);
        uvAttr.setXY(i2, i / (points.length - 1), 0);

        // Vértice derecho
        posAttr.setXYZ(i2 + 1, currentPoint.x, currentPoint.y, currentPoint.z);
        prevAttr.setXYZ(i2 + 1, prevPoint.x, prevPoint.y, prevPoint.z);
        nextAttr.setXYZ(i2 + 1, nextPoint.x, nextPoint.y, nextPoint.z);
        sideAttr.setX(i2 + 1, 1);
        uvAttr.setXY(i2 + 1, i / (points.length - 1), 1);
    }
    
    posAttr.needsUpdate = true;
    prevAttr.needsUpdate = true;
    nextAttr.needsUpdate = true;
    sideAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
    
    this.geometry.setDrawRange(0, (points.length - 1) * 6);
  }
}