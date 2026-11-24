import { BufferGeometry, Color, Float32BufferAttribute, OrthographicCamera, PerspectiveCamera, Points, Quaternion, Scene, ShaderMaterial, Vector3, WebGLRenderer } from 'three';

const stageFloorY = -1.19;
const stageCenterZ = -1.4;
const phoneHalfHeight = 2048 / 944 / 2 + .05;
const phoneThickness = .14;
const phoneBevel = .016;
const phonePerspective = 3.1;

// Units are relative to the App Preview's width. Its front face sits at z = 0.
function phoneParticles() {
  const positions: number[] = [];
  const halfWidth = .55;
  const radius = .17;
  const depthSegments = 14;
  const sideSegments = 264;
  const endSegments = 104;
  const cornerSegments = 38;

  // Sample straight edges and quarter-circle corners at a consistent spacing.
  for (let layer = 0; layer <= depthSegments; layer++) {
    const depth = layer / depthSegments;
    const z = -phoneThickness * depth;
    const bevel = phoneBevel * Math.abs(depth * 2 - 1) ** 3;
    const width = halfWidth - bevel;
    const height = phoneHalfHeight - bevel;
    for (const side of [-1, 1]) {
      for (let i = 0; i <= sideSegments; i++) {
        const y = (2 * i / sideSegments - 1) * (height - radius);
        positions.push(side * width, y, z);
      }
      for (let i = 0; i <= endSegments; i++) {
        const x = (2 * i / endSegments - 1) * (width - radius);
        positions.push(x, side * height, z);
      }
      for (const end of [-1, 1]) {
        for (let i = 1; i < cornerSegments; i++) {
          const angle = i / cornerSegments * Math.PI / 2;
          positions.push(side * (width - radius + radius * Math.cos(angle)),
            end * (height - radius + radius * Math.sin(angle)), z);
        }
      }
    }
  }

  // Action, volume, side and camera controls, sampled off the side rails.
  for (const [side, center, length] of [
    [-1, .67, .08], [-1, .45, .16], [-1, .23, .16], [1, .40, .24], [1, -.51, .19],
  ]) {
    const buttonSegments = Math.ceil(length * 150);
    for (let row = 0; row <= 6; row++) {
      for (let i = 0; i <= buttonSegments; i++) {
        positions.push(side * (halfWidth + .014), center + (i / buttonSegments - .5) * length, -.035 - row * .01);
      }
    }
  }
  return positions;
}

