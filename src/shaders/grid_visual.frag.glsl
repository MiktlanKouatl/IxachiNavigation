// grid_visual.frag.glsl

uniform sampler2D textureGridState;
varying vec2 vUv;

void main() {
    // Look up the state of this grid cell
    float gridValue = texture2D(textureGridState, vUv).r;

    if (gridValue < 0.01) {
        discard; // Don't render pixels that are turned off
    }

    // Make it glow from orange to bright yellow
    vec3 color = mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.8), gridValue);
    
    // The alpha is also based on the grid value, but maybe not linearly
    float alpha = smoothstep(0.0, 0.5, gridValue);

    gl_FragColor = vec4(color * gridValue, alpha);
}
