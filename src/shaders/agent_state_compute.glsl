// Compute Shader: Agent State Update
// This shader is responsible for updating an agent's internal state:
// vec4(behaviorID, stepCounter, decisionTimer, unused)
// Uniforms for textures are injected automatically by GPUComputationRenderer

uniform float time; // For PRNG seeding and decision timing

// Simple Pseudo-Random Number Generator (PRNG)
// Based on https://thebookofshaders.com/10/
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 currentAgentState = texture2D(textureAgentState, uv);
    float behaviorID = currentAgentState.x;
    float stepCounter = currentAgentState.y;
    float decisionTimer = currentAgentState.z;

    vec4 posData = texture2D(texturePosition, uv);
    float is_alive = posData.w;

    if (is_alive > 0.5) {
        // --- Behavior-Specific State Updates ---
        if (behaviorID == 1.0) { // 'Star' behavior
            stepCounter += 1.0;
            if (stepCounter > 4.0) {
                stepCounter = 0.0; // Loop the 5-step animation
            }
        }
        // NOTE: 'Walker' behavior (behaviorID 0.0) does not need state updates here for now.
        // The old decision logic is removed to keep agents stable for testing.

        gl_FragColor = vec4(behaviorID, stepCounter, decisionTimer, 0.0);

    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); // Dead agents have no state
    }
}
