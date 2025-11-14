uniform vec3 uColor;
uniform float uOpacity;

void main() {
    // Crea un punto circular suave
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.45, 0.5, dist);

    if (alpha < 0.01) discard;

    gl_FragColor = vec4(uColor, uOpacity * alpha);
}