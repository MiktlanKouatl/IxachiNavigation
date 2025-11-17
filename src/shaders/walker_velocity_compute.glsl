// "Cerebro" Shader de Cómputo para Velocidad/Estado
// Este shader determina el siguiente paso para un agente, asegurando que se mantenga dentro de sus límites
// e implementa la lógica de "movimiento libre" para evitar celdas ocupadas, o sigue patrones predefinidos.
// Uniforms for textures are injected automatically by GPUComputationRenderer or passed manually.

uniform float gridColumns;
uniform float gridRows;
uniform float gridLayers;
uniform float layersPerRegion;
uniform float time; // Para la semilla del PRNG
uniform sampler2D textureGridState; // Estado de la cuadrícula (ocupación)

// --- Funciones auxiliares ---

// Converts a 3D grid coordinate (ivec3) into a 2D UV coordinate
// suitable for sampling our flattened 3D texture.
// This logic needs to perfectly match how we write to the textureGridState.
vec2 getUVFor3DCoord(vec3 coord, vec2 textureSize) {
    // Clamp coordinates to ensure they are within bounds before flattening
    vec3 clampedCoord = clamp(coord, vec3(0.0), vec3(gridColumns - 1.0, gridRows - 1.0, gridLayers - 1.0));

    // Flatten the 3D coord into a 1D index
    float flatIndex = clampedCoord.x + clampedCoord.y * gridColumns + clampedCoord.z * gridColumns * gridRows;
    
    // Convert the 1D index into a 2D UV coordinate
    float u = mod(flatIndex, textureSize.x);
    float v = floor(flatIndex / textureSize.x);
    
    return (vec2(u, v) + 0.5) / textureSize;
}

// Simple Pseudo-Random Number Generator (PRNG)
// Based on https://thebookofshaders.com/10/
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // Read the current state: velocity and regionID
    vec4 currentState = texture2D(textureVelocity, uv);
    vec3 currentStep = currentState.xyz;
    float regionID = currentState.w;

    // Read the current position
    vec4 posData = texture2D(texturePosition, uv);
    vec3 currentPos = posData.xyz;
    float is_alive = posData.w;

    vec3 nextStep = currentStep; // Assume current step is valid by default

    if (is_alive > 0.5) {
        // Calculate the potential next position
        vec3 potentialNextPos = currentPos + currentStep;

        // --- Check if potentialNextPos is valid --- (Initial check for currentStep)
        bool isValidMove = true;

        // 1. Check Row boundaries (clamp behavior)
        if (potentialNextPos.y < 0.0 || potentialNextPos.y >= gridRows) {
            isValidMove = false;
        }

        // 2. Check Layer boundaries (clamp behavior)
        if (potentialNextPos.z < 0.0 || potentialNextPos.z >= gridLayers) {
            isValidMove = false;
        }

        // 3. Check Region boundaries (confinement)
        float minLayer = regionID * layersPerRegion;
        float maxLayer = minLayer + layersPerRegion;
        if (potentialNextPos.z < minLayer || potentialNextPos.z >= maxLayer) {
            isValidMove = false;
        }

        // 4. Check if cell is occupied in the grid state map
        if (isValidMove) {
            vec2 gridUV = getUVFor3DCoord(potentialNextPos, resolution.xy);
            float isOccupied = texture2D(textureGridState, gridUV).r; // .r channel holds occupancy
            if (isOccupied > 0.5) { // If occupied
                isValidMove = false;
            }
        }

        // --- Decision Logic: If current path is blocked, find a new one --- (Free Movement)
        if (!isValidMove) {
            // PERFORMANCE BOTTLENECK IS LIKELY HERE.
            // For debugging, we will just stop the agent instead of finding a new path.
            nextStep = vec3(0.0);

            /*
            // Define possible 3D steps (6 directions)
            vec3 possibleSteps[6];
            possibleSteps[0] = vec3(1.0, 0.0, 0.0);  // Right
            possibleSteps[1] = vec3(-1.0, 0.0, 0.0); // Left
            possibleSteps[2] = vec3(0.0, 1.0, 0.0);  // Up
            possibleSteps[3] = vec3(0.0, -1.0, 0.0); // Down
            possibleSteps[4] = vec3(0.0, 0.0, 1.0);  // Forward (to next layer)
            possibleSteps[5] = vec3(0.0, 0.0, -1.0); // Backward (to previous layer)

            // Seed PRNG with agent's UV and time for unique random sequence
            float seed = rand(uv * time);

            // Shuffle directions (Fisher-Yates-like shuffle using PRNG)
            for (int i = 5; i >= 0; i--) {
                int j = int(floor(rand(uv * time + float(i) + seed) * (float(i) + 1.0)));
                vec3 temp = possibleSteps[i];
                possibleSteps[i] = possibleSteps[j];
                possibleSteps[j] = temp;
            }

            bool foundNewPath = false;
            for (int i = 0; i < 6; i++) {
                vec3 testStep = possibleSteps[i];
                vec3 testPos = currentPos + testStep;

                bool testIsValid = true;

                // Check Row boundaries
                if (testPos.y < 0.0 || testPos.y >= gridRows) { testIsValid = false; }
                // Check Layer boundaries
                if (testPos.z < 0.0 || testPos.z >= gridLayers) { testIsValid = false; }
                // Check Region boundaries
                if (testPos.z < minLayer || testPos.z >= maxLayer) { testIsValid = false; }

                // Check if cell is occupied
                if (testIsValid) {
                    vec2 testGridUV = getUVFor3DCoord(testPos, resolution.xy);
                    float testIsOccupied = texture2D(textureGridState, testGridUV).r;
                    if (testIsOccupied > 0.5) { testIsValid = false; }
                }

                if (testIsValid) {
                    nextStep = testStep;
                    foundNewPath = true;
                    break; // Found a valid path, stop searching
                }
            }

            if (!foundNewPath) {
                nextStep = vec3(0.0); // No valid path found, stop the agent
            }
            */
        } else {
            // Current path is valid, keep moving in the same direction
            nextStep = currentStep;
        }
    } else {
        nextStep = vec3(0.0); // Agent is not alive, so it doesn't move
    }

    // Write the new state back out
    // .xyz = the step to take in the *next* frame
    // .w = the region ID (unchanged)
    gl_FragColor = vec4(nextStep, regionID);
}
