import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SVGLoader, SVGResultPaths } from 'three/examples/jsm/loaders/SVGLoader.js';
import { EventEmitter } from '../core/EventEmitter';
import { PathData } from '../core/pathing/PathData';

// Define the structure of the assets to be loaded
const assetsToLoad = {
  models: {
    ixachiLogoGLB: '/ixachiLogo_ixtioli.glb' // Add the GLB model
  },
  textures: {
    // ixachiLogoSVG: '/ixachiLogo0001.svg' // Keep the SVG as a texture
  },
  paths: {
    ixachiLogoSVG: '/ixachiLogo0001.svg'
  }
};

type AssetType = 'models' | 'textures' | 'paths';
type AssetKey<T extends AssetType> = keyof (typeof assetsToLoad)[T];

/**
 * @class AssetManager
 * @description Centralized manager for loading all 3D assets.
 */
export class AssetManager extends EventEmitter {
  private gltfLoader: GLTFLoader;
  private svgLoader: SVGLoader;
  private textureLoader: THREE.TextureLoader;

  public readonly models: Record<string, THREE.Group> = {};
  public readonly textures: Record<string, THREE.Texture> = {};
  public readonly paths: Record<string, PathData> = {};

  constructor() {
    super();
    console.log('📦 [AssetManager] Initialized.');
    this.gltfLoader = new GLTFLoader();
    this.svgLoader = new SVGLoader();
    this.textureLoader = new THREE.TextureLoader();
  }

  public async loadAll(): Promise<void> {
    console.log('🌀 [AssetManager] Starting to load all assets...');
    
    const promises: Promise<any>[] = [];
    let loaded = 0;
    const total = Object.keys(assetsToLoad.models).length + Object.keys(assetsToLoad.textures).length + Object.keys(assetsToLoad.paths).length;

    const onProgress = (key: string) => {
        loaded++;
        const progressRatio = loaded / total;
        console.log(`⏳ [AssetManager] Loading: ${key} (${(progressRatio * 100).toFixed(0)}%)`);
        this.emit('progress', progressRatio, key, loaded, total);
    };

    for (const key in assetsToLoad.models) {
      const path = assetsToLoad.models[key as AssetKey<'models'>];
      const promise = this.gltfLoader.loadAsync(path).then(gltf => {
        this.models[key] = gltf.scene;
        onProgress(key);
      });
      promises.push(promise);
    }

    for (const key in assetsToLoad.textures) {
      const path = assetsToLoad.textures[key as AssetKey<'textures'>];
      const promise = this.textureLoader.loadAsync(path).then(texture => {
        this.textures[key] = texture;
        onProgress(key);
      });
      promises.push(promise);
    }

    for (const key in assetsToLoad.paths) {
        const path = assetsToLoad.paths[key as AssetKey<'paths'>];
        const promise = this.loadPathData(path).then(pathData => {
            this.paths[key] = pathData;
            onProgress(key);
        });
        promises.push(promise);
    }

    await Promise.all(promises);

    console.log('✅ [AssetManager] All assets have been loaded.');
    this.emit('loaded');
  }

  private async loadPathData(url: string): Promise<PathData> {
    const data = await this.svgLoader.loadAsync(url);
    const paths: THREE.Vector3[][] = [];
    const minDistanceSq = 0.01 * 0.01; // Threshold for filtering close points

    for (const path of data.paths) {
        const shapes = SVGLoader.createShapes(path as unknown as SVGResultPaths);

        for (const shape of shapes) {
            const shapePoints: THREE.Vector3[] = [];
            for (const curve of shape.curves) {
                const points2D = curve.getPoints(50);
                for (const point2d of points2D) {
                    const newPoint = new THREE.Vector3(point2d.x, point2d.y, 0);
                    if (shapePoints.length === 0 || newPoint.distanceToSquared(shapePoints[shapePoints.length - 1]) > minDistanceSq) {
                        shapePoints.push(newPoint);
                    }
                }
            }
            if (shapePoints.length > 0) {
                paths.push(shapePoints);
            }
        }
    }

    // Normalize and center the points
    const allPoints = paths.flat();
    if (allPoints.length === 0) {
        return new PathData([]);
    }

    const boundingBox = new THREE.Box3().setFromPoints(allPoints);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const scale = 20 / Math.max(size.x, size.y, size.z);

    const centeredPaths = paths.map(pathPoints => {
        return pathPoints.map(p => {
            return new THREE.Vector3(
                (p.x - center.x) * scale,
                (p.y - center.y) * -scale, // Invert Y to match Three.js coordinates
                0
            );
        });
    });

    return new PathData(centeredPaths);
  }

  public getModel(key: string): THREE.Group {
    if (!this.models[key]) {
      throw new Error(`[AssetManager] Model with key "${key}" has not been loaded or does not exist.`);
    }
    return this.models[key].clone();
  }

  public getTexture(key: string): THREE.Texture {
    if (!this.textures[key]) {
      throw new Error(`[AssetManager] Texture with key "${key}" has not been loaded or does not exist.`);
    }
    return this.textures[key];
  }

  public getPath(key: string): PathData {
    if (!this.paths[key]) {
      throw new Error(`[AssetManager] Path with key "${key}" has not been loaded or does not exist.`);
    }
    return this.paths[key];
  }
}
