uniform float u_time;
uniform float u_delta;

// Uniforms u_time, u_delta and textureAgentState are injected automatically by the GPGPU system.

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 currentState = texture2D(textureAgentState, uv);

    float behavior = currentState.x;
    float timer = currentState.y;
    float state = currentState.b;

    vec4 nextState = currentState;

    float randomSeed = currentState.a;
    const float baseAnimationDuration = 3.0;
    float animationDuration = baseAnimationDuration + rand(uv + vec2(randomSeed, u_time)) * 2.0; // Vary by up to 2 seconds

    if (state == 0.0) {
        // Was searching on the previous frame, so switch to animating now.
        nextState.b = 1.0;
        nextState.y = 0.0; // Reset timer
    } else if (state == 1.0) { // Was animating
        timer += u_delta / animationDuration;
        if (timer > 1.0) {
            // Animation finished, switch to searching for the next frame.
            nextState.b = 0.0;
            timer = 0.0; // Reset timer
        }
        nextState.y = timer;
    }

    gl_FragColor = nextState;
}