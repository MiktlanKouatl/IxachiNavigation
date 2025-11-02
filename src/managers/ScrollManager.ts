import { EventEmitter } from '../core/EventEmitter';

export interface ScrollData {
    deltaX: number;
    deltaY: number;
}

export class ScrollManager extends EventEmitter {
    private isConnected: boolean = false;

    constructor() {
        super();
        this.onWheel = this.onWheel.bind(this);
    }

    public connect(): void {
        if (!this.isConnected) {
            window.addEventListener('wheel', this.onWheel, { passive: false });
            this.isConnected = true;
            console.log('📜 [ScrollManager] Connected for directional input.');
        }
    }

    public disconnect(): void {
        if (this.isConnected) {
            window.removeEventListener('wheel', this.onWheel);
            this.isConnected = false;
            console.log('📜 [ScrollManager] Disconnected.');
        }
    }

    private onWheel(event: WheelEvent): void {
        event.preventDefault();
        
        const scrollData: ScrollData = {
            deltaX: event.deltaX,
            deltaY: event.deltaY
        };

        this.emit('scroll', scrollData);
    }
}
