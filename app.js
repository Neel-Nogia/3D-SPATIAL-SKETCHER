// --- State Variables ---
let scene, camera, renderer, controls;
let starField, gridHelper;

let handsModel = null;
let activeCamera = null;
let webcamRunning = false;
let videoElement, overlayCanvas, overlayCtx;

// Drawing Data
let allLines = []; // Array of objects: { mesh: THREE.Mesh, points: THREE.Vector3[] }

// User Configuration
let drawColor = '#00ffff';
let brushSize = 12; // Radius divisor
let lockPlane = 'free'; // 'free', 'xy', 'xz'
let smoothingFactor = 0.85; // EMA factor (higher = smoother, slower)
let baseDepthOffset = 0; // manual Z offset slider

// Dynamic Eraser Configuration
const ERASER_RADIUS = 2.2;

// Track State for up to 2 Hands
const handStates = [
  {
    id: 0,
    activePoints: [],
    activeLineMesh: null,
    isDrawing: false,
    cursorPointer: null,
    cursorLight: null,
    smoothCursor: new THREE.Vector3(0, 0, 0),
    smoothPalmSize: 0.15,
    detectedInFrame: false,
    label: 'Hand 1',
    currentMode: 'NONE'
  },
  {
    id: 1,
    activePoints: [],
    activeLineMesh: null,
    isDrawing: false,
    cursorPointer: null,
    cursorLight: null,
    smoothCursor: new THREE.Vector3(0, 0, 0),
    smoothPalmSize: 0.15,
    detectedInFrame: false,
    label: 'Hand 2',
    currentMode: 'NONE'
  }
];

// DOM Elements
const loaderOverlay = document.getElementById('loader-overlay');
const loaderStatus = document.getElementById('loader-status');
const statusDot = document.getElementById('status-dot');
const trackingStatus = document.getElementById('tracking-status');
const gestureText = document.getElementById('current-gesture-text');
const stateIndicator = document.getElementById('state-indicator');
const brushSizeVal = document.getElementById('brush-size-val');
const depthOffsetVal = document.getElementById('depth-offset-val');
const smoothingVal = document.getElementById('draw-smoothing-val');

// --- 1. Initialize Three.js Environment ---
function initThree() {
  const canvas = document.getElementById('three-canvas');
  
  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060813, 0.015);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 15, 35);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 + 0.1; // Limit panning below floor
  controls.minDistance = 5;
  controls.maxDistance = 150;

  // Ambient Light (Soft room lighting)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambientLight);

  // Grid Floor (Futuristic cyber-grid)
  gridHelper = new THREE.GridHelper(100, 50, 0xff007f, 0x00ffff);
  gridHelper.position.y = -10;
  gridHelper.material.opacity = 0.2;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // Reflective Floor Plane
  const floorGeo = new THREE.PlaneGeometry(100, 100);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x070919,
    roughness: 0.6,
    metalness: 0.9,
    transparent: true,
    opacity: 0.7
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -10.05;
  floor.receiveShadow = true;
  scene.add(floor);

  // Starry Background (Space Dust)
  const starGeo = new THREE.BufferGeometry();
  const starCount = 800;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 200;
    positions[i + 1] = (Math.random() - 0.5) * 150 + 20;
    positions[i + 2] = (Math.random() - 0.5) * 200;

    colors[i] = Math.random() > 0.5 ? 0.0 : 1.0;
    colors[i + 1] = 1.0;
    colors[i + 2] = 1.0;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 0.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });

  starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // Create cursors and point lights for Hand 1 and Hand 2
  handStates.forEach(handState => {
    // 3D Pointer Cursor (Glowing Sphere)
    // Hand 1 starts Cyan, Hand 2 starts Magenta
    const startColor = handState.id === 0 ? '#00ffff' : '#ff007f';
    const cursorGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(startColor),
      transparent: true,
      opacity: 0.8
    });
    handState.cursorPointer = new THREE.Mesh(cursorGeo, cursorMat);
    handState.cursorPointer.visible = false;
    scene.add(handState.cursorPointer);

    // Dynamic Cursor Light (Casts neon glow on surrounding structures)
    handState.cursorLight = new THREE.PointLight(new THREE.Color(startColor), 4, 12, 1.5);
    handState.cursorLight.visible = false;
    scene.add(handState.cursorLight);
  });

  // Resize Listener
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- 2. Initialize MediaPipe Hand Tracking (Dual Hands) ---
function initHandTracking() {
  try {
    loaderStatus.innerText = "Loading MediaPipe Hands model...";
    
    handsModel = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsModel.setOptions({
      maxNumHands: 2, // Allow tracking two hands simultaneously
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    handsModel.onResults(onHandResults);

    loaderStatus.innerText = "Acquiring camera permission...";
    setupCamera();
  } catch (error) {
    console.error("Initialization failed:", error);
    loaderStatus.innerText = `Error: ${error.message}. Please reload.`;
  }
}

// Camera Setup
function setupCamera() {
  videoElement = document.getElementById('webcam-video');
  overlayCanvas = document.getElementById('webcam-overlay');
  overlayCtx = overlayCanvas.getContext('2d');

  activeCamera = new Camera(videoElement, {
    onFrame: async () => {
      if (webcamRunning) {
        await handsModel.send({ image: videoElement });
      }
    },
    width: 640,
    height: 480
  });

  activeCamera.start()
    .then(() => {
      overlayCanvas.width = videoElement.videoWidth || 640;
      overlayCanvas.height = videoElement.videoHeight || 480;
      
      webcamRunning = true;
      
      loaderOverlay.classList.add('fade-out');
      statusDot.className = "status-dot active";
      trackingStatus.innerText = "Tracking Active";
      
      animate();
    })
    .catch((err) => {
      console.error("Camera access denied:", err);
      loaderStatus.innerText = "Camera access denied. Please grant camera permission.";
      statusDot.className = "status-dot inactive";
    });
}

// --- 3. Gesture Detection & Coordinate Mapping ---

// Check if a finger is extended (Tip to wrist distance vs PIP to wrist distance)
function isFingerExtended(landmarks, tipIdx, pipIdx, wristIdx = 0) {
  const wrist = landmarks[wristIdx];
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  
  const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y, tip.z - wrist.z);
  const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y, pip.z - wrist.z);
  
  return dTip > dPip;
}

