import {
  AmbientLight, BoxGeometry, CircleGeometry, DirectionalLight, ExtrudeGeometry,
  Group, Mesh, MeshStandardMaterial, OrthographicCamera, Scene, Shape,
  TorusGeometry, WebGLRenderer,
} from 'three';

export function createHeroScene(host: HTMLElement): () => void {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);

  const scene = new Scene();
  const camera = new OrthographicCamera(-5, 5, 3, -3, 0.1, 100);
  camera.position.z = 12;
  scene.add(new AmbientLight(0xffffff, 2));
  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(-3, 5, 8);
  scene.add(light);

  const controller = new AbortController();
  const { signal } = controller;
  const objects: Group[] = [];
  const geometries = new Set<BoxGeometry | CircleGeometry | ExtrudeGeometry | TorusGeometry>();
  const materials = new Set<MeshStandardMaterial>();
  function material(color: number, metalness = 0.1) {
    const value = new MeshStandardMaterial({ color, metalness, roughness: 0.4 });
    materials.add(value);
    return value;
  }
  const ink = material(0x17251b);
  const green = material(0x7dd020);
  const cyan = material(0x32ade6);
  const cream = material(0xf0e8d2);
  function roundedCard() {
    const shape = new Shape();
    const w = 2.2, h = 1.38, r = 0.15;
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const geometry = new ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 8 });
    geometry.translate(0, 0, -0.03);
    geometries.add(geometry);
    return geometry;
  }
  const cardGeometry = roundedCard();
  const chipGeometry = new BoxGeometry(0.32, 0.24, 0.025);
  const stripeGeometry = new BoxGeometry(0.7, 0.035, 0.025);
  geometries.add(chipGeometry);
  geometries.add(stripeGeometry);
  [green, cyan].forEach((color, i) => {
    const card = new Group();
    card.add(new Mesh(cardGeometry, color));
    const chip = new Mesh(chipGeometry, cream);
    chip.position.set(-0.65, 0.15, 0.07);
    card.add(chip);
    for (let n = 0; n < 2; n++) {
      const stripe = new Mesh(stripeGeometry, ink);
      stripe.position.set(-0.4, -0.25 - n * 0.12, 0.07);
      card.add(stripe);
    }
    card.position.set(i === 0 ? -3.1 : 3.2, i === 0 ? 1.2 : -0.4, -1);
    card.rotation.set(0.15, i === 0 ? 0.35 : -0.3, i === 0 ? -0.28 : 0.3);
    scene.add(card);
    objects.push(card);
  });
  const ringGeometry = new TorusGeometry(0.35, 0.09, 8, 36);
  geometries.add(ringGeometry);
  const ring = new Group();
  ring.add(new Mesh(ringGeometry, green));
  ring.position.set(3.1, 1.7, -1);
  scene.add(ring);
  objects.push(ring);

  let visible = false;
  let frame = 0;
  let disposed = false;
  let pointerX = 0, pointerY = 0;
  const base = objects.map((object) => ({ y: object.position.y, xRotation: object.rotation.x, yRotation: object.rotation.y }));
  const render = (time: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    objects.forEach((object, i) => {
      object.position.y = base[i].y + Math.sin(time * 0.00065 + i * 2) * 0.07;
      object.rotation.y += (base[i].yRotation + pointerX * 0.16 - object.rotation.y) * 0.06;
      object.rotation.x += (base[i].xRotation + pointerY * 0.1 - object.rotation.x) * 0.06;
    });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  function resume() {
    if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
  }
  function pause() { cancelAnimationFrame(frame); frame = 0; }
  const resize = new ResizeObserver(([entry]) => {
    if (disposed) return;
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    const halfWidth = Math.max(5, width / height * 3.3);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = 3.3;
    camera.bottom = -3.3;
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
  const showcase = host.parentElement!;
  showcase.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const rect = showcase.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width * 2 - 1;
    pointerY = (event.clientY - rect.top) / rect.height * 2 - 1;
  }, { signal, passive: true });
  showcase.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; }, { signal });
  function dispose() {
    if (disposed) return;
    disposed = true;
    pause();
    controller.abort();
    resize.disconnect();
    observer.disconnect();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((value) => value.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  }
  renderer.domElement.addEventListener('webglcontextlost', dispose, { signal });
  return dispose;
}
