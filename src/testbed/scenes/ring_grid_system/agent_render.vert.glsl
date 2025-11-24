uniform sampler2D u_textureAgentPosition;
uniform sampler2D u_textureAgentState;

uniform float u_gridRadii[3];
uniform float u_gridHeights[3];
uniform vec2 u_gridDimensions[3]; // columns, rows

attribute vec2 a_agent_uv;

varying float v_animTimer;
varying vec2 v_agent_uv; // Pass agent UV to fragment shader

const vec3 pattern[5] = vec3[5](
    vec3(0.0, 0.0, 0.0),
    vec3(1.0, 0.0, 0.0),
    vec3(-1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, -1.0, 0.0)
);

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

    vec3 centerWorldPos = gridToWorld(ringIndex, column, row);

    int particleId = gl_VertexID % 5;
    vec3 localOffset = pattern[particleId] * 2.0; 

    vec3 finalPos = centerWorldPos + localOffset;

    vec4 modelViewPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    float sizePulse = sin(v_animTimer * 3.14159265);
    gl_PointSize = sizePulse * 20.0;
}