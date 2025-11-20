
// agent_movement_flow_compute.glsl
// Updates agent velocity based on a flow field.

uniform sampler2D textureFlowField; // Our new vector field
uniform float worldSize;
uniform float speed;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 pos = texture2D(texturePosition, uv).xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;

    // --- Flow Field Following ---
    // 1. Convert the agent's world position (on the XZ plane) to a UV coordinate for the flow field texture.
    vec2 flowUv = pos.xz / worldSize + 0.5;

    // 2. Look up the desired direction from the flow field.
    vec3 desiredDirection = texture2D(textureFlowField, flowUv).xyz;

    // 3. Steer the current velocity towards the desired direction.
    // This is a classic steering behavior: steering_force = desired - velocity
    vec3 desiredVelocity = desiredDirection * speed;
    vec3 steeringForce = desiredVelocity - vel;

    // Limit the steering force to avoid jerky movements (optional but good practice)
    // steeringForce = clamp(steeringForce, -0.1, 0.1);

    vec3 newVel = vel + steeringForce * 0.1; // Apply a fraction of the force
    
    // Safeguard: Avoid normalizing a zero vector
    if (length(newVel) > 0.0) {
        newVel = normalize(newVel) * speed; // Maintain constant speed
    }

    // --- Boundary Conditions ---
    // If an agent goes off the XZ-plane, reset its position to the center.
    if (abs(pos.x) > worldSize / 2.0 || abs(pos.z) > worldSize / 2.0) {
        newVel = vec3(0.0, 0.0, 0.0); // This will be handled by the position shader
    }

    gl_FragColor = vec4(newVel, 1.0);
}

