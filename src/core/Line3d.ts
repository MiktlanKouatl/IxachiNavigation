import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

export interface Line3dConfig {
  startPosition: THREE.Vector3
  direction: THREE.Vector3
  maxSegments: number
  color: number
  lineWidth: number
  speed: number
  
  // Navigation properties
  laneOffset?: THREE.Vector3        // Offset respecto al PathGuide
  followGuide?: boolean             // Si debe seguir un PathGuide
  deviationStrength?: number        // Intensidad de desviaciones (0-1)
  deviationFrequency?: number       // Frecuencia de desviaciones por frame
}

export class Line3d {
  private geometry: LineGeometry
  private material: LineMaterial
  private mesh: Line2
  
  // Pool interno de segmentos para zero-allocation
  private segmentPool: THREE.Vector3[] = []
  private activePoints: THREE.Vector3[] = []
  private lastPointCount: number = 0
  
  // Basic properties
  private direction: THREE.Vector3
  private maxSegments: number
  private speed: number
  private currentPosition: THREE.Vector3
  
  // Navigation properties
  private pathGuide: any | null = null  // PathGuide reference
  private baseDirection: THREE.Vector3  // Dirección base (original o del guide)
  private currentDirection: THREE.Vector3  // Dirección actual con desviaciones
  private laneOffset: THREE.Vector3     // Offset del carril
  private followGuide: boolean = false
  private deviationStrength: number = 0.2
  private deviationFrequency: number = 0.01
  private deviationAngle: number = 0
  
  constructor(config: Line3dConfig) {
    // Store configuration
    this.direction = config.direction.clone().normalize()
    this.maxSegments = config.maxSegments
    this.speed = config.speed
    this.currentPosition = config.startPosition.clone()
    
    // Initialize navigation properties
    this.baseDirection = this.direction.clone()
    this.currentDirection = this.direction.clone()
    this.laneOffset = config.laneOffset || new THREE.Vector3(0, 0, 0)
    this.followGuide = config.followGuide || false
    this.deviationStrength = config.deviationStrength || 0.2
    this.deviationFrequency = config.deviationFrequency || 0.01
    
    // Initialize segment pool - pre-allocate all Vector3 instances
    this.initializeSegmentPool()
    
    // Initialize line with 2 points from pool
    this.initializeLine()
    
    // Create Three.js geometry and material
    this.geometry = new LineGeometry()
    this.material = new LineMaterial({
      color: config.color,
      linewidth: config.lineWidth,
      transparent: true,
      opacity: 0.9,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    })
    
    // Create the mesh
    this.mesh = new Line2(this.geometry, this.material)
    
    // Update geometry with initial points
    this.updateGeometry()
    this.lastPointCount = this.activePoints.length
    
    console.log(`Line3d created: ${this.activePoints.length} initial points, pool: ${this.segmentPool.length} available`)
  }
  
  private initializeSegmentPool(): void {
    // Pre-allocate all Vector3 instances for zero-allocation during runtime
    for (let i = 0; i < this.maxSegments; i++) {
      this.segmentPool.push(new THREE.Vector3())
    }
    console.log(`Segment pool initialized with ${this.segmentPool.length} pre-allocated Vector3s`)
  }
  
  private initializeLine(): void {
    // Get first two points from pool
    const startPoint = this.segmentPool.pop()!
    const secondPoint = this.segmentPool.pop()!
    
    // Set initial positions
    startPoint.copy(this.currentPosition)
    secondPoint.copy(this.currentPosition).add(
      this.direction.clone().multiplyScalar(1.0)
    )
    
    this.activePoints = [startPoint, secondPoint]
    console.log(`Line initialized with ${this.activePoints.length} active points, ${this.segmentPool.length} remaining in pool`)
  }
  
  // Set PathGuide to follow
  setPathGuide(guide: any): void {
    this.pathGuide = guide
    this.followGuide = true
    console.log('Line3d now following PathGuide')
  }
  
  // 🎛️ Adjust deviation parameters dynamically
  setDeviationParameters(strength: number, frequency: number): void {
    this.deviationStrength = Math.max(0, Math.min(1, strength))     // Clamp 0-1
    this.deviationFrequency = Math.max(0, Math.min(0.1, frequency)) // Clamp 0-0.1
    
    console.log(`Deviation parameters updated: strength=${this.deviationStrength.toFixed(2)}, frequency=${this.deviationFrequency.toFixed(3)}`)
  }
  
  // Navigation methods
  private updateNavigation(deltaTime: number): void {
    if (this.followGuide && this.pathGuide) {
      this.followPathGuide()
    }
    
    this.applyDeviations()
    this.updateCurrentDirection()
  }
  
