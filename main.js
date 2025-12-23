import * as THREE from 'three';

// ============================================================================
// GLOBAL STATE
// ============================================================================

const state = {
    // Three.js core
    scene: null,
    camera: null,
    renderer: null,

    // Tree components
    treeGroup: null,
    ornaments: [],
    lightBulbs: [],
    starGlow: null,

    // Interaction
    isDragging: false,
    previousPointer: { x: 0, y: 0 },
    rotationVelocity: { x: 0, y: 0 },
    targetRotation: { x: 0, y: 0 },
    currentRotation: { x: 0, y: 0 },

    // Pinch zoom
    initialPinchDistance: 0,
    initialCameraZ: 0,

    // Motion & shake
    motionEnabled: false,
    lastAccelMagnitude: 0,
    shakeThreshold: 14,
    shakeCooldown: false,
    lastShakeTime: 0,

    // Audio
    audioContext: null,
    isPlayingJingle: false,

    // Particles
    snowParticles: null,
    sparkleParticles: null,
    snowVelocities: [],
    sparkleVelocities: [],

    // Animation
    clock: new THREE.Clock(),
    time: 0,

    // Effects
    celebrationActive: false,
    wobblePhase: 0,
    lightWavePhase: 0,
};

// DOM elements
const canvas = document.getElementById('canvas');

// ============================================================================
// THREE.JS SCENE SETUP
// ============================================================================

function initScene() {
    // Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x0a0e27);
    state.scene.fog = new THREE.Fog(0x0a0e27, 10, 50);

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    state.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    state.camera.position.set(0, 2, 8);
    state.camera.lookAt(0, 2, 0);
    state.initialCameraZ = state.camera.position.z;

    // Renderer with device pixel ratio
    state.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: window.devicePixelRatio <= 1,
        powerPreference: 'high-performance',
    });
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 1.2;

    // Lighting
    setupLighting();

    // Ground (snow plane)
    createGround();

    // Tree
    createTree();

    // Particles
    createParticles();
}

// ============================================================================
// LIGHTING
// ============================================================================

function setupLighting() {
    // Low ambient
    const ambient = new THREE.AmbientLight(0x4060aa, 0.3);
    state.scene.add(ambient);

    // Key directional light
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    state.scene.add(keyLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.3);
    rimLight.position.set(-3, 3, -3);
    state.scene.add(rimLight);
}

// ============================================================================
// GROUND
// ============================================================================

function createGround() {
    const geometry = new THREE.PlaneGeometry(30, 30, 1, 1);
    const material = new THREE.MeshStandardMaterial({
        color: 0xf0f8ff,
        roughness: 0.9,
        metalness: 0.1,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    state.scene.add(ground);

    // Add subtle sparkle points on ground
    const sparkleCount = 100;
    const sparkleGeometry = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i++) {
        sparklePositions[i * 3] = (Math.random() - 0.5) * 20;
        sparklePositions[i * 3 + 1] = 0.01;
        sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
    });
    const groundSparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
    state.scene.add(groundSparkles);
}

// ============================================================================
// PROCEDURAL TREE
// ============================================================================

