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
let landedMessages = []; // Messages that have landed and are clickable
let userLocation = { lat: 40.7128, lng: -74.0060 }; // Default NYC

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════

init();
initGlobe();
initMessageUI();
initTooltip();
onWindowResize();
animate();

// Get user's real location
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      console.log('User location:', userLocation);
    },
    () => console.log('Using default location')
  );
}

// ═══════════════════════════════════════════
// SCENE SETUP - HORIZON VIEW
// ═══════════════════════════════════════════

function init() {
  // Renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new Scene();
  scene.add(new AmbientLight(0xbbbbbb, 0.3));
  scene.background = new Color(0x040d21);

  // Camera - positioned above looking down at horizon
  camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);

  // HORIZON VIEW: Camera positioned for bottom-of-screen globe view
  camera.position.set(0, -100, 350);

  // Lighting - creates the purple glow effect
  const dLight = new DirectionalLight(0xffffff, 0.8);
  dLight.position.set(-800, 2000, 400);
  camera.add(dLight);

  const dLight1 = new DirectionalLight(0x7982f6, 1);
  dLight1.position.set(-200, 500, 200);
  camera.add(dLight1);

  const dLight2 = new PointLight(0x8566cc, 0.5);
  dLight2.position.set(-200, 500, 200);
  camera.add(dLight2);

  scene.add(camera);

  // Fog for depth
  scene.fog = new Fog(0x535ef3, 400, 2000);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dynamicDampingFactor = 0.01;
  controls.enablePan = false;
  controls.enableZoom = false; // Disable zoom for consistent view
  controls.rotateSpeed = 0.3;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.05; // VERY SLOW rotation

  // Lock vertical angle - allow minimal tilt
  controls.minPolarAngle = Math.PI / 2.2;
  controls.maxPolarAngle = Math.PI / 1.9;

  // Target above center to push globe down in view
  controls.target.set(0, 100, 0);

  // Raycaster for click detection
  raycaster = new Raycaster();
  mouse = new Vector2();

  window.addEventListener("resize", onWindowResize, false);
  document.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("click", onGlobeClick);
}

// ═══════════════════════════════════════════
// GLOBE
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
    .atmosphereColor("#3a228a")
    .atmosphereAltitude(0.25)
    .hexPolygonColor(() => "rgba(255,255,255, 0.7)");

  // Initial rotation
  Globe.rotateY(-Math.PI * (5 / 9));
  Globe.rotateZ(-Math.PI / 6);

  // Globe material - purple gradient
  const globeMaterial = Globe.globeMaterial();
  globeMaterial.color = new Color(0x3a228a);
  globeMaterial.emissive = new Color(0x220038);
  globeMaterial.emissiveIntensity = 0.1;
  globeMaterial.shininess = 0.7;

  scene.add(Globe);

  // Initialize with empty arcs
  updateArcs();
  updatePoints();
}

// ═══════════════════════════════════════════
// ARC SYSTEM
// ═══════════════════════════════════════════

function generateRandomLocation() {
  const lat = (Math.random() - 0.5) * 160;
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
    arcAlt: 0.2 + Math.random() * 0.3,
    color: getArcColor(),
    message: message,
    timestamp: Date.now(),
  };

  currentArcs.push(arc);
  messagesInTransit++;
  messagesSent++;

  updateStats();
  updateArcs();

  // After arc animation, convert to landed message point
  setTimeout(() => {
    messagesInTransit = Math.max(0, messagesInTransit - 1);
    updateStats();

    // Add to landed messages (clickable points)
    landedMessages.push({
      lat: endLocation.lat,
      lng: endLocation.lng,
      message: message,
      timestamp: Date.now(),
      size: 0.4,
      color: arc.color,
    });

    // Keep only last 50 landed messages
    if (landedMessages.length > 50) {
      landedMessages = landedMessages.slice(-50);
    }

    updatePoints();
  }, 4000);
}

