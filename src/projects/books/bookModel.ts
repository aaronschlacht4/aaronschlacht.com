import * as THREE from 'three';

/**
 * The Modern Salon's own book dressing, ported verbatim from the app's
 * lib/bookModel.ts (only the cover-URL resolution, which is Supabase's, is
 * gone). A book's JPG is its jacket laid out flat, full bleed, left to
 * right — back cover, spine, front cover. Calibrated covers are drawn at
 * the book's honest proportions (921px per cover, 203px × the thickness
 * factor for the spine, against a 1200px height) and get the spine-remap
 * shader; everything else is stretched over the jacket the way the app's
 * shelf does it.
 */

/** glTF stores UVs top-left origin, so uploaded JPGs must not be flipped. */
export function prepareCoverTexture(tex: THREE.Texture, maxAnisotropy = 8): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Bounding box of the book's solid body, with stray geometry hidden.
 *
 * Exported models tend to carry debris the author left behind — zero-thickness
 * planes, loose page quads parked off to one side. Measuring the whole scene
 * lets that debris set the book's height, spine width and resting point, and it
 * renders on the shelf as floating shards. So seed the box from the largest
 * solid mesh and keep only parts centred inside it; anything else is hidden.
 *
 * Mutates `root`, so call it on a clone.
 */
export function measureBookBody(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);

  const parts: { mesh: THREE.Mesh; box: THREE.Box3; size: THREE.Vector3 }[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;
    parts.push({ mesh, box, size: box.getSize(new THREE.Vector3()) });
  });
  if (!parts.length) return new THREE.Box3();

  const volume = (s: THREE.Vector3) => s.x * s.y * s.z;
  const seed = parts.reduce((a, b) => (volume(b.size) > volume(a.size) ? b : a));

  const body = seed.box.clone();
  const pad = Math.max(seed.size.x, seed.size.y, seed.size.z) * 0.02;
  const bounds = body.clone().expandByScalar(pad);
  const centre = new THREE.Vector3();

  for (const part of parts) {
    if (part === seed) continue;
    const solid = Math.min(part.size.x, part.size.y, part.size.z) > 1e-6;
    if (solid && bounds.containsPoint(part.box.getCenter(centre))) {
      body.union(part.box);
    } else {
      part.mesh.visible = false;
    }
  }
  return body;
}

let warnedNoJacketMaterial = false;

/**
 * The mesh's own spine band: the U range its -X face (the spine) samples.
 *
 * The jacket is one continuous mesh — back, spine, front in a single UV strip
 * — so the boundaries between panels exist only implicitly, as which U values
 * land on which face. Measured directly off the geometry (the vertices lying
 * on the model's min-X plane are the spine's), rather than hardcoded, so a
 * re-exported model recalibrates itself.
 */
export type SpineBand = {
  u1: number;
  u2: number;
  /** Projection warp across the spine band — see the comment in the body. */
  warp: number[];
  /** The jacket's own x extent in root space: the cover boards' width. */
  depth: number;
  /** The jacket's own y extent in root space: the book's height. */
  height: number;
};

