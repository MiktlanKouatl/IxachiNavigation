// Saved from src/testbed/scenes/ring_grid_system/agent_state_compute.glsl
uniform float u_time;
uniform float u_delta;

// Uniforms u_time, u_delta and textureAgentState are injected automatically by the GPGPU system.

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 currentState = texture2D(textureAgentState, uv);

    vec4 nextState = currentState;

    // Use u_delta to increment the animation timer, making it frame-rate independent.
    nextState.y = currentState.y + u_delta;

    // Example of a behavior based on the timer
    // if (nextState.y > 2.0) { // Every 2 seconds
    //     nextState.y = 0.0; // Reset timer
    //     // Change state or do something else
    // }

    gl_FragColor = nextState;
}


// Saved from src/testbed/scenes/ring_grid_system/agent_position_compute.glsl
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


// Saved from src/testbed/scenes/ring_grid_system/agent_render.vert.glsl
uniform sampler2D u_textureAgentPosition;
uniform sampler2D u_textureAgentState;

uniform float u_gridRadii[3];
uniform float u_gridHeights[3];
uniform vec2 u_gridDimensions[3]; // columns, rows

attribute vec2 a_agent_uv;

varying float v_animTimer;
varying vec2 v_agent_uv; // Pass agent UV to fragment shader
varying float v_randomSeed; // Pass per-agent random seed
varying float v_behaviorType; // Pass behavior type for debugging

// Simple pseudo-random number generator
float random(float seed) {
    return fract(sin(seed) * 43758.5453);
}

// Procedurally generates a star pattern
vec3 generateStar(int vertexId, int numPoints, float radiusOuter, float radiusInner) {
    float totalVertices = float(numPoints) * 2.0;
    float angleStep = 2.0 * 3.14159265 / totalVertices;
    float currentAngle = float(vertexId) * angleStep - (3.14159265 / 2.0); // Offset to make it point up

    // Even vertices are outer points, odd are inner points
    float radius = mod(float(vertexId), 2.0) == 0.0 ? radiusOuter : radiusInner;
    
    float x = cos(currentAngle) * radius;
    float y = sin(currentAngle) * radius;

    return vec3(x, y, 0.0);
}

// Generates a starburst pattern
vec3 generateStarburst(int vertexId, float animTime, int numRays, int particlesPerRay, float maxRayLength, float spacing) {
    int rayId = vertexId / particlesPerRay;
    int particleIdWithinRay = vertexId % particlesPerRay;

    float angle = float(rayId) * (2.0 * 3.14159265 / float(numRays));
    vec2 rayDir = vec2(cos(angle), sin(angle));

    // Calculate distance along the ray based on animTime and particleIdWithinRay
    // The farther a particle is along the ray, the further it lags behind.
    float currentDist = maxRayLength * animTime;
    currentDist -= float(particleIdWithinRay) * spacing;

    // Ensure particles don't go inwards too much
    currentDist = max(0.0, currentDist);

    return vec3(rayDir * currentDist, 0.0);
}

vec3 gridToWorld(int ringIndex, float column, float row) {
    float radius = u_gridRadii[ringIndex];
    float height = u_gridHeights[ringIndex];
    float numColumns = u_gridDimensions[ringIndex].x;
    float numRows = u_gridDimensions[ringIndex].y;

    float angle = (column / numColumns) * 2.0 * 3.14159265;
    float x = cos(angle) * radius;
    float z = sin(angle) * radius;
    float y = (row / (max(1.0, numRows - 1.0))) * height - height / 2.0;

    return vec3(x, y, z);
}

void main() {
    vec4 agentPosData = texture2D(u_textureAgentPosition, a_agent_uv);
    vec4 agentStateData = texture2D(u_textureAgentState, v_agent_uv);

    int ringIndex = int(agentPosData.x);
    float column = agentPosData.y;
    float row = agentPosData.z;

    v_animTimer = agentStateData.y; // This is the slow, continuous timer
    v_agent_uv = a_agent_uv; // Pass the uv through
    v_randomSeed = agentStateData.w; // Get random seed (unreliable, but pass it anyway)

    // FINAL WORKAROUND: Generate a reliable unique seed from a_agent_uv
    float unique_seed = a_agent_uv.x + a_agent_uv.y * 10.0;

    // Procedurally determine behavior type from the reliable seed
    float behaviorType;
    if (random(unique_seed) < 0.5) {
        behaviorType = 1.0;
    } else {
        behaviorType = 2.0;
    }
    v_behaviorType = behaviorType; // Pass to fragment shader for debugging

    vec3 centerWorldPos = gridToWorld(ringIndex, column, row);

    // --- Create Orientation Matrix ---
    float numColumns = u_gridDimensions[ringIndex].x;
    float angle = (column / numColumns) * 2.0 * 3.14159265;

    // Tangent vector (direction of travel, pattern's X-axis)
    vec3 tangent = normalize(vec3(-sin(angle), 0.0, cos(angle)));

    // World Up vector (pattern's Y-axis)
    vec3 up = vec3(0.0, 1.0, 0.0);

    // Side vector (radially outwards, pattern's Z-axis)
    vec3 side = normalize(cross(up, tangent));

    mat3 orientation = mat3(tangent, up, side);
    // --- End Orientation Matrix ---

    // Use the reliable unique_seed for the frequency multiplier
    float freqMultiplier = 0.5 + random(unique_seed + 1.0) * 1.0; // Use a slightly different seed for variety
    
    // Simplified animation timing
    float animTime = fract(v_animTimer * freqMultiplier);
    float sizePulse = sin(v_animTimer * 3.14159265 * freqMultiplier) * 0.5 + 0.5;

    vec3 localOffset;
    if (abs(behaviorType - 1.0) < 0.1) { // Star pattern
        int numStarPoints = 5;
        int totalStarVertices = numStarPoints * 2;
        int particleId = gl_VertexID % totalStarVertices;
        localOffset = generateStar(particleId, numStarPoints, 1.0, 0.5); // Outer radius 1.0, inner radius 0.5
    } else if (abs(behaviorType - 2.0) < 0.1) { // Starburst pattern
        int numRays = 8;
        int particlesPerRay = 2;
        int totalStarburstVertices = numRays * particlesPerRay;
        int particleId = gl_VertexID % totalStarburstVertices;
        localOffset = generateStarburst(particleId, animTime, numRays, particlesPerRay, 6.0, 1.5); // Max length 6.0, spacing 1.5
    } else { // Default to Star pattern
        int numStarPoints = 5;
        int totalStarVertices = numStarPoints * 2;
        int particleId = gl_VertexID % totalStarVertices;
        localOffset = generateStar(particleId, numStarPoints, 1.0, 0.5);
    }

    // Rotate the local offset to align with the agent's orientation
    vec3 rotatedOffset = orientation * localOffset;

    vec3 finalPos = centerWorldPos + rotatedOffset;

    vec4 modelViewPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    // Set point size directly
    gl_PointSize = 1.0 + sizePulse * 4.0;
}