function createTree() {
    state.treeGroup = new THREE.Group();

    // 1. Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.9,
        metalness: 0.0,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    state.treeGroup.add(trunk);

    // 2. Foliage (stacked cones with organic variation)
    const foliageLayers = [
        { y: 1.2, radius: 1.4, height: 1.8 },
        { y: 2.3, radius: 1.1, height: 1.5 },
        { y: 3.2, radius: 0.8, height: 1.2 },
        { y: 4.0, radius: 0.5, height: 0.9 },
    ];

    foliageLayers.forEach(layer => {
        const segments = 16;
        const coneGeometry = new THREE.ConeGeometry(layer.radius, layer.height, segments, 4);

        // Add organic variation to vertices
        const positions = coneGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            const noise = (Math.random() - 0.5) * 0.1;
            positions.setX(i, x + noise);
            positions.setZ(i, z + noise);
        }
        positions.needsUpdate = true;
        coneGeometry.computeVertexNormals();

        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a5f3a,
            roughness: 0.8,
            metalness: 0.0,
            flatShading: true,
        });
        const cone = new THREE.Mesh(coneGeometry, foliageMaterial);
        cone.position.y = layer.y;
        cone.castShadow = true;
        cone.receiveShadow = true;
        state.treeGroup.add(cone);
    });

    // 3. Star at top
    const starShape = createStarShape();
    const starGeometry = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
    });
    const starMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.8,
        metalness: 0.5,
        roughness: 0.3,
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.y = 5.0;
    star.scale.set(0.25, 0.25, 0.25);
    state.treeGroup.add(star);

    // Star glow (fake bloom)
    const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
    });
    state.starGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    state.starGlow.position.y = 5.0;
    state.treeGroup.add(state.starGlow);

    // 4. Ornaments (instanced spheres)
    createOrnaments();

    // 5. Garland ribbon (helix tube)
    createGarland();

    // 6. Light bulbs (helix-wrapped emissive spheres)
    createLightBulbs();

    state.treeGroup.position.y = 0;
    state.scene.add(state.treeGroup);
}

function createStarShape() {
    const shape = new THREE.Shape();
    const outerRadius = 1;
    const innerRadius = 0.4;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();
    return shape;
}

function createOrnaments() {
    const ornamentGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const colors = [0xff6b6b, 0xffd700, 0x4169e1];
    const positions = [
        // Layer 1
        { x: 1.0, y: 1.5, z: 0 },
        { x: -0.8, y: 1.6, z: 0.5 },
        { x: 0.3, y: 1.4, z: -1.0 },
        // Layer 2
        { x: 0.7, y: 2.5, z: 0.7 },
        { x: -0.6, y: 2.6, z: -0.4 },
        { x: 0, y: 2.4, z: 0.9 },
        // Layer 3
        { x: 0.5, y: 3.3, z: -0.3 },
        { x: -0.4, y: 3.4, z: 0.4 },
        { x: 0.2, y: 3.2, z: -0.6 },
        // Layer 4
        { x: 0.3, y: 4.1, z: 0.2 },
        { x: -0.2, y: 4.2, z: -0.3 },
    ];

    positions.forEach((pos, i) => {
        const color = colors[i % colors.length];
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.2,
        });
        const ornament = new THREE.Mesh(ornamentGeometry, material);
        ornament.position.set(pos.x, pos.y, pos.z);
        ornament.castShadow = true;
        state.treeGroup.add(ornament);
        state.ornaments.push({
            mesh: ornament,
            originalPos: pos,
            jiggleOffset: new THREE.Vector3(0, 0, 0),
        });
    });
}

function createGarland() {
    // Helix curve
    const helixCurve = new THREE.CatmullRomCurve3(
        generateHelixPoints(1.5, 4.5, 1.2, 0.9, 3)
    );
    const tubeGeometry = new THREE.TubeGeometry(helixCurve, 100, 0.02, 8, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.6,
        roughness: 0.4,
    });
    const garland = new THREE.Mesh(tubeGeometry, tubeMaterial);
    state.treeGroup.add(garland);
}

function createLightBulbs() {
    const bulbGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulbColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];

    // Create 3 helix strands
    for (let strand = 0; strand < 3; strand++) {
        const points = generateHelixPoints(1.3, 4.8, 1.3, 0.6, 2.5, strand * (Math.PI * 2 / 3));
        points.forEach((point, i) => {
            if (i % 3 === 0) { // Space bulbs out
                const color = bulbColors[i % bulbColors.length];
                const bulbMaterial = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.6,
                });
                const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
                bulb.position.copy(point);
                state.treeGroup.add(bulb);

                // Glow sprite for fake bloom
                const glowGeometry = new THREE.SphereGeometry(0.08, 8, 8);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.2,
                    blending: THREE.AdditiveBlending,
                });
                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                glow.position.copy(point);
                state.treeGroup.add(glow);

                state.lightBulbs.push({
                    bulb: bulb,
                    glow: glow,
                    originalEmissive: 0.6,
                    baseY: point.y,
                    twinklePhase: Math.random() * Math.PI * 2,
                });
            }
        });
    }
}

