import { useEffect, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import {
  type Mesh,
  type WebGLProgramParametersWithUniforms,
  SRGBColorSpace,
  MeshStandardMaterial,
} from 'three';
import { GLOBE_RADIUS } from '../lib/geo';
import { worldSunDirection } from '../lib/sun';

/**
 * The Earth surface: a PBR sphere (Blue Marble color + normal relief + ocean
 * roughness mask) patched with a shader injection that blends NASA night-lights
 * onto whatever hemisphere faces away from the (real-time) sun. The sun uniform
 * shares a reference with `worldSunDirection`, which GlobeScene updates each
 * frame from the actual UTC sub-solar point.
 */
export default function Earth() {
  const meshRef = useRef<Mesh>(null);
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  const [colorMap, normalMap, nightMap, specMap] = useTexture([
    '/textures/earth_color.webp',
    '/textures/earth_normal.webp',
    '/textures/earth_night.webp',
    '/textures/earth_specular.webp',
  ]);

  // Crisp textures at grazing angles.
  useEffect(() => {
    for (const t of [colorMap, normalMap, nightMap, specMap]) {
      t.anisotropy = maxAniso;
      t.needsUpdate = true;
    }
    colorMap.colorSpace = SRGBColorSpace;
    nightMap.colorSpace = SRGBColorSpace;
  }, [colorMap, normalMap, nightMap, specMap, maxAniso]);

  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      map: colorMap,
      normalMap,
      roughnessMap: specMap,
      roughness: 1,
      metalness: 0,
    });

    mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      // Share the live world-sun reference so updates need no re-compile.
      shader.uniforms.uSunDirection = { value: worldSunDirection };
      shader.uniforms.uNightMap = { value: nightMap };
      shader.uniforms.uNightIntensity = { value: 1.2 };

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vWorldNormal;',
        )
        .replace(
          '#include <beginnormal_vertex>',
          '#include <beginnormal_vertex>\n  vWorldNormal = mat3(modelMatrix) * objectNormal;',
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform vec3 uSunDirection;
           uniform sampler2D uNightMap;
           uniform float uNightIntensity;
           varying vec3 vWorldNormal;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           float sunDot = dot(normalize(vWorldNormal), normalize(uSunDirection));
           float nightMix = smoothstep(0.15, -0.25, sunDot);
           vec3 cityLights = texture2D(uNightMap, vMapUv).rgb;
           totalEmissiveRadiance += cityLights * nightMix * uNightIntensity;`,
        );
    };

    return mat;
  }, [colorMap, normalMap, nightMap, specMap]);

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
    </mesh>
  );
}
