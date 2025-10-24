import { EventEmitter } from '../../core/EventEmitter'; // Assuming EventEmitter is a core utility

export class ScrollController extends EventEmitter {
    private isConnected: boolean = false;
    private currentScroll: number = 0; // Current controlled scroll position
    private targetScroll: number = 0;  // Target scroll position from user input
    private scrollSpeed: number = 0.1; // How fast currentScroll catches up to targetScroll
    private maxScrollDelta: number = 50; // Max change per scroll event to prevent jumps
    private animationFrameId: number | null = null;

    constructor() {
        super();
        this.onScroll = this.onScroll.bind(this);
        this.animate = this.animate.bind(this);
    }

    public connect(): void {
        if (!this.isConnected) {
            window.addEventListener('wheel', this.onScroll, { passive: false }); // Use 'wheel' for more control
            this.isConnected = true;
            this.animationFrameId = requestAnimationFrame(this.animate);
            console.log('📜 [ScrollController] Connected.');
        }
    }

    public disconnect(): void {
        if (this.isConnected) {
            window.removeEventListener('wheel', this.onScroll);
            this.isConnected = false;
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            console.log('📜 [ScrollController] Disconnected.');
        }
    }

    private onScroll(event: WheelEvent): void {
        event.preventDefault(); // Prevent default scroll behavior

        // Accumulate scroll input, but clamp it to prevent extreme jumps
        const delta = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), this.maxScrollDelta);
        this.targetScroll += delta;

        // Emit raw scroll event for potential immediate reactions
        this.emit('rawScroll', delta, this.targetScroll);
    }

    private animate(): void {
        // Smoothly interpolate currentScroll towards targetScroll
        this.currentScroll += (this.targetScroll - this.currentScroll) * this.scrollSpeed;

        // Emit controlled scroll progress
        this.emit('scroll', this.currentScroll);

        if (this.isConnected) {
            this.animationFrameId = requestAnimationFrame(this.animate);
        }
    }

    // Optional: Method to reset scroll position
    public reset(): void {
        this.currentScroll = 0;
        this.targetScroll = 0;
        this.emit('scroll', this.currentScroll);
    }
}