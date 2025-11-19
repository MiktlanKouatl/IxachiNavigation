// Compute Shader: Grid State Update
// This shader is responsible for maintaining the shared world map (textureGridState).

// It performs two main functions:
// 1. Decay: It gradually "cools down" occupied cells from the previous frame.
// 2. Mark: It marks the cells currently occupied by active agents as "hot" (1.0).

uniform sampler2D texturePosition; // Input: The current positions of all agents
uniform float gridColumns;
uniform float gridRows;
uniform float gridLayers;

// This function converts a 3D grid coordinate (ivec3) into a 2D UV coordinate
// suitable for sampling our flattened 3D texture.
// Note: This logic needs to perfectly match how we write to the texture.
vec2 getUVFor3DCoord(ivec3 coord, vec2 textureSize) {
    // Flatten the 3D coord into a 1D index
    float flatIndex = float(coord.x) + float(coord.y) * gridColumns + float(coord.z) * gridColumns * gridRows;
    
    // Convert the 1D index into a 2D UV coordinate
    float u = mod(flatIndex, textureSize.x);
    float v = floor(flatIndex / textureSize.x);
    
    return (vec2(u, v) + 0.5) / textureSize;
}


void main() {
    // For this shader, we don't operate on a per-agent basis.
    // Instead, each thread is responsible for ONE CELL in the 3D grid.
    // We need to figure out which 3D grid cell this thread corresponds to.
    
    // 1. Calculate the 1D index of the cell this thread is responsible for.
    float flatIndex = gl_FragCoord.x - 0.5 + (gl_FragCoord.y - 0.5) * resolution.x;

    // 2. Un-flatten the 1D index back into a 3D grid coordinate.
    float z = floor(flatIndex / (gridColumns * gridRows));
    float xyIndex = mod(flatIndex, gridColumns * gridRows);
    float y = floor(xyIndex / gridColumns);
    float x = mod(xyIndex, gridColumns);

    // At this point, (x, y, z) is the coordinate of the grid cell we are updating.
    
    // For now, we will just mark the cell as occupied if an agent is there.
    // A simple approach is to iterate through all agents and see if any match our cell.
    // THIS IS INEFFICIENT but a good starting point. A better approach uses atomic operations or a different shader structure.
    
    // Let's start with a simple "reset" shader. It just clears the board.
    // In the next step, we'll add the marking logic.
    
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Mark all cells as empty
}
