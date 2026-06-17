import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Timer,
  WebGPURenderer,
} from "three/webgpu";
import { GamepadOrbitControls } from "three-gamepad-controls";

import "./style.css";

const app = document.getElementById("app") as HTMLDivElement;

if (!app) {
  throw new Error("Could not find the app container.");
}

const scene = new Scene();

const renderer = new WebGPURenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
app.append(renderer.domElement);

const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.45,
  metalness: 0.1,
});
const cube = new Mesh(geometry, material);
cube.position.y = 0.5;
cube.castShadow = true;
scene.add(cube);

const gridHelper = new GridHelper(100, 100);
scene.add(gridHelper);

const ambientLight = new AmbientLight("#ffffff", 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight("#ffffff", 1);
directionalLight.position.set(4, 3, 2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 10;
scene.add(directionalLight);

const camera = new PerspectiveCamera(
  75,
  globalThis.innerWidth / globalThis.innerHeight,
  1,
  100,
);
camera.position.set(1.5, 3, 4);
camera.lookAt(0, 0.5, 0);

const orbitControls = new OrbitControls(camera, renderer.domElement);
const gamepadOrbitControls = new GamepadOrbitControls(orbitControls);

const updateViewportSize = () => {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
};
updateViewportSize();
globalThis.addEventListener("resize", updateViewportSize);

const timer = new Timer();

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const delta = timer.getDelta();
  gamepadOrbitControls.update(delta);
  orbitControls.update(delta);
  renderer.render(scene, camera);
});