function createAtmosphere(pixelRatio: number) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, .1, 25);
  camera.position.set(0, -.52, 3.8);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  scene.rotation.order = 'YXZ';
  const time = { value: 0 };
  const tint = { value: new Color() };
  const positions: number[] = [];
  const layers: number[] = [];
  const addPoint = (x: number, y: number, z: number, layer: number) => {
    positions.push(x, y, z);
    layers.push(layer);
  };
  for (let i = 0; i < 980; i++) {
    const star = i < 720;
    addPoint(
      (Math.random() - .5) * (star ? 24 : 11),
      star ? -.45 + Math.random() * 9 : (Math.random() - .5) * 6,
      star ? -9 - Math.random() * 10 : 1.9 - Math.random() * 10,
      0,
    );
  }
  // Center the level stage on the phone's contact point.
  const stageRows = 330;
  const stageColumns = 432;
  for (let row = 0; row < stageRows; row++) {
    for (let column = 0; column < stageColumns; column++) {
      const x = (column / (stageColumns - 1) - .5) * 16.5;
      const z = stageCenterZ + (.5 - row / (stageRows - 1)) * 8.2;
      addPoint(x, stageFloorY, z, 1);
    }
  }
  // Overlapping ellipsoids give the cloud banks body and soft edges.
  for (let bank = 0; bank < 24; bank++) {
    const upper = bank >= 17;
    const centerX = upper ? (bank - 20) * 2.2 : (bank - 8) * .98;
    const centerY = upper ? 5.1 + .48 * Math.sin(bank * 1.12) : .55 + .40 * Math.sin(bank * 1.12);
    const centerZ = -10.8 - (bank % 4) * 1.7;
    const samples = upper ? 1250 : 1450;
    const verticalSpread = upper ? .35 : .24;
    for (let i = 0; i < samples; i++) {
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      const z = Math.random() * 2 - 1;
      if (x * x + y * y + z * z > 1) continue;
      addPoint(centerX + x * 2.25, centerY + y * verticalSpread + x * .13, centerZ + z * 1.4, 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('layer', new Float32BufferAttribute(layers, 1));
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time, pixelRatio: { value: pixelRatio }, tint, stageCenterZ: { value: stageCenterZ } },
    vertexShader: `
      attribute float layer;
      uniform float time, pixelRatio, stageCenterZ;
      varying float opacity, softness, highlight;
      void main() {
        float seed = fract(sin(dot(position.xz, vec2(21.37, 58.63))) * 7215.13);
        vec3 p = position;
        float ground = 1.0 - step(.5, abs(layer - 1.0));
        float cloud = 1.0 - step(.5, abs(layer - 2.0));
        float dust = (1.0 - step(.5, layer)) * smoothstep(-10.0, -7.0, p.z);
        p.x += cloud * sin(time * .19 + p.z * .4) * .24;
        p.y += dust * sin(seed * 20.0 + time * .34) * .11;
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        float depth = -view.z;
        float nearBlur = (1.0 - smoothstep(1.15, 3.35, depth)) * dust;
        float distanceFade = exp(-depth * .085);
        float glow = exp(-length(vec2(p.x * .8, (p.z - stageCenterZ) * .43)));
        float pulse = .65 + .35 * sin(time * .48 + p.z * .9 + seed * 3.0);
        float sky = mix(.18 + seed * .47, (.34 + seed * .58) * pulse, dust);
        float terrain = (.32 + glow * .62) * (1.0 - smoothstep(3.8, 7.4, abs(p.x)));
        opacity = mix(sky * sqrt(distanceFade), terrain * distanceFade, ground);
        opacity = mix(opacity, (.13 + seed * .28) * sqrt(distanceFade), cloud);
        highlight = ground * glow * .48;
        softness = max(nearBlur, cloud * .18);
        gl_Position = projectionMatrix * view;
        float skySize = clamp((8.0 + seed * 17.0) / depth, 1.15, 3.8) + nearBlur * 9.0;
        float terrainSize = clamp(4.2 / depth, .68, 1.3);
        float pointSize = mix(skySize, terrainSize, ground);
        float cloudSize = clamp((12.5 + seed * 15.0) / depth, .72, 1.9);
        pointSize = mix(pointSize, cloudSize, cloud);
        gl_PointSize = pixelRatio * pointSize;
      }`,
    fragmentShader: `
      uniform vec3 tint;
      varying float opacity, softness, highlight;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.0;
        float edge = 1.0 - smoothstep(mix(.52, .06, softness), 1.0, radius);
        gl_FragColor = vec4(mix(tint, vec3(1.0), highlight * .55), edge * opacity * mix(1.0, .64, softness));
        #include <colorspace_fragment>
      }`,
  });
  scene.add(new Points(geometry, material));
  return { scene, camera, geometry, material };
}

