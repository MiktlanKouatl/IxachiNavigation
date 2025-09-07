import './style.css'
import { IxachiNavigationScene } from './core/IxachiNavigationScene'
import { UIController } from './UIController'

// Initialize the main scene
const scene = new IxachiNavigationScene()
scene.init()
scene.start()

// 🎛️ Initialize UI Controller
const uiController = new UIController(scene)

// Update UI info periodically
/* setInterval(() => {
  uiController.updateInfo()
}, 1000) */

// 🎛️ Exponer la escena globalmente para control desde consola
;(window as any).scene = scene
;(window as any).ui = uiController
/* 
console.log('🎮 Ixachi Navigation with Visual UI Controls Ready!')
console.log('')
console.log('📱 UI CONTROLS: Check the panel on the top-right!')
console.log('⌨️  KEYBOARD: 1/2/3/4 for camera presets, WASD for manual control')
console.log('🖱️  MOUSE: Use the visual controls panel for all adjustments')
console.log('')
console.log('🎭 CINEMATIC API (GSAP):')
console.log('  window.scene.transitionToPreset("overview", 3.0)')
console.log('  window.scene.playAutoSequence()  // Auto cinematic sequence')
console.log('  window.scene.saveCameraPreset("my-shot", "My Custom Shot")')
console.log('  window.scene.listCameraPresets() // List all presets')
console.log('  window.scene.stopCameraTransition() // Stop current transition')
console.log('')
console.log('�️ LINE CONTROLS:')
console.log('  window.scene.setDeviationPreset("dramatic")   // All lines') 
console.log('  window.scene.updateLineDeviations(0.8, 0.03)  // All lines')
console.log('  window.scene.updateSingleLineDeviations(0, 0.5, 0.02) // Line 0')
console.log('')
console.log('  Lines: 0=cyan, 1=purple, 2=orange, 3=green')
 */