/* Render Shader: Vertex */
uniform sampler2D positionTexture; // Now holds STATE (T, Angle, Rad, _)
uniform sampler2D tPathPos;
uniform sampler2D tPathNorm;
uniform sampler2D tPathBinorm;

uniform float uPlayerT;
uniform float uWindowSize;

attribute vec2 reference;
varying float vBehaviorID;

// Helper to sample LUT
vec3 samplePath(sampler2D tex, float t) {
    return texture2D(tex, vec2(t, 0.5)).xyz;
}

void main() {
    // Read State
    vec4 state = texture2D(positionTexture, reference);
    float tOffset = state.x;
    float angle = state.y;
    float radOffset = state.z;
    vBehaviorID = state.w; // or we can use generic ID

    // Calculate Linear T
    // We want particles to appear static in the world as the window moves.
    // state.x is the "slot" (0..1).
    // We counter-scroll the slot based on player movement to keep WorldT constant.
    // Window moves forward (+uPlayerT). We shift slot backward (-).
    float slide = fract(tOffset - uPlayerT / uWindowSize);

    // Now map 'slide' (0..1 in window) to World T.
    // Window is centered at uPlayerT.
    // Range: [uPlayerT - 0.5*W, uPlayerT + 0.5*W]
    float linearT = fract(uPlayerT + (slide - 0.5) * uWindowSize);
    
    // Sample LUT
    vec4 pathPosData = texture2D(tPathPos, vec2(linearT, 0.5));
    vec3 pathPos = pathPosData.xyz;
    float sectorId = pathPosData.w; // 0=Full, 1=Bed, 2=Roof (from TrackBuilder)

    vec3 pathNorm = samplePath(tPathNorm, linearT);
    vec3 pathBinorm = samplePath(tPathBinorm, linearT);
    
    // Sector Logic (Culling)
    bool visible = true;
    
    // Normalize angle to 0..2PI
    float normAngle = mod(angle, 6.28318);
    
    if (sectorId > 0.5) {
        float cosA = cos(angle);
        
        if (sectorId > 0.9 && sectorId < 1.1) {
            // BED (Bottom Half) -> We want vectors pointing DOWN (approx).
            // Actually, "Bed" means particles ON THE GROUND.
            // If Normal is UP, then ground is when cos(angle) < 0? 
            // Let's try cos(angle) < 0.
            if (cosA > 0.0) visible = false; 
        } else if (sectorId > 1.9 && sectorId < 2.1) {
             // ROOF (Top Half)
             if (cosA < 0.0) visible = false;
        }
    }
    
    if (!visible) {
        gl_Position = vec4(0.0);
        gl_PointSize = 0.0;
        return;
    }

    // Calculate Ring Position
    float radius = 10.0 + radOffset * 5.0;
    vec3 ringOffset = (cos(angle) * pathNorm + sin(angle) * pathBinorm) * radius;
    
    vec3 finalPos = pathPos + ringOffset;

    // Size Transition (Fade In/Out at edges of WINDOW)
    // Use 'slide' which is 0..1 relative to the window.
    float fadeIn = smoothstep(0.0, 0.1, slide);
    float fadeOut = 1.0 - smoothstep(0.9, 1.0, slide);
    float sizeScale = fadeIn * fadeOut;

    gl_PointSize = 4.0 * sizeScale; // Base size 4.0
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
}