// Pinch detection (Index tip #8 to Thumb tip #4)
function detectPinch(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const dz = thumbTip.z - indexTip.z;

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance < 0.045; // Touch threshold
}

// Classify gesture and return mode
function getHandMode(landmarks) {
  // 1. Pinch is highest priority (Thumb tip close to Index tip) -> DRAW
  if (detectPinch(landmarks)) {
    return 'DRAW';
  }

  // Check extended states of fingers
  const indexExt = isFingerExtended(landmarks, 8, 6);
  const middleExt = isFingerExtended(landmarks, 12, 10);
  const ringExt = isFingerExtended(landmarks, 16, 14);
  const pinkyExt = isFingerExtended(landmarks, 20, 18);

  // 2. Peace Sign (Index + Middle extended, others folded) -> ERASE
  if (indexExt && middleExt && !ringExt && !pinkyExt) {
    return 'ERASE';
  }

  // 3. Fist (All fingers folded) -> NONE (hide cursor pointer)
  if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
    return 'NONE';
  }

  // 4. Open hand (Default) -> HOVER
  return 'HOVER';
}

// Map 2D camera coordinates (0 to 1) to Three.js 3D coordinates (with smoothing)
function mapLandmarksTo3D(landmarks, handState) {
  const indexTip = landmarks[8];
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];

  // 1. Estimate depth (hand-to-camera distance) from palm size
  const dx = wrist.x - indexMcp.x;
  const dy = wrist.y - indexMcp.y;
  const rawPalmSize = Math.sqrt(dx * dx + dy * dy);
  
  handState.smoothPalmSize = (handState.smoothPalmSize * 0.9) + (rawPalmSize * 0.1);
  
  const targetDistance = THREE.MathUtils.mapLinear(
    THREE.MathUtils.clamp(handState.smoothPalmSize, 0.08, 0.22),
    0.08, 0.22,
    30, 10
  );

  // 2. Translate normalized camera coordinates to NDC (Mirrored x-axis)
  const ndcX = (1.0 - indexTip.x) * 2 - 1;
  const ndcY = -indexTip.y * 2 + 1;

  // 3. Project NDC to 3D world coordinate
  const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
  vector.unproject(camera);
  
  const dir = vector.sub(camera.position).normalize();
  const finalDistance = targetDistance + baseDepthOffset;
  const targetWorldPoint = camera.position.clone().add(dir.multiplyScalar(finalDistance));

  // Apply axis locking constraints
  if (lockPlane === 'xy') {
    targetWorldPoint.z = baseDepthOffset;
  } else if (lockPlane === 'xz') {
    targetWorldPoint.y = 0;
  }

  // 4. Smooth coordinates using EMA
  handState.smoothCursor.x = (handState.smoothCursor.x * smoothingFactor) + (targetWorldPoint.x * (1 - smoothingFactor));
  handState.smoothCursor.y = (handState.smoothCursor.y * smoothingFactor) + (targetWorldPoint.y * (1 - smoothingFactor));
  handState.smoothCursor.z = (handState.smoothCursor.z * smoothingFactor) + (targetWorldPoint.z * (1 - smoothingFactor));

  return handState.smoothCursor.clone();
}

