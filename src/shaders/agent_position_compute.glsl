// agent_position_compute.glsl
// Updates agent position based on velocity.

uniform float delta; // Time elapsed since last frame
uniform float time; // Total elapsed time for seeding random
uniform float worldSize;

// A simple pseudo-random number generator
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 pos = texture2D(texturePosition, uv).xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;

    // Simple Euler integration
    vec3 newPos = pos + vel * delta;

    // Boundary condition: if agent is outside a circular radius, reset to a new random position.
    float radius = length(newPos.xy);
    if (radius > worldSize / 2.0) {
        // Use the particle's uv and the time to seed the random function
        float r1 = random(uv * time);
        float r2 = random(uv * time + vec2(0.1, 0.1));
        newPos.x = (r1 - 0.5) * worldSize;
        newPos.y = (r2 - 0.5) * worldSize;
    }

    // Output the new position.
    gl_FragColor = vec4(newPos, 1.0);
}