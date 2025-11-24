varying vec3 vColor;
varying float vAlpha;

void main() {
    // Coordenadas del punto (0.0 a 1.0)
    vec2 uv = gl_PointCoord;
    
    // Calcular distancia al centro (0.5, 0.5)
    float dist = length(uv - 0.5);
    
    // Si está fuera del círculo, descartar (hacer transparente)
    if (dist > 0.5) discard;

    // Crear un borde suave (glow/antialias)
    // De 0.0 en el centro a 1.0 en el borde. Invertimos para alpha.
    float circleAlpha = 1.0 - smoothstep(0.4, 0.5, dist);
    
    // Combinar opacidad de lógica (fade in) con opacidad de forma
    float finalAlpha = vAlpha * circleAlpha;

    gl_FragColor = vec4(vColor, finalAlpha);
}