import {
  ColliderDesc,
  type RigidBody,
  RigidBodyDesc,
  World,
} from "@dimforge/rapier3d";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
  WebGPURenderer,
} from "three/webgpu";
import {
  GAMEPAD_AXIS,
  GAMEPAD_BUTTON,
  GamepadPointerLockControls,
} from "three-gamepad-controls";

import "./style.css";

const FIXED_TIMESTEP = 1 / 60;
const MAX_ACCUMULATED_TIME = 0.1;
const CUBE_SIZE = 1;
const CUBE_GAP = 0.02;
const STACK_LEVELS = 6;
const BALL_RADIUS = 0.35;
const BALL_SPEED = 20;

type PhysicsObject = {
  mesh: Mesh;
  body: RigidBody;
};

const app = document.getElementById("app") as HTMLDivElement;

const pointerLockHint = document.getElementById(
  "pointer-lock-hint",
) as HTMLParagraphElement;

const crosshair = document.getElementById("crosshair") as HTMLDivElement;

if (!app || !pointerLockHint || !crosshair) {
  throw new Error("Could not find the game interface.");
}

const world = new World({ x: 0, y: -9.81, z: 0 });
world.timestep = FIXED_TIMESTEP;

const scene = new Scene();
scene.background = new Color("#0f172a");

const renderer = new WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
app.append(renderer.domElement);

const camera = new PerspectiveCamera(
  75,
  globalThis.innerWidth / globalThis.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.7, 10);
camera.lookAt(0, 2.5, 0);

const pointerLockControls = new PointerLockControls(
  camera,
  renderer.domElement,
);
pointerLockControls.minPolarAngle = Math.PI / 3;
pointerLockControls.maxPolarAngle = (Math.PI * 2) / 3;
const gamepadPointerLockControls = new GamepadPointerLockControls(
  pointerLockControls,
  {
    moveSpeed: 0,
    lookStick: {
      xAxis: GAMEPAD_AXIS.LeftX,
      yAxis: GAMEPAD_AXIS.LeftY,
    },
  },
);

pointerLockControls.addEventListener("lock", () => {
  pointerLockHint.hidden = true;
  crosshair.hidden = false;
});

pointerLockControls.addEventListener("unlock", () => {
  pointerLockHint.hidden = false;
  crosshair.hidden = true;
});

const ambientLight = new AmbientLight("#ffffff", 0.65);
scene.add(ambientLight);

const directionalLight = new DirectionalLight("#ffffff", 2.5);
directionalLight.position.set(6, 10, 8);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 40;
directionalLight.shadow.camera.left = -12;
directionalLight.shadow.camera.right = 12;
directionalLight.shadow.camera.top = 12;
directionalLight.shadow.camera.bottom = -12;
directionalLight.shadow.bias = -0.0005;
scene.add(directionalLight);

const groundGeometry = new BoxGeometry(30, 0.5, 30);
const groundMaterial = new MeshStandardMaterial({
  color: "#1e293b",
  roughness: 0.95,
  metalness: 0,
});
const ground = new Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.25;
ground.receiveShadow = true;
scene.add(ground);

const groundCollider = ColliderDesc.cuboid(15, 0.25, 15)
  .setTranslation(0, -0.25, 0)
  .setFriction(1)
  .setRestitution(0);
world.createCollider(groundCollider);

const cubeGeometry = new BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const cubeMaterial = new MeshStandardMaterial({
  color: "#f59e0b",
  roughness: 0.7,
  metalness: 0.05,
});
const ballGeometry = new SphereGeometry(BALL_RADIUS, 32, 20);
const ballMaterial = new MeshStandardMaterial({
  color: "#f8fafc",
  roughness: 0.35,
  metalness: 0.15,
});
const physicsObjects: PhysicsObject[] = [];

for (let level = 0; level < STACK_LEVELS; level += 1) {
  const cubeCount = STACK_LEVELS - level;
  const y = CUBE_SIZE / 2 + level * (CUBE_SIZE + CUBE_GAP);

  for (let cubeIndex = 0; cubeIndex < cubeCount; cubeIndex += 1) {
    const x = (cubeIndex - (cubeCount - 1) / 2) * (CUBE_SIZE + CUBE_GAP);
    const mesh = new Mesh(cubeGeometry, cubeMaterial);
    mesh.position.set(x, y, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = world.createRigidBody(
      RigidBodyDesc.dynamic().setTranslation(x, y, 0),
    );
    const collider = ColliderDesc.cuboid(
      CUBE_SIZE / 2,
      CUBE_SIZE / 2,
      CUBE_SIZE / 2,
    )
      .setMass(1)
      .setFriction(0.8)
      .setRestitution(0.05);
    world.createCollider(collider, body);
    physicsObjects.push({ mesh, body });
  }
}

const shotDirection = new Vector3();
const shotOrigin = new Vector3();

const shootBall = () => {
  camera.getWorldDirection(shotDirection).normalize();
  shotOrigin
    .copy(camera.position)
    .addScaledVector(shotDirection, BALL_RADIUS + 0.5);

  const body = world.createRigidBody(
    RigidBodyDesc.dynamic()
      .setTranslation(shotOrigin.x, shotOrigin.y, shotOrigin.z)
      .setLinvel(
        shotDirection.x * BALL_SPEED,
        shotDirection.y * BALL_SPEED,
        shotDirection.z * BALL_SPEED,
      )
      .setCcdEnabled(true),
  );
  const collider = ColliderDesc.ball(BALL_RADIUS)
    .setMass(4)
    .setFriction(0.5)
    .setRestitution(0.15);
  world.createCollider(collider, body);

  const mesh = new Mesh(ballGeometry, ballMaterial);
  mesh.position.copy(shotOrigin);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  physicsObjects.push({ mesh, body });
};

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }

  if (!pointerLockControls.isLocked) {
    pointerLockControls.lock();
    return;
  }

  shootBall();
});

const updateViewportSize = () => {
  const { innerWidth, innerHeight } = globalThis;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
};
updateViewportSize();
globalThis.addEventListener("resize", updateViewportSize);

const syncPhysicsObjects = () => {
  for (const { mesh, body } of physicsObjects) {
    const position = body.translation();
    const rotation = body.rotation();
    mesh.position.set(position.x, position.y, position.z);
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }
};

const timer = new Timer();
let accumulatedTime = 0;
let wasGamepadShootPressed = false;

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const delta = timer.getDelta();
  gamepadPointerLockControls.update(delta);

  const isGamepadShootPressed =
    gamepadPointerLockControls.gamepad?.buttons[GAMEPAD_BUTTON.South]
      ?.pressed ?? false;
  if (isGamepadShootPressed && !wasGamepadShootPressed) {
    shootBall();
  }
  wasGamepadShootPressed = isGamepadShootPressed;

  accumulatedTime = Math.min(
    accumulatedTime + delta,
    MAX_ACCUMULATED_TIME,
  );

  while (accumulatedTime >= FIXED_TIMESTEP) {
    world.step();
    accumulatedTime -= FIXED_TIMESTEP;
  }

  syncPhysicsObjects();
  renderer.render(scene, camera);
});