export function measureSpineBand(root: THREE.Object3D): SpineBand | null {
  // Relative to root, not full-scene world space: inverting root's own
  // matrixWorld out of the product cancels everything above root — wrapper
  // rotation, thickness scale, shelf position — leaving exactly the internal
  // node-to-node transform book.size was measured in.
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const jackets: THREE.Mesh[] = [];
  const v = new THREE.Vector3();

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!mats.some((m) => m && JACKET_MATERIAL_PATTERN.test(m.name ?? ''))) return;
    jackets.push(mesh);
    const rel = new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
    const pos = mesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(rel);
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
  });
  if (!jackets.length || !Number.isFinite(minX)) return null;
  const depth = maxX - minX;
  const height = maxY - minY;

  // The spine face is flat but the binding curves away from it on both
  // sides, and that curve is still front-on to the camera on a shelf — a
  // tight tolerance around the true flat plane left the curved rim outside
  // [u1, u2] entirely. 20% sits inside the plateau where u1/u2 stop moving.
  const tolerance = (maxX - minX) * 0.2;
  let u1 = Infinity;
  let u2 = -Infinity;
  for (const mesh of jackets) {
    const rel = new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
    const pos = mesh.geometry.getAttribute('position');
    const uv = mesh.geometry.getAttribute('uv');
    if (!uv) continue;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(rel);
      if (v.x > minX + tolerance) continue;
      u1 = Math.min(u1, uv.getX(i));
      u2 = Math.max(u2, uv.getX(i));
    }
  }
  if (!(u2 > u1)) return null;

  // ---- The projection warp: where each u in the band actually sits on
  // screen, measured off the mesh.
  //
  // The mesh's UVs spread the spine's slice of the strip along the jacket's
  // SURFACE — the flat middle, the curved rims either side of it. The eye,
  // looking at a shelved book, sees the PROJECTION of all that: the flat
  // middle nearly at full size, the rims foreshortened to slivers. A remap
  // linear in u leaves the flat middle with too few pixels, so art there
  // renders horizontally magnified (~1.2x dead centre). So: sample the crop
  // proportionally to projected position instead. The spine's width direction
  // is local Z (the thickness axis — root space, so per-book thickness scaling
  // divides out). For each u in the band, the mesh's own z there, normalised
  // across the band, IS the fraction of the on-screen spine width where that u
  // lands, and therefore the fraction of the file's spine crop it should sample.
  const byU = new Map<number, { z: number; n: number }>();
  for (const mesh of jackets) {
    const rel = new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
    const pos = mesh.geometry.getAttribute('position');
    const uv = mesh.geometry.getAttribute('uv');
    if (!uv) continue;
    for (let i = 0; i < pos.count; i++) {
      const ux = uv.getX(i);
      if (ux < u1 || ux > u2) continue;
      v.fromBufferAttribute(pos, i).applyMatrix4(rel);
      const key = Math.round(ux * 1e5) / 1e5;
      const e = byU.get(key);
      if (e) {
        e.z += v.z;
        e.n++;
      } else byU.set(key, { z: v.z, n: 1 });
    }
  }
  const profile = [...byU.entries()].map(([u, e]) => ({ u, z: e.z / e.n })).sort((a, b) => a.u - b.u);

  // Not enough distinct cross-section points to describe a curve — fall
  // back to the identity warp (plain linear remap, the old behaviour).
  if (profile.length < 3) {
    return {
      u1,
      u2,
      warp: Array.from({ length: WARP_SAMPLES }, (_, i) => i / (WARP_SAMPLES - 1)),
      depth,
      height,
    };
  }

  const z0 = profile[0].z;
  const z1 = profile[profile.length - 1].z;
  const zSpan = z1 - z0;
  const warp: number[] = [];
  for (let i = 0; i < WARP_SAMPLES; i++) {
    const u = u1 + (i / (WARP_SAMPLES - 1)) * (u2 - u1);
    // Linear interpolation within the measured profile.
    let j = 0;
    while (j < profile.length - 2 && profile[j + 1].u < u) j++;
    const a = profile[j];
    const b = profile[j + 1];
    const t = b.u > a.u ? (u - a.u) / (b.u - a.u) : 0;
    const z = a.z + (b.z - a.z) * Math.min(Math.max(t, 0), 1);
    const w = Math.abs(zSpan) > 1e-9 ? (z - z0) / zSpan : i / (WARP_SAMPLES - 1);
    // Monotonic by construction on a sane mesh; enforce it anyway so a
    // stray vertex can never make the remap double back on itself.
    warp.push(Math.min(Math.max(w, warp.length ? warp[warp.length - 1] : 0), 1));
  }

  return { u1, u2, warp, depth, height };
}

/** Resolution of the projection warp passed to the spine shader. */
const WARP_SAMPLES = 32;

