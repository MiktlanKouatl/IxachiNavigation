// En src/core/LineManager.ts

import * as THREE from 'three';
import { RibbonConfig, RibbonLine, RenderMode } from '../core/RibbonLine'; // Añadimos RenderMode a la importación
import { PathGuide } from '../core/PathGuide';
import { PathFollower } from '../core/PathFollower';
import { ILineController } from '../interfaces/ILineController'; // Importamos la interfaz
import { PathController } from '../core/PathController'; // Importamos el nuevo controlador

// Ahora, un LineSystem contiene un controlador genérico
interface LineSystem {
  ribbon: RibbonLine;
  controller: ILineController;
}

export class LineManager {
  private scene: THREE.Scene;
  private lines: LineSystem[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🚀 LineManager v2.0 (Multi-Estrategia) inicializado.');
  }

  // Método para las líneas que siguen una guía
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
    const lineSystem = { ribbon, controller: follower }; // Creamos el objeto del sistema
    this.lines.push(lineSystem);
    console.log(`✨ Línea dinámica creada con modo: ${RenderMode[ribbonConfig.renderMode ?? 0]}`);
    return lineSystem; // Devolvemos el sistema completo
  }

  // Método para las líneas estáticas
  public createStaticShape(
    ribbonConfig: RibbonConfig,
    points: THREE.Vector3[]
  ): LineSystem { // El tipo de retorno ya estaba bien, solo faltaba la implementación.
    const ribbon = new RibbonLine(ribbonConfig);
    this.scene.add(ribbon.mesh);
    const controller = new PathController(ribbon, points);
    const lineSystem = { ribbon, controller }; // Creamos el objeto
    this.lines.push(lineSystem);
    console.log(`✨ Forma estática creada con modo: ${RenderMode[ribbonConfig.renderMode ?? 0]}`);
    return lineSystem; // Devolvemos el objeto completo
  }

  // 👇 CAMBIO 3: El update ahora es más simple y genérico
  public update(deltaTime: number, elapsedTime: number): void {
    for (const lineSystem of this.lines) {
      // Llama al update del controlador, sea cual sea (PathFollower o ShapeDrawer)
      lineSystem.controller.update(deltaTime, elapsedTime);
    }
  }

  // Un método útil para obtener las ribbons si necesitamos controlarlas desde main.ts
  public getRibbons(): RibbonLine[] {
    return this.lines.map(l => l.ribbon);
  }
}