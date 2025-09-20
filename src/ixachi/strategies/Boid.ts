// src/ixachi/strategies/Boid.ts
import * as THREE from 'three';
import { IMotionSource } from '../core/IMotionSource';

export class Boid implements IMotionSource {
  public readonly position: THREE.Vector3;
  public velocity: THREE.Vector3;
  private acceleration: THREE.Vector3;

  // --- Parámetros de Comportamiento (nuestros "diales" creativos) ---
  public maxSpeed: number = .5;    // Velocidad máxima que puede alcanzar
  public maxForce: number = 0.01; // Fuerza máxima de giro o cambio de dirección
  
  // El radio de percepción se pasará dinámicamente para poder ajustarlo
  
  // --- Límites del Entorno ---
  private bounds: { x: number; y: number; z: number };

  constructor(x: number, y: number, z: number, bounds: { x: number; y: number; z: number }) {
    this.position = new THREE.Vector3(x, y, z);
    // Inicia con una velocidad aleatoria para que no todos empiecen igual
    this.velocity = new THREE.Vector3().randomDirection();
    this.velocity.setLength(Math.random() * this.maxSpeed);
    this.acceleration = new THREE.Vector3();
    this.bounds = bounds;
  }

  /**
   * Mantiene al boid dentro de los límites. Si sale por un lado, aparece por el opuesto.
   */
  private edges(): void {
    if (this.position.x > this.bounds.x) this.position.x = -this.bounds.x;
    else if (this.position.x < -this.bounds.x) this.position.x = this.bounds.x;

    if (this.position.y > this.bounds.y) this.position.y = -this.bounds.y;
    else if (this.position.y < -this.bounds.y) this.position.y = this.bounds.y;

    // Lo mantenemos en 2D por ahora para simplicidad, el eje Z no cambia.
    // if (this.position.z > this.bounds.z) this.position.z = -this.bounds.z;
    // else if (this.position.z < -this.bounds.z) this.position.z = this.bounds.z;
  }

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
    const alignment = this.align(boids, perception);
    const cohesion = this.cohesion(boids, perception);
    const separation = this.separate(boids, perception * 0.8); // La separación suele necesitar un radio menor

    // Aplicamos las fuerzas a la aceleración, podemos darles diferente peso
    this.acceleration.add(alignment.multiplyScalar(1.0));
    this.acceleration.add(cohesion.multiplyScalar(1.0));
    this.acceleration.add(separation.multiplyScalar(1.5)); // La separación es la más importante
  }

  /**
   * Actualiza la física del boid.
   */
  public update(): void {
    this.position.add(this.velocity);
    this.velocity.add(this.acceleration);
    this.velocity.clampLength(0, this.maxSpeed);
    this.acceleration.multiplyScalar(0);
    this.edges();
  }
}