// Draw 2D Hand landmarks for user feedback overlay
function drawHandOverlay(landmarks, handState) {
  // Set draw colors depending on the hand's current mode
  let color = drawColor;
  if (handState.currentMode === 'ERASE') {
    color = '#ff3b30'; // Red
  } else if (handState.currentMode === 'DRAW') {
    color = '#ff007f'; // Magenta (active drawing)
  } else if (handState.currentMode === 'NONE') {
    color = '#555555'; // Greyed out
  }

  overlayCtx.strokeStyle = color;
  overlayCtx.lineWidth = 3;

  const connections = [
    [0,1], [1,2], [2,3], [3,4], // Thumb
    [0,5], [5,6], [6,7], [7,8], // Index
    [0,9], [9,10], [10,11], [11,12], // Middle
    [0,13], [13,14], [14,15], [15,16], // Ring
    [0,17], [17,18], [18,19], [19,20], // Pinky
    [5,9], [9,13], [13,17] // Palm
  ];

  // Draw lines
  connections.forEach(([p1, p2]) => {
    const pt1 = landmarks[p1];
    const pt2 = landmarks[p2];
    overlayCtx.beginPath();
    overlayCtx.moveTo(pt1.x * overlayCanvas.width, pt1.y * overlayCanvas.height);
    overlayCtx.lineTo(pt2.x * overlayCanvas.width, pt2.y * overlayCanvas.height);
    overlayCtx.stroke();
  });

  // Draw joints/keypoints
  landmarks.forEach((landmark, index) => {
    overlayCtx.beginPath();
    let radius = 4;
    if (index === 8 || index === 4) {
      radius = handState.currentMode === 'DRAW' ? 8 : 6;
      overlayCtx.fillStyle = color;
    } else {
      overlayCtx.fillStyle = '#ffffff';
    }
    overlayCtx.arc(landmark.x * overlayCanvas.width, landmark.y * overlayCanvas.height, radius, 0, 2 * Math.PI);
    overlayCtx.fill();
  });

  // Draw hand indicator label
  overlayCtx.fillStyle = '#ffffff';
  overlayCtx.font = 'bold 12px Orbitron';
  overlayCtx.fillText(
    `${handState.label}: ${handState.currentMode}`, 
    landmarks[0].x * overlayCanvas.width - 25, 
    landmarks[0].y * overlayCanvas.height + 25
  );
}

// --- 4. Drawing & Erasing Mechanics ---

function handleDrawing(point, handState) {
  if (handState.activePoints.length === 0) {
    handState.activePoints.push(point);
    return;
  }

  // Prevent redundant points if hand hasn't moved enough
  const lastPoint = handState.activePoints[handState.activePoints.length - 1];
  const dist = point.distanceTo(lastPoint);
  if (dist < 0.12) return;

  handState.activePoints.push(point);

  // Generate 3D Tube along the curve
  if (handState.activePoints.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(handState.activePoints);
    
    // Dispose previous active stroke mesh
    if (handState.activeLineMesh) {
      scene.remove(handState.activeLineMesh);
      handState.activeLineMesh.geometry.dispose();
    }

    const radiusVal = brushSize / 60;
    const geometry = new THREE.TubeGeometry(
      curve, 
      handState.activePoints.length * 3, 
      radiusVal, 
      8, 
      false
    );

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(drawColor),
      emissive: new THREE.Color(drawColor),
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.9,
      toneMapped: false
    });

    handState.activeLineMesh = new THREE.Mesh(geometry, material);
    handState.activeLineMesh.castShadow = true;
    handState.activeLineMesh.receiveShadow = true;
    scene.add(handState.activeLineMesh);
  }
}

