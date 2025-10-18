import * as THREE from 'three'
import { Line3d } from './Line3d'
import { PathGuide } from '../ixachi/core/PathGuide'
import { CameraController } from './CameraController'

// 🎨 Interfaz para configuración de líneas
interface LineConfig {
  color: number           // Color hex (ej: 0x00ffff)
  lineWidth: number       // Ancho de línea (ej: 16)
  maxSegments: number     // Número máximo de segmentos (ej: 150)
  laneOffset: THREE.Vector3 // Offset desde el PathGuide (ej: new Vector3(0, 1, 0))
  id?: string            // ID opcional para identificar la línea
  heightAnimation?: {     // 🆕 Animación de altura tipo montaña rusa
    amplitude: number     // Qué tan alto sube/baja (ej: 2.0)
    frequency: number     // Qué tan rápido cambia (ej: 0.5)
    phase: number        // Desfase inicial (ej: 0)
    changeInterval: number // Intervalo para cambios aleatorios (ej: 3.0 segundos)
  }
}

export class IxachiNavigationScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private animationId: number | null = null
  private lines: Line3d[] = []  // 🔄 Array de líneas en lugar de una sola
  private pathGuide: PathGuide | null = null
  private cameraController: CameraController | null = null // 🎥 Controlador de cámara
  private lineHeightAnimations: any[] = [] // 🎢 Configuraciones de animación de altura
  
  // 👁️ Control de visibilidad del PathGuide
  private pathGuideVisible: boolean = true
  private keys: { [key: string]: boolean } = {}

  constructor() {
    // Initialize Three.js scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000011) // Dark blue background
    
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    )
    
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
  }

  init(): void {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    
    // Add renderer to DOM
    const appElement = document.getElementById('app')
    if (appElement) {
      appElement.appendChild(this.renderer.domElement)
    }

    // Setup camera position - El CameraController manejará esto
    // this.camera.position.set(0, 0, 25)  // Comentado, ahora lo maneja el controller
    // this.camera.lookAt(0, 0, 0)

    // 🎥 Inicializar controlador de cámara
    this.cameraController = new CameraController(this.camera)

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this))
    
    // 👁️ Setup keyboard controls for PathGuide visibility
    this.setupKeyboardControls()
    
    // Create path guide and multiple lines
    this.createPathGuide()
    this.createMultipleLines()
    
    console.log('IxachiNavigationScene initialized - Multi-line navigation with camera control ready')
  }

  // 👁️ Configurar controles de teclado para visibilidad del PathGuide
  private setupKeyboardControls(): void {
    window.addEventListener('keydown', (event) => {
      this.keys[event.code] = true
      
      // P = Toggle PathGuide visibility
      if (event.code === 'KeyP' && !this.keys['KeyP_processed']) {
        this.togglePathGuideVisibility()
        this.keys['KeyP_processed'] = true
      }
    })
    
    window.addEventListener('keyup', (event) => {
      this.keys[event.code] = false
      if (event.code === 'KeyP') {
        this.keys['KeyP_processed'] = false
      }
    })
    
    console.log('🎮 Keyboard controls setup - Press P to toggle PathGuide visibility')
  }

  // 👁️ Toggle PathGuide visibility
  private togglePathGuideVisibility(): void {
    this.pathGuideVisible = !this.pathGuideVisible
    
    if (this.pathGuide) {
      this.pathGuide.setVisibility(this.pathGuideVisible)
    }
    
    const status = this.pathGuideVisible ? 'VISIBLE' : 'HIDDEN'
    console.log(`👁️ PathGuide is now ${status}`)
  }

  private createPathGuide(): void {
    console.log('Creating PathGuide with closed circuit trajectory...')
    
    // Crear el guía de trayectoria (la posición inicial se ajustará automáticamente)
    this.pathGuide = new PathGuide(
      new THREE.Vector3(0, 0, 0),   // Posición temporal, se ajustará al crear el circuito
      new THREE.Vector3(1, 0, 0),   // Dirección inicial
      15                             // Velocidad más lenta para mejor visualización
    )
    
    // 🔄 CIRCUITO CERRADO - Elegir uno de estos diseños:
    
    // Opción 1: Circuito circular simple
    this.pathGuide.createCircuitLoop(
      new THREE.Vector3(0, 0, 0),  // Centro del circuito
      15,                           // Radio de 8 unidades
      32,                          // 32 segmentos para suavidad
      true                         // Sentido horario
    )
    
    // // Opción 2: Circuito ovalado tipo pista de carreras
    // this.pathGuide.createRaceTrackLoop(
    //   new THREE.Vector3(0, 0, 0),  // Centro
    //   12,                          // Ancho
    //   6,                           // Alto
    //   40                           // Segmentos
    // )
    
    // Crear visualización del PathGuide
    this.pathGuide.createVisualization(this.scene)
    this.pathGuide.updatePathVisualization(this.scene)
    
    // 🎥 Conectar PathGuide al controlador de cámara
    if (this.cameraController) {
      this.cameraController.setPathGuide(this.pathGuide)
    }
    
    console.log('PathGuide created with closed circuit loop, visualization, and camera control')
  }

  // 🚀 Crear múltiples líneas con diferentes configuraciones
  private createMultipleLines(): void {
    console.log('Creating multiple guided lines...')
    
    if (!this.pathGuide) {
      console.error('PathGuide must be created before creating lines')
      return
    }
    
    // 🎨 Configuraciones de líneas - Con animación de altura tipo montaña rusa
    const lineConfigs: LineConfig[] = [
      /* {
        id: 'cyan-main',
        color: 0x00ffff,                           // Cyan
        lineWidth: 6,                             // Línea gruesa principal
        maxSegments: 80,                          // Muchos segmentos
        laneOffset: new THREE.Vector3(0, 0, 0),  // Base inicial
        heightAnimation: {                         // 🎢 Montaña rusa principal
          amplitude: 2.0,                         // Cambios de hasta 3 unidades
          frequency: 0.3,                         // Cambios moderados
          phase: 0,                               // Sin desfase
          changeInterval: 2.5                     // Cambia cada 2.5 segundos
        }
      }, */
      {
        id: 'purple-secondary',
        color: 0x9400d3,                           // Púrpura
        lineWidth: 6,                             // Línea mediana
        maxSegments: 130,                          // Menos segmentos
        laneOffset: new THREE.Vector3(0, -.4, 0),   // Base inicial
        heightAnimation: {                         // 🎢 Patrón diferente
          amplitude: 2.5,                         // Cambios más suaves
          frequency: 0.4,                         // Más frecuente
          phase: Math.PI / 3,                     // Desfasada 60°
          changeInterval: 3.0                     // Cambia cada 3 segundos
        }
      },
      {
        id: 'orange-accent',
        color: 0xff8c00,                           // Naranja
        lineWidth: 10,                              // Línea delgada
        maxSegments: 50,                          // Pocos segmentos
        laneOffset: new THREE.Vector3(0, -.2, 0),    // Centro
        heightAnimation: {                         // 🎢 Cambios rápidos
          amplitude: 2.0,                         // Cambios medianos
          frequency: 0.6,                         // Más dinámico
          phase: Math.PI / 2,                     // Desfasada 90°
          changeInterval: 2.0                     // Cambia cada 2 segundos
        }
      },
      /* {
        id: 'green-side',
        color: 0x32cd32,                           // Verde lima
        lineWidth: 4,                              // Línea delgada
        maxSegments: 30,                          // Pocos segmentos  
        laneOffset: new THREE.Vector3(0, 0, 0),    // Base inicial
        heightAnimation: {                         // 🎢 Patrón lento pero dramático
          amplitude: 2.5,                         // Cambios más dramáticos
          frequency: 0.2,                         // Más lento
          phase: Math.PI,                         // Desfasada 180°
          changeInterval: 4.0                     // Cambia cada 4 segundos
        }
      }, */
      {
        id: 'red-fast',
        color: 0xff4444,                           // Rojo brillante
        lineWidth: 14,                              // Línea mediana-gruesa
        maxSegments: 90,                           // Muchos segmentos
        laneOffset: new THREE.Vector3(0, 0, 0),    // Arriba
        heightAnimation: {                         // 🎢 Cambios rápidos y dramáticos
          amplitude: 2.0,                         // Cambios muy dramáticos
          frequency: 0.8,                         // Muy dinámico
          phase: Math.PI / 6,                     // Desfasada 30°
          changeInterval: 1.5                     // Cambia cada 1.5 segundos
        }
      },
      {
        id: 'blue-smooth',
        color: 0x4488ff,                           // Azul claro
        lineWidth: 4,                              // Línea delgada
        maxSegments: 60,                           // Segmentos medianos
        laneOffset: new THREE.Vector3(0, .6, 0), // Cerca del centro
        heightAnimation: {                         // 🎢 Ondas suaves
          amplitude: 2.5,                         // Cambios sutiles
          frequency: 0.25,                        // Muy suave
          phase: Math.PI / 4,                     // Desfasada 45°
          changeInterval: 5.0                     // Cambia cada 5 segundos
        }
      },
      {
        id: 'yellow-electric',
        color: 0xffff00,                           // Amarillo eléctrico
        lineWidth: 8,                              // Línea mediana
        maxSegments: 75,                           // Segmentos moderados
        laneOffset: new THREE.Vector3(0, .4, 0),  // Ligeramente arriba
        heightAnimation: {                         // 🎢 Patrón eléctrico
          amplitude: 2.8,                         // Cambios medianos-altos
          frequency: 0.9,                         // Muy activo
          phase: Math.PI * 0.75,                  // Desfasada 135°
          changeInterval: 1.8                     // Cambia cada 1.8 segundos
        }
      },
      {
        id: 'magenta-wild',
        color: 0xff00ff,                           // Magenta
        lineWidth: 5,                              // Línea delgada
        maxSegments: 40,                           // Pocos segmentos
        laneOffset: new THREE.Vector3(0, .2, 0),   // Muy abajo
        heightAnimation: {                         // 🎢 Patrón salvaje
          amplitude: 2.0,                         // Cambios extremos
          frequency: 0.9,                         // Muy caótico
          phase: Math.PI * 1.5,                   // Desfasada 270°
          changeInterval: 1.2                     // Cambia cada 1.2 segundos
        }
      }
    ]
    
    // Crear cada línea según su configuración
    lineConfigs.forEach((config, index) => {
      const line = new Line3d({
        startPosition: this.pathGuide!.getPosition(),  // Start at guide position
        direction: this.pathGuide!.getDirection(),     // Use guide direction
        maxSegments: config.maxSegments,               // Segments from config
        color: config.color,                           // Color from config
        lineWidth: config.lineWidth,                   // Width from config
        speed: 3,                                      // Same speed for all
        laneOffset: config.laneOffset,                 // Offset from config
        followGuide: true,                             // All follow guide
        deviationStrength: 0.1 + (index * 0.05),     // Slightly different deviations
        deviationFrequency: 0.005 + (index * 0.002)  // Slightly different frequencies
      })
      
      // Connect line to path guide
      line.setPathGuide(this.pathGuide!)
      
      // Add to scene and array
      this.scene.add(line.getMesh())
      this.lines.push(line)
      
      // 🎢 Guardar configuración de animación de altura
      this.lineHeightAnimations.push({
        line: line,
        config: config.heightAnimation,
        baseOffset: config.laneOffset.clone(),
        lastChangeTime: 0,
        currentTarget: config.laneOffset.z,
        currentZ: config.laneOffset.z
      })
      
      console.log(`Created line ${config.id || index}: ${config.color.toString(16)} color, ${config.lineWidth}px width`)
    })
    
    console.log(`✅ Created ${this.lines.length} guided lines successfully`)
  }
  
  // 🎛️ Panel de control para ajustar desviaciones (aplica a todas las líneas)
  updateLineDeviations(strength: number, frequency: number): void {
    this.lines.forEach((line) => {
      line.setDeviationParameters(strength, frequency)
    })
    console.log(`Deviations updated for ${this.lines.length} lines: strength=${strength}, frequency=${frequency}`)
  }
  
  // 🎯 Control individual de línea por índice
  updateSingleLineDeviations(lineIndex: number, strength: number, frequency: number): void {
    if (lineIndex >= 0 && lineIndex < this.lines.length) {
      this.lines[lineIndex].setDeviationParameters(strength, frequency)
      console.log(`Line ${lineIndex} deviations updated: strength=${strength}, frequency=${frequency}`)
    } else {
      console.warn(`Invalid line index: ${lineIndex}. Available lines: 0-${this.lines.length - 1}`)
    }
  }

  // 👁️ Control de visibilidad de líneas individuales
  setLineVisibility(lineIndex: number, visible: boolean): void {
    if (lineIndex >= 0 && lineIndex < this.lines.length) {
      const line = this.lines[lineIndex]
      const mesh = line.getMesh()
      mesh.visible = visible
      console.log(`Line ${lineIndex} visibility set to: ${visible}`)
    } else {
      console.warn(`Invalid line index: ${lineIndex}. Available lines: 0-${this.lines.length - 1}`)
    }
  }
  
  // 🎨 Presets de comportamiento
  setDeviationPreset(preset: 'subtle' | 'moderate' | 'dramatic' | 'chaotic'): void {
    const presets = {
      subtle:   { strength: 0.15, frequency: 0.005 },
      moderate: { strength: 0.3,  frequency: 0.01  },
      dramatic: { strength: 0.6,  frequency: 0.02  },
      chaotic:  { strength: 0.8,  frequency: 0.05  }
    }
    
    const params = presets[preset]
    this.updateLineDeviations(params.strength, params.frequency)
    console.log(`Applied ${preset} deviation preset`)
  }

  // 📊 Método para obtener información de la cámara
  getCameraInfo(): { position: THREE.Vector3, rotation: THREE.Euler } | null {
    return this.cameraController?.getCameraInfo() || null
  }

  // 🎢 Actualizar animaciones de altura tipo montaña rusa
  private updateHeightAnimations(): void {
    const currentTime = Date.now() * 0.001 // Tiempo en segundos

    this.lineHeightAnimations.forEach((anim) => {
      if (!anim.config) return // No hay configuración de animación

      const { amplitude, frequency, phase, changeInterval } = anim.config

      // 🎲 Cambios aleatorios de objetivo cada cierto intervalo
      if (currentTime - anim.lastChangeTime > changeInterval) {
        // Generar nueva altura objetivo aleatoria
        const randomOffset = (Math.random() - 0.5) * amplitude * 2 // Rango: -amplitude a +amplitude
        anim.currentTarget = anim.baseOffset.z + randomOffset
        anim.lastChangeTime = currentTime
        
        console.log(`Line height target changed to: ${anim.currentTarget.toFixed(2)}`)
      }

      // 🌊 Interpolación suave hacia el objetivo usando seno
      const timeFactor = currentTime * frequency + phase
      const smoothing = Math.sin(timeFactor) * 0.5 + 0.5 // 0-1
      
      // Interpolar suavemente entre altura actual y objetivo
      const targetDiff = anim.currentTarget - anim.currentZ
      anim.currentZ += targetDiff * smoothing * 0.02 // Interpolación suave

      // 🔄 Actualizar el laneOffset de la línea
      anim.line.updateLaneOffset(
        new THREE.Vector3(anim.baseOffset.x, anim.baseOffset.y, anim.currentZ)
      )
    })
  }

  start(): void {
    this.animate()
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this))

    // Update path guide
    if (this.pathGuide) {
      this.pathGuide.update(0.016) // ~60fps
      
      // Debug: log progress occasionally
      if (Math.random() < 0.02) { // 2% chance
        console.log(`PathGuide: ${this.pathGuide.getProgress()} at position`, this.pathGuide.getPosition())
      }
    }

    // 🎥 Update camera controller
    if (this.cameraController) {
      this.cameraController.update(0.016)
    }

    // 🎢 Update height animations for roller-coaster effect
    this.updateHeightAnimations()

    // Update all lines if they exist
    this.lines.forEach((line) => {
      line.update(0.016) // ~60fps (16ms per frame)
      
      // Update Line2 material resolution for each line
      const mesh = line.getMesh()
      if (mesh.material.isLineMaterial) {
        mesh.material.resolution.set(window.innerWidth, window.innerHeight)
      }
    })

    // Render the scene
    this.renderer.render(this.scene, this.camera)
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    
    // Update Line2 material resolution for all lines
    this.lines.forEach(line => {
      const mesh = line.getMesh()
      if (mesh.material.isLineMaterial) {
        mesh.material.resolution.set(window.innerWidth, window.innerHeight)
      }
    })
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this))
    
    // 👁️ Remove keyboard event listeners
    window.removeEventListener('keydown', this.setupKeyboardControls)
    window.removeEventListener('keyup', this.setupKeyboardControls)
    
    // 🎥 Clean up camera controller
    if (this.cameraController) {
      this.cameraController.dispose()
      this.cameraController = null
    }
    
    // Clean up path guide
    if (this.pathGuide) {
      this.pathGuide.dispose(this.scene)
      this.pathGuide = null
    }
    
    // Clean up all lines
    this.lines.forEach(line => {
      this.scene.remove(line.getMesh())
      line.dispose()
    })
    this.lines = [] // Clear the array
    
    this.renderer.dispose()
  }
}
