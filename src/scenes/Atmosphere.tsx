import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, AdditiveBlending, ShaderMaterial, Color } from 'three';
import { GLOBE_RADIUS } from '../lib/geo';

/**
 * Global multiplier on the atmosphere's brightness, set each frame by GlobeScene
 * to the Earth's current on-screen scale so the glow stays proportional as the
 * planet shrinks into the hub (Bloom would otherwise keep a fixed-size halo).
 */
export const atmoGlow = { mul: 1 };

/**
 * The atmosphere: a back-side sphere hugging the globe with a Fresnel falloff
 * that layers a crisp bright cyan rim right at the limb over a broad soft blue
 * haze — the look of sunlight scattering through the edge of the atmosphere (see
 * reference). The rim sits at the sphere's silhouette so a tight scale keeps it
 * glued to the globe; Bloom lifts it into a luminous halo.
 */
export default function Atmosphere({
  rimColor = '#a6ecff',
  hazeColor = '#2f8bff',
  scale = 0.8,
  rimIntensity = 1.35,
  rimPower = 5.0,
  hazeIntensity = 0.45,
  hazePower = 2.0,
}: {
  rimColor?: string;
  hazeColor?: string;
  scale?: number;
  rimIntensity?: number;
  rimPower?: number;
  hazeIntensity?: number;
  hazePower?: number;
}) {
  const material = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      // DoubleSide so the fresnel rim lands on both the inner edge of the earth
      // disc and just outside it. depthTest stays ON so objects in front of the
      // globe (e.g. an orbiting sphere) correctly occlude the glow.
      side: DoubleSide,
      depthWrite: false,
      depthTest: true,
      toneMapped: true,
      blending: AdditiveBlending,
      uniforms: {
        uRim: { value: new Color(rimColor) },
        uHaze: { value: new Color(hazeColor) },
        uRimI: { value: rimIntensity },
        uRimP: { value: rimPower },
        uHazeI: { value: hazeIntensity },
        uHazeP: { value: hazePower },
        uMul: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-viewPos.xyz);
          gl_Position = projectionMatrix * viewPos;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform vec3 uRim;
        uniform vec3 uHaze;
        uniform float uRimI;
        uniform float uRimP;
        uniform float uHazeI;
        uniform float uHazeP;
        uniform float uMul;
        void main() {
          // 1 at the limb (normal ⟂ view), 0 head-on. Smootherstep-shaped so the
          // rim gradient has no hard edge or banding.
          float fres = clamp(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0);
          fres = fres * fres * (3.0 - 2.0 * fres); // smoothstep easing
          float rim  = pow(fres, uRimP)  * uRimI;  // bright cyan edge
          float haze = pow(fres, uHazeP) * uHazeI; // broad, soft blue falloff
          vec3 color = (uRim * rim + uHaze * haze) * uMul;
          float alpha = clamp(rim + haze, 0.0, 1.0) * uMul;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
  }, [rimColor, hazeColor, rimIntensity, rimPower, hazeIntensity, hazePower]);

  useFrame(() => {
    material.uniforms.uMul.value = atmoGlow.mul;
  });

  return (
    <mesh material={material} scale={scale}>
      <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
    </mesh>
  );
}
