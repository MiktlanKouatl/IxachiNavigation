// src/shaders/ribbon_gpu.vert.glsl

attribute float a_index;
attribute float side;
varying vec2 vUv;
varying float vTrailUv;
varying float v_visibility;

uniform vec2 uResolution;
uniform float uWidth;
uniform sampler2D uPathTexture;
uniform float uPathLength;

// New uniforms for explicit mode control
uniform int uUseMode; // 0: Static, 1: Reveal, 2: Trail
uniform float uRevealProgress; // For Reveal mode
uniform float uTrailHead;      // For Trail mode
uniform float uTrailLength;    // For Trail mode

vec4 getPoint(float progress) {
    // Use fract to allow paths to loop
    return texture2D(uPathTexture, vec2(fract(progress), 0.0));
}

void main() {
    vUv = uv;
    vTrailUv = a_index; // Pass the original index for fragment shader fading

    float pointProgress = a_index;
    
    // Read the full vec4 which includes our visibility flag in the 'w' component
    vec4 currentPointData = getPoint(pointProgress);
    float visibility = currentPointData.w; // Use visibility from texture
    v_visibility = visibility;

    // --- USE MODE LOGIC ---
    if (uUseMode == 1) { // Reveal Mode
        pointProgress = a_index;
        if (a_index > uRevealProgress) {
            visibility = 0.0;
        }
        vTrailUv = a_index / max(0.001, uRevealProgress); // Remap for fade

    } else if (uUseMode == 2) { // Trail Mode
        pointProgress = uTrailHead - a_index * uTrailLength;
        vTrailUv = a_index; // Trail fade is over its own length
    }
    // For Static mode (0), we use the visibility from the texture

    // If vertex is not visible, collapse it to the origin to hide it.
    if (visibility == 0.0) {
        gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // --- GEOMETRY CALCULATION (same as before) ---
    vec3 previousPoint = getPoint(pointProgress - 1.0 / uPathLength).rgb;
    vec3 currentPoint = currentPointData.rgb;
    vec3 nextPoint = getPoint(pointProgress + 1.0 / uPathLength).rgb;

    vec4 prevProjected = projectionMatrix * modelViewMatrix * vec4(previousPoint, 1.0);
    vec4 currentProjected = projectionMatrix * modelViewMatrix * vec4(currentPoint, 1.0);
    vec4 nextProjected = projectionMatrix * modelViewMatrix * vec4(nextPoint, 1.0);

    vec2 currentScreen = currentProjected.xy / currentProjected.w;
    vec2 prevScreen = prevProjected.xy / prevProjected.w;
    vec2 nextScreen = nextProjected.xy / nextProjected.w;
    
    vec2 dir = vec2(1.0, 0.0);

    if (a_index == 0.0) {
        vec2 diff = nextScreen - currentScreen;
        if (length(diff) > 0.0) dir = normalize(diff);
    } else if (a_index == 1.0) {
        vec2 diff = currentScreen - prevScreen;
        if (length(diff) > 0.0) dir = normalize(diff);
    } else {
        vec2 dir1 = currentScreen - prevScreen;
        vec2 dir2 = nextScreen - currentScreen;
        vec2 tangent = dir1 + dir2;
        
        if (length(tangent) > 0.0) {
            dir = normalize(tangent);
        } else if (length(dir2) > 0.0) {
            dir = normalize(dir2);
        }
    }
    
    vec2 normal = vec2(-dir.y, dir.x);
    normal.x /= uResolution.x / uResolution.y;
    
    float width = uWidth * (1.0 / currentProjected.w);
    
    currentProjected.xy += normal * side * width;
    
    gl_Position = currentProjected;
}