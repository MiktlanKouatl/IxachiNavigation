import * as THREE from 'three';

/**
 * Defines the contract for a movement strategy.
 * Any class that dictates how an object moves should implement this interface.
 */
export interface IMovementStrategy {
    /**
     * Optional parameters to configure the strategy.
     * Can be animated with GSAP.
     */
    params?: any;

    /**
     * Updates the position of the target object based on the strategy's logic.
     * @param target The object to move.
     * @param deltaTime Time since the last frame.
     * @param elapsedTime Total time elapsed.
     */
    update(target: THREE.Object3D, deltaTime: number, elapsedTime: number): void;
}
