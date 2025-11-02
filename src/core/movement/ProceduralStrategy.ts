import * as THREE from 'three';
import { IMovementStrategy } from './IMovementStrategy';
import { gsap } from 'gsap';
import { WaveForms, WaveFunction } from './WaveForms';

// Defines the 'control panel' for a single axis
interface IAxisParams {
    radius: number;
    freq: number;
    phase: number;
    waveFn: WaveFunction;
}

// Defines the parameters for a complete movement state
interface IStateParams {
    speed: number;
    axisX: IAxisParams;
    axisY: IAxisParams;
    axisZ: IAxisParams;
}

/**
 * A generic, procedural movement strategy that can blend between two different states (A and B).
 * Each state defines the movement on each axis, including wave shape, frequency, phase, and radius.
 */
export class ProceduralStrategy implements IMovementStrategy {
    public readonly params = {
        mix: 0.0, // 0 = 100% stateA, 1 = 100% stateB
        radiusMultiplier: 1.0, // Global scaler for all radii

        stateA: { // Default "Chaotic" state
            speed: 1.0,
            axisX: { radius: 10, freq: 1.1, phase: 1.3, waveFn: WaveForms.sin },
            axisY: { radius: 10, freq: 1.2, phase: 1.7, waveFn: WaveForms.cos },
            axisZ: { radius: 10, freq: 1.5, phase: 1.0, waveFn: WaveForms.sin },
        } as IStateParams,

        stateB: { // Default "Uniform Circle" state
            speed: 1.0,
            axisX: { radius: 8, freq: 1.0, phase: 0, waveFn: WaveForms.cos },
            axisY: { radius: 8, freq: 1.0, phase: 0, waveFn: WaveForms.sin },
            axisZ: { radius: 0, freq: 1.0, phase: 0, waveFn: WaveForms.sin },
        } as IStateParams,
    };

    constructor() {
        console.log('🎼 [ProceduralStrategy] Instantiated.');
    }

    public update(target: THREE.Object3D, deltaTime: number, elapsedTime: number): void {
        // --- 1. Calculate position for state A ---
        const posA = this.calculateStatePosition(this.params.stateA, elapsedTime);

        // --- 2. Calculate position for state B ---
        const posB = this.calculateStatePosition(this.params.stateB, elapsedTime);

        // --- 3. Interpolate between the two based on the mix factor ---
        const finalX = gsap.utils.interpolate(posA.x, posB.x, this.params.mix);
        const finalY = gsap.utils.interpolate(posA.y, posB.y, this.params.mix);
        const finalZ = gsap.utils.interpolate(posA.z, posB.z, this.params.mix);

        target.position.set(finalX, finalY, finalZ);
    }

    private calculateStatePosition(state: IStateParams, elapsedTime: number): THREE.Vector3 {
        const time = elapsedTime * state.speed;

        const x = state.axisX.waveFn((time * state.axisX.freq) + state.axisX.phase) * state.axisX.radius * this.params.radiusMultiplier;
        const y = state.axisY.waveFn((time * state.axisY.freq) + state.axisY.phase) * state.axisY.radius * this.params.radiusMultiplier;
        const z = state.axisZ.waveFn((time * state.axisZ.freq) + state.axisZ.phase) * state.axisZ.radius * this.params.radiusMultiplier;

        return new THREE.Vector3(x, y, z);
    }
}