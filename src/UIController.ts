import { IxachiNavigationScene } from './core/IxachiNavigationScene'

export class UIController {
  private uiContainer: HTMLElement | null = null
  private isVisible: boolean = true

  constructor(private scene: IxachiNavigationScene) {
    this.createUI()
    this.setupEventListeners()
    console.log('🎛️ UI Controller initialized with clean functional controls')
  }

  private createUI(): void {
    this.uiContainer = document.createElement('div')
    this.uiContainer.id = 'ui-container'
    this.uiContainer.innerHTML = `
      <div class="control-panel">
        <div class="panel-header">
          <h3>Ixachi Navigation Controls</h3>
          <button id="toggle-ui" class="toggle-btn">Hide</button>
        </div>
        
        <div class="panel-content">
          <!-- 📊 Line Controls -->
          <div class="control-section">
            <h4>📊 Line Controls</h4>
            <div class="control-grid">
              ${Array.from({ length: 8 }, (_, i) => `
                <div class="line-control">
                  <label>Line ${i + 1}</label>
                  <button class="toggle-btn" id="toggle-line-${i}">Visible</button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 🎯 Deviation Controls -->
          <div class="control-section">
            <h4>🎯 Deviation Controls</h4>
            <div class="slider-control">
              <label for="deviation-strength">Strength: <span id="deviation-strength-value">0.3</span></label>
              <input type="range" id="deviation-strength" min="0" max="1" step="0.1" value="0.3">
            </div>
            <div class="slider-control">
              <label for="deviation-frequency">Frequency: <span id="deviation-frequency-value">0.01</span></label>
              <input type="range" id="deviation-frequency" min="0.001" max="0.1" step="0.001" value="0.01">
            </div>
          </div>

          <!-- 🎨 Behavior Presets -->
          <div class="control-section">
            <h4>🎨 Behavior Presets</h4>
            <div class="button-group">
              <button class="preset-btn active" id="flowing-preset">Flowing</button>
              <button class="preset-btn" id="chaotic-preset">Chaotic</button>
              <button class="preset-btn" id="gentle-preset">Gentle</button>
              <button class="preset-btn" id="dramatic-preset">Dramatic</button>
            </div>
          </div>

          <!-- ⌨️ Keyboard Controls Info -->
          <div class="control-section">
            <h4>⌨️ Keyboard Controls</h4>
            <div class="keyboard-info">
              <div class="key-group">
                <span class="key-label">Movement:</span>
                <span class="key-combo">A/D/W/S/R/F</span>
              </div>
              <div class="key-group">
                <span class="key-label">Rotation:</span>
                <span class="key-combo">Q/E/T/G/Z/C</span>
              </div>
              <div class="key-group">
                <span class="key-label">Reset Camera:</span>
                <span class="key-combo">H</span>
              </div>
              <div class="key-group">
                <span class="key-label">PathGuide:</span>
                <span class="key-combo">P</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    
    // Add styles
    this.addStyles()
    document.body.appendChild(this.uiContainer)
  }

