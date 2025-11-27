import * as THREE from 'three';
import { WaypointContentData, ScreenData } from './types/WaypointContentData';
import { IBehaviorModule } from './types/IBehaviorModule';
import { ElementFactory } from './ElementFactory';
import { EventEmitter } from '../../core/EventEmitter';
import { PathController } from '../../core/pathing/PathController';

/**
 * Clase central que gestiona la carga, activación, y el ciclo de vida 
 * de los Waypoint Content y las Screens. Es el motor en tiempo de ejecución.
 */
export class WaypointContentManager {
    // Evento que se dispara cuando una interacción de un nodo de lógica ocurre
    public onLogicAction = new EventEmitter();

    private scene: THREE.Scene;
    private pathController: PathController;
    private allSections: Map<string, WaypointContentData> = new Map();
    private activeWaypointContent: WaypointContentData | null = null;
    private activeScreen: ScreenData | null = null;
    private currentScreenIndex: number = -1;
    private activeBehaviors: IBehaviorModule[] = [];
    private elementFactory: ElementFactory;
    private waypointContentAnchor: THREE.Object3D; // Punto de anclaje del contenido al Track

    constructor(scene: THREE.Scene, pathController: PathController) {
        this.scene = scene;
        this.pathController = pathController;
        // Creamos un grupo para contener todos los elementos de la sección
        this.waypointContentAnchor = new THREE.Object3D();
        this.scene.add(this.waypointContentAnchor);

        this.elementFactory = new ElementFactory(this.waypointContentAnchor, this.onLogicAction);
    }

    /**
     * Carga el JSON con la configuración de todos los elementos de contenido.
     */
    public loadSections(waypointContents: WaypointContentData[]): void {
        waypointContents.forEach(waypointContent => {
            this.allSections.set(waypointContent.id, waypointContent);
        });
        console.log(`[WaypointContentManager] Cargadas ${waypointContents.length} elementos de contenido.`);
    }

    /**
     * Mueve el punto de anclaje de la sección a la posición actual del Path.
     */
    private updateAnchorPosition(progress: number): void {
        const point = this.pathController.getPointAt(progress);
        const tangent = this.pathController.getTangentAt(progress);

        // Posicionar el ancla
        this.waypointContentAnchor.position.copy(point);

        // Orientar el ancla para que "mire" hacia adelante (con el Y vertical, NO inclinado)
        // Usamos una matriz temporal para alinear XZ con la tangente
        const m = new THREE.Matrix4();
        m.lookAt(point, point.clone().add(tangent), new THREE.Vector3(0, 1, 0));
        this.waypointContentAnchor.rotation.setFromRotationMatrix(m);
    }

    private previousProgress: number = -1;

    /**
     * Bucle principal: verifica triggers y actualiza lógica.
     */
    public update(deltaTime: number, time: number, trackProgress: number): void {
        // Initialize previousProgress on first run
        if (this.previousProgress === -1) {
            this.previousProgress = trackProgress;
        }

        // Lógica de detección de activación de sección
        if (!this.activeWaypointContent) {
            for (const waypointContent of this.allSections.values()) {
                // Detect crossing of the trigger point
                // Case 1: Standard crossing (prev < target <= curr)
                const crossed = this.previousProgress < waypointContent.trackProgress && trackProgress >= waypointContent.trackProgress;

                // Case 2: Loop wrapping (prev > curr, e.g. 0.99 -> 0.01) AND target is near 0
                // This is a bit complex without knowing if it's a loop. 
                // For now, we'll assume linear crossing or simple tolerance for start.

                // Case 3: Direct proximity (useful if we spawn right on it)
                const near = Math.abs(trackProgress - waypointContent.trackProgress) < 0.005;

                if (crossed || near) {
                    this.activateWaypointContent(waypointContent.id, trackProgress);
                    break;
                }
            }
        }
        if (this.activeWaypointContent) {
            // Mover el ancla de la sección con el track? 
            // NO, el ancla debe quedarse fija en el punto de inicio de la sección.
            // Si queremos que la sección se mueva con el jugador (HUD), es diferente.
            // Pero el diseño dice "Waypoint Content Anchor". Asumimos que es estático en el track.
            // Wait, el código original decía updateAnchorPosition(trackProgress).
            // Si actualizamos con trackProgress, la sección se mueve con el jugador.
            // Si es un "Billboard" que viaja contigo, está bien.
            // Si es un "Lugar" en el mapa, debería fijarse en waypointContent.trackProgress.

            // CORRECCIÓN: Fijar el ancla en la posición de la sección, no del jugador.
            // this.updateAnchorPosition(this.activeSection.trackProgress); 
            // Pero si queremos que aparezca frente al jugador, tal vez sea un HUD 3D.
            // El usuario pidió "espacio donde se muestre primero el nombre de la sección".
            // Vamos a asumir que se queda fijo en el mundo en el punto trackProgress.

            // Sin embargo, para efectos visuales, a veces queremos que flote cerca.
            // Por ahora, lo dejaré fijo en el punto de la sección.
            this.updateAnchorPosition(this.activeWaypointContent.trackProgress);

            // Actualizar todos los módulos de comportamiento activos
            this.activeBehaviors.forEach(b => b.update(deltaTime, time));

            // Lógica de transición de Screen (TO-DO)
            // ...
        }

        this.previousProgress = trackProgress;
    }

