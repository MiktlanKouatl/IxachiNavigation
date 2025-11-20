
// agent_movement_flow_compute.glsl
// Updates agent velocity based on a flow field.

uniform sampler2D textureFlowField; // Our new vector field
uniform float worldSize;
uniform float speed;

// Repulsion uniforms
uniform vec3 u_playerPosition;
uniform float u_repulsionStrength;
uniform float u_repulsionRadius;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 pos = texture2D(texturePosition, uv).xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;

    // --- Flow Field Following ---
    vec2 flowUv = pos.xz / worldSize + 0.5;
    vec3 desiredDirection = texture2D(textureFlowField, flowUv).xyz;
    vec3 desiredVelocity = desiredDirection * speed;
    vec3 steeringForce = desiredVelocity - vel;
    vec3 newVel = vel + steeringForce * 0.1;

    // --- Repulsion from Player ---
    vec3 fromPlayer = pos - u_playerPosition;
    float playerDist = length(fromPlayer);

    // Only apply repulsion if within radius AND not at the exact player position (to avoid normalize(0))
    if (playerDist < u_repulsionRadius && playerDist > 0.0) { 
        // Calculate a force that pushes away from the player, stronger when closer.
        vec3 repulsionForce = normalize(fromPlayer) * (1.0 - playerDist / u_repulsionRadius);
        newVel += repulsionForce * u_repulsionStrength;
    }

    // --- Final Velocity Calculation ---
    // Safeguard: Avoid normalizing a zero vector and re-normalize to maintain constant speed.
    if (length(newVel) > 0.0) {
        newVel = normalize(newVel) * speed;
    }

    // --- Boundary Conditions ---
    // If an agent goes off the XZ-plane, reset its position to the center.
    if (abs(pos.x) > worldSize / 2.0 || abs(pos.z) > worldSize / 2.0) {
        newVel = vec3(0.0, 0.0, 0.0); // This will be handled by the position shader
    }

    gl_FragColor = vec4(newVel, 1.0);
}

