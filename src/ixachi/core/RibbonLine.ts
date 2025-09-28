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
  fadeTransitionSize?: number; 
}


export class RibbonLine {
  public mesh: THREE.Mesh;
  public material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;
  private currentPoints: THREE.Vector3[] = [];
  private maxPoints: number;
  private isPulsing: boolean = false; // propiedad de estado para la animación

  constructor(config: RibbonConfig) {
    console.log('🚧 Creando RibbonLine v3.0 GPU-Powered...');
    
    this.geometry = new THREE.BufferGeometry();
    
    const maxPoints = config.maxLength;
    this.maxPoints = maxPoints;
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
        uFadeTransitionSize: { value: config.fadeTransitionSize ?? 0.1 },
      },

      // El Vertex Shader construye la geometría.
      vertexShader: vertexShader,
      
      // El Fragment Shader hace el render final.
      fragmentShader: fragmentShader,
    });
    
    if ((config.renderMode ?? RenderMode.Glow) === RenderMode.Glow) {
      this.material.blending = THREE.AdditiveBlending;
    } else {
      this.material.blending = THREE.NormalBlending;
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    
    // Escuchamos el evento de redimensionar para actualizar la resolución.
    window.addEventListener('resize', () => {
        this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });
    
    console.log('✅ RibbonLine v3.0 creada.');
  }

  //método de actualización para la lógica visual
    public update(elapsedTime: number): void {
        if (!this.isPulsing) return;
        if (!this.material.uniforms.transitionSize || !this.material.uniforms.uColorMix) {
            return;
        }
        // --- LÓGICA DE ANIMACIÓN (antes en main.ts) ---
        const oscillation = (Math.sin(elapsedTime * 0.8) + 1) / 2;
        const transitionSize = this.material.uniforms.transitionSize.value;
        const totalTravelRange = 1.0 + transitionSize;
        const colorMixProgress = oscillation * totalTravelRange;

        this.material.uniforms.uColorMix.value = colorMixProgress;
    }
  
  /*
  * Inicia o detiene la animación de pulso en la línea.
  * @param start - Si es verdadero, inicia el pulso; si es falso, lo detiene.
  */
  public pulse(start: boolean): void {
      this.isPulsing = start;
  }

  /**
  * Actualiza los puntos que definen la forma de la línea.
  * Este método es el corazón de la actualización visual para líneas dinámicas.
  * @param points - Un array de Vector3 que representa la nueva forma de la línea.
  */
  public setPoints(points: THREE.Vector3[]): void {
    this.currentPoints = points;
    this.updateGeometry();
  }
  /*
  * Actualiza la opacidad de la línea.
  * @param opacity - Nueva opacidad (0.0 a 1.0).
  */
  public setOpacity(opacity: number): void {
    this.material.uniforms.uOpacity.value = opacity;
  }

  /*
  * Actualiza el ancho de la línea.
  * @param width - Nuevo ancho de la línea.
  */
  public setWidth(width: number): void {
    this.material.uniforms.uWidth.value = width;
  }
  /*
  * Obtiene el número máximo de puntos que la línea puede manejar.
  * Útil para sistemas que necesitan conocer la capacidad máxima de la línea.
  */
  public getMaxPoints(): number {
    return this.maxPoints;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
  
  // `updateGeometry` prepara los datos.
  private updateGeometry(): void {
    const points = this.currentPoints;
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const prevAttr = this.geometry.attributes.previous as THREE.BufferAttribute;
    const nextAttr = this.geometry.attributes.next as THREE.BufferAttribute;
    const sideAttr = this.geometry.attributes.side as THREE.BufferAttribute;
    const uvAttr = this.geometry.attributes.uv as THREE.BufferAttribute;
    const widthAttr = this.geometry.attributes.width as THREE.BufferAttribute;

    // --- CAMBIO CLAVE: MANEJO DEFENSIVO DE LA GEOMETRÍA ---
    const drawLength = points.length;

    for (let i = 0; i < this.maxPoints; i++) {
        const i2 = i * 2; // Índice para el vértice izquierdo
        const i21 = i2 + 1; // Índice para el vértice derecho

        if (i < drawLength) {
            // Si este punto es parte de la estela visible, lo calculamos.
            // --- LÓGICA DE EXTREMOS CORREGIDA ---
            const currentPoint = points[i];
            
            // Para el punto 'previo': Si es el primer punto, extrapolamos hacia atrás.
            // Esto evita que prevPoint sea igual a currentPoint.
            const prevPoint = (i === 0) 
                ? points[i].clone().sub(points[i + 1].clone().sub(points[i])) 
                : points[i - 1];

            // Para el punto 'siguiente': Si es el último punto, extrapolamos hacia adelante.
            // Esto evita que nextPoint sea igual a currentPoint.
            const nextPoint = (i === points.length - 1) 
                ? points[i].clone().add(points[i].clone().sub(points[i - 1]))
                : points[i + 1];
            
            // Actualizamos los atributos para los dos vértices (izquierdo y derecho)
            posAttr.setXYZ(i2, currentPoint.x, currentPoint.y, currentPoint.z);
            posAttr.setXYZ(i21, currentPoint.x, currentPoint.y, currentPoint.z);

            prevAttr.setXYZ(i2, prevPoint.x, prevPoint.y, prevPoint.z);
            prevAttr.setXYZ(i21, prevPoint.x, prevPoint.y, prevPoint.z);

            nextAttr.setXYZ(i2, nextPoint.x, nextPoint.y, nextPoint.z);
            nextAttr.setXYZ(i21, nextPoint.x, nextPoint.y, nextPoint.z);
            
            sideAttr.setX(i2, -1);
            sideAttr.setX(i21, 1);

            uvAttr.setXY(i2, i / (drawLength - 1 || 1), 0);
            uvAttr.setXY(i21, i / (drawLength - 1 || 1), 1);

        } else {
            // Si este punto NO es parte de la estela visible, lo colapsamos en el origen para ocultarlo.
            // Hacemos esto para ambos vértices.
            posAttr.setXYZ(i2, 0, 0, 0);
            posAttr.setXYZ(i21, 0, 0, 0);

            prevAttr.setXYZ(i2, 0, 0, 0);
            prevAttr.setXYZ(i21, 0, 0, 0);

            nextAttr.setXYZ(i2, 0, 0, 0);
            nextAttr.setXYZ(i21, 0, 0, 0);

            uvAttr.setXY(i2, 0, 0);
            uvAttr.setXY(i21, 0, 0);

            if (widthAttr) {
                widthAttr.setX(i2, 0);
                widthAttr.setX(i21, 0);
            }
        }
    }

    // Le decimos a Three.js que los datos del buffer han cambiado.
    posAttr.needsUpdate = true;
    prevAttr.needsUpdate = true;
    nextAttr.needsUpdate = true;
    sideAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
    if (widthAttr) widthAttr.needsUpdate = true;

    // Y muy importante, le decimos que solo dibuje la parte visible de la geometría.
    const indicesToDraw = Math.max(0, (drawLength - 1) * 6);
    this.geometry.setDrawRange(0, indicesToDraw);
  }
}