/**
 * The spine crop's width as a fraction of the file's own real width — read
 * off the file itself, not assumed from a reference size: "203px of spine per
 * 1200px of height, times the book's thickness factor" is a size, measured
 * against whatever height *this* file actually is.
 */
const SPINE_PX_PER_REFERENCE_HEIGHT = 203;
const REFERENCE_HEIGHT = 1200;

/**
 * REVERTED to a no-op in the app (it was 1.17): widening the sampled crop
 * reads pixels past the spine's own drawn edge into the neighbouring cover,
 * which on a real file shows as a bleed line. Kept at 1.0 for the record.
 */
const SPINE_CURVE_MAGNIFICATION = 1.0;

function spineFractionOfWidth(imageWidth: number, imageHeight: number, thickness: number): number {
  const spinePx =
    SPINE_PX_PER_REFERENCE_HEIGHT * SPINE_CURVE_MAGNIFICATION * thickness * (imageHeight / REFERENCE_HEIGHT);
  return spinePx / imageWidth;
}

/**
 * Sample the cover at the file's own panel proportions instead of the mesh's.
 *
 * The mesh's UV strip divides back/spine/front at fixed fractions, sized for
 * a book at default thickness. A book's spine geometry, though, is scaled by
 * its page count — so a cover file drawn with its spine at the honest
 * proportions of *that* book would render smeared. This remaps U in the
 * fragment shader: the mesh's fixed bands are projected onto the file's own
 * three crops, so each face samples exactly the pixels drawn for it.
 */
