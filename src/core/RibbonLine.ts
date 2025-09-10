import * as THREE from 'three';

// ENUM para RenderMode
export enum RenderMode {
  Glow,   // El modo de energía que ya tenemos.
  Solid,  // El nuevo modo de color sólido/degradado.
}

// 🧠 ENUMERACIÓN PARA ESTILOS DE DESVANECIMIENTO
// None = 0, FadeIn = 1, FadeInOut = 2, FadeOut = 3
export enum FadeStyle {
  None,
  FadeIn,
  FadeInOut,
  FadeOut,
}

// 🧠 INTERFAZ DE CONFIGURACIÓN
// Definimos una interfaz para que sea fácil crear nuevas RibbonLine
// con diferentes propiedades en el futuro. Es una buena práctica de POO.
export interface RibbonConfig {
  //points: THREE.Vector3[]; // La lista de puntos que formarán la línea.
  color:          THREE.Color;  // El color del listón.
  width:          number;       // El ancho del listón en unidades de la escena.
  maxLength:      number;       // Longitud máxima en número de puntos (opcional).
  fadeStyle?:     FadeStyle;    // Estilo de desvanecimiento (opcional).
  renderMode?:    RenderMode;   // Para elegir el estilo del "pincel".
  opacity?:       number;       // Una opacidad general para el listón. (opcional, por defecto 1.0)
  colorEnd?:      THREE.Color;  // Color de fin, solo para el modo Solid/Gradient
  transitionSize?:number;
}

export class RibbonLine {
  // --- PROPIEDADES PRINCIPALES ---

  // El objeto 3D que realmente se añade a la escena.
  public mesh: THREE.Mesh;
  
  // La geometría que contendrá los vértices de nuestro listón.
  // Usamos BufferGeometry porque es la forma más performante.
  private geometry: THREE.BufferGeometry;

  // El material que le dará apariencia a nuestro listón.
  // Shader.
  // Hacemos el material público para poder acceder a sus uniforms desde main.ts
  public material: THREE.ShaderMaterial;

  // reconstruir la malla si es necesario.
  private width: number;
  private currentPointCount: number = 0; // Para saber cuántos puntos activos tenemos
  // 👇 Necesitamos guardar los puntos actuales para poder reconstruir la malla al cambiar el ancho.
  private currentPoints: THREE.Vector3[] = [];


