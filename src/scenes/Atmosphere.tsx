import { useMemo } from 'react';
import { BackSide, ShaderMaterial, Color } from 'three';
import { GLOBE_RADIUS } from '../lib/geo';

/**
 * A back-side sphere a little larger than the globe with a Fresnel falloff,
 * giving a soft blue rim of atmosphere without any postprocessing. Cheap and
 * works on every device; the optional bloom pass in phase 7 builds on top.
 */
export default function Atmosphere({
  color = '#5fb2ff',
  scale = 1.18,
}: {
  color?: string;
  scale?: number;
}) {
  const material = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uColor: { value: new Color(color) },
        uIntensity: { value: 1.0 },
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
        uniform vec3 uColor;
        uniform float uIntensity;
        void main() {
          // strongest at the limb (normal perpendicular to view), fading inward
          float fres = 1.0 - abs(dot(vNormal, vViewDir));
          float glow = pow(fres, 3.0) * uIntensity;
          gl_FragColor = vec4(uColor, glow);
        }
      `,
    });
  }, [color]);

  return (
    <mesh material={material} scale={scale}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
    </mesh>
  );
}
