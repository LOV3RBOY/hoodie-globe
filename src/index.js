import ThreeGlobe from "three-globe";
import { WebGLRenderer, Scene } from "three";
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

let renderer, camera, scene, controls;
let mouseX = 0;
let mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let Globe;

// Message state
let messagesSent = 0;
let messagesInTransit = 0;
let currentArcs = [];
let userLocation = { lat: 40.7128, lng: -74.0060 }; // Default NYC

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════

init();
initGlobe();
initMessageUI();
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
// SCENE SETUP
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

  // Camera
  camera = new PerspectiveCamera();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

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

  camera.position.z = 400;
  camera.position.x = 0;
  camera.position.y = 0;

  scene.add(camera);

  // Fog for depth
  scene.fog = new Fog(0x535ef3, 400, 2000);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dynamicDampingFactor = 0.01;
  controls.enablePan = false;
  controls.minDistance = 200;
  controls.maxDistance = 500;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  controls.minPolarAngle = Math.PI / 3.5;
  controls.maxPolarAngle = Math.PI - Math.PI / 3;

  window.addEventListener("resize", onWindowResize, false);
  document.addEventListener("mousemove", onMouseMove);
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
}

// ═══════════════════════════════════════════
// ARC SYSTEM
// ═══════════════════════════════════════════

function generateRandomLocation() {
  // Generate random coordinates on Earth
  const lat = (Math.random() - 0.5) * 160; // -80 to 80
  const lng = (Math.random() - 0.5) * 360; // -180 to 180
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

  // Remove arc after animation completes
  setTimeout(() => {
    messagesInTransit = Math.max(0, messagesInTransit - 1);
    updateStats();

    // Keep arc visible but could remove if needed
    // currentArcs = currentArcs.filter(a => a.timestamp !== arc.timestamp);
    // updateArcs();
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
  // Subtle mouse parallax
  camera.position.x +=
    Math.abs(mouseX) <= windowHalfX / 2
      ? (mouseX / 2 - camera.position.x) * 0.005
      : 0;
  camera.position.y += (-mouseY / 2 - camera.position.y) * 0.005;

  camera.lookAt(scene.position);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