  private addStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      #ui-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: rgba(26, 32, 44, 0.95);
        border: 1px solid rgba(74, 85, 104, 0.6);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        color: white;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 13px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-height: 80vh;
        overflow-y: auto;
        min-width: 320px;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid rgba(74, 85, 104, 0.4);
        background: rgba(45, 55, 72, 0.7);
        border-radius: 12px 12px 0 0;
      }

      .panel-header h3 {
        margin: 0;
        color: #63b3ed;
        font-weight: 600;
        font-size: 16px;
      }

      .panel-content {
        padding: 20px;
      }

      .control-section {
        margin-bottom: 25px;
        padding: 15px;
        background: rgba(45, 55, 72, 0.3);
        border-radius: 8px;
        border: 1px solid rgba(74, 85, 104, 0.3);
      }

      .control-section h4 {
        margin: 0 0 12px 0;
        color: #a0aec0;
        font-size: 14px;
        font-weight: 500;
      }

      .control-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .line-control {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: rgba(74, 85, 104, 0.2);
        border-radius: 6px;
      }

      .line-control label {
        color: #cbd5e0;
        font-size: 12px;
        font-weight: 500;
      }

      .toggle-btn {
        background: #48bb78;
        color: white;
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .toggle-btn:hover {
        background: #38a169;
        transform: translateY(-1px);
      }

      .toggle-btn.hidden {
        background: #e53e3e;
      }

      .toggle-btn.hidden:hover {
        background: #c53030;
      }

      .slider-control {
        margin-bottom: 15px;
      }

      .slider-control label {
        display: block;
        color: #cbd5e0;
        margin-bottom: 5px;
        font-size: 12px;
        font-weight: 500;
      }

      .slider-control input[type="range"] {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(74, 85, 104, 0.5);
        outline: none;
        -webkit-appearance: none;
      }

      .slider-control input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #63b3ed;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .button-group {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .preset-btn {
        background: rgba(74, 85, 104, 0.6);
        color: #cbd5e0;
        border: 1px solid rgba(113, 128, 150, 0.4);
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .preset-btn:hover {
        background: rgba(74, 85, 104, 0.8);
        border-color: #63b3ed;
        transform: translateY(-1px);
      }

      .preset-btn.active {
        background: #3182ce;
        color: white;
        border-color: #63b3ed;
      }

      .keyboard-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .key-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        background: rgba(74, 85, 104, 0.2);
        border-radius: 4px;
      }

      .key-label {
        color: #a0aec0;
        font-size: 11px;
        font-weight: 500;
      }

      .key-combo {
        color: #63b3ed;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        background: rgba(99, 179, 237, 0.1);
        border-radius: 3px;
      }

      #ui-container.ui-hidden .panel-content {
        display: none;
      }
    `
    document.head.appendChild(style)
  }

  private setupEventListeners(): void {
    if (!this.uiContainer) return

    // Toggle UI visibility
    const toggleBtn = this.uiContainer.querySelector('#toggle-ui')
    toggleBtn?.addEventListener('click', () => this.toggleVisibility())

    // Line visibility toggles
    for (let i = 0; i < 8; i++) {
      const toggleBtn = this.uiContainer.querySelector(`#toggle-line-${i}`)
      toggleBtn?.addEventListener('click', (e) => {
        const btn = e.target as HTMLButtonElement
        const isVisible = btn.textContent === 'Visible'
        
        this.scene.setLineVisibility(i, !isVisible)
        btn.textContent = isVisible ? 'Hidden' : 'Visible'
        btn.classList.toggle('hidden', isVisible)
      })
    }

    // Deviation controls
    const strengthSlider = this.uiContainer.querySelector('#deviation-strength') as HTMLInputElement
    const frequencySlider = this.uiContainer.querySelector('#deviation-frequency') as HTMLInputElement
    const strengthValue = this.uiContainer.querySelector('#deviation-strength-value')
    const frequencyValue = this.uiContainer.querySelector('#deviation-frequency-value')

    const updateDeviations = () => {
      const strength = parseFloat(strengthSlider.value)
      const frequency = parseFloat(frequencySlider.value)
      
      this.scene.updateLineDeviations(strength, frequency)
      if (strengthValue) strengthValue.textContent = strength.toFixed(2)
      if (frequencyValue) frequencyValue.textContent = frequency.toFixed(3)
    }

    strengthSlider?.addEventListener('input', updateDeviations)
    frequencySlider?.addEventListener('input', updateDeviations)

    // Behavior presets
    const presetButtons = this.uiContainer.querySelectorAll('.preset-btn')
    presetButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement
        this.setActiveButton('.preset-btn', target)
        
        switch (target.id) {
          case 'flowing-preset':
            this.scene.updateLineDeviations(0.3, 0.01)
            this.updateSliderValues(0.3, 0.01)
            break
          case 'chaotic-preset':
            this.scene.updateLineDeviations(0.8, 0.05)
            this.updateSliderValues(0.8, 0.05)
            break
          case 'gentle-preset':
            this.scene.updateLineDeviations(0.1, 0.005)
            this.updateSliderValues(0.1, 0.005)
            break
          case 'dramatic-preset':
            this.scene.updateLineDeviations(1.0, 0.02)
            this.updateSliderValues(1.0, 0.02)
            break
        }
      })
    })
  }

  private updateSliderValues(strength: number, frequency: number): void {
    if (!this.uiContainer) return

    const strengthSlider = this.uiContainer.querySelector('#deviation-strength') as HTMLInputElement
    const frequencySlider = this.uiContainer.querySelector('#deviation-frequency') as HTMLInputElement
    const strengthValue = this.uiContainer.querySelector('#deviation-strength-value')
    const frequencyValue = this.uiContainer.querySelector('#deviation-frequency-value')

    if (strengthSlider) strengthSlider.value = strength.toString()
    if (frequencySlider) frequencySlider.value = frequency.toString()
    if (strengthValue) strengthValue.textContent = strength.toFixed(2)
    if (frequencyValue) frequencyValue.textContent = frequency.toFixed(3)
  }

  private setActiveButton(selector: string, activeButton: HTMLElement): void {
    if (!this.uiContainer) return
    
    const buttons = this.uiContainer.querySelectorAll(selector)
    buttons.forEach(btn => btn.classList.remove('active'))
    activeButton.classList.add('active')
  }

  private toggleVisibility(): void {
    this.isVisible = !this.isVisible
    const panelContent = this.uiContainer?.querySelector('.panel-content') as HTMLElement
    const toggleBtn = this.uiContainer?.querySelector('#toggle-ui') as HTMLButtonElement
    
    if (panelContent && toggleBtn) {
      panelContent.style.display = this.isVisible ? 'block' : 'none'
      toggleBtn.textContent = this.isVisible ? 'Hide' : 'Show'
    }
  }

  destroy(): void {
    if (this.uiContainer) {
      this.uiContainer.remove()
      this.uiContainer = null
    }
    console.log('🎛️ UI Controller destroyed')
  }
}