function addSpineRemap(
  mat: THREE.MeshStandardMaterial,
  band: { u1: number; u2: number; warp: number[] },
  f1: number,
  f2: number,
  imageWidth: number,
) {
  // f1/f2/0/1 are seams *inside* one continuous image, so sampling right at
  // one still blends in whatever's drawn just past it. Insetting the clamp by
  // 8 texels keeps every sample's filter kernel inside its own crop — a clamp,
  // not a rescale, so no zoom.
  const texel = 1 / imageWidth;
  const inset = texel * 8.0;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.spineRemap = {
      value: new THREE.Vector4(band.u1, band.u2, f1, f2),
    };
    shader.uniforms.spineRemapInset = { value: inset };
    shader.uniforms.spineWarp = { value: band.warp };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_pars_fragment>',
        '#include <map_pars_fragment>\nuniform vec4 spineRemap;\nuniform float spineRemapInset;\nuniform float spineWarp[' +
          WARP_SAMPLES +
          '];',
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
#ifdef USE_MAP
  // textureGrad needs the screen-space derivative of the coordinate it's
  // actually sampling — jacketUv, not vMapUv. The remap only ever touches .x,
  // piecewise linearly, so d(jacketUv.x)/d(vMapUv.x) is that segment's slope.
  float u  = vMapUv.x;
  float u1 = spineRemap.x;
  float u2 = spineRemap.y;
  float f1 = spineRemap.z;
  float f2 = spineRemap.w;
  float slope;
  vec2 jacketUv = vMapUv;
  float inset = spineRemapInset;
  // At a grazing silhouette a couple of screen pixels sweep across a tenth of
  // the U strip; widen the spine branch's classification window by how much u
  // changes across this pixel so an edge-on pixel straddling the seam samples
  // spine, never the neighbouring cover's art. Capped.
  float rim = min(length(vec2(dFdx(u), dFdy(u))) * 2.0, 0.15);
  if (u <= u1 - rim) {
    slope = f1 / u1;
    jacketUv.x = clamp(u * slope, inset, f1 - inset);
  } else if (u <= u2 + rim) {
    // The crop is distributed per unit of PROJECTED width through spineWarp
    // (see measureSpineBand); it only redistributes within [f1, f2].
    float t = clamp((u - u1) / (u2 - u1), 0.0, 1.0) * ${WARP_SAMPLES - 1}.0;
    int wi = int(floor(min(t, ${WARP_SAMPLES - 2}.0)));
    float wf = t - float(wi);
    float w0 = spineWarp[wi];
    float w1 = spineWarp[wi + 1];
    slope = (f2 - f1) * (w1 - w0) * ${WARP_SAMPLES - 1}.0 / (u2 - u1);
    jacketUv.x = clamp(f1 + (f2 - f1) * mix(w0, w1, wf), f1 + inset, f2 - inset);
  } else {
    slope = (1.0 - f2) / (1.0 - u2);
    jacketUv.x = clamp(f2 + (u - u2) * slope, f2 + inset, 1.0 - inset);
  }
  vec2 gradX = dFdx(vMapUv) * vec2(slope, 1.0);
  vec2 gradY = dFdy(vMapUv) * vec2(slope, 1.0);
  // Those same exploding silhouette derivatives, fed to textureGrad, select a
  // mip so blurry its footprint blends far across the crop seams. Cap the
  // gradient length: only the degenerate edge-on pixels are affected.
  float gradCap = 0.01;
  float gxLen = length(gradX);
  if (gxLen > gradCap) gradX *= gradCap / gxLen;
  float gyLen = length(gradY);
  if (gyLen > gradCap) gradY *= gradCap / gyLen;
  vec4 sampledDiffuseColor = textureGrad( map, jacketUv, gradX, gradY );
  diffuseColor *= sampledDiffuseColor;
#endif
`,
      );
  };
  mat.needsUpdate = true;
}

/**
 * How a cover file's width maps onto the jacket's three faces.
 *
 * - "convention": the file was built to the wraparound spec — spine at dead
 *   centre at `203 × thickness` px per 1200px of height. Exact; only for
 *   calibrated books.
 * - "aspect": a jacket image of unknown internal layout. Each cover face
 *   samples an aspect-correct slice of the file and the spine takes whatever
 *   is left in the middle. Not used by the shelf.
 */
export type CoverFit = 'convention' | 'aspect';

function makeCoverMaterial(
  source: THREE.Material,
  tex: THREE.Texture,
  spineBand?: SpineBand | null,
  spineScale = 1,
  fit: CoverFit = 'convention',
): THREE.Material {
  const mat = source.clone() as THREE.MeshStandardMaterial;
  mat.map = tex;
  mat.color?.set(0xffffff);
  if (spineBand) {
    const img = tex.image as { width?: number; height?: number } | undefined;
    if (img?.width && img.height) {
      let f1: number;
      let f2: number;
      if (fit === 'convention') {
        const spineFraction = spineFractionOfWidth(img.width, img.height, spineScale);
        f1 = 0.5 - spineFraction / 2;
        f2 = 0.5 + spineFraction / 2;
      } else {
        // The slice width that renders this face undistorted: face aspect
        // (board width / book height, off the mesh) times the file's own
        // height-per-width. Capped so the two covers always leave the spine
        // a sliver.
        const ideal = (spineBand.depth / spineBand.height) * (img.height / img.width);
        const coverFrac = Math.min(ideal, 0.47);
        f1 = coverFrac;
        f2 = 1 - coverFrac;
      }
      addSpineRemap(mat, spineBand, f1, f2, img.width);
    }
  }

  // Every other map on this material was baked from the cover art the model
  // shipped with — book2.glb even points normalMap and roughnessMap at the same
  // screenshot it uses for base colour. A new cover replaces all of them.
  mat.normalMap = null;
  mat.bumpMap = null;
  mat.roughnessMap = null;
  mat.metalnessMap = null;
  mat.aoMap = null;
  mat.emissiveMap = null;
  mat.displacementMap = null;
  mat.alphaMap = null;
  mat.roughness = 0.62;
  mat.metalness = 0.0;

  // The jacket and the binding trim are all but coincident on the spine. The
  // jacket is biased toward the eye and the trim away from it, so which one
  // shows is decided rather than discovered per triangle.
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -8;
  mat.needsUpdate = true;
  return mat;
}

/** Materials a book's JPG is painted onto. */
export const JACKET_MATERIAL_PATTERN = /cover|jacket|wrap/i;
/** Material that reads as paper, so it takes only a wash of the jacket colour. */
const PAGE_MATERIAL_PATTERN = /page|paper|sheet/i;

/* ---- The colour of a book's insides ----
 * Looking down on a shelved book you see two surfaces: the top of the page
 * block, and a narrower strip of binding beside it. Both take the colour of
 * the jacket's top edge, so the page block runs into the cover without a seam. */

/** Flat colour for the inside strip, or null to follow each jacket. */
export const INSIDE_COLOR: string | null = null;
/** Flat colour for the page block, or null to follow each jacket. */
export const PAGE_COLOR: string | null = null;

// Paper is lifted well toward white so a page block reads as paper carrying a
// hint of the jacket; the binding strip takes the colour at full strength.
const PAGE_TINT_MIX = 0.62;
const INSIDE_TINT_MIX = 0;

/** Grain for the page block: the app's own pages.jpg. */
export const PAGE_TEXTURE_URL = '/salon/pages.jpg';

/**
 * The page block only samples a corner of its atlas — about 0.26 by 0.15 — so
 * the grain is repeated to fill that patch.
 */
const PAGE_UV_PATCH = { u: 0.262, v: 0.152 };

// Falls back to brightening the model's own texture if the file is missing.
const PAGE_BRIGHTEN = 2.7;
const PAGE_SATURATE = 0.35;

let pageGrain: THREE.Texture | null = null;

if (typeof window !== 'undefined') {
  new THREE.TextureLoader().load(
    PAGE_TEXTURE_URL,
    (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = false;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1 / PAGE_UV_PATCH.u, 1 / PAGE_UV_PATCH.v);
      // Page edges are almost always seen at a sharp angle.
      t.anisotropy = 16;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.needsUpdate = true;
      pageGrain = t;
    },
    undefined,
    () => {
      console.warn(`[bookModel] no page grain at ${PAGE_TEXTURE_URL}; brightening the model's own instead`);
    },
  );
}

