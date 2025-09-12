import * as THREE from 'three';
import { RibbonConfig, RibbonLine, RenderMode } from '../core/RibbonLine';
import { ILineController } from '../interfaces/ILineController';

// Controladores
import { PathFollower } from '../core/PathFollower';
import { PathGuide } from '../core/PathGuide';
import { PathController } from '../core/PathController';
import { FlockingController } from '../core/FlockingController';
import { Boid } from '../core/Boid';

interface LineSystem {
  ribbon: RibbonLine;
  controller: ILineController;
}

export class LineManager {
  private scene: THREE.Scene;
  private lines: LineSystem[] = [];
  
  // 👇 CAMBIO 1: El manager ahora conoce a todos los boids.
  private boids: Boid[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🚀 LineManager v3.0 (Flocking Ready) inicializado.');
  }

  // --- MÉTODOS DE CREACIÓN ---

  public createFollowingLine(
    ribbonConfig: RibbonConfig,
    guideConfig: { radius: number; speed: number }
  ): LineSystem {
    const ribbon = new RibbonLine(ribbonConfig);
    this.scene.add(ribbon.mesh);
    const guide = new PathGuide(guideConfig.radius, guideConfig.speed);
    const follower = new PathFollower({
      pathGuide: guide,
      ribbon: ribbon,
      maxLength: ribbonConfig.maxLength,
    });
    const lineSystem = { ribbon, controller: follower };
    this.lines.push(lineSystem);
    return lineSystem;
  }

  public createStaticShape(
    ribbonConfig: RibbonConfig,
    points: THREE.Vector3[]
  ): LineSystem {
    const ribbon = new RibbonLine(ribbonConfig);
    this.scene.add(ribbon.mesh);
    const controller = new PathController(ribbon, points);
    const lineSystem = { ribbon, controller };
    this.lines.push(lineSystem);
    return lineSystem;
  }

  // 👇 CAMBIO 2: Un nuevo método para crear un cardumen completo.
  public createFlock(
    count: number,
    ribbonConfig: Omit<RibbonConfig, 'maxLength'>,
    bounds: { x: number; y: number; z: number }
  ) {
    console.log(`🐦 Creando cardumen de ${count} líneas...`);
    for (let i = 0; i < count; i++) {
      // Creamos el cerebro (Boid) en una posición aleatoria.
      const boid = new Boid(
        Math.random() * 50 - 25,
        Math.random() * 50 - 25,
        0,
        bounds
      );
      this.boids.push(boid); // Lo añadimos a nuestra lista de cerebros.

      // Creamos el cuerpo (RibbonLine).
      const ribbon = new RibbonLine({
        ...ribbonConfig,
        maxLength: 100, // Todas las estelas del cardumen tendrán este largo
      });
      this.scene.add(ribbon.mesh);

      // Creamos el controlador que los une.
      const controller = new FlockingController({
        boid: boid,
        ribbon: ribbon,
        maxLength: 100
      });

      this.lines.push({ ribbon, controller });
    }
  }


  // 👇 CAMBIO 3: El update ahora orquesta la simulación del flocking.
  public update(deltaTime: number, elapsedTime: number): void {
    // 1. Primero, calculamos el movimiento de todos los boids.
    // Pasamos la lista completa de boids a cada FlockingController.
    for (const lineSystem of this.lines) {
      if (lineSystem.controller instanceof FlockingController) {
        lineSystem.controller.calculateFlock(this.boids);
      }
    }
    
    // 2. Luego, actualizamos todos los controladores.
    for (const lineSystem of this.lines) {
      lineSystem.controller.update(deltaTime, elapsedTime);
    }
  }

  public getRibbons(): RibbonLine[] {
    return this.lines.map(l => l.ribbon);
  }
}