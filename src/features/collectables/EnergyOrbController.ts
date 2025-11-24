import * as THREE from 'three';
import { PathController } from '../../core/pathing/PathController';
import { ColorManager } from '../../managers/ColorManager';
import { EventEmitter } from '../../core/EventEmitter';

// Importamos los shaders como raw strings (Vite)
import orbVertexShader from '../../shaders/orb_particle.vert.glsl?raw';
import orbFragmentShader from '../../shaders/orb_particle.frag.glsl?raw';

interface OrbData {
    id: number;
    currentPosition: THREE.Vector3;
    originalPosition: THREE.Vector3;
    velocity: THREE.Vector3;
    state: 'idle' | 'attracted' | 'collected';
}

export class EnergyOrbController {
    public onOrbCollected = new EventEmitter<{ count: number }>();
    
    private scene: THREE.Scene;
    private pathController: PathController;
    private colorManager: ColorManager;
    
    // Geometría y Material para THREE.Points
    private geometry: THREE.BufferGeometry;
    private material: THREE.ShaderMaterial;
    private points: THREE.Points;

    // Datos lógicos (CPU) para la física
    private orbsData: OrbData[] = [];
    
    // Configuración
    private magnetRadius = 7.5;     // Distancia para empezar a atraer
    private collectRadius = 1.5;    // Distancia para recolección
    private magnetSpeed = 40.0;     // Velocidad de atracción
    private fadeDuration = 2.0;     // Segundos que tarda en reaparecer

