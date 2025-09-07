import * as THREE from 'three'

export interface PathPoint {
  position: THREE.Vector3
  direction: THREE.Vector3
  speed: number
}

export class PathGuide {
  private position: THREE.Vector3
  private direction: THREE.Vector3
  private speed: number
  
  // Trayectoria definida por puntos de control
  private waypoints: PathPoint[] = []
  private currentWaypointIndex: number = 0
  private transitionProgress: number = 0  // 0-1 progress hacia el siguiente waypoint
  private transitionSmoothing: number = 0.05  // Suavidad de transición
  private isClosedLoop: boolean = false  // 🔄 Indica si es un circuito cerrado
  
  // Para curvas suaves
  private targetDirection: THREE.Vector3
  private targetSpeed: number
  
  // Elementos visuales
  private pathMesh: THREE.Line | null = null
  private currentPositionMesh: THREE.Mesh | null = null
  private waypointMeshes: THREE.Mesh[] = []
  private directionArrow: THREE.ArrowHelper | null = null
  
  constructor(startPosition: THREE.Vector3, initialDirection: THREE.Vector3, speed: number = 5) {
    this.position = startPosition.clone()
    this.direction = initialDirection.clone().normalize()
    this.speed = speed
    
    this.targetDirection = this.direction.clone()
    this.targetSpeed = this.speed
    
    console.log('PathGuide created at', this.position, 'with direction', this.direction)
  }
  
  // Crear visualización para debug
  createVisualization(scene: THREE.Scene): void {
    this.createCurrentPositionIndicator(scene)
    this.createDirectionArrow(scene)
    console.log('PathGuide visualization created')
  }
  