function getArcColor() {
  const colors = [
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ff6b6b', // Coral
    '#9cff00', // Lime
    '#ffcb21', // Gold
    '#7982f6', // Purple
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function updateArcs() {
  Globe
    .arcsData(currentArcs)
    .arcColor('color')
    .arcAltitude('arcAlt')
    .arcStroke(0.5)
    .arcDashLength(0.9)
    .arcDashGap(4)
    .arcDashAnimateTime(2500)
    .arcsTransitionDuration(500);
}

function updatePoints() {
  Globe
    .pointsData(landedMessages)
    .pointLat('lat')
    .pointLng('lng')
    .pointColor('color')
    .pointAltitude(0.01)
    .pointRadius('size')
    .pointsMerge(false); // Keep separate for click detection
}

// ═══════════════════════════════════════════
// TOOLTIP FOR MESSAGES
// ═══════════════════════════════════════════

function initTooltip() {
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.id = 'message-tooltip';
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <p class="tooltip-message"></p>
    </div>
  `;
  document.body.appendChild(tooltip);
}

function showTooltip(message, x, y) {
  const tooltip = document.getElementById('message-tooltip');
  const messageEl = tooltip.querySelector('.tooltip-message');

  messageEl.textContent = `"${message}"`;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.add('visible');

  // Auto-hide after 3 seconds
  setTimeout(() => {
    hideTooltip();
  }, 3000);
}

function hideTooltip() {
  const tooltip = document.getElementById('message-tooltip');
  tooltip.classList.remove('visible');
}

// ═══════════════════════════════════════════
// CLICK DETECTION
// ═══════════════════════════════════════════

function onGlobeClick(event) {
  // Calculate mouse position in normalized device coordinates
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // Update raycaster
  raycaster.setFromCamera(mouse, camera);

  // Check intersections with globe
  const intersects = raycaster.intersectObject(Globe, true);

  if (intersects.length > 0) {
    const point = intersects[0].point;

    // Convert 3D point to lat/lng (approximate)
    const globeRadius = 100; // Default three-globe radius
    const lat = Math.asin(point.y / globeRadius) * (180 / Math.PI);
    const lng = Math.atan2(point.x, point.z) * (180 / Math.PI);

    // Find closest landed message
    let closestMessage = null;
    let closestDist = Infinity;

    landedMessages.forEach(msg => {
      const dist = Math.sqrt(
        Math.pow(msg.lat - lat, 2) +
        Math.pow(msg.lng - lng, 2)
      );
      if (dist < closestDist && dist < 15) { // 15 degree tolerance
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

  // Send button click
  sendBtn.addEventListener('click', () => sendMessage());

  // Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Focus input after a delay
  setTimeout(() => input.focus(), 1500);
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');

  if (!input || !sendBtn) return;

  let message = input.value.trim();

  // Use random positive message if empty
  if (!message) {
    const defaults = [
      "You are enough ✨",
      "Sending love your way",
      "You've got this!",
      "Believe in yourself",
      "You make the world better",
      "Keep shining ⭐",
    ];
    message = defaults[Math.floor(Math.random() * defaults.length)];
  }

  // Disable button temporarily
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';

  // Create the arc animation
  createMessageArc(message);

  // Clear input
  input.value = '';

  // Success feedback
  setTimeout(() => {
    sendBtn.classList.add('success');
    sendBtn.textContent = 'Sent!';

    setTimeout(() => {
      sendBtn.classList.remove('success');
      sendBtn.textContent = 'Send';
      sendBtn.disabled = false;
    }, 1500);
  }, 500);
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
  windowHalfX = window.innerWidth / 1.5;
  windowHalfY = window.innerHeight / 1.5;
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ═══════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════

function animate() {
  // Subtle mouse parallax (reduced for horizon view)
  camera.position.x +=
    Math.abs(mouseX) <= windowHalfX / 2
      ? (mouseX / 4 - camera.position.x) * 0.002
      : 0;

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
