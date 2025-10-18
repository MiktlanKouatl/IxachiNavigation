// En src/core/FlockingController.ts

import * as THREE from 'three';
import { Boid } from './Boid';
import { RibbonLine } from '../../core/RibbonLine';
import { ILineController } from '../../core/ILineController';

export interface FlockingControllerConfig {
  boid: Boid;
  ribbon: RibbonLine;
  maxLength: number;
}

export class FlockingController implements ILineController {
  private boid: Boid;
  private ribbon: RibbonLine;

  constructor(config: FlockingControllerConfig) {
    this.boid = config.boid;
    this.ribbon = config.ribbon;
  }

  // 👇 CAMBIO 1: Nuevo método para calcular las fuerzas.
  public calculateFlock(allBoids: Boid[]): void {
    // console.log('[FlockingController] calculateFlock called.');
    this.boid.flock(allBoids, 15);
  }

  // 👇 CAMBIO 2: El update ahora es más simple y cumple la interfaz.
  public update(deltaTime: number, elapsedTime: number): void {
    // console.log('[FlockingController] update called.');
    // 1. Actualizamos la física (ya calculada en calculateFlock).
    // this.boid.update(); // Moved to LineManager

    // 2. Actualizamos la estela del cuerpo.
    this.ribbon.addPoint(this.boid.position);

    // 3. Redibujamos y actualizamos uniforms.
    // console.log('[FlockingController] Setting points for ribbon.');
    this.ribbon.material.uniforms.uTime.value = elapsedTime;

    // --- DEBUGGING LOGS ---
    // console.log(`[FlockingController Debug] Ribbon ID: ${this.ribbon.mesh.uuid}`);
    // console.log(`  - Mesh Visible: ${this.ribbon.mesh.visible}`);
    // console.log(`  - Mesh Position: ${this.ribbon.mesh.position.toArray()}`);
    // console.log(`  - Material Visible: ${this.ribbon.material.visible}`);
    // console.log(`  - Geometry Draw Range: start=${this.ribbon.geometry.drawRange.start}, count=${this.ribbon.geometry.drawRange.count}`);
    // console.log(`  - Geometry Position Attribute Count: ${this.ribbon.geometry.attributes.position.count}`);
    // if (this.ribbon.geometry.attributes.position.array.length > 0) {
    //     const posArray = this.ribbon.geometry.attributes.position.array;
    //     console.log(`  - First 6 position values: [${posArray[0]}, ${posArray[1]}, ${posArray[2]}, ${posArray[3]}, ${posArray[4]}, ${posArray[5]}]`);
    // }
    // --- END DEBUGGING LOGS ---

  }
}