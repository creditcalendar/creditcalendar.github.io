import { BufferGeometry, Color, Float32BufferAttribute, OrthographicCamera, Points, Scene, ShaderMaterial, WebGLRenderer } from 'three';

// Units are relative to the App Preview's width. Its front face sits at z = 0.
function phoneParticles() {
  const positions: number[] = [];
  const halfWidth = .55;
  const halfHeight = 2048 / 944 / 2 + .05;
  const radius = .17;
  const thickness = .14;
  const depthSegments = 14;
  const sideSegments = 264;
  const endSegments = 104;
  const cornerSegments = 38;

  // Sample straight edges and quarter-circle corners at a consistent spacing.
  for (let layer = 0; layer <= depthSegments; layer++) {
    const depth = layer / depthSegments;
    const z = -thickness * depth;
    const bevel = .016 * Math.abs(depth * 2 - 1) ** 3;
    const width = halfWidth - bevel;
    const height = halfHeight - bevel;
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

export function createHeroScene(host: HTMLElement): () => void {
  const showcase = host.parentElement!;
  const screen = host.dataset.variant === 'phone' ? showcase.querySelector<HTMLElement>('.phone-wrap') : null;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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
  if (screen) {
    const darkMode = matchMedia('(prefers-color-scheme: dark)');
    const updatePalette = () => {
      tint.setHex(darkMode.matches ? 0xffffff : 0x000000);
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
      pixelRatio: { value: Math.min(devicePixelRatio, 1.5) },
    },
    vertexShader: `uniform float time; uniform float pixelRatio; varying float intensity;
      void main() {
      #ifdef PHONE
        float sweep = mod(time * .48 + 1.5, 3.5) - 1.75;
        float diagonal = position.y + position.x * .65 - position.z * 1.8;
        float band = (diagonal - sweep) * 7.0;
        intensity = exp(-band * band);
        float grain = fract(sin(dot(position, vec3(419.2, 317.9, 127.1))) * 4375.93);
        vec3 jitter = vec3(grain - .5, fract(grain * 97.7) - .5, fract(grain * 47.9) - .5) * .005;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + jitter, 1.0);
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
  points.rotation.order = 'YXZ';
  scene.add(points);
  let visible = false;
  let frame = 0;
  let disposed = false;
  let pointerX = 0, pointerY = 0;
  let trackingPointer = false;
  let elapsed = 0;
  let previousFrame: number | undefined;
  const render = (time: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const delta = previousFrame === undefined ? 0 : Math.min((time - previousFrame) * .001, .05);
    previousFrame = time;
    elapsed += delta;
    material.uniforms.time.value = screen ? elapsed : time * .001;
    if (screen) {
      const ease = 1 - Math.exp(-delta * 5);
      const yaw = trackingPointer ? -pointerX * .72 : Math.sin(elapsed * .48) * .44;
      const pitch = trackingPointer ? pointerY * .27 : Math.sin(elapsed * .31) * .09;
      points.rotation.y += (yaw - points.rotation.y) * ease;
      points.rotation.x += (pitch - points.rotation.x) * ease;
      // Match the orthographic projection. CSS uses a downward-positive Y axis.
      screen.style.setProperty('--phone-yaw', `${points.rotation.y}rad`);
      screen.style.setProperty('--phone-pitch', `${-points.rotation.x}rad`);
    } else {
      points.rotation.y += (pointerX * .08 - points.rotation.y) * .04;
      points.rotation.x += (pointerY * .05 - points.rotation.x) * .04;
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
  const resize = new ResizeObserver(([entry]) => {
    if (disposed) return;
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    const screenWidth = screen?.offsetWidth;
    const halfWidth = screenWidth ? width / (2 * screenWidth) : Math.max(5, width / height * 3.3);
    const halfHeight = screenWidth ? height / (2 * screenWidth) : 3.3;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    resume();
  });
  resize.observe(host);
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
    renderer.dispose();
    renderer.domElement.remove();
    screen?.style.removeProperty('--phone-yaw');
    screen?.style.removeProperty('--phone-pitch');
  }
  renderer.domElement.addEventListener('webglcontextlost', dispose, { signal });
  return dispose;
}
