
// flow_field_dynamic_compute.glsl
// Creates a dynamic 2D vector field using Perlin Noise.

uniform float worldSize;
uniform float u_time;

//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20201014 (stegu)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
  {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
// First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + vec4( 0.0, 0.0, -1.0, -1.0 );
  x12.xy -= i1;
  x12.zw += C.xx;

// Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		+ i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;

// Gradients: 41 points uniformly over a unit circle.
// The ring size 1.0 is arbitrary, but avoids setting the ring size to zero.
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

// Normalization factor
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// GLES20 does not support matrix construction from vectors.
// So manually construct the matrix using dot products.
  vec3 g;
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    // Map the pixel coordinate to a position in our simulation world
    vec2 worldPos = (gl_FragCoord.xy / resolution.xy - 0.5) * worldSize;

    // Use time to animate the noise field
    float noiseTime = u_time * 0.1;

    // Define a scale for the noise to control the "zoom" level
    float noiseScale = 0.02;

    // Get a noise value for the current position and time
    // The result is in the range [-1, 1]
    float noise = snoise(worldPos * noiseScale + noiseTime);

    // Map the noise value to an angle in radians (0 to 2*PI)
    float angle = (noise + 1.0) * 3.14159265359;

    // Convert the angle to a 2D flow vector
    vec2 flowVector = vec2(cos(angle), sin(angle));
    
    // The shader is for a 3D simulation, so we output a 3D vector (XY plane)
    vec3 finalVector = vec3(flowVector, 0.0);

    // Output the final 3D vector. The '1.0' in the alpha channel is conventional.
    gl_FragColor = vec4(finalVector, 1.0);
}
