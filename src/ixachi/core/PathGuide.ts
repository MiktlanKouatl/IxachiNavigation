// src/ixachi/core/PathGuideV2.ts

import * as THREE from 'three';
import { IMotionSource } from './IMotionSource';

interface PathGuideOptions {
  speed?: number;
  isClosedLoop?: boolean;
}

export class PathGuide implements IMotionSource {
  // --- Propiedades Públicas (para ser leídas por otros sistemas) ---
  public readonly position: THREE.Vector3;
  public readonly direction: THREE.Vector3;
  public readonly curve: THREE.CatmullRomCurve3;

  // --- Propiedades Privadas (para el funcionamiento interno) ---
  private speed: number;
  private progress: number = 0; // Progreso normalizado (0 a 1)
  private isClosedLoop: boolean;
  private totalLength: number;

  constructor(points: THREE.Vector3[], options: PathGuideOptions = {}) {
    if (points.length < 2) {
      throw new Error("PathGuideV2 requiere al menos 2 puntos para crear una curva.");
    }
    
    // --- Configuración ---
    this.speed = options.speed ?? 5.0;
    this.isClosedLoop = options.isClosedLoop ?? false;

    // --- El Corazón del Sistema ---
    // 1. Creamos la representación matemática de la curva.
    this.curve = new THREE.CatmullRomCurve3(points, this.isClosedLoop, 'catmullrom', 0.5);
    
    // 2. Pre-calculamos la longitud total de la curva. Esto es clave para la velocidad constante.
    this.totalLength = this.curve.getLength();

    // 3. Inicializamos la posición y dirección en el punto de partida.
    this.position = this.curve.getPointAt(0);
    this.direction = this.curve.getTangentAt(0).normalize();
  }

  public update(deltaTime: number): void {
    // --- Lógica de Movimiento (ultra-eficiente) ---

    // 1. Calculamos la distancia a recorrer en este fotograma.
    const distanceToTravel = this.speed * deltaTime;

    // 2. Calculamos el incremento de progreso basado en la distancia y la longitud total.
    // Esto asegura que la velocidad visual sea constante, sin importar la forma de la curva.
    const progressIncrement = distanceToTravel / this.totalLength;
    this.progress += progressIncrement;

    // 3. Si es un bucle, reiniciamos el progreso. Si no, nos detenemos al final.
    if (this.progress >= 1) {
      if (this.isClosedLoop) {
        this.progress %= 1; // Reinicia (ej: 1.05 se convierte en 0.05)
      } else {
        this.progress = 1; // Se detiene en el punto final.
      }
    }
    
    // 4. Obtenemos la nueva posición y dirección directamente de la curva.
    // Estas son las operaciones clave: rápidas y precisas.
    this.position.copy(this.curve.getPointAt(this.progress));
    this.direction.copy(this.curve.getTangentAt(this.progress)).normalize();
  }
  
  // --- Implementación de la Interfaz IMotionSource ---
  getPosition(): THREE.Vector3 { return this.position; }
  getDirection(): THREE.Vector3 { return this.direction; }
  getSpeed(): number { return this.speed; }
}