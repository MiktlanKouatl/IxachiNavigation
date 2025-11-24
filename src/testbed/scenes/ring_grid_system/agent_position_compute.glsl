uniform float u_time;

// Uniforms textureAgentState and textureAgentPosition are injected automatically by the GPGPU system.

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    vec4 currentPosition = texture2D(textureAgentPosition, uv);
    // Read the NEW state for this frame, which was just computed in the previous pass
    vec4 newState = texture2D(textureAgentState, uv);

    float state = newState.b;
    float randomSeed = newState.a;

    vec4 nextPosition = currentPosition;

    // If the state is 0.0 (searching), we compute a new position.
    if (state == 0.0) {
        float ringIndex = floor(rand(uv + vec2(randomSeed + 1.23, u_time)) * 3.0);
        float column = floor(rand(uv + vec2(randomSeed + 4.56, u_time + 7.89)) * 256.0);
        float row = floor(rand(uv + vec2(randomSeed + 9.01, u_time - 2.34)) * 16.0);
        nextPosition = vec4(ringIndex, column, row, 0.0);
    }

    gl_FragColor = nextPosition;
}