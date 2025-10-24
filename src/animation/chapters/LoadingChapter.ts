import { IAnimationChapter } from "../IAnimationChapter";
import { AnimationDirector } from "../AnimationDirector";
import { AnimationTargets } from "../AnimationTargets";
import { gsap } from 'gsap';
import { AssetManager } from '../../managers/AssetManager';

/**
 * Chapter 2: The loading animation with the progress circle and text.
 * This chapter now actively listens to AssetManager for real loading progress.
 */
export class LoadingChapter implements IAnimationChapter {
    private timeline: gsap.core.Timeline | null = null;
    private assetManager: AssetManager;
    private resolvePromise: (() => void) | null = null;
    private _targets: AnimationTargets; // Store targets as a class property
    // private progressTween: gsap.core.Tween | null = null; // Removed: No longer using a single long tween

    private currentAssetProgress: number = 0; // 0-1 range
    private displayedProgress: { value: number } = { value: 0 }; // Animatable object for GSAP
    private isAssetsLoaded: boolean = false;
    private startTime: number = 0;

    public readonly params = {
        minDisplayDuration: 2.0, // Minimum time the loading screen is shown
        preStartDelay: 1.5, // New: Delay before loading UI appears
        revealDuration: 1.5,
        disappearDuration: 1.0,
        progressEase: 'power1.out',
    };

    constructor(assetManager: AssetManager) {
        this.assetManager = assetManager;
        this.onAssetProgress = this.onAssetProgress.bind(this);
        this.onAssetsLoaded = this.onAssetsLoaded.bind(this);
    }

    public start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        return new Promise<void>(resolve => {
            this.resolvePromise = resolve;
            this.startTime = performance.now() / 1000;
            this.isAssetsLoaded = false;
            this.currentAssetProgress = 0;
            this.displayedProgress.value = 0;
            this._targets = targets; // Store targets here

            // Delay the actual start of the loading UI and asset loading
            gsap.delayedCall(this.params.preStartDelay, () => {
                const circleMat = this._targets.progressCircle.material;
                const progressUI = this._targets.progressUI;

                // --- SETUP UI ---
                circleMat.uniforms.uDrawProgress.value = 0;
                circleMat.uniforms.uWipeProgress.value = 0;
                this._targets.progressCircle.mesh.visible = true; // Keep circle visible
                progressUI.fade(true, 0.2);
                progressUI.percentage.value = 0; // Reset text
                progressUI.updateText();

                // --- Event Listeners ---
                this.assetManager.on('progress', this.onAssetProgress);
                this.assetManager.on('loaded', this.onAssetsLoaded);

                // Start loading assets
                this.assetManager.loadAll();
            });
        });
    }

    private onAssetProgress(ratio: number, item: string, loaded: number, total: number): void {
        this.currentAssetProgress = ratio;
        const circleMat = this._targets.progressCircle.material;
        const progressUI = this._targets.progressUI;

        // Smoothly animate displayed progress towards currentAssetProgress
        gsap.to(this.displayedProgress, {
            value: ratio * 100,
            duration: 0.5, // Smooth transition duration
            ease: this.params.progressEase,
            overwrite: true, // Overwrite previous progress tweens
            onUpdate: () => {
                circleMat.uniforms.uDrawProgress.value = this.displayedProgress.value / 100;
                progressUI.percentage.value = this.displayedProgress.value;
                progressUI.updateText();
            },
        });
    }

    private onAssetsLoaded(): void {
        this.isAssetsLoaded = true;
        const circleMat = this._targets.progressCircle.material;
        const progressUI = this._targets.progressUI;

        // Ensure displayed progress reaches 100% smoothly
        gsap.to(this.displayedProgress, {
            value: 100,
            duration: 0.5, // Smooth transition duration
            ease: this.params.progressEase,
            overwrite: true,
            onUpdate: () => {
                circleMat.uniforms.uDrawProgress.value = this.displayedProgress.value / 100;
                progressUI.percentage.value = this.displayedProgress.value;
                progressUI.updateText();
            },
            onComplete: () => this.onDisplayedProgressComplete(), // Check completion after reaching 100%
        });
    }

    private onDisplayedProgressComplete(): void {
        // This is called when displayedProgress reaches 100%
        // Now, we wait for the minimum display duration to pass
        const elapsedTime = performance.now() / 1000 - this.startTime;
        const remainingTime = Math.max(0, this.params.minDisplayDuration - elapsedTime);

        gsap.delayedCall(remainingTime, () => {
            // Ensure all listeners are removed before resolving
            this.assetManager.off('progress', this.onAssetProgress);
            this.assetManager.off('loaded', this.onAssetsLoaded);

            // --- DISAPPEAR PHASE ---
            this.timeline = gsap.timeline({
                onComplete: () => {
                    if (this.resolvePromise) {
                        this.resolvePromise();
                    }
                }
            });

            const circleMat = this._targets.progressCircle.material;
            const progressUI = this._targets.progressUI;

            this.timeline
                .call(() => progressUI.fade(false, 0.3), [], '-=0.3')
                .to(circleMat.uniforms.uWipeProgress, {
                    value: 1,
                    duration: this.params.disappearDuration,
                    ease: 'power1.in'
                })
                .call(() => {
                    this._targets.progressCircle.mesh.visible = false;
                }, []);
        });
    }

    public stop(): void {
        if (this.timeline) {
            this.timeline.kill();
            this.timeline = null;
        }
        // if (this.progressTween) { // Removed: No longer using a single long tween
        //     this.progressTween.kill();
        //     this.progressTween = null;
        // }
        this.assetManager.off('progress', this.onAssetProgress);
        this.assetManager.off('loaded', this.onAssetsLoaded);
        // Ensure UI is hidden if stopped prematurely
        this._targets.progressCircle.mesh.visible = false;
        this._targets.progressUI.fade(false, 0);
    }
}