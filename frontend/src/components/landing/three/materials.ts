import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Glass Material                                                     */
/*  MeshPhysicalMaterial with transmission for glassmorphic effects    */
/* ------------------------------------------------------------------ */

export const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color("#88aaff"),       // Slight blue tint
  metalness: 0.0,
  roughness: 0.05,
  transmission: 0.95,                      // High transparency
  thickness: 0.5,                          // Refraction depth
  ior: 1.5,                               // Index of refraction (glass)
  envMapIntensity: 1.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  transparent: true,
  opacity: 0.6,
  side: THREE.DoubleSide,
});

/* ------------------------------------------------------------------ */
/*  Glow Material                                                      */
/*  MeshBasicMaterial for self-illuminating / emissive elements        */
/* ------------------------------------------------------------------ */

export const glowMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#D95333"),       // Clay base
  transparent: true,
  opacity: 0.85,
  toneMapped: false,                       // Bypass tone mapping for bloom
});

// Helper: create a glow material with a custom color
export function createGlowMaterial(
  color: string | THREE.Color,
  opacity: number = 0.85
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: color instanceof THREE.Color ? color : new THREE.Color(color),
    transparent: true,
    opacity,
    toneMapped: false,
  });
}

/* ------------------------------------------------------------------ */
/*  Gradient Shader Material                                           */
/*  Simple vertex-color gradient from clay (#D95333) to gold (#EAB308)*/
/* ------------------------------------------------------------------ */

const gradientVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const gradientFragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uAngle;

  varying vec2 vUv;

  void main() {
    // Rotate the UV gradient direction by uAngle (radians)
    float cosA = cos(uAngle);
    float sinA = sin(uAngle);
    vec2 rotatedUv = vec2(
      cosA * (vUv.x - 0.5) - sinA * (vUv.y - 0.5) + 0.5,
      sinA * (vUv.x - 0.5) + cosA * (vUv.y - 0.5) + 0.5
    );

    float t = clamp(rotatedUv.y, 0.0, 1.0);
    vec3 color = mix(uColorA, uColorB, t);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const gradientMaterial = new THREE.ShaderMaterial({
  vertexShader: gradientVertexShader,
  fragmentShader: gradientFragmentShader,
  uniforms: {
    uColorA: { value: new THREE.Color("#D95333") },  // Clay
    uColorB: { value: new THREE.Color("#EAB308") },  // Gold
    uAngle: { value: 0.0 },                          // Gradient angle in radians
  },
  side: THREE.DoubleSide,
});

// Helper: create a gradient material with custom colors and angle
export function createGradientMaterial(
  colorA: string,
  colorB: string,
  angle: number = 0.0
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: gradientVertexShader,
    fragmentShader: gradientFragmentShader,
    uniforms: {
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uAngle: { value: angle },
    },
    side: THREE.DoubleSide,
  });
}
