uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;

varying vec2 vUv;

void main() {
    float pulse = (sin(uTime * 5.0) * 0.5 + 0.5) * 0.5 + 0.5; // range [0.5, 1]
    float alpha = pulse * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
}