const litPageCache = new WeakMap<THREE.Texture, THREE.Texture | null>();

/** A lightened copy of the page-block texture (the fallback when pages.jpg is missing). */
function lightenedPageTexture(tex: THREE.Texture | null): THREE.Texture | null {
  if (!tex) return null;
  if (litPageCache.has(tex)) return litPageCache.get(tex) ?? null;

  let lit: THREE.Texture | null = null;
  const img = tex.image as CanvasImageSource;
  const w = (img as { width?: number })?.width ?? 0;
  const h = (img as { height?: number })?.height ?? 0;

  if (w && h && typeof document !== 'undefined') {
    try {
      const scale = Math.min(1, 1024 / w);
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `brightness(${PAGE_BRIGHTEN}) saturate(${PAGE_SATURATE})`;
        ctx.drawImage(img, 0, 0, w, h, 0, 0, cw, ch);
        lit = new THREE.CanvasTexture(canvas);
        lit.flipY = tex.flipY;
        lit.wrapS = tex.wrapS;
        lit.wrapT = tex.wrapT;
        lit.colorSpace = THREE.SRGBColorSpace;
        lit.anisotropy = tex.anisotropy;
        lit.needsUpdate = true;
      }
    } catch {
      lit = null;
    }
  }

  litPageCache.set(tex, lit);
  return lit;
}

const accentCache = new WeakMap<THREE.Texture, THREE.Color | null>();

// The patch of jacket sampled for the insides: the middle of its top edge —
// the top of the spine, which is the colour the page block runs into.
const TOP_PATCH = { u0: 0.36, u1: 0.64, v0: 0, v1: 0.1 };

/**
 * Colour of the jacket along its top edge, used for the page block and binding.
 * Median rather than mean, per channel, so title lettering across the patch
 * doesn't drag the result.
 */
