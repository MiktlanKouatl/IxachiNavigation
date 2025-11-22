// flow_field_perlin_compute.glsl
// Creates a dynamic, circular vector field perturbed by Perlin noise.

uniform float worldSize;
uniform float u_time;
uniform float u_noiseScale;
uniform float u_perturbStrength;
uniform float verticalSpeed; // Keep vertical speed for 3D feel

const float PI = 3.141592653589793;

// --- Classic Perlin 3D Noise by Stefan Gustavson (for cnoise function) ---
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
float cnoise(vec3 P) {
    vec3 Pi0 = floor(P); vec3 Pi1 = Pi0 + vec3(1.0); Pi0 = mod(Pi0, 289.0); Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x); vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixyz0 = permute(ixy + iz0); vec4 ixyz1 = permute(ixy + iz1);
    vec4 gx = fract(ixyz0 * (1.0 / 7.0)) - 0.5; vec4 gy = fract(floor(ixyz0 * (1.0 / 7.0)) * (1.0 / 7.0)) - 0.5;
    vec4 gz = fract(floor(floor(ixyz0 * (1.0 / 7.0)) * (1.0 / 7.0)) * (1.0 / 7.0)) - 0.5;
    vec4 gw0 = taylorInvSqrt(vec4(dot(gx, gx) + dot(gy, gy) + dot(gz, gz)));
    gx *= gw0; gy *= gw0; gz *= gw0;
    vec4 gxx = fract(ixyz1 * (1.0 / 7.0)) - 0.5; vec4 gyy = fract(floor(ixyz1 * (1.0 / 7.0)) * (1.0 / 7.0)) - 0.5;
    vec4 gzz = fract(floor(floor(ixyz1 * (1.0 / 7.0)) * (1.0 / 7.0)) * (1.0 / 7.0)) - 0.5;
    vec4 gw1 = taylorInvSqrt(vec4(dot(gxx, gxx) + dot(gyy, gyy) + dot(gzz, gzz)));
    gxx *= gw1; gyy *= gw1; gzz *= gw1;
    vec3 n000 = vec3(gx.x, gy.x, gz.x); vec3 n100 = vec3(gx.y, gy.y, gz.y);
    vec3 n010 = vec3(gx.z, gy.z, gz.z); vec3 n110 = vec3(gx.w, gy.w, gz.w);
    vec3 n001 = vec3(gxx.x, gyy.x, gzz.x); vec3 n101 = vec3(gxx.y, gyy.y, gzz.y);
    vec3 n011 = vec3(gxx.z, gyy.z, gzz.z); vec3 n111 = vec3(gxx.w, gyy.w, gzz.w);
    vec3 fade_xyz = fade(Pf0);
    vec4 nx = mix(vec4(dot(n000, Pf0), dot(n100, Pf1.xzy), dot(n010, Pf0.xzy), dot(n110, Pf1.xzy)),
                  vec4(dot(n001, Pf0 - vec3(0.0,0.0,1.0)), dot(n101, Pf1.xzy - vec3(0.0,0.0,1.0)), dot(n011, Pf0.xzy - vec3(0.0,0.0,1.0)), dot(n111, Pf1.xzy - vec3(0.0,0.0,1.0))),
                  fade_xyz.z);
    return 2.2 * mix(mix(nx.x, nx.y, fade_xyz.x), mix(nx.z, nx.w, fade_xyz.x), fade_xyz.y);
}
// --- End of Noise functions ---

void main() {
    // Map the pixel coordinate to a position in our simulation world (X, Z plane).
    // Note: in this shader, worldPos.y is actually the Z coordinate from a 3D world.
    vec2 worldPos = (gl_FragCoord.xy / resolution.xy - 0.5) * worldSize;

    // --- 1. Calculate Base Circular Flow ---
    // The tangent to the circle on the XZ plane at (x,z) is (-z, 0, x).
    // Here, worldPos.x is x and worldPos.y is z.
    vec3 baseFlow = vec3(-worldPos.y, 0.0, worldPos.x);

    // --- FIX: Handle the center of the world to avoid normalizing a zero vector ---
    vec2 baseFlow2D = baseFlow.xz;
    if (length(baseFlow2D) == 0.0) {
        baseFlow2D = vec2(1.0, 0.0); // Assign a default direction at the center
    } else {
        baseFlow2D = normalize(baseFlow2D);
    }
    
    // --- 2. Perturb the Flow with Noise ---
    // Define the input for the noise function. We scale the position and include time
    // to make the noise field evolve.
    vec3 noiseInput = vec3(worldPos.x, worldPos.y, u_time) * u_noiseScale;
    float noiseValue = cnoise(noiseInput); // This returns a value in approx. [-1, 1]

    // Create a rotation matrix to perturb the angle of the base flow vector.
    // The amount of rotation is controlled by the noise and a strength uniform.
    float angleOffset = noiseValue * u_perturbStrength;
    mat2 rotation = mat2(cos(angleOffset), -sin(angleOffset), 
                         sin(angleOffset),  cos(angleOffset));
    
    // Apply the rotation to the (now safe) normalized 2D base flow vector.
    vec2 perturbedFlow2D = rotation * baseFlow2D;

    // --- 3. Add Vertical Flow Component ---
    // We can still use a sine wave to create zones of upward and downward flow.
    // This makes the 3D space more interesting.
    float verticalFlow = sin(worldPos.y * 0.05 + u_time * 0.1) * verticalSpeed;

    // --- 4. Combine and Finalize ---
    // Create the final 3D vector.
    vec3 finalVector = vec3(perturbedFlow2D.x, verticalFlow, perturbedFlow2D.y);

    // Normalize the final vector to represent a direction. Speed is applied later.
    if (length(finalVector) > 0.0) {
        finalVector = normalize(finalVector);
    }
    
    // Output the final 3D vector.
    gl_FragColor = vec4(finalVector, 1.0);
}
