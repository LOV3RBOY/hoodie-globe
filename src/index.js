import ThreeGlobe from "three-globe";
import {
  WebGLRenderer,
  Scene,
  Raycaster,
  Vector2,
  PCFSoftShadowMap,
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from "three";
import {
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  Color,
  PointLight,
  HemisphereLight,
  MeshStandardMaterial,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import countries from "./files/globe-data-min.json";

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════

let renderer, camera, scene, controls, raycaster, mouse;
let Globe;

// Message state
let messagesSent = 0;
let messagesInTransit = 0;
let currentArcs = [];
let landedMessages = [];
let userLocation = { lat: 40.7128, lng: -74.0060 };

// ═══════════════════════════════════════════
// FLAGSHIP COLOR PALETTE
// Apple/Fintech level - refined neutrals
// ═══════════════════════════════════════════

const PALETTE = {
  // Canvas
  background: 0x000000,

  // Globe base - warm charcoal
  globeSurface: new Color().setHSL(0, 0, 0.10),
  globeEmissive: new Color().setHSL(0.6, 0.05, 0.02),

  // Atmosphere - extremely subtle warm white
  atmosphere: "#1a1a1a",

  // Geography - clean vector-style
  landFill: "rgba(255, 255, 255, 0.06)",
  landStroke: "rgba(255, 255, 255, 0.12)",

  // Arcs - subtle off-white
  arc: "rgba(255, 255, 255, 0.4)",
};

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

init();
initGlobe();
initMessageUI();
initTooltip();
onWindowResize();
animate();

if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    (pos) => { userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
    () => { }
  );
}

// ═══════════════════════════════════════════
// FLAGSHIP RENDERER - MAXIMUM QUALITY
// ═══════════════════════════════════════════

function init() {
  // Ultra-high quality WebGL renderer
  renderer = new WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    precision: "highp",
    logarithmicDepthBuffer: true,
  });

  // Maximum pixel ratio for crisp rendering
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Filmic tone mapping for premium look
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;

  // Soft shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  // Pure black background
  renderer.setClearColor(PALETTE.background, 1);

  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new Scene();
  scene.background = new Color(PALETTE.background);

  // ═══════════════════════════════════════════
  // EDITORIAL STUDIO LIGHTING
  // Soft, diffused, cinematic
  // ═══════════════════════════════════════════

  // Hemisphere light for soft ambient fill
  const hemiLight = new HemisphereLight(0xffffff, 0x080808, 0.3);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  // Camera
  camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.set(0, 0, 380);

  // Key light - soft diffused from top-left
  const keyLight = new DirectionalLight(0xffffff, 0.5);
  keyLight.position.set(-250, 350, 250);
  keyLight.castShadow = false;
  camera.add(keyLight);

  // Fill light - extremely soft from opposite side
  const fillLight = new DirectionalLight(0xffffff, 0.08);
  fillLight.position.set(200, -50, 200);
  camera.add(fillLight);

  // Subtle rim/backlight for edge separation
  const rimLight = new DirectionalLight(0xffffff, 0.06);
  rimLight.position.set(0, 100, -350);
  camera.add(rimLight);

  scene.add(camera);

  // Controls - ultra-smooth
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.02;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 300;
  controls.maxDistance = 500;
  controls.rotateSpeed = 0.3;
  controls.zoomSpeed = 0.4;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.08; // Ultra-slow, controlled

  controls.minPolarAngle = Math.PI / 3;
  controls.maxPolarAngle = Math.PI - Math.PI / 3;
  controls.target.set(0, 0, 0);

  // Raycaster
  raycaster = new Raycaster();
  mouse = new Vector2();

  window.addEventListener("resize", onWindowResize, false);
  renderer.domElement.addEventListener("click", onGlobeClick);
}

// ═══════════════════════════════════════════
// HIGH-FIDELITY GLOBE
// Smooth polygons, no hex dots
// ═══════════════════════════════════════════

function initGlobe() {
  Globe = new ThreeGlobe({
    waitForGlobeReady: true,
    animateIn: true,
  })
    // Use smooth polygons instead of hex grid
    .polygonsData(countries.features)
    .polygonCapColor(() => PALETTE.landFill)
    .polygonSideColor(() => "rgba(0, 0, 0, 0)")
    .polygonStrokeColor(() => PALETTE.landStroke)
    .polygonAltitude(0.002)

    // Subtle atmosphere
    .showAtmosphere(true)
    .atmosphereColor(PALETTE.atmosphere)
    .atmosphereAltitude(0.15);

  Globe.rotateY(-Math.PI * (5 / 9));
  Globe.rotateZ(-Math.PI / 6);

  // ═══════════════════════════════════════════
  // PBR GLOBE MATERIAL
  // Matte-satin composite, premium finish
  // ═══════════════════════════════════════════

  const globeMaterial = Globe.globeMaterial();

  // Custom PBR-like properties
  globeMaterial.color = PALETTE.globeSurface;
  globeMaterial.emissive = PALETTE.globeEmissive;
  globeMaterial.emissiveIntensity = 0.02;

  // Matte-satin finish
  globeMaterial.shininess = 5;
  globeMaterial.specular = new Color(0x111111);

  // Ensure smooth shading
  globeMaterial.flatShading = false;

  scene.add(Globe);

  updateArcs();
  updatePoints();
}

// ═══════════════════════════════════════════
// ARC SYSTEM - Hairline bezier curves
// ═══════════════════════════════════════════

function generateRandomLocation() {
  const lat = (Math.random() - 0.5) * 120;
  const lng = (Math.random() - 0.5) * 340;
  return { lat, lng };
}

function createMessageArc(message) {
  const endLocation = generateRandomLocation();

  const arc = {
    startLat: userLocation.lat,
    startLng: userLocation.lng,
    endLat: endLocation.lat,
    endLng: endLocation.lng,
    arcAlt: 0.08 + Math.random() * 0.12,
    color: PALETTE.arc,
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
      size: 0.25,
      color: 'rgba(255, 255, 255, 0.6)',
    });

    if (landedMessages.length > 40) {
      landedMessages = landedMessages.slice(-40);
    }

    updatePoints();
  }, 2500);
}

function updateArcs() {
  Globe
    .arcsData(currentArcs)
    .arcColor('color')
    .arcAltitude('arcAlt')
    .arcStroke(0.3)          // Hairline
    .arcDashLength(0.9)
    .arcDashGap(4)
    .arcDashAnimateTime(1500)
    .arcsTransitionDuration(300);
}

function updatePoints() {
  Globe
    .pointsData(landedMessages)
    .pointLat('lat')
    .pointLng('lng')
    .pointColor('color')
    .pointAltitude(0.005)
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
  setTimeout(() => hideTooltip(), 3000);
}

function hideTooltip() {
  document.getElementById('message-tooltip')?.classList.remove('visible');
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
      if (dist < closestDist && dist < 15) {
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

  setTimeout(() => input.focus(), 800);
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');

  if (!input || !sendBtn) return;

  let message = input.value.trim();

  if (!message) {
    const defaults = ["You are enough", "Sending love", "Keep going", "You matter", "Stay strong"];
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
    }, 1000);
  }, 300);
}

function updateStats() {
  const sentEl = document.getElementById('stat-sent');
  const transitEl = document.getElementById('stat-transit');
  if (sentEl) sentEl.textContent = messagesSent;
  if (transitEl) transitEl.textContent = messagesInTransit;
}

// ═══════════════════════════════════════════
// RESIZE
// ═══════════════════════════════════════════

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ═══════════════════════════════════════════
// ANIMATION - Butter smooth
// ═══════════════════════════════════════════

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
