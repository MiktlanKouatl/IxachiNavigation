// grid_state_compute.glsl

uniform sampler2D textureGridState; // Previous grid state
uniform sampler2D textureAgentInfluence; // Influence from agents for this frame
uniform float time;

varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    vec4 previousState = texture2D(textureGridState, uv);
    vec4 influence = texture2D(textureAgentInfluence, uv);

    vec4 newState;

    // Check the alpha channel of the influence texture to decide the update rule
    if (influence.a > 0.5) { // Use > 0.5 for robustness with float precision
        // DIRECT WRITE: The agent wants to set the state directly.
        // We ignore the previous state.
        newState = influence;
    } else {
        // ADDITIVE DECAY: The agent adds "energy" which then fades out.
        float decayFactor = 0.95;
        float newEnergy = influence.r; // Energy is stored in the red channel

        newState.r = previousState.r * decayFactor + newEnergy;
        newState.g = 0.0; // Unused
        newState.b = 0.0; // Unused
        newState.a = 0.0; // Keep alpha at 0 to signify this is decay-able state
    }

    gl_FragColor = newState;
}
