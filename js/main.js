import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ========= UI =========
const $status = document.getElementById("status");
const setStatus = (html) => ($status.innerHTML = html);

// ========= RUTAS =========
const MODEL_PATH = "public/millennium_falcon/";
const MODEL_FILE = "scene.gltf";

// ========= THREE BASICS =========
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000008); // negro azulado tipo espacio

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(4, 3, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 40;
controls.target.set(0, 0.8, 0);
controls.update();

// ========= STARFIELD (fondo estrellas) =========
function makeStarfield(count = 3000, radius = 800) {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Distribución random en una esfera
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const r = radius * (0.25 + 0.75 * Math.random());
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.15,
    sizeAttenuation: true,
    color: 0xffffff,
    transparent: true,
    opacity: 0.9
  });

  const stars = new THREE.Points(geom, mat);
  return stars;
}

const stars = makeStarfield();
scene.add(stars);

// ========= ILUMINACIÓN “STAR WARS” =========
// Luz ambiente suave
scene.add(new THREE.AmbientLight(0x9bbcff, 0.55));

// Luz principal fría
const key = new THREE.DirectionalLight(0xeaf2ff, 2.1);
key.position.set(6, 10, 6);
scene.add(key);

// Luz de relleno roja tenue (toque rebelde)
const fill = new THREE.DirectionalLight(0xff6a6a, 0.55);
fill.position.set(-8, 2, -6);
scene.add(fill);

// Spotlight dramático desde arriba
const spot = new THREE.SpotLight(0xffffff, 1700, 200, 0.25, 0.9);
spot.position.set(0, 25, 0);
scene.add(spot);

// ========= MODELO =========
const loader = new GLTFLoader().setPath(MODEL_PATH);

let falcon = null;
let autoRotate = true;

// “Glow” motor (simulado)
let engineGlow = null;

function centerAndScale(model) {
  // centra
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  // escala a un tamaño “bonito”
  const size = box.getSize(new THREE.Vector3()).length();
  const target = 6; // “diámetro” aprox
  const scale = target / size;
  model.scale.setScalar(scale);

  // ajusta target de cámara (un poco arriba)
  controls.target.set(0, 0.8, 0);
  controls.update();
}

function addEngineGlow(model) {
  // Un plano con material aditivo para simular brillo azul del motor
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x4fd3ff,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const glowGeo = new THREE.PlaneGeometry(2.2, 0.55);
  engineGlow = new THREE.Mesh(glowGeo, glowMat);

  // Lo colocamos “aprox” donde está la parte trasera del Falcon.
  // Como el modelo ya está centrado, esto suele quedar bien.
  engineGlow.position.set(0, 0.08, -1.25);

  // Que mire hacia la cámara (billboard)
  engineGlow.renderOrder = 999;

  model.add(engineGlow);
}

setStatus("Cargando modelo…");

loader.load(
  MODEL_FILE,
  (gltf) => {
    falcon = gltf.scene;

    // opcional: mejorar materiales un poquito (sin postprocesado)
    falcon.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        // evita que algunos materiales se vean apagados
        if (o.material) o.material.needsUpdate = true;
      }
    });

    centerAndScale(falcon);
    addEngineGlow(falcon);

    scene.add(falcon);
    setStatus('Listo ✅ <span style="opacity:.8">| Tecla <b>R</b> rota on/off</span>');
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus('<span style="color:#ffb4b4"><b>Error</b> cargando el modelo. Revisa consola.</span>');
  }
);

// ========= CONTROLES EXTRA =========
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") {
    autoRotate = !autoRotate;
    setStatus(
      `Listo ✅ <span style="opacity:.8">| Rotación: <b>${autoRotate ? "ON" : "OFF"}</b> (tecla R)</span>`
    );
  }
});

// ========= ANIMACIÓN =========
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  // leve movimiento estrellas (parallax)
  stars.rotation.y += dt * 0.02;

  // rotación del Halcón
  if (falcon && autoRotate) {
    falcon.rotation.y += dt * 0.45;
  }

  // pulso del glow del motor
  if (engineGlow) {
    const t = performance.now() * 0.003;
    engineGlow.material.opacity = 0.30 + 0.18 * (0.5 + 0.5 * Math.sin(t));
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ========= RESIZE =========
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});