// Helper: Generate helix points
function generateHelixPoints(yStart, yEnd, radiusStart, radiusEnd, turns, angleOffset = 0) {
    const points = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = yStart + (yEnd - yStart) * t;
        const radius = radiusStart + (radiusEnd - radiusStart) * t;
        const angle = t * turns * Math.PI * 2 + angleOffset;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        points.push(new THREE.Vector3(x, y, z));
    }
    return points;
}

// ============================================================================
// PARTICLES
// ============================================================================

function createParticles() {
    // Snow particles (continuous gentle fall)
    const snowCount = 600;
    const snowGeometry = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(snowCount * 3);

    for (let i = 0; i < snowCount; i++) {
        snowPositions[i * 3] = (Math.random() - 0.5) * 20;
        snowPositions[i * 3 + 1] = Math.random() * 15;
        snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;

        state.snowVelocities.push({
            x: (Math.random() - 0.5) * 0.2,
            y: -0.5 - Math.random() * 0.5,
            z: (Math.random() - 0.5) * 0.2,
        });
    }

    snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.08,
        transparent: true,
        opacity: 0.8,
    });
    state.snowParticles = new THREE.Points(snowGeometry, snowMaterial);
    state.scene.add(state.snowParticles);

    // Sparkle particles (event-based)
    const sparkleCount = 300;
    const sparkleGeometry = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);

    for (let i = 0; i < sparkleCount; i++) {
        sparklePositions[i * 3] = 0;
        sparklePositions[i * 3 + 1] = -100; // Hide initially
        sparklePositions[i * 3 + 2] = 0;

        state.sparkleVelocities.push({
            x: 0,
            y: 0,
            z: 0,
            life: 0,
        });
    }

    sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMaterial = new THREE.PointsMaterial({
        color: 0xffd700,
        size: 0.12,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
    });
    state.sparkleParticles = new THREE.Points(sparkleGeometry, sparkleMaterial);
    state.scene.add(state.sparkleParticles);
}

function updateParticles(delta) {
    // Update snow
    const snowPositions = state.snowParticles.geometry.attributes.position.array;
    for (let i = 0; i < snowPositions.length / 3; i++) {
        snowPositions[i * 3] += state.snowVelocities[i].x * delta;
        snowPositions[i * 3 + 1] += state.snowVelocities[i].y * delta;
        snowPositions[i * 3 + 2] += state.snowVelocities[i].z * delta;

        // Respawn at top
        if (snowPositions[i * 3 + 1] < 0) {
            snowPositions[i * 3 + 1] = 15;
            snowPositions[i * 3] = (Math.random() - 0.5) * 20;
            snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
    }
    state.snowParticles.geometry.attributes.position.needsUpdate = true;

    // Update sparkles
    const sparklePositions = state.sparkleParticles.geometry.attributes.position.array;
    for (let i = 0; i < sparklePositions.length / 3; i++) {
        if (state.sparkleVelocities[i].life > 0) {
            sparklePositions[i * 3] += state.sparkleVelocities[i].x * delta;
            sparklePositions[i * 3 + 1] += state.sparkleVelocities[i].y * delta;
            sparklePositions[i * 3 + 2] += state.sparkleVelocities[i].z * delta;

            // Gravity
            state.sparkleVelocities[i].y -= 2 * delta;
            state.sparkleVelocities[i].life -= delta;

            // Fade out
            if (state.sparkleVelocities[i].life <= 0) {
                sparklePositions[i * 3 + 1] = -100;
            }
        }
    }
    state.sparkleParticles.geometry.attributes.position.needsUpdate = true;
}

function triggerSparkleBurst() {
    const positions = state.sparkleParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
        // Position around tree
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.5 + Math.random() * 1.5;
        const height = 1 + Math.random() * 3;

        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = height;
        positions[i * 3 + 2] = Math.sin(angle) * radius;

        // Velocity outward and up
        state.sparkleVelocities[i].x = Math.cos(angle) * (1 + Math.random() * 2);
        state.sparkleVelocities[i].y = 2 + Math.random() * 3;
        state.sparkleVelocities[i].z = Math.sin(angle) * (1 + Math.random() * 2);
        state.sparkleVelocities[i].life = 1.5 + Math.random();
    }
    state.sparkleParticles.geometry.attributes.position.needsUpdate = true;
}