function finishStroke(handState) {
  if (handState.activeLineMesh) {
    // Add mesh and coordinates copy to allLines record for eraser collision tests
    allLines.push({
      mesh: handState.activeLineMesh,
      points: [...handState.activePoints]
    });
    handState.activeLineMesh = null;
  }
  handState.activePoints = [];
}

// Erase drawn lines intersecting with eraser sphere
function handleErasing(eraserPos) {
  let linesToKeep = [];
  let linesToErase = [];

  allLines.forEach(line => {
    let shouldErase = false;
    
    // Check if any point of the line path lies inside the eraser sphere radius
    for (let i = 0; i < line.points.length; i++) {
      if (line.points[i].distanceTo(eraserPos) < ERASER_RADIUS) {
        shouldErase = true;
        break;
      }
    }

    if (shouldErase) {
      linesToErase.push(line);
    } else {
      linesToKeep.push(line);
    }
  });

  // Remove mesh from scene and dispose WebGL data
  linesToErase.forEach(line => {
    scene.remove(line.mesh);
    line.mesh.geometry.dispose();
    line.mesh.material.dispose();
  });

  if (linesToErase.length > 0) {
    allLines = linesToKeep;
    showNotification(`Erased ${linesToErase.length} line(s)`);
  }
}

// --- 5. MediaPipe Result Handler (Supports Dual Hands) ---

function onHandResults(results) {
  // Clear the 2D canvas overlay
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  
  const numDetected = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
  
  // Reset frame status flags
  handStates.forEach(handState => {
    handState.detectedInFrame = false;
  });

  // Map detections to hand records
  for (let i = 0; i < numDetected && i < 2; i++) {
    const landmarks = results.multiHandLandmarks[i];
    const handState = handStates[i];
    handState.detectedInFrame = true;

    // Detect gesture
    const mode = getHandMode(landmarks);
    handState.currentMode = mode;

    // Draw overlay nodes on camera stream
    drawHandOverlay(landmarks, handState);

    // Map index tip coordinates to 3D Scene
    const hand3DPosition = mapLandmarksTo3D(landmarks, handState);

    // Update 3D Pointer Sphere
    handState.cursorPointer.position.copy(hand3DPosition);
    handState.cursorLight.position.copy(hand3DPosition);

    // Apply color logic based on mode
    if (mode === 'ERASE') {
      handState.cursorPointer.material.color.set('#ff3b30');
      handState.cursorLight.color.set('#ff3b30');
      handState.cursorPointer.scale.setScalar(2.0); // Make pointer larger to match eraser size
      handState.cursorPointer.visible = true;
      handState.cursorLight.visible = true;

      // Handle drawing teardown if switching directly from drawing to erasing
      if (handState.isDrawing) {
        handState.isDrawing = false;
        finishStroke(handState);
      }

      // Execute erasing checks
      handleErasing(hand3DPosition);

    } else if (mode === 'DRAW') {
      handState.cursorPointer.material.color.set(drawColor);
      handState.cursorLight.color.set(drawColor);
      handState.cursorPointer.scale.setScalar(1.0);
      handState.cursorPointer.visible = true;
      handState.cursorLight.visible = true;

      if (!handState.isDrawing) {
        handState.isDrawing = true;
      }
      handleDrawing(hand3DPosition, handState);

    } else if (mode === 'HOVER') {
      handState.cursorPointer.material.color.set(drawColor);
      handState.cursorLight.color.set(drawColor);
      handState.cursorPointer.scale.setScalar(1.0);
      handState.cursorPointer.visible = true;
      handState.cursorLight.visible = true;

      if (handState.isDrawing) {
        handState.isDrawing = false;
        finishStroke(handState);
      }

    } else {
      // mode is 'NONE' (fist folded)
      handState.cursorPointer.visible = false;
      handState.cursorLight.visible = false;

      if (handState.isDrawing) {
        handState.isDrawing = false;
        finishStroke(handState);
      }
    }
  }

  // Handle teardown of hands that left camera viewport
  handStates.forEach(handState => {
    if (!handState.detectedInFrame) {
      handState.currentMode = 'NONE';
      handState.cursorPointer.visible = false;
      handState.cursorLight.visible = false;
      
      if (handState.isDrawing) {
        handState.isDrawing = false;
        finishStroke(handState);
      }
    }
  });

  // Update overall HUD state text in sidebar panel
  updateHUDState();
}

