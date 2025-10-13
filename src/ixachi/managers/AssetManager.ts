// Ruta Propuesta: src/ixachi/managers/AssetManager.ts

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SVGLoader, SVGResult } from 'three/examples/jsm/loaders/SVGLoader.js';

// --- INTERFAZ DE EVENTOS ---
// Para una comunicación limpia, definimos los eventos que nuestro manager puede emitir.
export interface AssetManagerEvents {
  onProgress?: (progress: number, item: string, loaded: number, total: number) => void;
  onLoad?: () => void;
  onError?: (url: string) => void;
}

// --- LISTA DE RECURSOS ---
// Centralizamos aquí TODOS los assets que la experiencia necesitará.
// Esto facilita enormemente la gestión y precarga.
const assetsToLoad = {
  models: {
    ixachiLogo: '/ixachiLogo_ixtioli.glb',
    // Aquí añadiremos más modelos en el futuro.
  },
  svgs: {
    // Aquí podemos cargar trazados SVG.
    ixachiLogoPaths: '/ixachiLogo0001.svg',
  },
  textures: {
    // Y aquí las texturas.
  }
};

type AssetType = 'models' | 'svgs' | 'textures';
type AssetKey<T extends AssetType> = keyof (typeof assetsToLoad)[T];

/**
 * @class AssetManager
 * @description Gestor centralizado para la carga de todos los recursos 3D.
 * Utiliza el LoadingManager de Three.js para rastrear el progreso y notifica
 * a través de callbacks. Es el "utilero" de nuestra escena.
 */
export class AssetManager {
  private manager: THREE.LoadingManager;
  private gltfLoader: GLTFLoader;
  private svgLoader: SVGLoader;
  private textureLoader: THREE.TextureLoader;

  // Almacenes para los recursos ya cargados.
  public readonly models: Record<keyof typeof assetsToLoad.models, THREE.Group> = {} as any;
  public readonly svgs: Record<keyof typeof assetsToLoad.svgs, SVGResult> = {} as any;
  public readonly textures: Record<keyof typeof assetsToLoad.textures, THREE.Texture> = {} as any;

  constructor(events: AssetManagerEvents = {}) {
    console.log('📦 [AssetManager] Inicializado.');

    // --- CONFIGURACIÓN DEL LOADING MANAGER ---
    this.manager = new THREE.LoadingManager();
    
    // Conectamos los eventos del LoadingManager de Three.js a nuestros propios callbacks.
    this.manager.onProgress = (item, loaded, total) => {
      const progressRatio = loaded / total;
      console.log(`⏳ [AssetManager] Cargando: ${item} (${(progressRatio * 100).toFixed(0)}%)`);
      events.onProgress?.(progressRatio, item, loaded, total);
    };

    this.manager.onLoad = () => {
      console.log('✅ [AssetManager] Todos los recursos han sido cargados.');
      events.onLoad?.();
    };

    this.manager.onError = (url) => {
      console.error(`❌ [AssetManager] Hubo un error cargando: ${url}`);
      events.onError?.(url);
    };

    // --- INICIALIZACIÓN DE LOADERS ---
    // Todos los loaders usarán el mismo manager, así el progreso es único.
    this.gltfLoader = new GLTFLoader(this.manager);
    this.svgLoader = new SVGLoader(this.manager);
    this.textureLoader = new THREE.TextureLoader(this.manager);
  }

  /**
   * Inicia el proceso de carga para todos los assets definidos.
   */
  public loadAll(): void {
    console.log('🌀 [AssetManager] Iniciando carga de todos los recursos...');
    
    // Cargamos todos los modelos
    for (const key in assetsToLoad.models) {
      const path = assetsToLoad.models[key as AssetKey<'models'>];
      this.gltfLoader.load(path, (gltf) => {
        this.models[key as AssetKey<'models'>] = gltf.scene;
      });
    }
    // --- AÑADIR LÓGICA DE CARGA DE SVGs ---
    for (const key in assetsToLoad.svgs) { // <-- AÑADIR ESTE BUCLE COMPLETO
      const path = assetsToLoad.svgs[key as AssetKey<'svgs'>];
      this.svgLoader.load(path, (data) => {
        this.svgs[key as AssetKey<'svgs'>] = data;
      });
    }
    // (Aquí iría la lógica para texturas)
  }

  /**
   * Permite obtener un modelo ya cargado de forma segura.
   */
  public getModel(key: AssetKey<'models'>): THREE.Group {
    if (!this.models[key]) {
      throw new Error(`[AssetManager] El modelo con clave "${String(key)}" no ha sido cargado o no existe.`);
    }
    return this.models[key].clone(); // Devolvemos un clon para no modificar el original.
  }
  // --- MÉTODO PARA OBTENER DATOS SVG ---
  public getSVGData(key: AssetKey<'svgs'>): SVGResult { // <-- AÑADIR ESTE MÉTODO COMPLETO
    if (!this.svgs[key]) {
      throw new Error(`[AssetManager] Los datos del SVG con clave "${String(key)}" no han sido cargados o no existen.`);
    }
    return this.svgs[key];
  }
}