export function createHeroScene(host: HTMLElement): () => void {
  const showcase = host.parentElement!;
  const screen = host.dataset.variant === 'phone' ? showcase.querySelector<HTMLElement>('.phone-wrap') : null;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  const pixelRatio = Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);

  const scene = new Scene();
  const camera = new OrthographicCamera(-5, 5, 3, -3, 0.1, 100);
  camera.position.z = 12;
  const controller = new AbortController();
  const { signal } = controller;
  // A sampled calendar surface: seven columns, five weeks, one slow scan.
  const positions: number[] = [];
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 7; column++) {
      for (let x = 0; x < 13; x++) {
        for (let y = 0; y < 10; y++) {
          positions.push(column * 1.2 + x * .065 - 4, row * 1.05 + y * .065 - 2.5, 0);
        }
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(screen ? phoneParticles() : positions, 3));
  const color = new Color(getComputedStyle(host).getPropertyValue('--cyan').trim());
  const tint = color.clone();
  const atmosphere = screen ? createAtmosphere(pixelRatio) : null;
  if (atmosphere) {
    const darkMode = matchMedia('(prefers-color-scheme: dark)');
    const updatePalette = () => {
      tint.setHex(darkMode.matches ? 0xffffff : 0x000000);
      atmosphere.material.uniforms.tint.value.setHex(darkMode.matches ? 0xb8d9ff : 0x537188);
    };
    updatePalette();
    darkMode.addEventListener('change', updatePalette, { signal });
  }
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    defines: screen ? { PHONE: 1 } : {},
    uniforms: {
      time: { value: 0 },
      tint: { value: tint },
      pixelRatio: { value: pixelRatio },
      phonePerspective: { value: phonePerspective },
      phoneCenter: { value: new Vector3() },
    },
    vertexShader: `uniform float time, pixelRatio, phonePerspective; uniform vec3 phoneCenter; varying float intensity;
      void main() {
      #ifdef PHONE
        float sweep = mod(time * .48 + 1.5, 3.5) - 1.75;
        float diagonal = position.y + position.x * .65 - position.z * 1.8;
        float band = (diagonal - sweep) * 7.0;
        intensity = exp(-band * band);
        float grain = fract(sin(dot(position, vec3(419.2, 317.9, 127.1))) * 4375.93);
        vec3 jitter = vec3(grain - .5, fract(grain * 97.7) - .5, fract(grain * 47.9) - .5) * .005;
        vec4 world = modelMatrix * vec4(position + jitter, 1.0);
        world.xy = phoneCenter.xy + (world.xy - phoneCenter.xy) / (1.0 - world.z / phonePerspective);
        gl_Position = projectionMatrix * viewMatrix * world;
        gl_PointSize = (.72 + grain * .48 + intensity * .5) * pixelRatio;
      #else
        float sweep = mod(time * 1.4, 14.0) - 7.0;
        intensity = exp(-pow((position.x - sweep) * 1.4, 2.0));
        vec3 p = position; p.z += intensity * 0.3;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.2 + intensity * 1.8) * pixelRatio;
      #endif
      }`,
    fragmentShader: `uniform vec3 tint; varying float intensity;
      void main() {
      #ifdef PHONE
        float edge = 1.0 - smoothstep(.18, .5, distance(gl_PointCoord, vec2(.5)));
        gl_FragColor = vec4(mix(tint, vec3(1.0), intensity), edge * (.44 + intensity * .54));
        #include <colorspace_fragment>
      #else
        if (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;
        gl_FragColor = vec4(tint, 0.25 + intensity * 0.75);
      #endif
      }`,
  });
  const points = new Points(geometry, material);
  material.uniforms.phoneCenter.value = points.position;
  points.rotation.order = 'YXZ';
  scene.add(points);
  let visible = false;
  let frame = 0;
  let disposed = false;
  let pointerX = 0, pointerY = 0;
  let trackingPointer = false;
  let elapsed = 0;
  let previousFrame: number | undefined;
  let screenWidth = 0;
  const stagePivot = new Vector3(0, stageFloorY, stageCenterZ);
  const stageContact = new Vector3();
  const phoneFoot = new Vector3();
  const stageViewRotation = new Quaternion();
  const render = (time: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const delta = previousFrame === undefined ? 0 : Math.min((time - previousFrame) * .001, .05);
    previousFrame = time;
    elapsed += delta;
    material.uniforms.time.value = screen ? elapsed : time * .001;
    if (screen && atmosphere) {
      const ease = 1 - Math.exp(-delta * (trackingPointer ? 5 : 1.7));
      const yaw = trackingPointer ? -pointerX * .72 : 0;
      const pitch = trackingPointer ? pointerY * .20 : 0;
      const stageRotation = atmosphere.scene.rotation;
      stageRotation.y += (yaw - stageRotation.y) * ease;
      stageRotation.x += (pitch * .55 - stageRotation.x) * ease;
      // Keep the ground under the phone fixed while the stage turns.
      stageContact.copy(stagePivot).applyEuler(stageRotation);
      atmosphere.scene.position.copy(stagePivot).sub(stageContact);
      // The phone follows the stage normal, expressed in the camera's view.
      stageViewRotation.copy(atmosphere.camera.quaternion).invert().multiply(atmosphere.scene.quaternion);
      points.rotation.setFromQuaternion(stageViewRotation);
      // Project the floor contact into the phone's orthographic coordinates.
      stageContact.copy(stagePivot).project(atmosphere.camera);
      phoneFoot.set(0, -phoneHalfHeight, -phoneThickness / 2).applyEuler(points.rotation);
      const footScale = 1 / (1 - phoneFoot.z / phonePerspective);
      points.position.set(
        stageContact.x * camera.right - phoneFoot.x * footScale,
        stageContact.y * camera.top - phoneFoot.y * footScale,
        0,
      );
      // Match the screen's CSS perspective with its downward-positive Y axis.
      screen.style.setProperty('--phone-x', `${points.position.x * screenWidth}px`);
      screen.style.setProperty('--phone-y', `${-points.position.y * screenWidth}px`);
      screen.style.setProperty('--phone-yaw', `${points.rotation.y}rad`);
      screen.style.setProperty('--phone-pitch', `${-points.rotation.x}rad`);
      screen.style.setProperty('--phone-roll', `${-points.rotation.z}rad`);
    } else {
      points.rotation.y += (pointerX * .08 - points.rotation.y) * .04;
      points.rotation.x += (pointerY * .05 - points.rotation.x) * .04;
    }
    renderer.clear();
    if (atmosphere) {
      atmosphere.material.uniforms.time.value = elapsed;
      renderer.render(atmosphere.scene, atmosphere.camera);
      renderer.clearDepth();
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  function resume() {
    if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
  }
  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousFrame = undefined;
  }
  const resize = new ResizeObserver(() => {
    if (disposed) return;
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    screenWidth = screen?.offsetWidth ?? 0;
    screen?.style.setProperty('--phone-perspective', `${screenWidth * phonePerspective}px`);
    const halfWidth = screenWidth ? width / (2 * screenWidth) : Math.max(5, width / height * 3.3);
    const halfHeight = screenWidth ? height / (2 * screenWidth) : 3.3;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    if (atmosphere) {
      atmosphere.camera.aspect = width / height;
      atmosphere.camera.updateProjectionMatrix();
    }
    renderer.setSize(width, height);
    resume();
  });
  resize.observe(host);
  if (screen) resize.observe(screen);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) resume(); else pause();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume(), { signal });
  const pointerArea = screen ? showcase.parentElement! : showcase;
  pointerArea.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    trackingPointer = true;
    const rect = pointerArea.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width * 2 - 1;
    pointerY = (event.clientY - rect.top) / rect.height * 2 - 1;
  }, { signal, passive: true });
  pointerArea.addEventListener('pointerleave', () => {
    trackingPointer = false;
    pointerX = 0;
    pointerY = 0;
  }, { signal });
  function dispose() {
    if (disposed) return;
    disposed = true;
    pause();
    controller.abort();
    resize.disconnect();
    observer.disconnect();
    geometry.dispose();
    material.dispose();
    atmosphere?.geometry.dispose();
    atmosphere?.material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    screen?.style.removeProperty('--phone-yaw');
    screen?.style.removeProperty('--phone-pitch');
    screen?.style.removeProperty('--phone-roll');
    screen?.style.removeProperty('--phone-x');
    screen?.style.removeProperty('--phone-y');
    screen?.style.removeProperty('--phone-perspective');
  }
  renderer.domElement.addEventListener('webglcontextlost', dispose, { signal });
  return dispose;
}
