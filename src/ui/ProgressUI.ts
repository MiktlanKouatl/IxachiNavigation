import { gsap } from 'gsap';

/**
 * @class ProgressUI
 * @description Manages the display of the loading progress UI.
 */
export class ProgressUI {
  private container: HTMLElement;
  private textElement: HTMLElement;
  public percentage: { value: number };

  constructor() {
    this.container = document.getElementById('progress-container')!;
    this.textElement = document.getElementById('progress-text')!;
    this.percentage = { value: 0 };

    if (!this.container || !this.textElement) {
      console.error('Progress UI elements not found in the DOM.');
      return;
    }
  }

  /**
   * Updates the text content with the current percentage value.
   */
  public updateText(): void {
    this.textElement.innerText = `${Math.floor(this.percentage.value)}%`;
  }

  /**
   * Fades the progress UI in or out.
   * @param fadeIn True to fade in, false to fade out.
   * @param duration The duration of the fade.
   */
  public fade(fadeIn: boolean, duration: number = 0.5): void {
    gsap.to(this.container, {
      opacity: fadeIn ? 1 : 0,
      duration: duration,
    });
  }

  /**
   * Sets the visibility of the percentage text element.
   * @param visible True to show the text, false to hide it.
   */
  public setTextVisible(visible: boolean): void {
    this.textElement.style.display = visible ? '' : 'none';
    this.container.style.display = visible ? '' : 'none';
  }
}
