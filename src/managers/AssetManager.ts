import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EventEmitter } from '../core/EventEmitter';

// Define the structure of the assets to be loaded
const assetsToLoad = {
  models: {
    ixachiLogoGLB: '/ixachiLogo_ixtioli.glb' // Add the GLB model
  },
  textures: {
    ixachiLogoSVG: '/ixachiLogo0001.svg' // Keep the SVG as a texture
  }
};

type AssetType = 'models' | 'textures';
type AssetKey<T extends AssetType> = keyof (typeof assetsToLoad)[T];

/**
 * @class AssetManager
 * @description Centralized manager for loading all 3D assets.
 * It uses Three.js's LoadingManager to track progress and emits events
 * upon completion or errors.
 */
export class AssetManager extends EventEmitter {
  private manager: THREE.LoadingManager;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;

  // Stores for the loaded assets
  public readonly models: Record<string, THREE.Group> = {};
  public readonly textures: Record<string, THREE.Texture> = {};

  constructor() {
    super();
    console.log('📦 [AssetManager] Initialized.');

    // --- SETUP LOADING MANAGER ---
    this.manager = new THREE.LoadingManager();
    
    this.manager.onProgress = (item, loaded, total) => {
      const progressRatio = loaded / total;
      console.log(`⏳ [AssetManager] Loading: ${item} (${(progressRatio * 100).toFixed(0)}%)`);
      this.emit('progress', progressRatio, item, loaded, total);
    };

    this.manager.onLoad = () => {
      console.log('✅ [AssetManager] All assets have been loaded.');
      this.emit('loaded');
    };

    this.manager.onError = (url) => {
      console.error(`❌ [AssetManager] There was an error loading: ${url}`);
      this.emit('error', url);
    };

    // --- INITIALIZE LOADERS ---
    this.gltfLoader = new GLTFLoader(this.manager);
    this.textureLoader = new THREE.TextureLoader(this.manager);
  }

  /**
   * Starts the loading process for all defined assets.
   */
  public loadAll(): void {
    console.log('🌀 [AssetManager] Starting to load all assets...');
    
    // Load all models
    for (const key in assetsToLoad.models) {
      const path = assetsToLoad.models[key as AssetKey<'models'>];
      this.gltfLoader.load(path, (gltf) => {
        this.models[key] = gltf.scene;
      });
    }

    // Load all textures
    for (const key in assetsToLoad.textures) {
      const path = assetsToLoad.textures[key as AssetKey<'textures'>];
      this.textureLoader.load(path, (texture) => {
        this.textures[key] = texture;
      });
    }

    // If there are no assets to load, emit 'loaded' immediately
    if (Object.keys(assetsToLoad.models).length === 0 && Object.keys(assetsToLoad.textures).length === 0) {
        // Use a timeout to ensure the event is emitted asynchronously
        setTimeout(() => this.emit('loaded'), 0);
    }
  }

  /**
   * Safely retrieves a loaded model.
   * @param key The key of the model to retrieve.
   * @returns A clone of the model group.
   */
  public getModel(key: string): THREE.Group {
    if (!this.models[key]) {
      throw new Error(`[AssetManager] Model with key "${key}" has not been loaded or does not exist.`);
    }
    return this.models[key].clone();
  }

  /**
   * Safely retrieves a loaded texture.
   * @param key The key of the texture to retrieve.
   * @returns The texture.
   */
  public getTexture(key: string): THREE.Texture {
    if (!this.textures[key]) {
      throw new Error(`[AssetManager] Texture with key "${key}" has not been loaded or does not exist.`);
    }
    return this.textures[key];
  }
}
