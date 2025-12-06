import * as THREE from 'three';
import { SceneElementData } from './types/WaypointContentData';
import { IBehaviorModule, LogicRegistry } from './types/IBehaviorModule';
import { EventEmitter } from '../../core/EventEmitter';
import { Text } from 'troika-three-text';
import { AssetManager } from '../../managers/AssetManager';
import { RibbonLine, RibbonConfig, UseMode } from '../../core/RibbonLine';
import { RibbonLineGPU } from '../../core/RibbonLineGPU';

/**
 * Mapeo de IDs de elementos a sus objetos 3D correspondientes. 
 * Necesario para que los nodos de lógica puedan referenciar a los elementos visuales.
 */
interface ElementMap {
    [id: string]: THREE.Object3D | IBehaviorModule;
}

/**
 * Clase responsable de instanciar objetos 3D o módulos de lógica a partir del JSON.
 */
export class ElementFactory {
    private scene: THREE.Group; // Grupo raíz (el WaypointContentAnchor)
    private elementMap: ElementMap = {};
    private logicEventBus: EventEmitter;
    private assetManager?: AssetManager; // Optional for now to avoid breaking existing tests if any

    constructor(scene: THREE.Group, logicEventBus: EventEmitter, assetManager?: AssetManager) {
        this.scene = scene;
        this.logicEventBus = logicEventBus;
        this.assetManager = assetManager;
    }

    private applyTransform(object: THREE.Object3D, transform: SceneElementData['transform']): void {
        if (transform) {
            object.position.set(transform.position.x, transform.position.y, transform.position.z);
            object.rotation.set(
                THREE.MathUtils.degToRad(transform.rotation.x),
                THREE.MathUtils.degToRad(transform.rotation.y),
                THREE.MathUtils.degToRad(transform.rotation.z)
            );
            object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
        }
    }

    public createElement(data: SceneElementData): THREE.Object3D | IBehaviorModule | null {
        let object: THREE.Object3D | IBehaviorModule | null = null;

        switch (data.type) {
            case 'text':
                object = this.createText(data);
                break;
            case 'image':
                object = this.createImage(data);
                break;
            case 'video':
                object = this.createVideo(data);
                break;
            case 'model':
                object = this.createModel(data);
                break;
            case 'button':
                object = this.createButton(data);
                break;
            case 'line': // Original line type, might be replaced by svg-path/json-path
                object = new THREE.Object3D();
                (object as THREE.Object3D).name = `LINE_${data.id}`;
                this.applyTransform(object as THREE.Object3D, data.transform);
                if (data.anchor) {
                    (object as THREE.Object3D).position.x += data.anchor.xOffset;
                    (object as THREE.Object3D).position.y += data.anchor.yOffset;
                    (object as THREE.Object3D).position.z += data.anchor.zOffset;
                }
                this.scene.add(object as THREE.Object3D);
                break;
            case 'svg-path':
            case 'json-path':
                object = this.createPathElement(data);
                break;
            case 'logic':
                object = this.createLogicHelper(data);
                break;
            default:
                console.warn(`Unknown element type: ${data.type}`);
                object = new THREE.Object3D();
                (object as THREE.Object3D).name = `ELEMENT_${data.id}`;
                this.applyTransform(object as THREE.Object3D, data.transform);
                if (data.anchor) {
                    (object as THREE.Object3D).position.x += data.anchor.xOffset;
                    (object as THREE.Object3D).position.y += data.anchor.yOffset;
                    (object as THREE.Object3D).position.z += data.anchor.zOffset;
                }
                this.scene.add(object as THREE.Object3D);
                break;
        }

        if (object) {
            this.elementMap[data.id] = object;
            if (object instanceof THREE.Object3D) {
                console.log(`[ElementFactory] Created and added ${data.type} (${data.id}) to scene. Visible: ${object.visible}, Pos: ${object.position.toArray()}, WorldPos: ${object.getWorldPosition(new THREE.Vector3()).toArray()}`);
            }
        }
        return object;
    }