export function coverAccentColor(tex: THREE.Texture): THREE.Color | null {
  if (accentCache.has(tex)) return accentCache.get(tex) ?? null;

  let accent: THREE.Color | null = null;
  const img = tex.image as CanvasImageSource;
  const w = (img as { width?: number })?.width ?? 0;
  const h = (img as { height?: number })?.height ?? 0;

  if (w && h && typeof document !== 'undefined') {
    try {
      const N = 40;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = N;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(
          img,
          w * TOP_PATCH.u0,
          h * TOP_PATCH.v0,
          w * (TOP_PATCH.u1 - TOP_PATCH.u0),
          h * (TOP_PATCH.v1 - TOP_PATCH.v0),
          0,
          0,
          N,
          N,
        );
        const px = ctx.getImageData(0, 0, N, N).data;

        const r: number[] = [],
          g: number[] = [],
          b: number[] = [];
        for (let i = 0; i < px.length; i += 4) {
          r.push(px[i]);
          g.push(px[i + 1]);
          b.push(px[i + 2]);
        }
        const median = (xs: number[]) => {
          xs.sort((p, q) => p - q);
          const mid = xs.length >> 1;
          return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
        };
        if (r.length) {
          accent = new THREE.Color(median(r) / 255, median(g) / 255, median(b) / 255);
        }
      }
    } catch {
      // A cross-origin image without CORS headers taints the canvas; the book
      // just keeps the model's own page and binding colours.
      accent = null;
    }
  }

  accentCache.set(tex, accent);
  return accent;
}

function tintMaterial(source: THREE.Material, accent: THREE.Color): THREE.Material {
  const mat = source.clone() as THREE.MeshStandardMaterial;
  const isPaper = PAGE_MATERIAL_PATTERN.test(mat.name ?? '');
  const flat = isPaper ? PAGE_COLOR : INSIDE_COLOR;
  const mix = isPaper ? PAGE_TINT_MIX : INSIDE_TINT_MIX;
  const target = flat ? new THREE.Color(flat) : accent.clone().lerp(new THREE.Color(0xffffff), mix);

  if (isPaper) {
    // Paper keeps a grain — the edges of the leaves — with the tint on top.
    const grain = pageGrain ?? lightenedPageTexture(mat.map);
    if (grain) mat.map = grain;
    mat.color?.copy(target);

    // The rest of the maps still pointed at the model's own page photograph,
    // and the page block samples barely a corner of that atlas.
    mat.normalMap = null;
    mat.bumpMap = null;
    mat.roughnessMap = null;
    mat.metalnessMap = null;
    mat.aoMap = null;
    mat.emissiveMap = null;
    mat.roughness = 0.8;
    mat.metalness = 0;
  } else {
    // The binding is the strip you see from above, beside the page block. Its
    // baked map is a flat red swatch; drop it so the strip is exactly the
    // colour of the jacket's top edge.
    mat.map = null;
    mat.normalMap = null;
    mat.roughnessMap = null;
    mat.metalnessMap = null;
    mat.color?.copy(target);
    // The other half of the bargain struck in makeCoverMaterial.
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = 2;
    mat.polygonOffsetUnits = 8;
  }

  mat.needsUpdate = true;
  return mat;
}

/**
 * Lay a cover image onto the jacket's slice of the atlas. The jacket occupies
 * only part of the model's UV space (book2.glb parks it in V 0.175→1 and
 * keeps the strip above for the page block and binding), so the texture's
 * repeat/offset are set to span exactly that band. The whole image, never a
 * crop: the title runs the full height of the spine.
 */
function fitCoverToJacket(root: THREE.Object3D, tex: THREE.Texture) {
  const img = tex.image as { width?: number; height?: number } | undefined;
  if (!img?.width || !img.height) return;

  let v0 = Infinity;
  let v1 = -Infinity;

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!mats.some((m) => m && JACKET_MATERIAL_PATTERN.test(m.name ?? ''))) return;

    const uv = mesh.geometry.getAttribute('uv');
    if (uv) {
      for (let i = 0; i < uv.count; i++) {
        v0 = Math.min(v0, uv.getY(i));
        v1 = Math.max(v1, uv.getY(i));
      }
    }
  });

  const bandH = v1 - v0;
  if (!(bandH > 1e-6) || !Number.isFinite(v0)) return;

  tex.repeat.set(1, 1 / bandH);
  tex.offset.set(0, -v0 / bandH);
  tex.needsUpdate = true;
}

