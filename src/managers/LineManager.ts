// src/ixachi/LineManager.ts
import * as THREE from 'three';
import { RibbonConfig, RibbonLine, RenderMode } from '../core/RibbonLine';
import { ILineController } from '../core/ILineController';

import { FlockingController } from '../features/flocking/FlockingController';
import { Boid } from '../features/flocking/Boid';
import { IAreaConstraint } from '../features/flocking/constraints/IAreaConstraint';

interface LineSystem {
  ribbon: RibbonLine;
  controller: ILineController;
  motionSource?: IMotionSource;
}

export class LineManager {
  private scene: THREE.Scene;
  private lines: LineSystem[] = [];
  
  private boids: Boid[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // console.log('🚀 LineManager v3.0 (Flocking Ready) inicializado.');
  }

  // --- MÉTODOS DE CREACIÓN ---



  // Método para crear un cardumen completo.
  public createFlock(
    count: number,
    ribbonConfig: Omit<RibbonConfig, 'maxLength'>,
    areaConstraint: IAreaConstraint
  ) {
    // console.log(`🐦 Creando cardumen de ${count} líneas...`);
    for (let i = 0; i < count; i++) {
      // Creamos el cerebro (Boid) en una posición aleatoria.
      const boid = new Boid(
        Math.random() * 50 - 25,
        Math.random() * 50 - 25,
        0,
        areaConstraint
      );
      this.boids.push(boid); // Lo añadimos a nuestra lista de cerebros.

      // Creamos el cuerpo (RibbonLine).
      const ribbon = new RibbonLine({
        ...ribbonConfig,
        maxLength: 100, // Todas las estelas del cardumen tendrán este largo
      });
      this.scene.add(ribbon.mesh);
      // console.log(`[LineManager] RibbonLine ${i} created and added to scene.`);

      // Creamos un FlockingController para este boid.
      const controller = new FlockingController({
        boid: boid,
        ribbon: ribbon,
        maxLength: 100,
      });
      
      // 4. Añadimos el nuevo sistema al manager.
      this.lines.push({ ribbon, controller });
    }
  }


  // El update orquesta la simulación del flocking.
  public update(deltaTime: number, elapsedTime: number): void {
    // console.log('[LineManager] Update method started.');
    // 1. Primero, calculamos el movimiento de todos los boids.
    // Pasamos la lista completa de boids a cada FlockingController.
    for (const lineSystem of this.lines) {
      if (lineSystem.controller instanceof FlockingController) {
        lineSystem.controller.calculateFlock(this.boids);
      }
    }
    // console.log('[LineManager] Flocking forces calculated for all boids.');

    // 2. Actualizamos la física de todos los boids (aplicando las fuerzas calculadas).
    for (const boid of this.boids) {
      boid.update();
    }
    // console.log('[LineManager] Boids physics updated.');
    
    // 3. Luego, actualizamos todos los controladores y las cintas.
    for (const lineSystem of this.lines) {
      
      if (lineSystem.motionSource) {
            // Si la tiene (como nuestro PathFollower), la actualizamos primero.
            lineSystem.motionSource.update (deltaTime, elapsedTime);
        }
      // FlockingController.update() ya no necesita llamar a boid.update()
      // porque ya lo hicimos en el paso anterior.
      lineSystem.controller.update(deltaTime, elapsedTime);
      lineSystem.ribbon.update(elapsedTime);
    }
    // console.log('[LineManager] Controllers and ribbons updated.');
  }

  public getRibbons(): RibbonLine[] {
    return this.lines.map(l => l.ribbon);
  }

  public setAreaConstraint(areaConstraint: IAreaConstraint): void {
    for (const boid of this.boids) {
      boid.areaConstraint = areaConstraint;
    }
  }
}