    private createText(data: SceneElementData): THREE.Object3D {
        const textMesh = new Text();
        textMesh.text = data.content || '';
        textMesh.fontSize = data.style?.fontSize || 2;
        (textMesh as any).color = data.style?.color || 0xffffff;
        textMesh.fillOpacity = data.style?.opacity ?? 1; // Troika uses fillOpacity
        textMesh.anchorX = 'center';
        textMesh.anchorY = 'middle';
        textMesh.sync();
        (textMesh as any).name = `TEXT_${data.id}`;

        this.applyTransform(textMesh, data.transform);
        if (data.anchor) {
            textMesh.position.x += data.anchor.xOffset;
            textMesh.position.y += data.anchor.yOffset;
            textMesh.position.z += data.anchor.zOffset;
        }
        this.scene.add(textMesh);
        return textMesh;
    }

    private createImage(data: SceneElementData): THREE.Object3D {
        const loader = new THREE.TextureLoader();
        const texture = data.url ? loader.load(data.url) : null;
        const planeMat = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xffffff, // White so texture colors are accurate
            transparent: true,
            opacity: data.style?.opacity ?? 1,
            side: THREE.DoubleSide
        });
        // Default aspect ratio 16:9, user can scale it
        const object = new THREE.Mesh(new THREE.PlaneGeometry(3.55, 2), planeMat);
        (object as THREE.Mesh).name = `IMAGE_${data.id}`;

        this.applyTransform(object, data.transform);
        if (data.anchor) {
            object.position.x += data.anchor.xOffset;
            object.position.y += data.anchor.yOffset;
            object.position.z += data.anchor.zOffset;
        }
        this.scene.add(object);
        return object;
    }

    private createVideo(data: SceneElementData): THREE.Object3D {
        const video = document.createElement('video');
        video.src = data.url || '';
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.play().catch(e => console.warn('Video autoplay failed', e));

        const videoTexture = new THREE.VideoTexture(video);
        const videoMat = new THREE.MeshBasicMaterial({
            map: videoTexture,
            color: 0xffffff,
            transparent: true,
            opacity: data.style?.opacity ?? 1,
            side: THREE.DoubleSide
        });

        const object = new THREE.Mesh(new THREE.PlaneGeometry(3.55, 2), videoMat);
        (object as THREE.Mesh).name = `VIDEO_${data.id}`;

        this.applyTransform(object, data.transform);
        if (data.anchor) {
            object.position.x += data.anchor.xOffset;
            object.position.y += data.anchor.yOffset;
            object.position.z += data.anchor.zOffset;
        }
        this.scene.add(object);
        return object;
    }

    private createButton(data: SceneElementData): THREE.Object3D {
        const btnMat = new THREE.MeshBasicMaterial({
            color: data.style?.color ? new THREE.Color(data.style.color) : 0x00ff00,
            transparent: true,
            opacity: data.style?.opacity ?? 0.5,
            side: THREE.DoubleSide
        });
        const object = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), btnMat);
        (object as THREE.Mesh).name = `BUTTON_${data.id}`;

        this.applyTransform(object, data.transform);
        if (data.anchor) {
            object.position.x += data.anchor.xOffset;
            object.position.y += data.anchor.yOffset;
            object.position.z += data.anchor.zOffset;
        }
        this.scene.add(object);
        return object;
    }

    private createModel(data: SceneElementData): THREE.Object3D {
        // Placeholder: Create a colored cube
        const color = data.style?.color || 0xffffff;
        const opacity = data.style?.opacity ?? 1;
        const object = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({
                color,
                transparent: opacity < 1,
                opacity
            })
        );
        (object as THREE.Mesh).name = `MODEL_${data.id}`;

        this.applyTransform(object, data.transform);
        if (data.anchor) {
            object.position.x += data.anchor.xOffset;
            object.position.y += data.anchor.yOffset;
            object.position.z += data.anchor.zOffset;
        }
        this.scene.add(object);
        return object;
    }

    private createLogicHelper(data: SceneElementData): IBehaviorModule {
        const ModuleClass = LogicRegistry[data.module!];
        if (!ModuleClass) {
            console.error(`Logic Module '${data.module}' not found in registry.`);
            return null as any; // This will be filtered out by the `if (object)` check in createElement
        }
        // Instanciar el módulo de lógica
        const object = new ModuleClass();
        // Logic modules are not added to the scene directly, but stored in elementMap
        return object;
    }

    private createPathElement(data: SceneElementData): THREE.Object3D {
        if (!this.assetManager) {
            console.warn("AssetManager not provided to ElementFactory, cannot create path element.");
            return new THREE.Group(); // Return empty group
        }

        if (!data.assetKey) {
            console.warn("No assetKey provided for path element.");
            return new THREE.Group();
        }

        const group = new THREE.Group();
        group.name = `${data.type.toUpperCase()}_${data.id}`;
        group.userData.assetKey = data.assetKey; // Store for update detection

        try {
            const pathData = this.assetManager.getPath(data.assetKey);
            const config = data.pathConfig || {
                ribbonWidth: 1,
                revealDuration: 2,
                trailLength: 20,
                trailSpeed: 1,
                color: '#ffffff'
            };

            // Create a RibbonLine for each curve in the path
            // Use high resolution for GPU path texture to ensure smooth trails
            pathData.curves.forEach((curve, index) => {
                const points = curve.getPoints(300); // High resolution for smooth GPU trails

                // Use RibbonLineGPU for all modes as it supports shader-based Trail and Reveal
                const ribbonConfig: RibbonConfig = {
                    color: new THREE.Color(data.pathConfig?.color ?? '#ffffff'),
                    colorEnd: new THREE.Color(data.pathConfig?.colorEnd ?? data.pathConfig?.color ?? '#ffffff'),
                    width: data.pathConfig?.ribbonWidth ?? 0.5,
                    opacity: data.pathConfig?.opacity ?? 1.0,
                    maxLength: points.length,
                    useMode: config.useMode ?? UseMode.Static,
                    trailLength: config.trailLength, // Pass trail params
                    fadeStyle: 2, // FadeStyle.FadeInOut (matches Testbed 22)
                    // trailSpeed is used in animation loop, not config directly unless we store it
                };

                // RibbonLineGPU takes points in constructor
                const ribbon = new RibbonLineGPU(points, ribbonConfig);

                // Set initial state
                if (config.useMode === UseMode.Reveal) {
                    ribbon.setRevealProgress(1); // Visible by default
                } else if (config.useMode === UseMode.Trail) {
                    ribbon.setTrail(0, config.trailLength || 0.2);
                }

                // Add to group
                group.add(ribbon.mesh);
            });

            // 2. Trail Ribbon (GPU) - Optional, maybe only for 'json-path' or if requested?
            // For now, let's just add the reveal ribbon.
            // If we want the trail, we need RibbonLineGPU.
            // Let's stick to RibbonLine for the editor visualization for now.

            // Apply Transform
            if (data.transform) {
                group.position.set(data.transform.position.x, data.transform.position.y, data.transform.position.z);
                group.rotation.set(
                    THREE.MathUtils.degToRad(data.transform.rotation.x),
                    THREE.MathUtils.degToRad(data.transform.rotation.y),
                    THREE.MathUtils.degToRad(data.transform.rotation.z)
                );
                group.scale.set(data.transform.scale.x, data.transform.scale.y, data.transform.scale.z);
            }

        } catch (e) {
            console.error(`Failed to create path element ${data.id}:`, e);
        }

        this.scene.add(group);
        return group;
    }

    public updateElement(data: SceneElementData): void {
        const object = this.elementMap[data.id];
        if (!object || !(object instanceof THREE.Object3D)) return;

        this.applyTransform(object, data.transform);

        if (data.type === 'text' && object instanceof Text) {
            object.text = data.content || '';
            object.fontSize = data.style?.fontSize || 2;
            (object as any).color = data.style?.color || 0xffffff;
            object.fillOpacity = data.style?.opacity ?? 1;
            object.sync();
        } else if (object instanceof THREE.Mesh && object.material) {
            const mat = object.material as THREE.MeshBasicMaterial;
            if (data.style?.color) mat.color.set(data.style.color);
            if (data.style?.opacity !== undefined) {
                mat.opacity = data.style.opacity;
                mat.transparent = mat.opacity < 1;
            }

            // Update Texture for Images
            if (data.type === 'image' && data.url) {
                const loader = new THREE.TextureLoader();
                mat.map = loader.load(data.url);
                mat.needsUpdate = true;
            }

            // Update Video Source
            if (data.type === 'video' && data.url && mat.map instanceof THREE.VideoTexture) {
                const video = mat.map.image as HTMLVideoElement;
                if (video.src !== data.url) {
                    video.src = data.url;
                    video.play().catch(e => console.warn('Video update play failed', e));
                }
            }
        } else if (object instanceof THREE.Group && (data.type === 'svg-path' || data.type === 'json-path')) {
            // Handle AssetKey change -> Re-create element
            if (object.userData.assetKey && object.userData.assetKey !== data.assetKey) {
                console.log(`[ElementFactory] AssetKey changed for ${data.id}, rebuilding...`);
                while (object.children.length > 0) {
                    const child = object.children[0];
                    object.remove(child);
                    if ((child as any).geometry) (child as any).geometry.dispose();
                    if ((child as any).material) (child as any).material.dispose();
                }
                const tempGroup = this.createPathElement(data);
                while (tempGroup.children.length > 0) {
                    object.add(tempGroup.children[0]);
                }
                object.userData.assetKey = data.assetKey;
                return;
            }

            // Handle RibbonLine updates for ALL children
            object.children.forEach(child => {
                if (child instanceof THREE.Mesh && (child.material as THREE.ShaderMaterial).uniforms?.uColor) {
                    const mat = child.material as THREE.ShaderMaterial;

                    // Update Color
                    if (data.pathConfig) {
                        if (data.pathConfig.color !== undefined) {
                            mat.uniforms.uColor.value.set(data.pathConfig.color);
                        }
                        if (data.pathConfig.colorEnd !== undefined) {
                            mat.uniforms.uColorEnd.value.set(data.pathConfig.colorEnd);
                        }
                    }

                    // Update Width
                    if (data.pathConfig?.ribbonWidth !== undefined) {
                        mat.uniforms.uWidth.value = data.pathConfig.ribbonWidth;
                    }

                    // Update Opacity
                    if (data.style?.opacity !== undefined) {
                        mat.uniforms.uOpacity.value = data.style.opacity;
                    }

                    // Update Mode
                    if (data.pathConfig?.useMode !== undefined) {
                        mat.uniforms.uUseMode.value = data.pathConfig.useMode;

                        // Reset progress if switching to Reveal
                        if (data.pathConfig.useMode === UseMode.Reveal) {
                            if (mat.uniforms.uRevealProgress) mat.uniforms.uRevealProgress.value = 1;
                        }
                    }

                    // Update Trail Length
                    if (data.pathConfig?.trailLength !== undefined && mat.uniforms.uTrailLength) {
                        mat.uniforms.uTrailLength.value = data.pathConfig.trailLength;
                    }
                }
            });
        }
    }

    public getSceneObjectsByIds(ids: string[]): THREE.Object3D[] {
        return ids.map(id => {
            const element = this.elementMap[id];
            if (element instanceof THREE.Object3D) {
                return element;
            }
            console.warn(`Element ID '${id}' not found or is a logic node.`);
            return new THREE.Object3D(); // Devolver un dummy si no se encuentra
        });
    }

    public disposeElements(elements: SceneElementData[]): void {
        for (const elementData of elements) {
            const element = this.elementMap[elementData.id];
            if (element) {
                if (element instanceof THREE.Object3D) {
                    this.scene.remove(element);

                    // Dispose Troika Text
                    if (element instanceof Text) {
                        (element as any).dispose();
                    }

                    // Dispose Geometries and Materials if standard mesh
                    if (element instanceof THREE.Mesh) {
                        if (element.geometry) element.geometry.dispose();
                        if (element.material) {
                            if (Array.isArray(element.material)) {
                                element.material.forEach(m => m.dispose());
                            } else {
                                element.material.dispose();
                            }
                        }
                    }
                }
                // Dispose Logic Modules
                if ((element as any).dispose && typeof (element as any).dispose === 'function') {
                    (element as any).dispose();
                }

                delete this.elementMap[elementData.id];
            }
        }
    }
    public getElementMap(): Map<string, THREE.Object3D> {
        // Convert the internal object map to a Map<string, THREE.Object3D>
        // Filtering out logic modules for now as they might not be animatable by GSAP directly in this way
        // or we cast them if they have properties we want to animate.
        const map = new Map<string, THREE.Object3D>();
        for (const id in this.elementMap) {
            const element = this.elementMap[id];
            if (element instanceof THREE.Object3D) {
                map.set(id, element);
            }
        }
        return map;
    }
}
