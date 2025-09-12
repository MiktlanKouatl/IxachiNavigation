// En src/core/FlockingController.ts

import * as THREE from 'three';
import { Boid } from './Boid';
import { RibbonLine } from './RibbonLine';
import { ILineController } from '../interfaces/ILineController';

export interface FlockingControllerConfig {
  boid: Boid;
  ribbon: RibbonLine;
  maxLength: number;
}

export class FlockingController implements ILineController {
  private boid: Boid;
  private ribbon: RibbonLine;
  private points: THREE.Vector3[] = [];
  private maxLength: number;

  constructor(config: FlockingControllerConfig) {
    this.boid = config.boid;
    this.ribbon = config.ribbon;
    this.maxLength = config.maxLength;
    for (let i = 0; i < this.maxLength; i++) {
      this.points.push(this.boid.position.clone());
    }
  }

  // 👇 CAMBIO 1: Nuevo método para calcular las fuerzas.
  public calculateFlock(allBoids: Boid[]): void {
    this.boid.flock(allBoids, 15);
  }

  // 👇 CAMBIO 2: El update ahora es más simple y cumple la interfaz.
  public update(deltaTime: number, elapsedTime: number): void {
    // 1. Actualizamos la física (ya calculada en calculateFlock).
    this.boid.update();

    // 2. Actualizamos la estela del cuerpo.
    const lastPoint = this.points.pop()!;
    this.points.unshift(lastPoint);
    lastPoint.copy(this.boid.position);

    // 3. Redibujamos y actualizamos uniforms.
    this.ribbon.update(this.points);
    this.ribbon.material.uniforms.uTime.value = elapsedTime;
  }
}