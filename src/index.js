import ThreeGlobe from "three-globe";
import { WebGLRenderer, Scene, Raycaster, Vector2 } from "three";
import {
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  Color,
  Fog,
  PointLight,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import countries from "./files/globe-data-min.json";

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════

let renderer, camera, scene, controls, raycaster, mouse;
let mouseX = 0;
let mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let Globe;

// Message state
let messagesSent = 0;
let messagesInTransit = 0;
let currentArcs = [];
let landedMessages = [];
let userLocation = { lat: 40.7128, lng: -74.0060 };

// ═══════════════════════════════════════════
// AWWWARDS-TIER COLOR PALETTE
// Inspired by Cosmos Studio - Pure monochrome
// ═══════════════════════════════════════════

const COLORS = {
  // Pure black canvas
  background: 0x000000,

  // Globe - deep charcoal with subtle warm undertone
  globeBase: [0.08, 0.08, 0.1],
  globeEmissive: 0x0a0a0f,

  // Atmosphere - subtle warm white glow
  atmosphere: "#ffffff",

  // Landmass - refined grays
  landPrimary: "rgba(255, 255, 255, 0.15)",
  landHighlight: "rgba(255, 255, 255, 0.35)",

  // Arcs - pure white with varying opacity
  arcColors: [
    '#ffffff',
    '#e0e0e0',
    '#c0c0c0',
  ],
};

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════

init();
initGlobe();
initMessageUI();
initTooltip();
onWindowResize();
animate();

// Geolocation
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    },
    () => { }
  );
}

// ═══════════════════════════════════════════
// SCENE SETUP - CINEMATIC QUALITY
// ═══════════════════════════════════════════

function init() {
  // Maximum quality renderer
  renderer = new WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(COLORS.background, 1);
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new Scene();
  scene.background = new Color(COLORS.background);

  // Subtle ambient
  scene.add(new AmbientLight(0xffffff, 0.08));

  // Camera - centered view
  camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.set(0, 0, 380);

  // Key light - soft white from top-left
  const keyLight = new DirectionalLight(0xffffff, 0.6);
  keyLight.position.set(-300, 400, 300);
  camera.add(keyLight);

  // Fill light - very soft from right
  const fillLight = new DirectionalLight(0xffffff, 0.15);
  fillLight.position.set(200, 0, 300);
  camera.add(fillLight);

  // Rim light - subtle backlight
  const rimLight = new DirectionalLight(0xffffff, 0.1);
  rimLight.position.set(0, 200, -400);
  camera.add(rimLight);

  scene.add(camera);

  // Minimal fog
  scene.fog = new Fog(COLORS.background, 500, 1200);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.03;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 280;
  controls.maxDistance = 550;
  controls.rotateSpeed = 0.4;
  controls.zoomSpeed = 0.6;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.15;

  controls.minPolarAngle = Math.PI / 3;
  controls.maxPolarAngle = Math.PI - Math.PI / 3;
  controls.target.set(0, 0, 0);

  // Raycaster
  raycaster = new Raycaster();
  mouse = new Vector2();

  window.addEventListener("resize", onWindowResize, false);
  document.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("click", onGlobeClick);
}

// ═══════════════════════════════════════════
// GLOBE - REFINED MONOCHROME
// ═══════════════════════════════════════════

function initGlobe() {
  Globe = new ThreeGlobe({
    waitForGlobeReady: true,
    animateIn: true,
  })
    .hexPolygonsData(countries.features)
    .hexPolygonResolution(3)
    .hexPolygonMargin(0.7)
    .showAtmosphere(true)
    .atmosphereColor(COLORS.atmosphere)
    .atmosphereAltitude(0.12)
    .hexPolygonColor(() => COLORS.landPrimary);

  Globe.rotateY(-Math.PI * (5 / 9));
  Globe.rotateZ(-Math.PI / 6);

  // Premium matte globe material
  const globeMaterial = Globe.globeMaterial();
  globeMaterial.color = new Color(...COLORS.globeBase);
  globeMaterial.emissive = new Color(COLORS.globeEmissive);
  globeMaterial.emissiveIntensity = 0.05;
  globeMaterial.shininess = 0.1;

  scene.add(Globe);

  updateArcs();
  updatePoints();
}

// ═══════════════════════════════════════════
// ARC SYSTEM
// ═══════════════════════════════════════════

function generateRandomLocation() {
  const lat = (Math.random() - 0.5) * 140;
  const lng = (Math.random() - 0.5) * 360;
  return { lat, lng };
}