// Update UI panel status based on active hand state modes
function updateHUDState() {
  const activeModes = handStates
    .filter(h => h.detectedInFrame)
    .map(h => h.currentMode);

  if (activeModes.includes('ERASE')) {
    stateIndicator.className = "state-indicator drawing"; // uses red/pink highlight
    stateIndicator.style.borderColor = "#ff3b30";
    stateIndicator.style.backgroundColor = "rgba(255, 59, 48, 0.15)";
    stateIndicator.style.color = "#ff3b30";
    gestureText.innerText = "ERASING";
    document.querySelector('.gesture-icon').innerText = "✌️";
  } else if (activeModes.includes('DRAW')) {
    stateIndicator.className = "state-indicator drawing";
    stateIndicator.style.borderColor = ""; // Reset inline colors to default css variables
    stateIndicator.style.backgroundColor = "";
    stateIndicator.style.color = "";
    gestureText.innerText = "DRAWING";
    document.querySelector('.gesture-icon').innerText = "🤏";
  } else if (activeModes.includes('HOVER')) {
    stateIndicator.className = "state-indicator";
    stateIndicator.style.borderColor = "";
    stateIndicator.style.backgroundColor = "";
    stateIndicator.style.color = "";
    gestureText.innerText = "HOVERING";
    document.querySelector('.gesture-icon').innerText = "🖐️";
  } else {
    stateIndicator.className = "state-indicator";
    stateIndicator.style.borderColor = "";
    stateIndicator.style.backgroundColor = "";
    stateIndicator.style.color = "";
    gestureText.innerText = "NO HANDS DETECTED";
    document.querySelector('.gesture-icon').innerText = "❌";
  }
}

// --- 6. Application Loop ---

function animate() {
  requestAnimationFrame(animate);

  // Star field rotation (Creates dynamic movement in space)
  if (starField) {
    starField.rotation.y += 0.0003;
    starField.rotation.x += 0.00015;
  }

  // Render update
  controls.update();
  renderer.render(scene, camera);
}

// --- 7. UI Controls Hookups ---

function setupUIListeners() {
  // Brush Color Pickers
  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      swatches.forEach(s => s.classList.remove('active'));
      e.target.classList.add('active');
      drawColor = e.target.getAttribute('data-color');
      updateCursorColor();
    });
  });

  const customColorPicker = document.getElementById('custom-color-picker');
  customColorPicker.addEventListener('input', (e) => {
    swatches.forEach(s => s.classList.remove('active'));
    drawColor = e.target.value;
    updateCursorColor();
  });

  // Brush Size
  const sizeSlider = document.getElementById('brush-size');
  sizeSlider.addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value);
    brushSizeVal.innerText = brushSize;
  });

  // Depth Offset
  const depthSlider = document.getElementById('depth-offset');
  depthSlider.addEventListener('input', (e) => {
    baseDepthOffset = parseInt(e.target.value);
    depthOffsetVal.innerText = baseDepthOffset;
  });

  // Smoothing Factor
  const smoothSlider = document.getElementById('draw-smoothing');
  smoothSlider.addEventListener('input', (e) => {
    smoothingFactor = parseFloat(e.target.value);
    smoothingVal.innerText = smoothingFactor.toFixed(2);
  });

  // Axis lock constraints
  const btnFree = document.getElementById('draw-mode-free');
  const btnXY = document.getElementById('draw-mode-xy');
  const btnXZ = document.getElementById('draw-mode-xz');
  
  function setSegmentActive(activeBtn) {
    [btnFree, btnXY, btnXZ].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  btnFree.addEventListener('click', () => {
    lockPlane = 'free';
    setSegmentActive(btnFree);
    showNotification("Mode: Free 3D Sketching");
  });
  btnXY.addEventListener('click', () => {
    lockPlane = 'xy';
    setSegmentActive(btnXY);
    showNotification("Mode: Locked onto XY Plane");
  });
  btnXZ.addEventListener('click', () => {
    lockPlane = 'xz';
    setSegmentActive(btnXZ);
    showNotification("Mode: Locked onto XZ Plane");
  });

  // Actions
  document.getElementById('btn-undo').addEventListener('click', performUndo);
  document.getElementById('btn-clear').addEventListener('click', performClear);
  document.getElementById('btn-export').addEventListener('click', performGLTFExport);
  document.getElementById('btn-reset-camera').addEventListener('click', resetCamera);
  document.getElementById('btn-toggle-camera-view').addEventListener('click', toggleCameraOverlay);

  // Floating Webcam widget size toggler
  const webcamPanel = document.getElementById('webcam-panel');
  document.getElementById('toggle-webcam-size').addEventListener('click', () => {
    webcamPanel.classList.toggle('expanded');
  });
}

