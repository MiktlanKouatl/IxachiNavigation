uniform float uTime;
uniform float uPointSize;

void main() {
    vec3 pos = position;
    
    // Moveremos los puntos en Y para la animación de revelación
    // pos.y += sin(pos.x * 0.1 + uTime) * 0.5; // Desactivado para depuración

    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    
    // Atenuación de tamaño corregida: los puntos lejanos son más pequeños,
    // pero la fórmula está ajustada para ser visible desde lejos.
    gl_PointSize = (uPointSize * 100.0) / -modelViewPosition.z;
}