// ============================================================================
// DRAG ROTATION (POINTER EVENTS)
// ============================================================================

function onPointerDown(e) {
    if (e.pointerType === 'touch' && e.touches && e.touches.length === 2) {
        // Pinch zoom start
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        state.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
        state.initialCameraZ = state.camera.position.z;
        return;
    }

    state.isDragging = true;
    state.previousPointer = {
        x: e.clientX || (e.touches ? e.touches[0].clientX : 0),
        y: e.clientY || (e.touches ? e.touches[0].clientY : 0),
    };
    state.rotationVelocity = { x: 0, y: 0 };
}

function onPointerMove(e) {
    if (e.touches && e.touches.length === 2) {
        // Pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scale = distance / state.initialPinchDistance;
        state.camera.position.z = THREE.MathUtils.clamp(
            state.initialCameraZ / scale,
            4,
            12
        );
        return;
    }

    if (!state.isDragging) return;

    const currentX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const currentY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

    const deltaX = currentX - state.previousPointer.x;
    const deltaY = currentY - state.previousPointer.y;

    // Update target rotation
    state.targetRotation.y += deltaX * 0.01;
    state.targetRotation.x += deltaY * 0.01;
    state.targetRotation.x = THREE.MathUtils.clamp(state.targetRotation.x, -0.35, 0.35);

    // Store velocity for inertia
    state.rotationVelocity.x = deltaY * 0.01;
    state.rotationVelocity.y = deltaX * 0.01;

    state.previousPointer = { x: currentX, y: currentY };
}

function onPointerUp() {
    state.isDragging = false;
}

function updateRotation(delta) {
    // Apply inertia when not dragging
    if (!state.isDragging) {
        state.targetRotation.y += state.rotationVelocity.y;
        state.targetRotation.x += state.rotationVelocity.x;
        state.targetRotation.x = THREE.MathUtils.clamp(state.targetRotation.x, -0.35, 0.35);

        // Damping
        state.rotationVelocity.x *= 0.95;
        state.rotationVelocity.y *= 0.95;
    }

    // Smooth interpolation to target
    state.currentRotation.y += (state.targetRotation.y - state.currentRotation.y) * 0.1;
    state.currentRotation.x += (state.targetRotation.x - state.currentRotation.x) * 0.1;

    state.treeGroup.rotation.y = state.currentRotation.y;
    state.treeGroup.rotation.x = state.currentRotation.x;
}

// ============================================================================
// SHAKE DETECTION
// ============================================================================

function onDeviceMotion(e) {
    if (!state.motionEnabled || state.shakeCooldown) return;

    const accel = e.accelerationIncludingGravity;
    if (!accel || accel.x === null) return;

    // Compute magnitude
    const magnitude = Math.sqrt(
        accel.x * accel.x +
        accel.y * accel.y +
        accel.z * accel.z
    );

    // High-pass filter: detect sharp changes
    const delta = Math.abs(magnitude - state.lastAccelMagnitude);
    state.lastAccelMagnitude = magnitude;

    if (delta > state.shakeThreshold) {
        triggerShakeCelebration();
    }
}

function triggerShakeCelebration() {
    if (state.shakeCooldown) return;

    state.shakeCooldown = true;
    state.lastShakeTime = Date.now();

    // Play jingle
    playJingle();

    // Trigger visual effects
    startCelebrationEffects();

    // Cooldown
    setTimeout(() => {
        state.shakeCooldown = false;
    }, 2000);
}

// ============================================================================
// WEB AUDIO SYNTHESIS (ORIGINAL JINGLE)
// ============================================================================

