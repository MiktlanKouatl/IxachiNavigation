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

    // --- FIX: On the very first frame, randomly initialize positions ---
    if (time < 0.1) { // Use a small threshold to detect the simulation start
        float r1 = random(uv * (time + 0.1)); // Seed with uv and a small time offset
        float r2 = random(uv * (time + 0.2));
        float r3 = random(uv * (time + 0.3)); // For y-coordinate

        vec3 initialPos;
        initialPos.x = (r1 - 0.5) * worldSize;
        initialPos.z = (r2 - 0.5) * worldSize;
        initialPos.y = (r3 - 0.5) * 20.0; // Random height between -10 and 10

        gl_FragColor = vec4(initialPos, 1.0); // Set initial position and make visible
        return; // Exit early as position is set
    }

    vec3 pos = texture2D(texturePosition, uv).xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;

    // Simple Euler integration
    vec3 newPos = pos + vel * delta;

    // Boundary condition: if agent is outside a circular radius on the XZ plane, reset to a new random position.
    float radius = length(newPos.xz);
    if (radius > worldSize / 2.0) {
        // Use the particle's uv and the time to seed the random function
        float r1 = random(uv * time);
        float r2 = random(uv * time + vec2(0.1, 0.1));
        float r3 = random(uv * time + vec2(0.2, 0.2));
        newPos.x = (r1 - 0.5) * worldSize;
        newPos.z = (r2 - 0.5) * worldSize; // Was newPos.y
        newPos.y = (r3 - 0.5) * 20.0;     // Reset height as well
    }

    // Output the new position.
    gl_FragColor = vec4(newPos, 1.0);
}