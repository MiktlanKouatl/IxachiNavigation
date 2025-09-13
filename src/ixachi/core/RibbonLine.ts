import * as THREE from 'three';
import vertexShader from '../shaders/ribbon.vert.glsl?raw';
import fragmentShader from '../shaders/ribbon.frag.glsl?raw';

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
        uWidth: { value: config.width }, // El ancho ahora es un uniform, podemos cambiarlo en tiempo real.
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }, // Pasamos la resolución para corregir el aspecto del ancho.
        uDrawProgress: { value: 1.0 },
        uTraceProgress: { value: 0.0 },
        uTraceSegmentLength: { value: 0.0 },
      },

      // El Vertex Shader construye la geometría.
      vertexShader: vertexShader,
      
      // El Fragment Shader no necesita cambios, ¡sigue funcionando igual!
      fragmentShader: fragmentShader,
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