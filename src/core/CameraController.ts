import * as THREE from 'three'

export class CameraController {
  private camera: THREE.PerspectiveCamera
  
  // 🎮 Controles de teclado SIMPLES
  private keys: { [key: string]: boolean } = {}
  private moveSpeed: number = 15
  private rotationSpeed: number = 1.5  // Velocidad de rotación en radianes por segundo
  
  // 🔄 Rotación manual
  private targetRotationX: number = -Math.PI / 2  // Empezar mirando hacia abajo
  private targetRotationY: number = 0
  private targetRotationZ: number = 0
  
  // 🏠 Posición y rotación inicial para reset
  private initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private initialRotationX: number = -Math.PI / 2
  private initialRotationY: number = 0
  private initialRotationZ: number = 0
  
  // 🎬 Control para evitar múltiples resets
  private resetProcessed: boolean = false
  
  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
    
    // 🎯 CÁMARA INICIAL - Vista aérea del circuito completo
    this.camera.position.set(0, 0, 0)  // Muy arriba, en el centro
    
    // 🔄 ROTACIÓN FIJA - Ya no usa lookAt automático
    this.camera.rotation.set(this.targetRotationX, this.targetRotationY, this.targetRotationZ)
    
    // 🎮 Configurar SOLO controles de teclado
    this.setupControls()
    
    console.log('🎥 CameraController - Manual position + rotation controls')
    console.log('🎮 Movement: A/D=X, W/S=Y, R/F=Z')
    console.log('🔄 Rotation: Q/E=Y-axis, T/G=X-axis, Z/C=Z-axis')
    console.log('🏠 Reset: H=Return to initial position (0,0,0)')
  }
  
  private setupControls(): void {
    // ⌨️ SOLO eventos de teclado
    window.addEventListener('keydown', (event) => {
      this.keys[event.code] = true
    })
    
    window.addEventListener('keyup', (event) => {
      this.keys[event.code] = false
    })
  }
  
  // 📍 Conectar el PathGuide (no necesario pero mantener compatibilidad)
  setPathGuide(_pathGuide: any): void {
    console.log('📍 PathGuide connected (camera stays manual)')
  }
  
  update(deltaTime: number): void {
    // 🎮 CONTROLES MANUALES - POSICIÓN Y ROTACIÓN
    
    // ⌨️ Movimiento directo con teclado
    const speed = this.moveSpeed * deltaTime
    const rotSpeed = this.rotationSpeed * deltaTime
    
    // === MOVIMIENTO ===
    // A/D - Eje X (izquierda/derecha)
    if (this.keys['KeyA']) {
      this.camera.position.x -= speed
    }
    if (this.keys['KeyD']) {
      this.camera.position.x += speed
    }
    
    // W/S - Eje Z (adelante/atrás)
    if (this.keys['KeyW']) {
      this.camera.position.y -= speed
    }
    if (this.keys['KeyS']) {
      this.camera.position.y += speed
    }
    
    // R/F - Eje Y (arriba/abajo)
    if (this.keys['KeyR']) {
      this.camera.position.z -= speed
    }
    if (this.keys['KeyF']) {
      this.camera.position.z += speed
    }
    
    // === ROTACIÓN MANUAL ===
    // Q/E - Rotación Y (girar izquierda/derecha)
    if (this.keys['KeyQ']) {
      this.targetRotationY -= rotSpeed
    }
    if (this.keys['KeyE']) {
      this.targetRotationY += rotSpeed
    }
    
    // T/G - Rotación X (mirar arriba/abajo)
    if (this.keys['KeyT']) {
      this.targetRotationX += rotSpeed
    }
    if (this.keys['KeyG']) {
      this.targetRotationX -= rotSpeed
    }
    
    // Z/C - Rotación Z (inclinar izquierda/derecha)
    if (this.keys['KeyZ']) {
      this.targetRotationZ -= rotSpeed
    }
    if (this.keys['KeyC']) {
      this.targetRotationZ += rotSpeed
    }
    
    // 🏠 H - Reset a posición inicial
    if (this.keys['KeyH'] && !this.resetProcessed) {
      this.resetToInitialPosition()
      this.resetProcessed = true
    }
    if (!this.keys['KeyH']) {
      this.resetProcessed = false
    }
    
    // 🔄 Aplicar la rotación fija (sin lookAt automático)
    this.camera.rotation.set(this.targetRotationX, this.targetRotationY, this.targetRotationZ)
  }
  
  // 🏠 Reset cámara a posición inicial
  private resetToInitialPosition(): void {
    // Resetear posición
    this.camera.position.copy(this.initialPosition)
    
    // Resetear rotación
    this.targetRotationX = this.initialRotationX
    this.targetRotationY = this.initialRotationY
    this.targetRotationZ = this.initialRotationZ
    this.camera.rotation.set(this.targetRotationX, this.targetRotationY, this.targetRotationZ)
    
    console.log('🏠 Camera reset to initial position: (0, 0, 0)')
  }
  
  dispose(): void {
    console.log('🧹 CameraController disposed')
  }
  
  // 📊 Métodos para obtener información de la cámara
  getCameraPosition(): THREE.Vector3 {
    return this.camera.position.clone()
  }
  
  getCameraRotation(): THREE.Euler {
    return this.camera.rotation.clone()
  }
  
  getCameraInfo(): { position: THREE.Vector3, rotation: THREE.Euler } {
    return {
      position: this.getCameraPosition(),
      rotation: this.getCameraRotation()
    }
  }
}