    constructor(scene: THREE.Scene, pathController: PathController, colorManager: ColorManager) {
        this.scene = scene;
        this.pathController = pathController;
        this.colorManager = colorManager;
        
        this.geometry = new THREE.BufferGeometry();
        
        // Shader Material
        this.material = new THREE.ShaderMaterial({
            vertexShader: orbVertexShader,
            fragmentShader: orbFragmentShader,
            uniforms: {
                uTime: { value: 0.0 },
                uSize: { value: 2.0 }, // Tamaño base del orbe
                uFadeDuration: { value: this.fadeDuration }
            },
            transparent: true,
            depthWrite: false, // Importante para partículas transparentes
            blending: THREE.AdditiveBlending
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false; // Para evitar parpadeos si los bounds no se actualizan
        this.scene.add(this.points);
    }

    public addOrbsSequence(startDist: number, count: number, gap: number): void {

        // Si ya hay puntos, tendríamos que reconstruir los buffers.
        // Por simplicidad, asumimos que se agregan al inicio. 
        // Si necesitas agregar dinámicamente, habría que hacer merge de arrays.
        // Aquí reiniciamos arrays con los datos existentes + nuevos para este ejemplo simple.
        
        // Reconstrucción de datos existentes + nuevos (Simplified Logic)
        // Nota: En producción, es mejor pre-alocar un buffer grande.
        
        const startIndex = this.orbsData.length;

        for (let i = 0; i < count; i++) {
            const normalizedDist = startDist + (i * gap);
            if (normalizedDist > 1.0) break;

            const pos = this.pathController.getPointAt(normalizedDist);

            // Datos Lógicos (CPU)
            this.orbsData.push({
                id: startIndex + i,
                currentPosition: pos.clone(),
                originalPosition: pos.clone(),
                velocity: new THREE.Vector3(0, 0, 0),
                state: 'idle'
            });
        }

        this.updateGeometryAttributes();
    }

    // Actualiza todos los buffers de la GPU
    private updateGeometryAttributes(): void {
        const count = this.orbsData.length;
        const posArray = new Float32Array(count * 3);
        const colStartArray = new Float32Array(count * 3);
        const colCollArray = new Float32Array(count * 3);
        const scaleArray = new Float32Array(count);
        const isCollArray = new Float32Array(count);
        const timeCollArray = new Float32Array(count);

        const cNormal = this.colorManager.getColor('ribbonDefault');
        const cCollected = this.colorManager.getColor('accent');

        for (let i = 0; i < count; i++) {
            const orb = this.orbsData[i];
            
            posArray[i*3] = orb.currentPosition.x;
            posArray[i*3+1] = orb.currentPosition.y;
            posArray[i*3+2] = orb.currentPosition.z;

            cNormal.toArray(colStartArray, i * 3);
            cCollected.toArray(colCollArray, i * 3);

            scaleArray[i] = 1.0;
            isCollArray[i] = 0.0; // Inician no recolectados
            timeCollArray[i] = 0.0;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        this.geometry.setAttribute('a_colorStart', new THREE.BufferAttribute(colStartArray, 3));
        this.geometry.setAttribute('a_colorCollected', new THREE.BufferAttribute(colCollArray, 3));
        this.geometry.setAttribute('a_scale', new THREE.BufferAttribute(scaleArray, 1));
        this.geometry.setAttribute('a_isCollected', new THREE.BufferAttribute(isCollArray, 1));
        this.geometry.setAttribute('a_collectionTime', new THREE.BufferAttribute(timeCollArray, 1));
        
        this.geometry.attributes.position.needsUpdate = true;
    }

    public update(deltaTime: number, time: number, playerPosition: THREE.Vector3): void {
        this.material.uniforms.uTime.value = time;

        const positions = this.geometry.attributes.position.array as Float32Array;
        const isCollectedAttr = this.geometry.attributes.a_isCollected as THREE.BufferAttribute;
        const collectionTimeAttr = this.geometry.attributes.a_collectionTime as THREE.BufferAttribute;
        
        let needsUpdatePos = false;
        let needsUpdateState = false;

        for (let i = 0; i < this.orbsData.length; i++) {
            const orb = this.orbsData[i];

            // Si ya fue recolectado, no hacemos física de atracción (está en su lugar haciendo fade in)
            if (orb.state === 'collected') continue;

            const distToPlayer = orb.currentPosition.distanceTo(playerPosition);

            // 1. ESTADO IDLE -> ATTRACTED
            if (orb.state === 'idle') {
                if (distToPlayer < this.magnetRadius) {
                    orb.state = 'attracted';
                }
            }

            // 2. ESTADO ATTRACTED (Física de atracción)
            if (orb.state === 'attracted') {
                const direction = new THREE.Vector3().subVectors(playerPosition, orb.currentPosition).normalize();
                
                // Mover hacia el jugador
                const moveStep = direction.multiplyScalar(this.magnetSpeed * deltaTime);
                orb.currentPosition.add(moveStep);

                // Actualizar buffer de posición
                positions[i * 3] = orb.currentPosition.x;
                positions[i * 3 + 1] = orb.currentPosition.y;
                positions[i * 3 + 2] = orb.currentPosition.z;
                needsUpdatePos = true;

                // 3. DETECTAR RECOLECCIÓN
                if (distToPlayer < this.collectRadius) {
                    // --- EVENTO DE RECOLELECCIÓN ---
                    orb.state = 'collected';
                    
                    // Resetear posición instantáneamente al origen
                    orb.currentPosition.copy(orb.originalPosition);
                    
                    // Actualizar posición en buffer para el siguiente frame
                    positions[i * 3] = orb.originalPosition.x;
                    positions[i * 3 + 1] = orb.originalPosition.y;
                    positions[i * 3 + 2] = orb.originalPosition.z;

                    // Actualizar atributos de estado para el Shader (GPU Animation)
                    isCollectedAttr.setX(i, 1.0);       // Marca como recolectado
                    collectionTimeAttr.setX(i, time);   // Marca el tiempo actual para el Fade In

                    needsUpdateState = true;
                    this.onOrbCollected.emit({ count: 1 });
                }
            }
        }

        if (needsUpdatePos) this.geometry.attributes.position.needsUpdate = true;
        if (needsUpdateState) {
            isCollectedAttr.needsUpdate = true;
            collectionTimeAttr.needsUpdate = true;
        }
    }
}