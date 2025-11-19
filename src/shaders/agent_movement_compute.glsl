// agent_movement_compute.glsl

// This shader updates the velocity of an agent to make it move in a circle.

uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;

void main() {
    // gl_FragCoord gives us the texture coordinate (pixel) we are writing to.
    // We use this to look up our agent's data in the input textures.
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // Read the agent's current position and velocity from the input textures.
    vec3 pos = texture2D(texturePosition, uv).xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;

    // --- Circular Motion Logic ---
    // Steer the agent towards the center to create a circular path.
    // This is a simple form of centripetal force.
    vec3 toCenter = -normalize(pos);
    float speed = length(vel);

    // A simple steering force. We'll add this to the current velocity.
    // The strength of the steering can be adjusted.
    vec3 steeringForce = toCenter * 0.1;

    // Update velocity: add steering force and re-normalize to maintain constant speed.
    vec3 newVel = normalize(vel + steeringForce) * speed;

    // Output the new velocity. The GPUComputationRenderer will ping-pong this
    // to the input for the next frame.
    gl_FragColor = vec4(newVel, 1.0);
}
