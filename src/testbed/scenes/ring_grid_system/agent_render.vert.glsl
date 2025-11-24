uniform sampler2D u_textureAgentPosition;
uniform sampler2D u_textureAgentState;

uniform float u_gridRadii[3];
uniform float u_gridHeights[3];
uniform vec2 u_gridDimensions[3]; // columns, rows

attribute vec2 a_agent_uv;

varying float v_animTimer;
varying vec2 v_agent_uv; // Pass agent UV to fragment shader
varying float v_randomSeed; // Pass per-agent random seed

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
    vec4 agentStateData = texture2D(u_textureAgentState, a_agent_uv);

    int ringIndex = int(agentPosData.x);
    float column = agentPosData.y;
    float row = agentPosData.z;

    v_animTimer = agentStateData.y;
    v_agent_uv = a_agent_uv; // Pass the uv through
    v_randomSeed = agentStateData.w; // Get random seed

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

    int numStarPoints = 5;
    int totalStarVertices = numStarPoints * 2;
    int particleId = gl_VertexID % totalStarVertices;

    // Generate the star procedurally
    vec3 localOffset = generateStar(particleId, numStarPoints, 1.0, 0.5); // Outer radius 1.0, inner radius 0.5

    // Rotate the local offset to align with the agent's orientation
    vec3 rotatedOffset = orientation * localOffset;

    vec3 finalPos = centerWorldPos + rotatedOffset;

    vec4 modelViewPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    // Create a per-agent random frequency for the pulse
    float freqMultiplier = 0.5 + random(v_randomSeed) * 1.0; // Random frequency between 0.5 and 1.5

    // Remap sin() from [-1, 1] to [0, 1]
    float sizePulse = sin(v_animTimer * 3.14159265 * freqMultiplier) * 0.5 + 0.5;
    // Now map [0, 1] to a min/max size, e.g. [1.0, 5.0]
    gl_PointSize = 1.0 + sizePulse * 4.0;
}