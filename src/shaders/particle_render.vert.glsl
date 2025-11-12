// This shader reads particle positions from a texture (calculated by the compute shader)
// and places a vertex at that position.

uniform sampler2D u_positions_texture; // The result of our GPGPU compute pass
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec2 uv; // We use UVs to look up the correct texel in the texture

void main() {
    // Fetch the position from the texture
    vec3 pos = texture2D(u_positions_texture, uv).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.0; // We can make this dynamic later
}
