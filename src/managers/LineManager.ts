// src/ixachi/LineManager.ts
import * as THREE from 'three';
import { RibbonConfig, RibbonLine, RenderMode } from '../core/RibbonLine';
import { ILineController } from '../core/ILineController';
import { TrailController } from '../../_legacy/src/ixachi/strategies/TrailController';
import { IMotionSource } from '../types/IMotionSource';
import { PathData } from '../core/pathing/PathData';
import { PathFollower } from '../core/pathing/PathFollower';

// Controladores
//
import { PathGuide } from '../../_legacy/src/ixachi/core/PathGuide';
import { PathController } from '../../_legacy/src/ixachi/strategies/PathController';
import { FlockingController } from '../../_legacy/src/ixachi/strategies/FlockingController';
import { Boid } from '../../_legacy/src/ixachi/strategies/Boid';
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
    guideSpeed: number = 50.0,
    trailLength: number = 0.1
  ): void {
    // console.log(`🌀 [LineManager] Creando sistemas de líneas para ${allPaths.length} trazados SVG...`);

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
        {
          trailLength: Math.floor(pathPoints.length * trailLength),
        }
      );

      // --- 5. Ensamblar y registrar el nuevo sistema de línea ---
      this.lines.push({ ribbon, controller, guide });
      //ribbon.pulse(true); // Iniciamos el pulso de la línea
    });

    // console.log(`✅ [LineManager] Se han creado ${this.lines.length} sistemas de líneas.`);
  }

  public createLineSwarm(
    pathPoints: THREE.Vector3[],
    count: number,
    ribbonConfig: RibbonConfig
): void {
    // console.log(`🌀 [LineManager] Creando enjambre de ${count} líneas...`);

    // 1. Creamos UN SOLO "mapa" para que todas las líneas lo compartan.
    const sharedPathData = new PathData(pathPoints, true);

    // 2. Creamos múltiples "coches" (seguidores), cada uno con un punto de partida diferente.
    for (let i = 0; i < count; i++) {
        // Distribuimos los seguidores a lo largo del camino.
        const initialProgress = i / count;

        const follower = new PathFollower(sharedPathData, {
            speed: 60.0,
            initialProgress: initialProgress,
        });

        const ribbon = new RibbonLine(ribbonConfig);
        this.scene.add(ribbon.mesh);

        const controller = new TrailController(ribbon, follower, {
            trailLength: 20, // Estelas cortas para el efecto de enjambre
        });
        
        // Ensamblamos el sistema.
        this.lines.push({ ribbon, controller, motionSource: follower });
    }
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