  // --- CONSTRUCTOR ---
  constructor(config: RibbonConfig) {
    console.log('🚧 Creando una nueva RibbonLine...');

    // Guardamos la configuración inicial.
    //this.points = config.points;
    this.width = config.width;

    // Creamos la geometría y el material.
    this.geometry = new THREE.BufferGeometry();

    // 🧠 OPTIMIZACIÓN: Creamos los "buffers" de la geometría con el tamaño máximo.
    // Así no tenemos que crear nuevos arrays en cada fotograma, solo actualizarlos.
    const maxVertices = config.maxLength * 2;
    const maxIndices = (config.maxLength - 1) * 6;
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(maxVertices * 3), 3)
    );
    this.geometry.setAttribute(
      'uv', // UVs son coordenadas 2D (x,y) que van de 0 a 1. Las usaremos en el shader.
      new THREE.BufferAttribute(new Float32Array(maxVertices * 2), 2)
    );
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(maxIndices), 1));

    // Creamos el ShaderMaterial
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true, // Necesario para que el degradado a transparente funcione
      depthWrite: false, // Evita problemas de renderizado con transparencias
      
      // Los "uniforms" son variables que pasamos desde TypeScript a nuestros shaders.
      uniforms: {
        // Le pasamos el color que queremos para el núcleo brillante.
        uColor: { value: config.color },
        // Si no se provee un color de fin, usamos el mismo de inicio para un color sólido.
        uColorEnd:  {value:config.colorEnd ?? config.color},
        uTime: { value: 0 },
        uFadeStyle: { value: config.fadeStyle ?? FadeStyle.FadeIn },
        uRenderMode: { value: config.renderMode ?? RenderMode.Glow },
        uOpacity: { value: config.opacity ?? 1.0 },
        uColorMix: { value: 1.0 }, // Inicia totalmente pintado con el color final.
        uTransitionSize: { value: config.transitionSize ?? 0.1 },
      },

      // --- CÓDIGO DEL ARQUITECTO (VERTEX SHADER) ---
      // GLSL es el lenguaje de los shaders. Se parece a C.
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      
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
          vec4 finalColor;

          if (uRenderMode == 0) { // MODO GLOW (sin cambios)
            float distanceToCenter = abs(vUv.y - 0.5) * 2.0;
            float strength = 1.0 - distanceToCenter;
            float glow = pow(strength, 2.5);
            float pulse = (sin(uTime * 5.0) + 1.0) / 2.0;
            pulse = pulse * 0.4 + 0.6;
            
            float tailFade = 1.0;
            if (uFadeStyle == 1) { tailFade = vUv.x; }
            else if (uFadeStyle == 2) { tailFade = sin(vUv.x * PI); }
            else if (uFadeStyle == 3) { tailFade = 1.0 - vUv.x; }

            float finalAlpha = glow * tailFade * pulse * uOpacity;
            finalColor = vec4(uColor, finalAlpha);

          } else { // MODO SOLID/GRADIENT
            // La magia del "pintado progresivo" ocurre aquí.
            // smoothstep(edge0, edge1, x) devuelve 0 si x < edge0, 1 si x > edge1,
            // y una transición suave entre 0 y 1 en el medio.
            // Usamos uColorMix como el punto de la transición y le damos un pequeño
            // margen (0.1) para que el borde del color sea suave.
            // 👇 CAMBIO 2: Usamos uTransitionSize para controlar la suavidad.
            // Restamos uTransitionSize al punto de mezcla para crear el rango.
            float mixFactor = smoothstep(uColorMix - uTransitionSize, uColorMix, vUv.x);
            
            vec3 gradientColor = mix(uColor, uColorEnd, mixFactor);
            
            float tailFade = 1.0;
            if (uFadeStyle == 1) { tailFade = vUv.x; }
            else if (uFadeStyle == 2) { tailFade = sin(vUv.x * PI); }
            else if (uFadeStyle == 3) { tailFade = 1.0 - vUv.x; }

            finalColor = vec4(gradientColor, uOpacity * tailFade);
          }
          
          gl_FragColor = finalColor;
        }
      `,
    });
    // Configuramos el blending dependiendo del modo.
    if ((config.renderMode ?? RenderMode.Glow) === RenderMode.Glow) {
      this.material.blending = THREE.AdditiveBlending;
    } else {
      this.material.blending = THREE.NormalBlending;
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false; // Evita que la línea desaparezca si parte de ella sale de la pantalla
    
    console.log('✅ RibbonLine multi-estilo creada.');
  }

  // --- MÉTODOS PÚBLICOS ---

   /**
   * Actualiza la línea con un nuevo conjunto de puntos.
   * @param {THREE.Vector3[]} points El array de puntos actualizado.
   */
  public update(points: THREE.Vector3[]): void {
    // Guardamos los puntos actuales cada vez que se actualiza.
    this.currentPoints = points;
    this.currentPointCount = points.length;
    this.buildMesh();
  }

  // Método para controlar la opacidad dinámicamente.
  /**
   * 
   * @param opacity Valor de opacidad entre 0.0 (transparente) y 1.0 (opaco).
   */
  public setOpacity(opacity: number): void {
    this.material.uniforms.uOpacity.value = opacity;
  }

  // Nuevo método para controlar el ancho dinámicamente.
  /**
   * 
   * @param width Nuevo ancho del listón.
   */
  public setWidth(width: number): void {
    if (this.width !== width) {
      this.width = width;
      // Forzamos la reconstrucción de la malla con el nuevo ancho.
      this.buildMesh();
    }
  }

  /**
   * Limpia los recursos de la GPU para evitar fugas de memoria.
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  // --- LÓGICA INTERNA (EL CORAZÓN DE LA CLASE) ---

  /**
   * Construye o reconstruye la malla del listón a partir del array `this.points`.
   */
  private buildMesh(): void {
    const points = this.currentPoints;
    if (points.length < 2) {
      this.geometry.setDrawRange(0, 0); // No dibujamos nada si no hay puntos suficientes.
      return;
    }
    
    // Obtenemos una referencia a los arrays de los buffers para actualizarlos.
    const positions = this.geometry.attributes.position.array as Float32Array;
    const uvs = this.geometry.attributes.uv.array as Float32Array;
    const indices = this.geometry.index!.array as Uint16Array;
    
    for (let i = 0; i < this.currentPointCount; i++) {
      const currentPoint = points[i];
      let direction = new THREE.Vector3();

      if (i < this.currentPointCount - 1) {
        direction.subVectors(points[i + 1], currentPoint);
      } else {
        direction.subVectors(currentPoint, points[i - 1]);
      }
      direction.normalize();

      const normal = new THREE.Vector3(-direction.y, direction.x, 0);
      const v1 = new THREE.Vector3().copy(currentPoint).add(normal.clone().multiplyScalar(this.width / 2));
      const v2 = new THREE.Vector3().copy(currentPoint).sub(normal.clone().multiplyScalar(this.width / 2));
      
      const vertexIndex = i * 2;
      positions[vertexIndex * 3 + 0] = v1.x;
      positions[vertexIndex * 3 + 1] = v1.y;
      positions[vertexIndex * 3 + 2] = v1.z;

      positions[(vertexIndex + 1) * 3 + 0] = v2.x;
      positions[(vertexIndex + 1) * 3 + 1] = v2.y;
      positions[(vertexIndex + 1) * 3 + 2] = v2.z;

      // 👇 CAMBIO 3: Calculamos y asignamos las coordenadas UV
      uvs[vertexIndex * 2 + 0] = i / (this.currentPointCount - 1); // Progreso a lo largo de la línea (U)
      uvs[vertexIndex * 2 + 1] = 0; // Borde de "arriba" (V)

      uvs[(vertexIndex + 1) * 2 + 0] = i / (this.currentPointCount - 1); // Progreso a lo largo de la línea (U)
      uvs[(vertexIndex + 1) * 2 + 1] = 1; // Borde de "abajo" (V)
    }

    // Actualizamos los índices
    let indexCount = 0;
    for (let i = 0; i < this.currentPointCount - 1; i++) {
      const i_v1 = i * 2;
      const i_v2 = i * 2 + 1;
      const i_v3 = (i + 1) * 2;
      const i_v4 = (i + 1) * 2 + 1;

      indices[indexCount++] = i_v1;
      indices[indexCount++] = i_v2;
      indices[indexCount++] = i_v3;

      indices[indexCount++] = i_v2;
      indices[indexCount++] = i_v4;
      indices[indexCount++] = i_v3;
    }

    // Le decimos a Three.js qué parte de los buffers pre-alocados debe dibujar.
    this.geometry.setDrawRange(0, indexCount);

    // Y muy importante, le decimos que los datos de los atributos han cambiado.
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true
    this.geometry.index!.needsUpdate = true;
  }
}