    /**
     * Instancia la sección y sus primeros elementos.
     */
    public activateWaypointContent(id: string, progress: number): void {
        const waypointContent = this.allSections.get(id);
        if (!waypointContent) return;

        if (this.activeWaypointContent === waypointContent) return; // Ya está activa

        if (this.activeWaypointContent) {
            this.disposeActiveWaypointContent();
        }

        this.activeWaypointContent = waypointContent;
        this.currentScreenIndex = -1; // Arrancamos antes del primer Screen

        console.log(`[WaypointContentManager] Contenido de Waypoint '${id}' activado.`);
        this.updateAnchorPosition(waypointContent.trackProgress);
        this.waypointContentAnchor.visible = true;

        this.playNextScreen();
    }

    private playNextScreen(): void {
        this.currentScreenIndex++;
        const nextScreen = this.activeWaypointContent?.screens[this.currentScreenIndex];

        if (nextScreen) {
            this.activeScreen = nextScreen;
            console.log(`[WaypointContentManager] Transicionando a Screen '${nextScreen.id}'.`);

            // Aquí iría la lógica de transición animada (TO-DO)

            this.loadScreenElements(nextScreen);
        } else {
            // Fin de la sección
            // Opcional: Dispose automático o esperar a salir del rango
            // Por ahora, no hacemos dispose automático para que se quede visible un rato
        }
    }

    private loadScreenElements(screen: ScreenData): void {
        // Limpiamos la lógica anterior y los elementos visuales (TO-DO)

        // Instanciar nuevos elementos
        screen.elements.forEach(data => {
            const element = this.elementFactory.createElement(data);

            // Si es un nodo de lógica, lo guardamos para el update loop
            if (data.type === 'logic') {
                const behaviorModule = element as IBehaviorModule;

                // Mapear targetElementIds a objetos 3D
                if (data.targetElementIds) {
                    const targetObjects = this.elementFactory.getSceneObjectsByIds(data.targetElementIds);
                    behaviorModule.init(data.config, targetObjects);
                } else {
                    behaviorModule.init(data.config, []);
                }

                this.activeBehaviors.push(behaviorModule);
            }
        });
    }

    /**
     * Limpia la sección actual.
     */
    public disposeActiveWaypointContent(): void {
        if (!this.activeWaypointContent) return;

        // Limpiar la lógica
        this.activeBehaviors.forEach(b => b.dispose());
        this.activeBehaviors = [];

        // Limpiar elementos visuales
        this.elementFactory.disposeAllElements();

        this.activeWaypointContent = null;
        this.activeScreen = null;
        this.waypointContentAnchor.visible = false;
        console.log(`[WaypointContentManager] Contenido de Waypoint desactivado.`);
    }
}
