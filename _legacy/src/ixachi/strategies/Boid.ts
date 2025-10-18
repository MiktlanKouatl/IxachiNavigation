// src/ixachi/strategies/Boid.ts
import * as THREE from 'three';
import { IMotionSource } from '../../../src/types/IMotionSource';
import { IAreaConstraint } from '../../../src/features/flocking/constraints/IAreaConstraint'; // Import the new interface

export class Boid implements IMotionSource {
  public readonly position: THREE.Vector3;
  public velocity: THREE.Vector3;
  private acceleration: THREE.Vector3;

  // --- Parámetros de Comportamiento (nuestros "diales" creativos) ---
  public maxSpeed: number = .5;    // Velocidad máxima que puede alcanzar
  public maxForce: number = 0.01; // Fuerza máxima de giro o cambio de dirección
  
  // El radio de percepción se pasará dinámicamente para poder ajustarlo
  
  // --- Límites del Entorno (ahora gestionados por IAreaConstraint) ---
  public areaConstraint: IAreaConstraint | null = null; // Nuevo: para gestionar límites dinámicamente

  constructor(x: number, y: number, z: number, areaConstraint: IAreaConstraint | null = null) {
    this.position = new THREE.Vector3(x, y, z);
    // Inicia con una velocidad aleatoria para que no todos empiecen igual
    this.velocity = new THREE.Vector3().randomDirection();
    this.velocity.setLength(Math.random() * this.maxSpeed);
    this.acceleration = new THREE.Vector3();
    this.areaConstraint = areaConstraint; // Asignamos la restricción de área
  }

  // El método `edges()` ha sido eliminado y su lógica se ha movido a las implementaciones de IAreaConstraint.

  // --- LAS TRES REGLAS DE ORO ---

  private align(boids: Boid[], perceptionRadius: number): THREE.Vector3 {
    const steering = new THREE.Vector3();
    let total = 0;
    for (const other of boids) {
      const d = this.position.distanceTo(other.position);
      if (other !== this && d < perceptionRadius) {
        steering.add(other.velocity);
        total++;
      }
    }
    if (total > 0) {
      steering.divideScalar(total);
      steering.setLength(this.maxSpeed);
      steering.sub(this.velocity);
      steering.clampLength(0, this.maxForce);
    }
    return steering;
  }

  private cohesion(boids: Boid[], perceptionRadius: number): THREE.Vector3 {
    const steering = new THREE.Vector3();
    let total = 0;
    for (const other of boids) {
      const d = this.position.distanceTo(other.position);
      if (other !== this && d < perceptionRadius) {
        steering.add(other.position);
        total++;
      }
    }
    if (total > 0) {
      steering.divideScalar(total);
      steering.sub(this.position);
      steering.setLength(this.maxSpeed);
      steering.sub(this.velocity);
      steering.clampLength(0, this.maxForce);
    }
    return steering;
  }

  private separate(boids: Boid[], perceptionRadius: number): THREE.Vector3 {
    const steering = new THREE.Vector3();
    let total = 0;
    for (const other of boids) {
      const d = this.position.distanceTo(other.position);
      if (other !== this && d < perceptionRadius) {
        const diff = new THREE.Vector3().subVectors(this.position, other.position);
        if (d > 0) { // Evitar división por cero si están en el mismo punto
          diff.divideScalar(d * d);
        }
        steering.add(diff);
        total++;
      }
    }
    if (total > 0) {
      steering.divideScalar(total);
      steering.setLength(this.maxSpeed);
      steering.sub(this.velocity);
      steering.clampLength(0, this.maxForce);
    }
    return steering;
  }

  /**
   * Calcula y aplica las tres fuerzas de comportamiento.
   */
  public flock(boids: Boid[], perception: number): void {
    console.log('[Boid] flock called.');
    const alignment = this.align(boids, perception);
    const cohesion = this.cohesion(boids, perception);
    const separation = this.separate(boids, perception * 0.8); // La separación suele necesitar un radio menor

    // Aplicamos las fuerzas a la aceleración, podemos darles diferente peso
    this.acceleration.add(alignment.multiplyScalar(1.0));
    this.acceleration.add(cohesion.multiplyScalar(1.0));
    this.acceleration.add(separation.multiplyScalar(1.5)); // La separación es la más importante
  }

  public applyForce(force: THREE.Vector3): void {
    this.acceleration.add(force);
  }

  /**
   * Actualiza la física del boid.
   */
  public update(): void {
    console.log('[Boid] update called.');
    this.position.add(this.velocity);
    this.velocity.add(this.acceleration);
    this.velocity.clampLength(0, this.maxSpeed);
    this.acceleration.multiplyScalar(0);
    
    // Nuevo: Aplicamos la restricción de área si existe
    if (this.areaConstraint) {
        this.areaConstraint.constrain(this);
    }
  }
}