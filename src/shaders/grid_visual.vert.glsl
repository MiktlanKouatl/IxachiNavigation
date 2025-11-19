// grid_visual.vert.glsl

// This vertex shader is for the final visualization of the grid.
// It positions the grid points and reads their energy from the state texture.

// The texture containing the final grid state for this frame.
uniform sampler2D gridStateTexture;

// The UV coordinate of this point on the grid is automatically provided by THREE.js

// A varying to pass the fetched energy to the fragment shader.
varying float vEnergy;

void main() {
    // Fetch the energy for this point from the grid state texture.
    // We only use the 'r' channel.
    vEnergy = texture2D(gridStateTexture, uv).r;

    // The 'position' attribute already holds the 3D world position.
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    // Set the point size based on its energy.
    // This makes brighter points appear larger.
    gl_PointSize = vEnergy * 5.0 + 1.0;
}