function playJingle() {
    if (state.isPlayingJingle || !state.audioContext) return;

    state.isPlayingJingle = true;

    // Resume audio context if suspended
    if (state.audioContext.state === 'suspended') {
        state.audioContext.resume();
    }

    // Original melody notes (C major scale, festive pattern)
    // C D E C | C D E C | E F G | E F G | G A G F E C | G A G F E C | C G C | C G C
    const melody = [
        { note: 'C5', duration: 0.3 },
        { note: 'D5', duration: 0.3 },
        { note: 'E5', duration: 0.3 },
        { note: 'C5', duration: 0.3 },
        { note: 'C5', duration: 0.3 },
        { note: 'D5', duration: 0.3 },
        { note: 'E5', duration: 0.3 },
        { note: 'C5', duration: 0.3 },
        { note: 'E5', duration: 0.3 },
        { note: 'F5', duration: 0.3 },
        { note: 'G5', duration: 0.6 },
        { note: 'E5', duration: 0.3 },
        { note: 'F5', duration: 0.3 },
        { note: 'G5', duration: 0.6 },
        { note: 'G5', duration: 0.2 },
        { note: 'A5', duration: 0.2 },
        { note: 'G5', duration: 0.2 },
        { note: 'F5', duration: 0.2 },
        { note: 'E5', duration: 0.3 },
        { note: 'C5', duration: 0.3 },
        { note: 'G5', duration: 0.2 },
        { note: 'A5', duration: 0.2 },
        { note: 'G5', duration: 0.2 },
        { note: 'F5', duration: 0.2 },
        { note: 'E5', duration: 0.3 },
        { note: 'C5', duration: 0.3 },
        { note: 'C5', duration: 0.3 },
        { note: 'G4', duration: 0.3 },
        { note: 'C5', duration: 0.6 },
    ];

    const noteFrequencies = {
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
        'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00,
    };

    let time = state.audioContext.currentTime;

    melody.forEach(({ note, duration }) => {
        playNote(noteFrequencies[note], time, duration);
        time += duration;
    });

    // Reset flag after melody finishes
    setTimeout(() => {
        state.isPlayingJingle = false;
    }, time * 1000);
}

function playNote(frequency, startTime, duration) {
    const ctx = state.audioContext;

    // Melody oscillator (sine with ADSR)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02); // Attack
    gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05); // Decay
    gainNode.gain.setValueAtTime(0.1, startTime + duration - 0.05); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // Release

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    // Harmony (square wave, lower volume)
    const harmOsc = ctx.createOscillator();
    harmOsc.type = 'square';
    harmOsc.frequency.setValueAtTime(frequency * 0.5, startTime); // Octave down

    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0, startTime);
    harmGain.gain.linearRampToValueAtTime(0.03, startTime + 0.02);
    harmGain.gain.linearRampToValueAtTime(0.02, startTime + 0.05);
    harmGain.gain.setValueAtTime(0.02, startTime + duration - 0.05);
    harmGain.gain.linearRampToValueAtTime(0, startTime + duration);

    harmOsc.connect(harmGain);
    harmGain.connect(ctx.destination);

    harmOsc.start(startTime);
    harmOsc.stop(startTime + duration);

    // Bell shimmer (noise burst at start)
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(frequency * 4, startTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, startTime);
    noiseGain.gain.linearRampToValueAtTime(0, startTime + 0.05);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(startTime);
}

// ============================================================================
// CELEBRATION VISUAL EFFECTS
// ============================================================================

function startCelebrationEffects() {
    state.celebrationActive = true;
    state.wobblePhase = 0;
    state.lightWavePhase = 0;

    // Trigger sparkle burst
    triggerSparkleBurst();

    // Increase snow briefly
    const snowMaterial = state.snowParticles.material;
    snowMaterial.opacity = 1.2;
    setTimeout(() => {
        snowMaterial.opacity = 0.8;
    }, 1500);

    // End celebration after 2 seconds
    setTimeout(() => {
        state.celebrationActive = false;
    }, 2000);
}

