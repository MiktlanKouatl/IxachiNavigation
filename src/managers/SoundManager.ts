import * as THREE from 'three';

interface Sound {
    name: string;
    path: string;
}

export class SoundManager {
    private listener: THREE.AudioListener;
    private audioLoader: THREE.AudioLoader;
    private sounds: Map<string, THREE.Audio> = new Map();

    constructor(listener: THREE.AudioListener) {
        this.listener = listener;
        this.audioLoader = new THREE.AudioLoader();
    }

    public load(soundsToLoad: Sound[]): Promise<void[]> {
        const promises = soundsToLoad.map(soundInfo => {
            return new Promise<void>((resolve, reject) => {
                this.audioLoader.load(
                    soundInfo.path,
                    (buffer) => {
                        const audio = new THREE.Audio(this.listener);
                        audio.setBuffer(buffer);
                        this.sounds.set(soundInfo.name, audio);
                        console.log(`🔊 Sound loaded: ${soundInfo.name}`);
                        resolve();
                    },
                    undefined, // onProgress callback (optional)
                    (error) => {
                        console.error(`Error loading sound: ${soundInfo.name}`, error);
                        reject(error);
                    }
                );
            });
        });
        return Promise.all(promises);
    }

    public play(name: string, volume: number = 1.0): void {
        const sound = this.sounds.get(name);
        if (sound) {
            if (sound.isPlaying) {
                sound.stop();
            }
            sound.setVolume(volume);
            sound.play();
        } else {
            console.warn(`Sound not found: ${name}`);
        }
    }
}
