// src/ixachi/LineManager.ts
import * as THREE from 'three';
import { RibbonConfig, RibbonLine, RenderMode } from './core/RibbonLine';
import { ILineController } from './core/ILineController';
import { TrailController } from './strategies/TrailController';
import { IMotionSource } from './core/IMotionSource';

// Controladores
//
import { PathGuide } from './core/PathGuide';
import { PathController } from './strategies/PathController';
import { FlockingController } from './strategies/FlockingController';
import { Boid } from './strategies/Boid';

interface LineSystem {
  ribbon: RibbonLine;
  controller: ILineController;
}

export class LineManager {
  private scene: THREE.Scene;
  private lines: LineSystem[] = [];
  
  private boids: Boid[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🚀 LineManager v3.0 (Flocking Ready) inicializado.');
  }

  // --- MÉTODOS DE CREACIÓN ---

  /* public createFollowingLine(
    ribbonConfig: RibbonConfig,
    guideConfig: { radius: number; speed: number }
  ): LineSystem {
    const ribbon = new RibbonLine(ribbonConfig);
    this.scene.add(ribbon.mesh);
    //const startPosition = new THREE.Vector3(0,0,0);
    //const initialDirection = new THREE.Vector3(0, 1, 0);
    const guide = new PathGuide (startPosition, initialDirection, 15);
   
    const controller = new TrailController(
      ribbon,
      guide, // Le pasamos el guía como la "Fuente de Movimiento"
      ribbonConfig.maxLength
    );

    // ✨ --- LÍNEAS DE DEPURACIÓN --- ✨
  //console.log("🔍 [LineManager] Creando sistema:", { ribbon, controller });
  //console.log("   - Ribbon es instancia de RibbonLine:", ribbon instanceof RibbonLine);
  //console.log("   - Controller es instancia de TrailController:", controller instanceof TrailController);
  // --- FIN DE LÍNEAS DE DEPURACIÓN ---

    const lineSystem = { ribbon, controller };
    this.lines.push(lineSystem);
    return lineSystem;
  } */

  public createLinesFromSVG(
    allPaths: THREE.Vector3[][],
    ribbonConfig: RibbonConfig,
    guideSpeed: number = 40.0,
    trailLength: number = 0.3
  ): void {
    console.log(`🌀 [LineManager] Creando sistemas de líneas para ${allPaths.length} trazados SVG...`);

    allPaths.forEach((pathPoints, index) => {
      // --- 1. FILTRO DE CALIDAD ---
      let estimatedLength = 0;
      for (let i = 0; i < pathPoints.length - 1; i++) {
        estimatedLength += pathPoints[i].distanceTo(pathPoints[i + 1]);
      }
      if (pathPoints.length < 3 || estimatedLength < 1.0) {
        console.warn(`⚠️ [LineManager] Trazado ${index + 1} omitido por ser demasiado corto o simple.`);
        return; // Omitimos este trazado y continuamos con el siguiente.
      }

      // --- 2. Crear la Guía de Movimiento ---
      const guide = new PathGuide(pathPoints, {
        speed: guideSpeed,
        isClosedLoop: true,
      });

      // --- 3. Crear la Cinta (El Cuerpo Visual) ---
      const ribbon = new RibbonLine(ribbonConfig);
      this.scene.add(ribbon.mesh);

      // --- 4. Crear el Controlador ---
      const controller = new TrailController(
        ribbon,
        guide,
        Math.floor(pathPoints.length * trailLength) // maxLength basado en la longitud del trazado
      );

      // --- 5. Ensamblar y registrar el nuevo sistema de línea ---
      this.lines.push({ ribbon, controller });
      //ribbon.pulse(true); // Iniciamos el pulso de la línea
    });

    console.log(`✅ [LineManager] Se han creado ${this.lines.length} sistemas de líneas.`);
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

  // Método para crear un cardumen completo.
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

      // Creamos un TrailController universal, pasándole el Boid como fuente de movimiento.
      const controller = new TrailController(
        ribbon,
        boid, // Boid ya es un IMotionSource, ¡así que encaja perfecto!
        100   // maxLength de la estela
      );
      
      // 4. Añadimos el nuevo sistema al manager.
      this.lines.push({ ribbon, controller });
    }
  }


  // El update orquesta la simulación del flocking.
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
      lineSystem.ribbon.update(elapsedTime);
    }
  }

  public getRibbons(): RibbonLine[] {
    return this.lines.map(l => l.ribbon);
  }
}