function createMessageArc(message) {
  const endLocation = generateRandomLocation();

  const arc = {
    startLat: userLocation.lat,
    startLng: userLocation.lng,
    endLat: endLocation.lat,
    endLng: endLocation.lng,
    arcAlt: 0.12 + Math.random() * 0.18,
    color: COLORS.arcColors[Math.floor(Math.random() * COLORS.arcColors.length)],
    message: message,
    timestamp: Date.now(),
  };

  currentArcs.push(arc);
  messagesInTransit++;
  messagesSent++;

  updateStats();
  updateArcs();

  setTimeout(() => {
    messagesInTransit = Math.max(0, messagesInTransit - 1);
    updateStats();

    landedMessages.push({
      lat: endLocation.lat,
      lng: endLocation.lng,
      message: message,
      timestamp: Date.now(),
      size: 0.4,
      color: '#ffffff',
    });

    if (landedMessages.length > 50) {
      landedMessages = landedMessages.slice(-50);
    }

    updatePoints();
  }, 3000);
}

function updateArcs() {
  Globe
    .arcsData(currentArcs)
    .arcColor('color')
    .arcAltitude('arcAlt')
    .arcStroke(0.4)
    .arcDashLength(0.9)
    .arcDashGap(4)
    .arcDashAnimateTime(1800)
    .arcsTransitionDuration(400);
}

function updatePoints() {
  Globe
    .pointsData(landedMessages)
    .pointLat('lat')
    .pointLng('lng')
    .pointColor('color')
    .pointAltitude(0.01)
    .pointRadius('size')
    .pointsMerge(false);
}

// ═══════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════

function initTooltip() {
  const tooltip = document.createElement('div');
  tooltip.id = 'message-tooltip';
  tooltip.innerHTML = `<div class="tooltip-content"><p class="tooltip-message"></p></div>`;
  document.body.appendChild(tooltip);
}

function showTooltip(message, x, y) {
  const tooltip = document.getElementById('message-tooltip');
  const messageEl = tooltip.querySelector('.tooltip-message');
  messageEl.textContent = `"${message}"`;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.add('visible');
  setTimeout(() => hideTooltip(), 3500);
}

function hideTooltip() {
  document.getElementById('message-tooltip').classList.remove('visible');
}

// ═══════════════════════════════════════════
// CLICK DETECTION
// ═══════════════════════════════════════════

function onGlobeClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(Globe, true);

  if (intersects.length > 0) {
    const point = intersects[0].point;
    const globeRadius = 100;
    const lat = Math.asin(point.y / globeRadius) * (180 / Math.PI);
    const lng = Math.atan2(point.x, point.z) * (180 / Math.PI);

    let closestMessage = null;
    let closestDist = Infinity;

    landedMessages.forEach(msg => {
      const dist = Math.sqrt(Math.pow(msg.lat - lat, 2) + Math.pow(msg.lng - lng, 2));
      if (dist < closestDist && dist < 20) {
        closestDist = dist;
        closestMessage = msg;
      }
    });

    if (closestMessage) {
      showTooltip(closestMessage.message, event.clientX, event.clientY);
    }
  }
}

// ═══════════════════════════════════════════
// MESSAGE UI
// ═══════════════════════════════════════════

function initMessageUI() {
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');

  if (!input || !sendBtn) return;

  sendBtn.addEventListener('click', () => sendMessage());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  setTimeout(() => input.focus(), 1000);
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');

  if (!input || !sendBtn) return;

  let message = input.value.trim();

  if (!message) {
    const defaults = ["You are enough", "Sending love", "You've got this", "Keep going", "You matter"];
    message = defaults[Math.floor(Math.random() * defaults.length)];
  }

  sendBtn.disabled = true;
  sendBtn.textContent = '...';

  createMessageArc(message);
  input.value = '';

  setTimeout(() => {
    sendBtn.textContent = '✓';
    setTimeout(() => {
      sendBtn.textContent = '→';
      sendBtn.disabled = false;
    }, 1200);
  }, 400);
}

function updateStats() {
  const sentEl = document.getElementById('stat-sent');
  const transitEl = document.getElementById('stat-transit');
  if (sentEl) sentEl.textContent = messagesSent;
  if (transitEl) transitEl.textContent = messagesInTransit;
}

// ═══════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════

function onMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ═══════════════════════════════════════════
// ANIMATION
// ═══════════════════════════════════════════

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
