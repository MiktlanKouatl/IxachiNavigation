import * as THREE from 'three';

// 🧠 INTERFAZ DE CONFIGURACIÓN
// Definimos una interfaz para que sea fácil crear nuevas RibbonLine
// con diferentes propiedades en el futuro. Es una buena práctica de POO.
export interface RibbonConfig {
  //points: THREE.Vector3[]; // La lista de puntos que formarán la línea.
  color: THREE.Color;      // El color del listón.
  width: number;           // El ancho del listón en unidades de la escena.
  maxLength: number;       // Longitud máxima en número de puntos (opcional).
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
  private material: THREE.ShaderMaterial;

  // Guardamos una referencia a los puntos y al ancho para poder
  // reconstruir la malla si es necesario.
  //private points: THREE.Vector3[];
  private width: number;
  private currentPointCount: number = 0; // Para saber cuántos puntos activos tenemos


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
      
      // Los "uniforms" son variables que pasamos desde TypeScript a nuestros shaders.
      uniforms: {
        // Le pasamos el color que queremos para el núcleo brillante.
        uColor: { value: config.color },
      },

      // --- CÓDIGO DEL ARQUITECTO (VERTEX SHADER) ---
      // GLSL es el lenguaje de los shaders. Se parece a C.
      vertexShader: `
        // Atributos que recibimos de nuestra BufferGeometry por cada vértice.
        // "uv" ya está disponible aquí gracias a setAttribute en TypeScript.
        //attribute vec2 uv; 

        // "Varyings" son variables que el Vertex Shader le pasa al Fragment Shader.
        varying vec2 vUv;

        void main() {
          // Simplemente pasamos las coordenadas UV al fragment shader.
          vUv = uv;

          // gl_Position es una variable especial que define la posición final del vértice.
          // Hacemos el cálculo estándar de Three.js para proyectar el punto en la pantalla.
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      
      // --- CÓDIGO DEL PINTOR (FRAGMENT SHADER) ---
      fragmentShader: `
        // Variables que recibimos de TypeScript (uniforms) y del Vertex Shader (varyings).
        uniform vec3 uColor;
        varying vec2 vUv;

        void main() {
          // vUv.y nos dice la posición vertical en el listón (0 en un borde, 1 en el otro).
          // Calculamos la distancia desde el centro (que estaría en 0.5).
          float distanceToCenter = abs(vUv.y - 0.5) * 2.0; // Normalizamos de 0 a 1
          
          // Creamos un factor de "fuerza" que es máximo en el centro (1.0) y
          // disminuye hacia los bordes. Usamos 1.0 - distancia.
          float strength = 1.0 - distanceToCenter;
          
          // Para un degradado más suave, elevamos la fuerza a una potencia.
          // Números más altos hacen el núcleo más delgado y definido.
          float glow = pow(strength, 2.5);

          // gl_FragColor es la variable especial que define el color final del píxel.
          // Usamos el color base y establecemos su transparencia (alpha) según el "glow".
          gl_FragColor = vec4(uColor, glow);
        }
      `,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false; // Evita que la línea desaparezca si parte de ella sale de la pantalla
    
    console.log('✅ RibbonLine con Shaders creada exitosamente.');
  }

  // --- MÉTODOS PÚBLICOS ---

   /**
   * Actualiza la línea con un nuevo conjunto de puntos.
   * @param {THREE.Vector3[]} points El array de puntos actualizado.
   */
  public update(points: THREE.Vector3[]): void {
    this.currentPointCount = points.length;
    this.buildMesh(points);
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
  private buildMesh(points: THREE.Vector3[]): void {
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
    this.geometry.attributes.uv.needsUpdate = true;
    this.geometry.index!.needsUpdate = true;
  }
}