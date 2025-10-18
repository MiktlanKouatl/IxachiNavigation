// src/ixachi/core/IMotionSource.ts
import * as THREE from 'three';

/**
 * Define el contrato para cualquier objeto que pueda actuar como una fuente de movimiento.
 * Un IMotionSource es un "punto inteligente" en el espacio que sabe dónde está
 * y cómo actualizar su posición en cada fotograma.
 */
export interface IMotionSource {
    /**
     * La posición actual del objeto en el espacio 3D. Debe ser de solo lectura
     * para que los controladores externos no la modifiquen directamente.
     */
    readonly position: THREE.Vector3;

    /**
     * El método que actualiza la lógica de movimiento del objeto.
     * @param deltaTime El tiempo transcurrido desde el último fotograma.
     * @param elapsedTime El tiempo total transcurrido desde el inicio.
     */
    update(deltaTime: number, elapsedTime: number): void;
}