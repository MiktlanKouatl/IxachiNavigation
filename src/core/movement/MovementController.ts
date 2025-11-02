import * as THREE from 'three';
import { IMovementStrategy } from './IMovementStrategy';

/**
 * Manages and executes the active movement strategy.
 */
export class MovementController {
    private activeStrategy: IMovementStrategy | null = null;

    /**
     * Sets or changes the active movement strategy.
     * @param strategy The new strategy to use.
     */
    public setStrategy(strategy: IMovementStrategy | null): void {
        this.activeStrategy = strategy;
        console.log(`🧠 [MovementController] Strategy set to: ${strategy?.constructor.name || 'null'}`);
    }

    public getActiveStrategy(): IMovementStrategy | null {
        return this.activeStrategy;
    }

    /**
     * Executes the update method of the active strategy, if one is set.
     * @param target The object to be moved.
     * @param deltaTime Time since the last frame.
     * @param elapsedTime Total time elapsed.
     */
    public update(target: THREE.Object3D, deltaTime: number, elapsedTime: number): void {
        if (this.activeStrategy) {
            this.activeStrategy.update(target, deltaTime, elapsedTime);
        }
    }
}
