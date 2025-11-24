// src/shaders/ribbon_gpu_player.vert.glsl

attribute float a_index;
attribute float side;
attribute float a_isHead;

varying vec2 vUv;
varying float vTrailUv;
varying float v_visibility;
varying float v_isDegenerateSegment;
varying float v_isHead;

uniform vec2 uResolution;
uniform float uWidth;
uniform sampler2D uPathTexture;
uniform float uPathLength;

uniform int uUseMode;
uniform float uRevealProgress;
uniform float uTrailHead;
uniform float uTrailLength;

uniform float uMinSegmentLengthThreshold;

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
    v_isHead = a_isHead;
    v_isDegenerateSegment = 0.0; // Default to not degenerate

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

    // Declare hasPrev and hasNext once, and use them throughout
    bool hasPrev = !isnan(prevPointData.x);
    bool hasNext = !isnan(nextPointData.x);

    // Check for degenerate segments in 3D world space (segment between current and next point)
    if (hasNext) {
        float segmentLength = distance(currentPointData.rgb, nextPointData.rgb); // Distance from current to next point
        if (segmentLength < uMinSegmentLengthThreshold) {
            v_isDegenerateSegment = 1.0;
        }
    }

    // Transform points to View Space
    vec4 currentView = modelViewMatrix * vec4(currentPointData.rgb, 1.0);
    vec4 prevView = modelViewMatrix * vec4(prevPointData.rgb, 1.0);
    vec4 nextView = modelViewMatrix * vec4(nextPointData.rgb, 1.0);

    vec2 dir;

    // Project to screen space ONLY for direction calculation.
    // Declare these variables BEFORE using them in the dir calculation block
    vec2 currentScreen = currentView.xy / currentView.w;
    vec2 prevScreen = prevView.xy / prevView.w;
    vec2 nextScreen = nextView.xy / nextView.w;

    // Use the correctly declared hasPrev and hasNext for direction calculation
    if (hasPrev && hasNext) {
        vec2 dir1 = safeNormalize(currentScreen - prevScreen);
        vec2 dir2 = safeNormalize(nextScreen - currentScreen);
        dir = safeNormalize(dir1 + dir2);
    } else if (hasPrev) {
        dir = safeNormalize(currentScreen - prevScreen);
    } else if (hasNext) {
        dir = safeNormalize(nextScreen - currentScreen);
    } else {
        // If no valid prev or next, this is an isolated point.
        // If it's a degenerate segment (v_isDegenerateSegment == 1.0), it will be discarded by frag shader.
        // Otherwise, give it an arbitrary but non-zero direction to avoid issues with normal calculation.
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