function updateCursorColor() {
  handStates.forEach(handState => {
    if (handState.currentMode !== 'ERASE') {
      if (handState.cursorPointer) handState.cursorPointer.material.color.set(drawColor);
      if (handState.cursorLight) handState.cursorLight.color.set(drawColor);
    }
  });
}

// Undo Action
function performUndo() {
  if (allLines.length > 0) {
    const lastLineObj = allLines.pop();
    scene.remove(lastLineObj.mesh);
    lastLineObj.mesh.geometry.dispose();
    lastLineObj.mesh.material.dispose();
    showNotification("Stroke undone");
  } else {
    showNotification("Nothing to undo!");
  }
}

// Clear Action
function performClear() {
  if (allLines.length === 0) {
    showNotification("Canvas is already clear!");
    return;
  }

  allLines.forEach(line => {
    scene.remove(line.mesh);
    line.mesh.geometry.dispose();
    line.mesh.material.dispose();
  });
  allLines = [];
  
  handStates.forEach(handState => {
    if (handState.activeLineMesh) {
      scene.remove(handState.activeLineMesh);
      handState.activeLineMesh.geometry.dispose();
      handState.activeLineMesh = null;
    }
    handState.activePoints = [];
  });
  
  showNotification("Canvas cleared");
}

// Camera Reset
function resetCamera() {
  controls.reset();
  camera.position.set(0, 15, 35);
  controls.target.set(0, 0, 0);
  showNotification("Camera view reset");
}

// Hide/Show Webcam Stream
function toggleCameraOverlay() {
  const video = document.getElementById('webcam-video');
  const overlay = document.getElementById('webcam-overlay');
  
  const isHidden = video.style.display === 'none';
  video.style.display = isHidden ? 'block' : 'none';
  overlay.style.display = isHidden ? 'block' : 'none';
  
  showNotification(isHidden ? "Webcam visible" : "Webcam hidden");
}

// GLTF Export
function performGLTFExport() {
  if (allLines.length === 0) {
    showNotification("Draw something first before exporting!");
    return;
  }

  showNotification("Generating GLTF model...", 3000);

  const exportGroup = new THREE.Group();
  exportGroup.name = "SpatialSketch";
  
  allLines.forEach(line => {
    const clone = line.mesh.clone();
    clone.material = line.mesh.material.clone();
    exportGroup.add(clone);
  });

  const exporter = new THREE.GLTFExporter();
  
  exporter.parse(exportGroup, (gltf) => {
    const output = JSON.stringify(gltf, null, 2);
    downloadFile(output, 'application/json', 'spatial_sketch.gltf');
    showNotification("GLTF Model Exported Successfully!");
  }, (err) => {
    console.error("Export error:", err);
    showNotification("Export failed. See console.");
  }, { binary: false });
}

function downloadFile(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Notification Banner Helper
let notificationTimeout = null;
function showNotification(message, duration = 2000) {
  const banner = document.getElementById('notification-banner');
  const msgText = document.getElementById('notification-message');
  
  msgText.innerText = message;
  banner.classList.remove('hidden');
  
  if (notificationTimeout) clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => {
    banner.classList.add('hidden');
  }, duration);
}

// --- Start Execution ---
function startApp() {
  initThree();
  setupUIListeners();
  initHandTracking();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp);
}
