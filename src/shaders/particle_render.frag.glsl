// This shader determines the color of each particle.

uniform vec3 u_color;

void main() {
    // For now, all particles have the same color.
    // Later, we can pass age or velocity from the vertex shader 
    // to create more interesting color effects.
    gl_FragColor = vec4(u_color, 1.0);
}