  private createCurrentPositionIndicator(scene: THREE.Scene): void {
    // Esfera para mostrar posición actual
    const geometry = new THREE.SphereGeometry(0.3, 16, 16)
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, // Rojo para posición actual
      transparent: true,
      opacity: 0.8
    })
    
    this.currentPositionMesh = new THREE.Mesh(geometry, material)
    this.currentPositionMesh.position.copy(this.position)
    scene.add(this.currentPositionMesh)
  }
  
  private createDirectionArrow(scene: THREE.Scene): void {
    // Flecha para mostrar dirección
    this.directionArrow = new THREE.ArrowHelper(
      this.direction,     // Dirección
      this.position,      // Origen
      2,                  // Longitud
      0xff6600,          // Color naranja
      0.5,               // Longitud de la cabeza
      0.3                // Ancho de la cabeza
    )
    scene.add(this.directionArrow)
  }
  
  private createPathVisualization(scene: THREE.Scene): void {
    if (this.waypoints.length === 0) return
    
    // Crear línea que muestra toda la trayectoria
    const pathPoints = [this.position, ...this.waypoints.map(wp => wp.position)]
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints)
    const pathMaterial = new THREE.LineBasicMaterial({ 
      color: 0x444444, // Gris para la trayectoria
      transparent: true,
      opacity: 0.5
    })
    
    this.pathMesh = new THREE.Line(pathGeometry, pathMaterial)
    scene.add(this.pathMesh)
    
    // Crear esferas pequeñas para waypoints
    this.waypoints.forEach((waypoint, index) => {
      const wpGeometry = new THREE.SphereGeometry(0.15, 8, 8)
      const wpMaterial = new THREE.MeshBasicMaterial({ 
        color: index === this.currentWaypointIndex ? 0x00ff00 : 0x666666 // Verde para activo
      })
      
      const wpMesh = new THREE.Mesh(wpGeometry, wpMaterial)
      wpMesh.position.copy(waypoint.position)
      this.waypointMeshes.push(wpMesh)
      scene.add(wpMesh)
    })
    
    console.log(`Path visualization created with ${this.waypoints.length} waypoints`)
  }
  
  // Agregar waypoint para crear trayectoria
  addWaypoint(position: THREE.Vector3, direction: THREE.Vector3, speed?: number): void {
    this.waypoints.push({
      position: position.clone(),
      direction: direction.clone().normalize(),
      speed: speed !== undefined ? speed : this.speed
    })
    
    console.log(`Waypoint added: ${this.waypoints.length} total waypoints`)
  }
  
  // Actualizar visualización después de agregar todos los waypoints
  updatePathVisualization(scene: THREE.Scene): void {
    // Limpiar visualización anterior de la trayectoria si existe
    if (this.pathMesh) {
      scene.remove(this.pathMesh)
      this.pathMesh.geometry.dispose()
      this.pathMesh = null
    }
    
    this.waypointMeshes.forEach(mesh => {
      scene.remove(mesh)
      mesh.geometry.dispose()
    })
    this.waypointMeshes = []
    
    // Crear nueva visualización
    this.createPathVisualization(scene)
  }
  
  // Crear trayectoria curva usando spline
  createCurvedPath(points: THREE.Vector3[], segmentSpeed?: number): void {
    if (points.length < 2) return
    
    // Crear curva spline catmull-rom para suavidad
    const curve = new THREE.CatmullRomCurve3(points)
    const curvePoints = curve.getPoints(points.length * 10) // 10 puntos por segmento
    
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const current = curvePoints[i]
      const next = curvePoints[i + 1]
      
      // Calcular dirección basada en el siguiente punto
      const direction = next.clone().sub(current).normalize()
      
      this.addWaypoint(current, direction, segmentSpeed)
    }
    
    console.log(`Curved path created with ${curvePoints.length} points`)
  }
  
  // Crear trayectoria en forma de S
  createSCurve(startPos: THREE.Vector3, endPos: THREE.Vector3, amplitude: number = 3, frequency: number = 1): void {
    const distance = startPos.distanceTo(endPos)
    const direction = endPos.clone().sub(startPos).normalize()
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0) // Perpendicular en 2D
    
    const numPoints = Math.max(10, Math.floor(distance / 2)) // Densidad basada en distancia
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints // 0 to 1
      const basePosition = startPos.clone().lerp(endPos, t)
      
      // Aplicar curva sinusoidal
      const sineOffset = Math.sin(t * Math.PI * frequency) * amplitude * Math.sin(t * Math.PI) // Fade in/out
      const curvePosition = basePosition.clone().add(perpendicular.clone().multiplyScalar(sineOffset))
      
      // Calcular dirección tangente a la curva
      let tangentDirection: THREE.Vector3
      if (i < numPoints) {
        const nextT = (i + 1) / numPoints
        const nextBasePos = startPos.clone().lerp(endPos, nextT)
        const nextSineOffset = Math.sin(nextT * Math.PI * frequency) * amplitude * Math.sin(nextT * Math.PI)
        const nextCurvePos = nextBasePos.clone().add(perpendicular.clone().multiplyScalar(nextSineOffset))
        
        tangentDirection = nextCurvePos.clone().sub(curvePosition).normalize()
      } else {
        tangentDirection = direction.clone()
      }
      
      this.addWaypoint(curvePosition, tangentDirection)
    }
    
    console.log(`S-curve created from`, startPos, 'to', endPos, `with ${numPoints + 1} waypoints`)
  }
  
  // 🔄 Crear circuito cerrado (loop)
  createCircuitLoop(center: THREE.Vector3, radius: number, numSegments: number = 24, isClockwise: boolean = true): void {
    const points: THREE.Vector3[] = []
    
    for (let i = 0; i <= numSegments; i++) {
      const angle = (i / numSegments) * Math.PI * 2
      const adjustedAngle = isClockwise ? -angle : angle  // Invertir para sentido horario
      
      const x = center.x + Math.cos(adjustedAngle) * radius
      const y = center.y + Math.sin(adjustedAngle) * radius
      const z = center.z
      
      points.push(new THREE.Vector3(x, y, z))
    }
    
    // Asegurar que el último punto conecta con el primero para cerrar el circuito
    points[points.length - 1] = points[0].clone()
    
    // 🎯 Sincronizar posición inicial del PathGuide con el primer punto del circuito
    this.position.copy(points[0])
    
    // Crear waypoints con direcciones tangenciales
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      
      // Dirección tangencial (hacia el siguiente punto)
      const direction = next.clone().sub(current).normalize()
      
      this.addWaypoint(current, direction, this.speed)
    }
    
    // 🔄 Activar modo de circuito cerrado
    this.isClosedLoop = true
    
    console.log(`Circuit loop created: center=${center.x},${center.y},${center.z}, radius=${radius}, segments=${numSegments}`)
  }
  
  // 🏁 Crear circuito tipo pista de carreras (óvalo)
  createRaceTrackLoop(center: THREE.Vector3, width: number, height: number, numSegments: number = 32): void {
    const points: THREE.Vector3[] = []
    
    for (let i = 0; i <= numSegments; i++) {
      const angle = (i / numSegments) * Math.PI * 2
      
      // Crear forma ovalada usando elipse
      const x = center.x + Math.cos(angle) * width
      const y = center.y + Math.sin(angle) * height
      const z = center.z
      
      points.push(new THREE.Vector3(x, y, z))
    }
    
    // Cerrar el circuito
    points[points.length - 1] = points[0].clone()
    
    // 🎯 Sincronizar posición inicial del PathGuide
    this.position.copy(points[0])
    
    // Crear waypoints
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      const direction = next.clone().sub(current).normalize()
      
      this.addWaypoint(current, direction, this.speed)
    }
    
    // 🔄 Activar modo de circuito cerrado
    this.isClosedLoop = true
    
    console.log(`Race track loop created: ${width}x${height} oval with ${numSegments} segments`)
  }
  
  update(deltaTime: number): void {
    if (this.waypoints.length === 0) {
      // Sin waypoints, solo avanzar en línea recta
      this.moveForward(deltaTime)
    } else {
      // Seguir waypoints
      this.followWaypoints(deltaTime)
    }
    
    // Actualizar visualización
    this.updateVisualization()
  }
  
  private updateVisualization(): void {
    // Actualizar posición del indicador
    if (this.currentPositionMesh) {
      this.currentPositionMesh.position.copy(this.position)
    }
    
    // Actualizar flecha de dirección
    if (this.directionArrow) {
      this.directionArrow.position.copy(this.position)
      this.directionArrow.setDirection(this.direction)
    }
    
    // Actualizar color de waypoints (activo vs inactivo)
    this.waypointMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      material.color.setHex(index === this.currentWaypointIndex ? 0x00ff00 : 0x666666)
    })
  }
  
  private moveForward(deltaTime: number): void {
    const movement = this.direction.clone().multiplyScalar(this.speed * deltaTime)
    this.position.add(movement)
  }
  
  private followWaypoints(deltaTime: number): void {
    // 🔄 Manejar circuito cerrado ANTES de verificar el índice
    if (this.currentWaypointIndex >= this.waypoints.length && this.isClosedLoop) {
      this.currentWaypointIndex = 0
      console.log('🔄 Circuit completed, looping back to start')
    }
    
    // Si ya no hay waypoints y no es un loop cerrado, seguir recto
    if (this.currentWaypointIndex >= this.waypoints.length && !this.isClosedLoop) {
      this.moveForward(deltaTime)
      return
    }
    
    const currentWaypoint = this.waypoints[this.currentWaypointIndex]
    const distanceToWaypoint = this.position.distanceTo(currentWaypoint.position)
    
    // 🎯 En lugar de suavizado, usar dirección directa hacia el waypoint
    if (distanceToWaypoint > 0.1) {
      // Calcular dirección hacia el waypoint
      const directionToWaypoint = currentWaypoint.position.clone().sub(this.position).normalize()
      this.direction.copy(directionToWaypoint)
      this.speed = currentWaypoint.speed
    } else {
      // Muy cerca del waypoint, usar su dirección target
      this.direction.copy(currentWaypoint.direction)
      this.speed = currentWaypoint.speed
    }
    
    // Mover hacia adelante
    this.moveForward(deltaTime)
    
    // Verificar si llegamos al waypoint (threshold más pequeño para circuito)
    if (distanceToWaypoint < 0.5) { // Threshold aún más pequeño
      console.log(`✅ Reached waypoint ${this.currentWaypointIndex + 1}/${this.waypoints.length} - Distance: ${distanceToWaypoint.toFixed(2)}`)
      this.currentWaypointIndex++
      this.transitionProgress = 0
    } else {
      // Debug: mostrar distancia ocasionalmente
      if (Math.random() < 0.01) {
        console.log(`→ Moving to waypoint ${this.currentWaypointIndex + 1}, distance: ${distanceToWaypoint.toFixed(2)}`)
      }
    }
  }
  
  private updateTargets(waypoint: PathPoint): void {
    this.targetDirection.copy(waypoint.direction)
    this.targetSpeed = waypoint.speed
  }
  
  private applySmoothing(deltaTime: number): void {
    // Lerp dirección suavemente
    this.direction.lerp(this.targetDirection, this.transitionSmoothing)
    this.direction.normalize()
    
    // Lerp velocidad suavemente
    this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, this.transitionSmoothing)
  }
  
  // Getters públicos
  getPosition(): THREE.Vector3 {
    return this.position.clone()
  }
  
  getDirection(): THREE.Vector3 {
    return this.direction.clone()
  }
  
  getSpeed(): number {
    return this.speed
  }
  
  // Debug info
  getProgress(): string {
    if (this.waypoints.length === 0) return 'Free movement'
    return `Waypoint ${this.currentWaypointIndex + 1}/${this.waypoints.length}`
  }

  // 👁️ Control de visibilidad de la visualización
  setVisibility(visible: boolean): void {
    if (this.currentPositionMesh) {
      this.currentPositionMesh.visible = visible
    }
    
    if (this.directionArrow) {
      this.directionArrow.visible = visible
    }
    
    if (this.pathMesh) {
      this.pathMesh.visible = visible
    }
    
    this.waypointMeshes.forEach(mesh => {
      mesh.visible = visible
    })
    
    console.log(`PathGuide visibility set to: ${visible}`)
  }
  
  // Reset para reutilizar
  reset(newStartPosition?: THREE.Vector3): void {
    this.currentWaypointIndex = 0
    this.transitionProgress = 0
    
    if (newStartPosition) {
      this.position.copy(newStartPosition)
    }
    
    console.log('PathGuide reset')
  }
  
  // Limpiar visualización
  dispose(scene: THREE.Scene): void {
    if (this.pathMesh) {
      scene.remove(this.pathMesh)
      this.pathMesh.geometry.dispose()
    }
    
    if (this.currentPositionMesh) {
      scene.remove(this.currentPositionMesh)
      this.currentPositionMesh.geometry.dispose()
    }
    
    if (this.directionArrow) {
      scene.remove(this.directionArrow)
    }
    
    this.waypointMeshes.forEach(mesh => {
      scene.remove(mesh)
      mesh.geometry.dispose()
    })
    
    console.log('PathGuide visualization disposed')
  }
}
