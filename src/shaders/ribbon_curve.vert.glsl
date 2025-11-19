// Vertex shader for rendering a smooth curve (spline) from points

attribute float side;
attribute float a_segmentIndex;
attribute float a_segmentT;
attribute float a_ribbonProgress;

varying vec2 vUv;
varying float v_visibility;
varying float vTrailUv;

uniform vec2 uResolution;
uniform float uWidth;
uniform sampler2D uPathTexture;
uniform vec2 uPathTextureSize;
uniform float uPathLength;
uniform float u_headIndex;

// --- Helper Functions ---

// Calculates the 2D UV coordinate from a 1D particle index
vec2 getUVFromIndex(float index) {
    float y = floor(index / uPathTextureSize.x);
    float x = mod(index, uPathTextureSize.x);
    return (vec2(x, y) + 0.5) / uPathTextureSize;
}

// Fetches particle data from the texture at a given index
vec4 getPoint(float index) {
    // Robust modulo for the index
    float wrappedIndex = mod(mod(index, uPathLength) + uPathLength, uPathLength);
    vec2 uv = getUVFromIndex(floor(wrappedIndex));
    vec4 pointData = texture2D(uPathTexture, uv); // .xyzw = pos.x, pos.y, pos.z, age

    // If age is very high, it's an uninitialized or "dead" particle.
    if (pointData.w > 9000.0) {
        return vec4(0.0/0.0); // Return NaN
    }
    return pointData;
}

// --- Catmull-Rom Spline Functions ---

// Calculates position on a Catmull-Rom spline
vec3 catmullRom(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    return 0.5 * (
        (2.0 * p1) +
        (-p0 + p2) * t +
        (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
        (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
    );
}

// Calculates the tangent (derivative) of the spline
vec3 catmullRomDerivative(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
    float t2 = t * t;
    return 0.5 * (
        (-p0 + p2) +
        (4.0 * p0 - 10.0 * p1 + 8.0 * p2 - 2.0 * p3) * t +
        (-3.0 * p0 + 9.0 * p1 - 9.0 * p2 + 3.0 * p3) * t2
    );
}

vec2 safeNormalize(vec2 v) {
    return length(v) > 0.0 ? normalize(v) : vec2(0.0);
}

// --- Main ---

void main() {
    vUv = vec2(a_ribbonProgress, uv.y);
    vTrailUv = a_ribbonProgress;
    v_visibility = 1.0;

    // --- Index Calculation ---
    // Calculate the indices of the 4 control points (p0, p1, p2, p3)
    // for the Catmull-Rom spline segment.
    float baseIndex = u_headIndex - a_segmentIndex;
    vec4 p0_data = getPoint(baseIndex + 1.0);
    vec4 p1_data = getPoint(baseIndex);
    vec4 p2_data = getPoint(baseIndex - 1.0);
    vec4 p3_data = getPoint(baseIndex - 2.0);

    // If any of the core points for the segment are dead, discard the vertex.
    if (isnan(p1_data.x) || isnan(p2_data.x)) {
        gl_Position = vec4(0.0/0.0);
        return;
    }

    // Handle edge cases where outer control points are dead.
    // If so, we just duplicate the inner points.
    vec3 p0 = isnan(p0_data.x) ? p1_data.xyz : p0_data.xyz;
    vec3 p1 = p1_data.xyz;
    vec3 p2 = p2_data.xyz;
    vec3 p3 = isnan(p3_data.x) ? p2_data.xyz : p3_data.xyz;

    // --- Position and Tangent Calculation ---
    vec3 interpolatedPosition = catmullRom(p0, p1, p2, p3, a_segmentT);
    vec3 tangent = catmullRomDerivative(p0, p1, p2, p3, a_segmentT);
    
    // --- Geometry Calculation (View Space) ---
    vec4 currentView = modelViewMatrix * vec4(interpolatedPosition, 1.0);
    vec3 tangentView = (modelViewMatrix * vec4(tangent, 0.0)).xyz;

    // Project tangent to screen space to get the ribbon's direction
    vec2 dir = safeNormalize(tangentView.xy);
    if (length(dir) == 0.0) {
        dir = vec2(1.0, 0.0); // Fallback direction
    }

    // The normal is perpendicular to the screen-space direction
    vec2 normal = vec2(-dir.y, dir.x);
    
    // Apply width in screen space
    float aspect = uResolution.x / uResolution.y;
    normal.x /= aspect;
    normal *= uWidth;

    // Project offset back to a 3D offset in view space
    vec4 offset = vec4(normal * currentView.w, 0.0, 0.0);
    
    gl_Position = projectionMatrix * (currentView + offset * side);
}