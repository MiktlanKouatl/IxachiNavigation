import * as THREE from 'three'
import { Line3d } from './Line3d'

export interface FlockingConfig {
  separationWeight?: number
  alignmentWeight?: number
  cohesionWeight?: number
  separationRadius?: number
  alignmentRadius?: number
  cohesionRadius?: number
  wanderStrength?: number
}

export class FlockingSystem {
  private lines: Line3d[] = []
  private config: Required<FlockingConfig>
  private wanderTargets: Map<Line3d, THREE.Vector3> = new Map()

  constructor(config: FlockingConfig = {}) {
    this.config = {
      separationWeight: config.separationWeight ?? 1.5,
      alignmentWeight: config.alignmentWeight ?? 1.0,
      cohesionWeight: config.cohesionWeight ?? 1.0,
      separationRadius: config.separationRadius ?? 2.0,
      alignmentRadius: config.alignmentRadius ?? 3.0,
      cohesionRadius: config.cohesionRadius ?? 4.0,
      wanderStrength: config.wanderStrength ?? 0.3
    }
  }

  addLine(line: Line3d): void {
    this.lines.push(line)
    // Initialize wander target for this line
    this.initializeWanderTarget(line)
  }

  removeLine(line: Line3d): void {
    const index = this.lines.indexOf(line)
    if (index > -1) {
      this.lines.splice(index, 1)
      this.wanderTargets.delete(line)
    }
  }

  update(deltaTime: number): void {
    // Calculate flocking forces for each line
    for (const line of this.lines) {
      this.applyFlockingBehavior(line)
      this.applyWandering(line, deltaTime)
    }
  }

  private applyFlockingBehavior(line: Line3d): void {
    const neighbors = this.getNeighbors(line)
    
    // Calculate the three main flocking forces
    const separation = line.separate(neighbors, this.config.separationRadius)
    const alignment = line.align(neighbors, this.config.alignmentRadius)
    const cohesion = line.cohesion(neighbors, this.config.cohesionRadius)
    
    // Apply weights to each force
    separation.multiplyScalar(this.config.separationWeight)
    alignment.multiplyScalar(this.config.alignmentWeight)
    cohesion.multiplyScalar(this.config.cohesionWeight)
    
    // Apply forces to the line
    line.applyForce(separation)
    line.applyForce(alignment)
    line.applyForce(cohesion)
  }

  private applyWandering(line: Line3d, deltaTime: number): void {
    let wanderTarget = this.wanderTargets.get(line)
    
    if (!wanderTarget) {
      this.initializeWanderTarget(line)
      wanderTarget = this.wanderTargets.get(line)!
    }

    // Update wander target with some randomness
    const wanderChange = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.5 // Less movement in Z-axis
    )
    wanderChange.multiplyScalar(deltaTime * this.config.wanderStrength)
    wanderTarget.add(wanderChange)
    
    // Keep wander target at a reasonable distance from the line
    const headPosition = line.getHeadPosition()
    const toTarget = wanderTarget.clone().sub(headPosition)
    if (toTarget.length() > 5) {
      toTarget.normalize().multiplyScalar(5)
      wanderTarget.copy(headPosition).add(toTarget)
    }
    
    // Apply subtle wander force
    const wanderForce = line.seek(wanderTarget)
    wanderForce.multiplyScalar(0.1) // Make it subtle
    line.applyForce(wanderForce)
  }

  private initializeWanderTarget(line: Line3d): void {
    const headPosition = line.getHeadPosition()
    const velocity = line.getVelocity()
    
    // Place wander target ahead of the line
    const wanderTarget = headPosition.clone().add(
      velocity.clone().normalize().multiplyScalar(3)
    )
    
    this.wanderTargets.set(line, wanderTarget)
  }

  private getNeighbors(line: Line3d): Line3d[] {
    return this.lines.filter(other => other !== line)
  }

  // Advanced flocking behaviors
  addAvoidanceTarget(target: THREE.Vector3, strength: number = 2): void {
    for (const line of this.lines) {
      const avoidForce = this.calculateAvoidance(line, target, strength)
      line.applyForce(avoidForce)
    }
  }

  addAttractionTarget(target: THREE.Vector3, strength: number = 1): void {
    for (const line of this.lines) {
      const attractForce = line.seek(target)
      attractForce.multiplyScalar(strength)
      line.applyForce(attractForce)
    }
  }

  private calculateAvoidance(line: Line3d, target: THREE.Vector3, strength: number): THREE.Vector3 {
    const headPosition = line.getHeadPosition()
    const distance = headPosition.distanceTo(target)
    const avoidanceRadius = 5
    
    if (distance < avoidanceRadius) {
      const avoidForce = headPosition.clone().sub(target)
      avoidForce.normalize()
      avoidForce.multiplyScalar(strength * (avoidanceRadius - distance) / avoidanceRadius)
      return avoidForce
    }
    
    return new THREE.Vector3()
  }

  // Microchip-like behavior patterns
  createMicrochipPattern(): void {
    // Create organized lanes for the lines
    this.lines.forEach((line, index) => {
      const laneOffset = (index % 4) - 1.5 // Create 4 lanes
      const laneTarget = new THREE.Vector3(0, laneOffset * 2, 0)
      
      const laneForce = line.seek(laneTarget)
      laneForce.multiplyScalar(0.5)
      line.applyForce(laneForce)
    })
  }

  // Getters
  getLines(): Line3d[] {
    return [...this.lines]
  }

  getConfig(): Required<FlockingConfig> {
    return { ...this.config }
  }

  // Configuration updates
  updateConfig(newConfig: Partial<FlockingConfig>): void {
    Object.assign(this.config, newConfig)
  }
}
