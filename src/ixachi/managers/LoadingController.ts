// Ruta Propuesta: src/ixachi/managers/LoadingController.ts

import * as THREE from 'three';
import { RibbonLine, RibbonConfig, RenderMode, FadeStyle } from '../core/RibbonLine';
import gsap from 'gsap';

/**
 * @class LoadingController
 * @description Gestiona la representación visual de la pantalla de carga en 3D.
 * No crea su propia escena, sino que encapsula sus objetos en un THREE.Group
 * para ser añadido a una escena existente.
 */
export class LoadingController {
  public readonly container: THREE.Group;
  private ribbon: RibbonLine;

  constructor() {
    console.log('🎨 [LoadingController] Creando visuales de carga...');
    
    this.container = new THREE.Group();

    // --- 1. Definir la configuración de la cinta para el loader ---
    const loaderRibbonConfig: RibbonConfig = {
      color: new THREE.Color(0xffffff),
      width: 0.1,
      maxLength: 101, // 100 segmentos + 1 para cerrar el círculo
      renderMode: RenderMode.Solid,
      fadeStyle: FadeStyle.None,
    };

    this.ribbon = new RibbonLine(loaderRibbonConfig);
    // Inicializamos el progreso de dibujado en 0 para que esté invisible al empezar.
    this.ribbon.material.uniforms.uDrawProgress.value = 0;

    // --- 2. Crear los puntos para la geometría (un círculo) ---
    const points = this.createCirclePoints(1.5, 100);
    this.ribbon.setPoints(points);

    // --- 3. Añadir la cinta al contenedor principal ---
    this.container.add(this.ribbon.mesh);
    this.container.visible = false; // Empezará invisible hasta que lo mostremos explícitamente.
    
    console.log('✅ [LoadingController] Visuales de carga listos.');
  }

  /**
   * Genera una serie de puntos en forma de círculo.
   * @param radius - El radio del círculo.
   * @param segments - El número de segmentos (puntos) que formarán el círculo.
   * @returns Un array de THREE.Vector3.
   */
  private createCirclePoints(radius: number, segments: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(theta) * radius,
          Math.sin(theta) * radius,
          0
        )
      );
    }
    return points;
  }

  /**
   * Actualiza el progreso visual del loader.
   * @param progress - Un valor de 0.0 a 1.0.
   */
  public setProgress(progress: number): void {
    // Directamente actualizamos el uniform del shader que controla el dibujado.
    this.ribbon.material.uniforms.uDrawProgress.value = progress;
  }

  /**
   * Muestra el loader con una animación de aparición.
   * @returns Una promesa que se resuelve cuando la animación termina.
   */
  public show(): Promise<void> {
    return new Promise((resolve) => {
      this.container.visible = true;
      gsap.to(this.ribbon.material.uniforms.uOpacity, {
        value: 1.0,
        duration: 0.5,
        onComplete: resolve
      });
    });
  }

  /**
   * Oculta el loader con una animación de desaparición.
   * @returns Una promesa que se resuelve cuando la animación termina.
   */
  public hide(): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(this.ribbon.material.uniforms.uOpacity, {
        value: 0.0,
        duration: 0.5,
        onComplete: () => {
          this.container.visible = false;
          resolve();
        }
      });
    });
  }

  /**
   * Libera los recursos de la GPU cuando el loader ya no es necesario.
   */
  public dispose(): void {
    this.ribbon.dispose();
  }
}