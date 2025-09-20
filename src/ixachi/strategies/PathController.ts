// src/core/PathController.ts

import { RibbonLine } from '../core/RibbonLine';
import { ILineController } from '../core/ILineController';
import gsap from 'gsap';

export class PathController implements ILineController {
  private ribbon: RibbonLine;
  private timeline: gsap.core.Timeline; // Usaremos una línea de tiempo de GSAP

  private animationState = {
    revealProgress: 1,
    traceProgress: 0,
  };


  constructor(ribbon: RibbonLine, points: THREE.Vector3[]) {
    this.ribbon = ribbon;
    this.timeline = gsap.timeline();
    this.show(points);
  }

  /**
   * Muestra la forma estática completa de inmediato.
   * @param points Array de puntos que definen la forma.
   */
  public show(points: THREE.Vector3[]): void {
    this.timeline.kill(); // Detenemos cualquier animación en curso.
    this.ribbon.setPoints(points);
    // Para mostrar, el progreso del dibujo está al 100%
    this.ribbon.material.uniforms.uDrawProgress.value = 1.0;
    // Y desactivamos el trace poniendo su longitud en 0.
    this.ribbon.material.uniforms.uTraceSegmentLength.value = 0.0;
  }

  /**
   * Anima el dibujado de la línea desde el principio hasta el fin.
   * @param duration Duración de la animación en segundos.
   * @param delay Retardo antes de iniciar la animación en segundos.
   * @returns Una promesa que se resuelve cuando la animación termina.
   */
  public reveal(duration: number = 2, delay: number = 0): Promise<void> {
    console.log('▶️ Animando: Reveal');
    this.timeline.kill();
    this.animationState.revealProgress = 0;
    this.ribbon.material.uniforms.uTraceSegmentLength.value = 0.0; // Nos aseguramos de que el trace esté apagado
    // Animamos uVisibleEnd de 0 a 1.
    return new Promise(resolve => {
      this.timeline = gsap.timeline({ onComplete: () => resolve(), delay });
      this.timeline.to(this.animationState, {
        revealProgress: 1,
        duration,
        ease: 'power2.inOut',
      });
    });
  }

  /**
   * Anima un segmento de luz que recorre la forma continuamente.
   * @param duration Duración de una pasada completa en segundos.
   * @param segmentLength Longitud del segmento visible (0.0 - 1.0).
   * @param delay Retardo antes de iniciar la animación en segundos.
   */
  public trace(duration: number = 3, segmentLength: number = 0.2): void {
    console.log('▶️ Animando: Trace (Bucle Perfecto)');
    this.timeline.kill();
    // Nos aseguramos de que la línea esté completamente "revelada".
    this.animationState.revealProgress = 1.0;
    
    // Le pasamos la longitud del segmento al shader una sola vez.
    this.ribbon.material.uniforms.uTraceSegmentLength.value = segmentLength;

    // 👇 CAMBIO 2: La animación ahora es un simple bucle de 0 a 1.
    // GSAP se encargará de que este bucle sea perfecto y sin saltos.
    this.timeline = gsap.timeline({ repeat: -1 });
    this.timeline.fromTo(this.animationState, 
      { traceProgress: 0 },
      { traceProgress: 1, duration, ease: 'none' }
    );
  }

  public update(deltaTime: number, elapsedTime: number): void {
    // 👇 CAMBIO 3: Pasamos los estados actuales al shader en cada fotograma.
    this.ribbon.material.uniforms.uDrawProgress.value = this.animationState.revealProgress;
    this.ribbon.material.uniforms.uTraceProgress.value = this.animationState.traceProgress;
    this.ribbon.material.uniforms.uTime.value = elapsedTime;
  }
}