// src/shaders/ribbon_gpu_player.vert.glsl

attribute float a_index;
attribute float side;
varying vec2 vUv;
varying float vTrailUv;
varying float v_visibility;

uniform vec2 uResolution;
uniform float uWidth;
uniform sampler2D uPathTexture;
uniform float uPathLength;

uniform int uUseMode;
uniform float uRevealProgress;
uniform float uTrailHead;
uniform float uTrailLength;

vec4 getPoint(float progress) {
    if (progress < 0.0 || progress > 1.0) {
        return vec4(0.0/0.0);
    }
    vec4 pointData = texture2D(uPathTexture, vec2(progress, 0.0));
    if (pointData.w < 0.5) {
        return vec4(0.0/0.0);
    }
    return pointData;
}

vec2 safeNormalize(vec2 v) {
    float len = length(v);
    if (len > 0.0) {
        return v / len;
    }
    return vec2(0.0);
}

void main() {
    vUv = uv;
    vTrailUv = a_index;

    float pointProgress = a_index;
    
    if (uUseMode == 1) {
        pointProgress = a_index;
        if (a_index > uRevealProgress) {
            gl_Position = vec4(0.0/0.0);
            return;
        }
        vTrailUv = a_index / max(0.001, uRevealProgress);
    } else if (uUseMode == 2) {
        pointProgress = uTrailHead - a_index * uTrailLength;
        vTrailUv = a_index;
    }

    vec4 currentPointData = getPoint(pointProgress);
    if (isnan(currentPointData.x)) {
        gl_Position = vec4(0.0/0.0);
        return;
    }
    v_visibility = currentPointData.w;

    // --- GEOMETRY CALCULATION (View Space) ---
    vec4 prevPointData = getPoint(pointProgress - 1.0 / uPathLength);
    vec4 nextPointData = getPoint(pointProgress + 1.0 / uPathLength);

    // Transform points to View Space
    vec4 currentView = modelViewMatrix * vec4(currentPointData.rgb, 1.0);
    vec4 prevView = modelViewMatrix * vec4(prevPointData.rgb, 1.0);
    vec4 nextView = modelViewMatrix * vec4(nextPointData.rgb, 1.0);

    vec2 dir;

    bool hasPrev = !isnan(prevPointData.x);
    bool hasNext = !isnan(nextPointData.x);

    // Project to screen space ONLY for direction calculation. This is still a weak point.
    // A true robust solution would use derivatives or normals calculated in 3D space.
    // However, for a ribbon that should be camera-facing, this is a common approach.
    vec2 currentScreen = currentView.xy / currentView.w;
    vec2 prevScreen = prevView.xy / prevView.w;
    vec2 nextScreen = nextView.xy / nextView.w;

    if (hasPrev && hasNext) {
        vec2 dir1 = safeNormalize(currentScreen - prevScreen);
        vec2 dir2 = safeNormalize(nextScreen - currentScreen);
        dir = safeNormalize(dir1 + dir2);
    } else if (hasPrev) {
        dir = safeNormalize(currentScreen - prevScreen);
    } else if (hasNext) {
        dir = safeNormalize(nextScreen - currentScreen);
    } else {
        dir = vec2(1.0, 0.0);
    }
    
    if (length(dir) < 0.0001) {
        dir = vec2(1.0, 0.0);
    }

    // The normal is perpendicular to the screen-space direction
    vec2 normal = vec2(-dir.y, dir.x);
    
    // The width is applied in screen space, so it's constant
    float aspect = uResolution.x / uResolution.y;
    normal.x /= aspect;
    normal *= uWidth;

    // Project back to a 3D offset in view space
    vec4 offset = vec4(normal * currentView.w, 0.0, 0.0);
    
    // Final position is the view-space point, plus the offset, projected to clip space
    gl_Position = projectionMatrix * (currentView + offset * side);
}