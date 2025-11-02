// procedural_ribbon.vert.glsl

varying vec2 vUv;
varying float vTrailUv;

attribute float side;

// --- Uniforms for Path Data ---
uniform sampler2D uPathPoints;
uniform sampler2D uPathNormals;
uniform sampler2D uPathBinormals;

// --- Uniforms for Procedural Generation ---
uniform float uSeed;
uniform float uRadius; // Base radius of the circle
uniform float uRadiusVariation; // How much the radius can vary (+/-)
uniform float uAngleFrequency; // How wiggly the path is
uniform float uRadiusFrequency; // How fast the radius changes

// --- Uniforms for Animation ---
uniform float uWidth; // Width of the ribbon itself
uniform float uRevealStart;
uniform float uRevealEnd;

const float PI = 3.14159265359;

// --- Simplex 2D noise ---
// (Implementation by Stefan Gustavson)
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy) );
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Function to get looping noise
float getLoopingNoise(float progress, float frequency, float seed) {
    float angle = progress * 2.0 * PI;
    float x = cos(angle) * frequency;
    float y = sin(angle) * frequency;
    return snoise(vec2(x, y) + seed);
}

void main() {
    vUv = uv;
    float progress = uv.x;

    // --- Visibility Calculation with Wrap-Around ---
    bool isVisible;
    float windowLength;
    float progressInWindow;

    if (uRevealStart < uRevealEnd) {
        // Normal case: e.g., start=0.2, end=0.5
        isVisible = progress >= uRevealStart && progress < uRevealEnd;
        windowLength = uRevealEnd - uRevealStart;
        progressInWindow = progress - uRevealStart;
    } else {
        // Wrap-around case: e.g., start=0.8, end=0.2
        isVisible = progress >= uRevealStart || progress < uRevealEnd;
        windowLength = (1.0 - uRevealStart) + uRevealEnd;
        if (progress >= uRevealStart) {
            progressInWindow = progress - uRevealStart;
        } else {
            progressInWindow = (1.0 - uRevealStart) + progress;
        }
    }

    if (!isVisible) {
        gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // Remap UV for fade effect based on the visible window
    vTrailUv = progressInWindow / max(0.001, windowLength);

    // --- 1. Read Base Path Data ---
    vec3 basePoint = texture2D(uPathPoints, vec2(progress, 0.0)).rgb;
    vec3 baseNormal = texture2D(uPathNormals, vec2(progress, 0.0)).rgb;
    vec3 baseBinormal = texture2D(uPathBinormals, vec2(progress, 0.0)).rgb;

    // --- 2. Procedural Calculation (with Looping Noise) ---
    float angleNoise = getLoopingNoise(progress, uAngleFrequency, uSeed);
    float angle = angleNoise * 2.0 * PI;

    float radiusNoise = getLoopingNoise(progress, uRadiusFrequency, uSeed * 1.5);
    float proceduralRadius = uRadius + radiusNoise * uRadiusVariation;

    vec3 offset = (baseNormal * cos(angle) + baseBinormal * sin(angle)) * proceduralRadius;
    vec3 centerPoint = basePoint + offset;

    // --- 3. Ribbon Geometry ---
    float nextProgress = progress + 0.01; // A small step forward
    vec3 nextBasePoint = texture2D(uPathPoints, vec2(nextProgress, 0.0)).rgb;
    vec3 nextBaseNormal = texture2D(uPathNormals, vec2(nextProgress, 0.0)).rgb;
    vec3 nextBaseBinormal = texture2D(uPathBinormals, vec2(nextProgress, 0.0)).rgb;

    float nextAngleNoise = getLoopingNoise(nextProgress, uAngleFrequency, uSeed);
    float nextAngle = nextAngleNoise * 2.0 * PI;
    float nextRadiusNoise = getLoopingNoise(nextProgress, uRadiusFrequency, uSeed * 1.5);
    float nextProceduralRadius = uRadius + nextRadiusNoise * uRadiusVariation;

    vec3 nextOffset = (nextBaseNormal * cos(nextAngle) + nextBaseBinormal * sin(nextAngle)) * nextProceduralRadius;
    vec3 nextCenterPoint = nextBasePoint + nextOffset;

    vec3 ribbonDirection = normalize(nextCenterPoint - centerPoint);
    vec3 ribbonNormal = normalize(cross(ribbonDirection, baseNormal));

    vec3 finalPosition = centerPoint + ribbonNormal * side * uWidth * 0.5;

    // --- 4. Final Projection ---
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
}
