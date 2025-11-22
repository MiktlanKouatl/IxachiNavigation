// agent_position_circular_compute.glsl
// Updates agent position based on velocity and handles particle lifetime within a circular boundary.

uniform float delta;
uniform float time;
uniform float worldSize; // Will be used as the radius

// A simple pseudo-random number generator
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Function to generate a random point inside a circle
vec2 randomPointInCircle(float seed) {
    float r = sqrt(random(vec2(seed, seed * 0.5))) * worldSize * 0.5;
    float theta = random(vec2(seed * 0.5, seed)) * 2.0 * 3.1415926535;
    return vec2(r * cos(theta), r * sin(theta));
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posData = texture2D(texturePosition, uv);
    vec3 pos = posData.xyz;
    float life = posData.w;

    // --- On the very first frame, randomly initialize positions and life ---
    if (time < 0.1) {
        vec2 initialXZ = randomPointInCircle(random(uv * (time + 0.1)));
        float initialY = (random(uv * (time + 0.2)) - 0.5) * 20.0;
        float initialLife = random(uv * (time + 0.3)); // Random initial life for staggered appearance

        gl_FragColor = vec4(initialXZ.x, initialY, initialXZ.y, initialLife);
        return;
    }

    vec3 vel = texture2D(textureVelocity, uv).xyz;
    vec3 newPos = pos + vel * delta;
    
    // Decrease life over time
    float lifeDecay = 0.005; // Rate at which particles fade
    life -= lifeDecay;

    // Boundary condition: if agent is outside the circular radius or its life runs out, reset it.
    if (length(newPos.xz) > worldSize / 2.0 || life <= 0.0) {
        vec2 resetXZ = randomPointInCircle(random(uv * time));
        newPos.x = resetXZ.x;
        newPos.z = resetXZ.y;
        newPos.y = (random(uv * time * 0.5) - 0.5) * 20.0; // Reset height
        life = 1.0; // Reset life
    }

    gl_FragColor = vec4(newPos, life);
}