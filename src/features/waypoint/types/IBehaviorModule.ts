import * as THREE from 'three';
import { SceneElementData } from './WaypointContentData';

/**
 * Interfaz base para cualquier módulo de lógica que puede ser instanciado 
 * por el WaypointContentManager.
 */
export interface IBehaviorModule {
    /**
     * Inicializa el módulo.
     * @param config - El objeto 'config' del JSON.
     * @param targets - Los objetos 3D a los que este módulo debe aplicar su lógica.
     */
    init(config: any, targets: THREE.Object3D[]): void;

    /**
     * Se llama en cada frame del bucle de renderizado.
     * @param deltaTime - El tiempo transcurrido desde el último frame.
     * @param time - Tiempo total transcurrido.
     */
    update(deltaTime: number, time: number): void;

    /**
     * Limpia listeners, timers, o cualquier recurso.
     */
    dispose(): void;
}

/**
 * Registro de todas las clases de lógica disponibles.
 * Usado por el ElementFactory para instanciar el módulo correcto.
 */
export const LogicRegistry: { [key: string]: new () => IBehaviorModule } = {};