function updateCelebrationEffects(delta) {
    if (!state.celebrationActive) return;

    state.wobblePhase += delta * 8;
    state.lightWavePhase += delta * 3;

    // Tree wobble (rotation + scale pulse)
    const wobble = Math.sin(state.wobblePhase) * 0.05;
    state.treeGroup.rotation.z = wobble;
    const scalePulse = 1 + Math.sin(state.wobblePhase * 2) * 0.02;
    state.treeGroup.scale.set(scalePulse, scalePulse, scalePulse);

    // Ornament jiggle
    state.ornaments.forEach(ornament => {
        if (state.wobblePhase < Math.PI * 2) {
            const jiggle = Math.sin(state.wobblePhase * 3) * 0.05;
            ornament.jiggleOffset.x = (Math.random() - 0.5) * jiggle;
            ornament.jiggleOffset.y = (Math.random() - 0.5) * jiggle;
            ornament.jiggleOffset.z = (Math.random() - 0.5) * jiggle;
        } else {
            // Decay to zero
            ornament.jiggleOffset.multiplyScalar(0.9);
        }
        ornament.mesh.position.set(
            ornament.originalPos.x + ornament.jiggleOffset.x,
            ornament.originalPos.y + ornament.jiggleOffset.y,
            ornament.originalPos.z + ornament.jiggleOffset.z
        );
    });

    // Light wave (bottom to top)
    state.lightBulbs.forEach(bulb => {
        const waveProgress = state.lightWavePhase / 0.8; // 0.8s wave duration
        const normalizedY = (bulb.baseY - 1.3) / (4.8 - 1.3);

        if (waveProgress >= normalizedY && waveProgress <= normalizedY + 0.2) {
            bulb.bulb.material.emissiveIntensity = 1.5;
            bulb.glow.material.opacity = 0.6;
        } else {
            bulb.bulb.material.emissiveIntensity = bulb.originalEmissive;
            bulb.glow.material.opacity = 0.2;
        }
    });

    // Star glow pulse
    const glowPulse = 0.3 + Math.sin(state.wobblePhase * 4) * 0.2;
    state.starGlow.material.opacity = glowPulse;
}

function updateLightTwinkle() {
    // Continuous twinkle effect (independent of celebration)
    state.lightBulbs.forEach(bulb => {
        if (!state.celebrationActive) {
            bulb.twinklePhase += 0.05;
            const twinkle = Math.sin(bulb.twinklePhase) * 0.3;
            bulb.bulb.material.emissiveIntensity = bulb.originalEmissive + twinkle;
            bulb.glow.material.opacity = 0.2 + twinkle * 0.2;
        }
    });
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function animate() {
    requestAnimationFrame(animate);

    const delta = state.clock.getDelta();
    state.time += delta;

    // Update rotation
    updateRotation(delta);

    // Update particles
    updateParticles(delta);

    // Update light twinkle
    updateLightTwinkle();

    // Update celebration effects
    updateCelebrationEffects(delta);

    // Render
    state.renderer.render(state.scene, state.camera);
}

// ============================================================================
// WINDOW RESIZE
// ============================================================================

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();

    state.renderer.setSize(width, height);
}

// ============================================================================
// PERMISSION & INITIALIZATION
// ============================================================================

function setupMotionDetection() {
    // Auto-enable motion without iOS permission (will be requested on first interaction if needed)
    if (typeof DeviceMotionEvent !== 'undefined') {
        state.motionEnabled = true;
        window.addEventListener('devicemotion', onDeviceMotion);
    }
}

function initAudioContext() {
    try {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return true;
    } catch (error) {
        console.error('Audio context error:', error);
        return false;
    }
}

function init() {
    // Setup motion detection
    setupMotionDetection();

    // Initialize audio context
    initAudioContext();

    // Start animation loop
    animate();
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Pointer events for drag
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);

// Touch events for pinch
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
canvas.addEventListener('touchend', onPointerUp, { passive: false });

// Prevent default touch behaviors on canvas
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// Desktop fallback: keyboard 'S' to simulate shake
window.addEventListener('keydown', (e) => {
    if (e.key === 's' || e.key === 'S') {
        triggerShakeCelebration();
    }
});

// Window resize
window.addEventListener('resize', onWindowResize);

// ============================================================================
// INITIALIZE
// ============================================================================

initScene();
init();
