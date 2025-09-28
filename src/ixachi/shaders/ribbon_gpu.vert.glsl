// src/shaders/ribbon_gpu.vert.glsl

attribute float a_index;
attribute float side;
varying vec2 vUv;
varying float vTrailUv;

uniform vec2 uResolution;
uniform float uWidth;
uniform sampler2D uPathTexture;
uniform float uPathLength;
uniform float uProgress;
uniform float uTrailLength;

vec3 getPoint(float progress) {
    return texture2D(uPathTexture, vec2(fract(progress), 0.0)).rgb;
}

void main() {
    vUv = uv;
    vTrailUv = a_index;

    float headProgress = uProgress;
    float pointProgress = headProgress - a_index * uTrailLength;

    vec3 previousPoint = getPoint(pointProgress - 1.0 / uPathLength);
    vec3 currentPoint = getPoint(pointProgress);
    vec3 nextPoint = getPoint(pointProgress + 1.0 / uPathLength);

    vec4 prevProjected = projectionMatrix * modelViewMatrix * vec4(previousPoint, 1.0);
    vec4 currentProjected = projectionMatrix * modelViewMatrix * vec4(currentPoint, 1.0);
    vec4 nextProjected = projectionMatrix * modelViewMatrix * vec4(nextPoint, 1.0);

    vec2 currentScreen = currentProjected.xy / currentProjected.w;
    vec2 prevScreen = prevProjected.xy / prevProjected.w;
    vec2 nextScreen = nextProjected.xy / nextProjected.w;
    
    vec2 dir = vec2(1.0, 0.0);

    // LÓGICA DE DIRECCIÓN COMPLETAMENTE ROBUSTA
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