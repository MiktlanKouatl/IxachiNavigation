import * as THREE from 'three';
import { IBehaviorModule, LogicRegistry } from '../types/IBehaviorModule';

interface AttractionConfig {
    forceMultiplier: number;
    centerTargetId: string; // El ID del objeto que atraerá a los demás
}

/**
 * Módulo de Lógica: Aplica una fuerza de atracción/repulsión a los elementos target.
 */
export class AttractionPhysicsModule implements IBehaviorModule {
    private config!: AttractionConfig;
    private targets: THREE.Object3D[] = [];
    private centerTarget: THREE.Object3D | null = null;
    private velocity: Map<THREE.Object3D, THREE.Vector3> = new Map();

    init(config: any, targets: THREE.Object3D[]): void {
        this.config = config as AttractionConfig;
        this.targets = targets;

        // El centro de atracción debe ser uno de los targets o un elemento referenciado
        // En un sistema real, el ElementFactory buscaría 'centerTargetId'
        // Por ahora, asumimos que el primer target es el centro de atracción para simplificar:
        this.centerTarget = this.targets[0];

        this.targets.forEach(t => {
            this.velocity.set(t, new THREE.Vector3());
        });
    }

    update(deltaTime: number, time: number): void {
        if (!this.centerTarget) return;

        const centerPos = this.centerTarget.position;
        const multiplier = this.config.forceMultiplier * deltaTime;

        // Aplicar atracción a todos los demás targets
        for (const target of this.targets) {
            if (target === this.centerTarget) continue;

            const direction = centerPos.clone().sub(target.position);
            const distanceSq = direction.lengthSq();

            // Usar una fuerza inversamente proporcional a la distancia (o similar)
            if (distanceSq > 0.1) {
                direction.normalize();

                // La fuerza es más fuerte cuanto más lejos está (o viceversa)
                const force = multiplier / Math.sqrt(distanceSq);

                // Aplicar la fuerza como aceleración a la velocidad
                let currentVel = this.velocity.get(target)!;
                currentVel.add(direction.multiplyScalar(force));

                // Aplicar fricción simple (damping)
                currentVel.multiplyScalar(0.95);

                // Mover el target
                target.position.add(currentVel);
            }
        }
    }

    dispose(): void {
        this.velocity.clear();
        this.targets = [];
        this.centerTarget = null;
    }
}

// IMPORTANTE: Registrar el módulo para que el WaypointContentManager lo pueda instanciar
LogicRegistry['AttractionPhysics'] = AttractionPhysicsModule;

console.log('[LogicRegistry] Módulo AttractionPhysics registrado.');
