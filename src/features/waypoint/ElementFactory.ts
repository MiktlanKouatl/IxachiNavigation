import * as THREE from 'three';
import { SceneElementData, Vector3Data } from './types/WaypointContentData';
import { IBehaviorModule, LogicRegistry } from './types/IBehaviorModule';
import { EventEmitter } from '../../core/EventEmitter';
import { Text } from 'troika-three-text';

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
    private anchorGroup: THREE.Object3D; // Grupo raíz (el WaypointContentAnchor)
    private elementMap: ElementMap = {};
    private logicEventBus: EventEmitter;

    constructor(anchorGroup: THREE.Object3D, logicEventBus: EventEmitter) {
        this.anchorGroup = anchorGroup;
        this.logicEventBus = logicEventBus;
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

    public createElement(data: SceneElementData): THREE.Object3D | IBehaviorModule {
        let object: THREE.Object3D | IBehaviorModule;

        if (data.type === 'logic') {
            const ModuleClass = LogicRegistry[data.module!];
            if (!ModuleClass) {
                console.error(`Logic Module '${data.module}' not found in registry.`);
                return null as any;
            }
            // Instanciar el módulo de lógica
            object = new ModuleClass();
        } else {
            // Esto es un elemento visual
            switch (data.type) {
                case 'text':
                    const textMesh = new Text();
                    textMesh.text = data.content || '';
                    textMesh.fontSize = data.style?.fontSize || 2;
                    textMesh.color = data.style?.color || 0xffffff;
                    textMesh.fillOpacity = data.style?.opacity ?? 1; // Troika uses fillOpacity
                    textMesh.anchorX = 'center';
                    textMesh.anchorY = 'middle';
                    textMesh.sync();
                    object = textMesh;
                    (object as THREE.Mesh).name = `TEXT_${data.id}`;
                    break;
                case 'image':
                case 'video':
                    // TO-DO: Implement VideoTexture/ImageTexture
                    const planeMat = new THREE.MeshBasicMaterial({
                        color: 0xff00ff,
                        transparent: true,
                        opacity: data.style?.opacity ?? 1
                    });
                    object = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), planeMat);
                    (object as THREE.Mesh).name = `${data.type.toUpperCase()}_${data.id}`;
                    break;
                case 'line':
                    // TO-DO: Implement Line Path
                    object = new THREE.Object3D();
                    (object as THREE.Object3D).name = `LINE_${data.id}`;
                    break;
                case 'model':
                    // Placeholder: Create a colored cube
                    const color = data.style?.color || 0xffffff;
                    const opacity = data.style?.opacity ?? 1;
                    object = new THREE.Mesh(
                        new THREE.BoxGeometry(1, 1, 1),
                        new THREE.MeshBasicMaterial({
                            color,
                            transparent: opacity < 1,
                            opacity
                        })
                    );
                    (object as THREE.Mesh).name = `MODEL_${data.id}`;
                    break;
                default:
                    object = new THREE.Object3D();
                    (object as THREE.Object3D).name = `ELEMENT_${data.id}`;
            }

            // Aplicar transformaciones al objeto visual
            this.applyTransform(object as THREE.Object3D, data.transform);

            // Aplicar anclaje (Anchor es la posición inicial antes de las transformaciones)
            if (data.anchor) {
                (object as THREE.Object3D).position.x += data.anchor.xOffset;
                (object as THREE.Object3D).position.y += data.anchor.yOffset;
                (object as THREE.Object3D).position.z += data.anchor.zOffset;
            }

            this.anchorGroup.add(object as THREE.Object3D);
            console.log(`[ElementFactory] Created and added ${data.type} (${data.id}) to anchor. Visible: ${(object as THREE.Object3D).visible}, Pos: ${(object as THREE.Object3D).position.toArray()}, WorldPos: ${(object as THREE.Object3D).getWorldPosition(new THREE.Vector3()).toArray()}`);
        }

        this.elementMap[data.id] = object;
        return object;
    }

    public updateElement(data: SceneElementData): void {
        const object = this.elementMap[data.id];
        if (!object || !(object instanceof THREE.Object3D)) return;

        this.applyTransform(object, data.transform);

        if (data.type === 'text' && object instanceof Text) {
            object.text = data.content || '';
            object.fontSize = data.style?.fontSize || 2;
            object.color = data.style?.color || 0xffffff;
            object.fillOpacity = data.style?.opacity ?? 1;
            object.sync();
        } else if (object instanceof THREE.Mesh && object.material) {
            const mat = object.material as THREE.MeshBasicMaterial;
            if (data.style?.color) mat.color.set(data.style.color);
            if (data.style?.opacity !== undefined) {
                mat.opacity = data.style.opacity;
                mat.transparent = mat.opacity < 1;
            }
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
                    this.anchorGroup.remove(element);

                    // Dispose Troika Text
                    if (element instanceof Text) {
                        element.dispose();
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