  private followPathGuide(): void {
    if (!this.pathGuide) return
    
    // Get guide's current direction and position
    this.baseDirection.copy(this.pathGuide.getDirection())
    
    // Update position to follow guide with lane offset
    const guidePosition = this.pathGuide.getPosition()
    const targetPosition = guidePosition.clone().add(this.laneOffset)
    
    // Smooth follow with interpolation
    this.currentPosition.lerp(targetPosition, 0.05)
  }
  
  private applyDeviations(): void {
    // Random chance to start new deviation
    if (Math.random() < this.deviationFrequency) {
      const maxAngle = Math.PI * this.deviationStrength * 0.5 // Max 90 degrees * strength
      this.deviationAngle = (Math.random() - 0.5) * maxAngle
      
      if (Math.random() < 0.1) { // 10% chance to log
        console.log(`Lane deviation: ${(this.deviationAngle * 180 / Math.PI).toFixed(1)}°`)
      }
    }
    
    // Gradually reduce deviation over time (natural return)
    this.deviationAngle *= 0.98 // Decay factor
  }
  
  private updateCurrentDirection(): void {
    // Start with base direction (from guide or original)
    this.currentDirection.copy(this.baseDirection)
    
    // Apply deviation if significant
    if (Math.abs(this.deviationAngle) > 0.01) {
      // Create rotation matrix around Z axis (2D rotation)
      const rotationMatrix = new THREE.Matrix4().makeRotationZ(this.deviationAngle)
      this.currentDirection.applyMatrix4(rotationMatrix)
    }
    
    this.currentDirection.normalize()
  }
  
  update(deltaTime: number): void {
    // Update navigation first
    this.updateNavigation(deltaTime)
    
    // Move forward using current direction (which may include deviations)
    const movement = this.currentDirection.clone().multiplyScalar((this.speed) * deltaTime)
    this.currentPosition.add(movement)
    
    // Add new segment using pool
    this.addNewSegment()
    
    // Quick debug every few frames
    if (Math.random() < 0.05) { // 5% chance
      console.log(`Line update: ${this.activePoints.length} active points, ${this.segmentPool.length} pool available`)
    }
    
    // Update the visual geometry
    this.updateGeometry()
  }
  
  private addNewSegment(): void {
    let newPoint: THREE.Vector3
    
    if (this.activePoints.length >= this.maxSegments) {
      // Recycle oldest point (zero allocation)
      newPoint = this.activePoints.shift()!
      console.log('Recycling segment from front of line')
    } else {
      // Get new point from pool
      if (this.segmentPool.length > 0) {
        newPoint = this.segmentPool.pop()!
        console.log(`Using new segment from pool. Pool size: ${this.segmentPool.length}`)
      } else {
        console.warn('Segment pool exhausted! Creating new Vector3 (not ideal)')
        newPoint = new THREE.Vector3()
      }
    }
    
    // Position the new/recycled point at current position
    newPoint.copy(this.currentPosition)
    this.activePoints.push(newPoint)
  }
  
  private updateGeometry(): void {
    if (this.activePoints.length >= 2) {
      // Always update geometry when at max segments (recycling mode)
      const isRecyclingMode = this.activePoints.length >= this.maxSegments
      const pointCountChanged = Math.abs(this.activePoints.length - this.lastPointCount) > 0
      
      if (pointCountChanged || isRecyclingMode) {
        const positions: number[] = []
        
        // Line2 needs positions as a flat array [x1, y1, z1, x2, y2, z2, ...]
        for (let i = 0; i < this.activePoints.length; i++) {
          positions.push(this.activePoints[i].x, this.activePoints[i].y, this.activePoints[i].z)
        }
        
        // Dispose old geometry and create new one
        this.geometry.dispose()
        this.geometry = new LineGeometry()
        this.geometry.setPositions(positions)
        
        // Update mesh geometry
        this.mesh.geometry = this.geometry
        
        this.lastPointCount = this.activePoints.length
      }
    }
  }
  
  getMesh(): Line2 {
    return this.mesh
  }

  // 🎢 Actualizar el offset del carril para animaciones de altura
  updateLaneOffset(newOffset: THREE.Vector3): void {
    this.laneOffset.copy(newOffset)
  }
  
  dispose(): void {
    // Return all active points to pool
    while (this.activePoints.length > 0) {
      const point = this.activePoints.pop()!
      this.segmentPool.push(point)
    }
    
    this.geometry.dispose()
    this.material.dispose()
    
    console.log(`Line3d disposed. All ${this.segmentPool.length} segments returned to pool`)
  }
}