/**
 * Dress a book that has no artwork in plain cloth: a flat colour derived from
 * the book's id reads as "no cover yet" and keeps neighbours distinguishable.
 */
export function applyBlankCover(root: THREE.Object3D, seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  // Deep and desaturated, so it reads as bookcloth under the shelf's warm key
  // light rather than as a blank page.
  const cloth = new THREE.Color().setHSL(((hash >>> 0) % 360) / 360, 0.34, 0.19);

  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.material) meshes.push(mesh);
  });

  let painted = 0;
  const one = (m: THREE.Material) => {
    if (!JACKET_MATERIAL_PATTERN.test(m.name ?? '')) return tintMaterial(m, cloth);
    painted++;
    const mat = m.clone() as THREE.MeshStandardMaterial;
    mat.map = null;
    mat.normalMap = null;
    mat.bumpMap = null;
    mat.roughnessMap = null;
    mat.metalnessMap = null;
    mat.aoMap = null;
    mat.emissiveMap = null;
    mat.color?.copy(cloth);
    mat.roughness = 0.78;
    mat.metalness = 0;
    mat.needsUpdate = true;
    return mat;
  };

  for (const mesh of meshes) {
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => (m ? one(m) : m)) : one(mesh.material);
  }
  return painted;
}

/**
 * Dress one cloned book in its cover JPG.
 *
 * Only the jacket is painted; pages and binding take a wash of the jacket
 * colour. Materials are cloned before being touched: `scene.clone(true)`
 * shares material instances between clones, so painting in place would put
 * one book's cover on every book on the shelf.
 *
 * Returns how many materials were textured.
 */
export function applyCoverTexture(
  root: THREE.Object3D,
  tex: THREE.Texture,
  maxAnisotropy = 8,
  spineScale = 1,
  calibrated = false,
  /**
   * How to lay an UNCALIBRATED cover onto the jacket. "stretch" is the
   * shelf's behaviour — the whole image across the whole strip — which is
   * right for a spine-out shelf. Calibrated covers always use their exact
   * convention fit.
   */
  uncalibratedFit: 'stretch' | 'aspect' = 'stretch',
): number {
  prepareCoverTexture(tex, maxAnisotropy);
  fitCoverToJacket(root, tex);

  const wantsRemap = calibrated || uncalibratedFit === 'aspect';
  const spineBand = wantsRemap ? measureSpineBand(root) : null;
  const fit: CoverFit = calibrated ? 'convention' : 'aspect';

  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.material) meshes.push(mesh);
  });

  const accent = coverAccentColor(tex);

  const paint = (match: (m: THREE.Material) => boolean) => {
    let count = 0;
    const one = (m: THREE.Material) => {
      if (!match(m)) return accent ? tintMaterial(m, accent) : m;
      count++;
      return makeCoverMaterial(m, tex, spineBand, spineScale, fit);
    };
    for (const mesh of meshes) {
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => (m ? one(m) : m)) : one(mesh.material);
    }
    return count;
  };

  const painted = paint((m) => JACKET_MATERIAL_PATTERN.test(m.name ?? ''));
  if (painted > 0) return painted;

  if (!warnedNoJacketMaterial) {
    warnedNoJacketMaterial = true;
    const names = [
      ...new Set(
        meshes.flatMap((m) =>
          (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => (mat as THREE.Material).name || '(unnamed)'),
        ),
      ),
    ];
    console.warn(
      `[bookModel] No material in the book model matches ${JACKET_MATERIAL_PATTERN} — ` +
        `painting every material instead. Name the jacket material "cover". Found: ${names.join(', ')}`,
    );
  }
  return paint(() => true);
}
