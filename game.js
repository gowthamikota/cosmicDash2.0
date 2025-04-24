import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Game state
let scene, camera, renderer, player;
let obstacles = [];
let collectibles = [];
let powerUps = [];
let score = 0;
let combo = 1;
let highestCombo = 1;
let health = 100;
let isGameOver = false;
let isGameStarted = false;
let powerUpActive = false;
let powerUpEndTime = 0;
let comboTimeout = null;
let lastTime = 0;
let playerVelocity = 0;
let gameSpeed = 1;
let level = 1;
let particles = [];
let isInvincible = false;
let invincibleEndTime = 0;
let targetColumn = 0;
let isMoving = false;
let isMobileDevice = false;
let lastTouchTime = 0;
let touchStartX = 0;
let touchStartY = 0;
let mouseStartX = 0;
let mouseStartY = 0;
let isMouseDown = false;
let lastClickTime = 0;
let joystickActive = false;
let joystickPosition = { x: 0, y: 0 };
let joystickHandle = null;
let joystickBase = null;
const JOYSTICK_TRANSITION_SPEED = 0.2;
const JOYSTICK_SMOOTHING = 0.15;
const JOYSTICK_RADIUS = 60;
const JOYSTICK_HANDLE_RADIUS = 25;
const JOYSTICK_DEADZONE = 0.1;
const DOUBLE_TAP_DELAY = 300;
const MOUSE_SENSITIVITY = 1.5;
const MOUSE_SMOOTHING = 0.2;
const DOUBLE_CLICK_DELAY = 300;

// Game settings
const JUMP_FORCE = 0.25;
const GRAVITY = 0.015;
const OBSTACLE_SPEED = 0.12;
const COLLECTIBLE_SPAWN_RATE = 0.015;
const POWER_UP_DURATION = 5000;
const COMBO_TIMEOUT = 2000;
const INVINCIBLE_DURATION = 3000;
const LEVEL_UP_SCORE = 1000;
const COLUMN_TRANSITION_SPEED = 0.15;

// Column positions
const COLUMN_POSITIONS = [-3, 0, 3]; // Left, Center, Right columns

// Add to existing constants
const RUNWAY_SEGMENTS = 50;
const RUNWAY_WIDTH = 20;
const RUNWAY_LENGTH = 100;
const STAR_COUNT = 200;
const NEBULA_PARTICLES = 100;
const NEBULA_COLORS = [
    0x6C5CE7, // Purple
    0x00FFFF, // Cyan
    0xFF00FF, // Magenta
    0x00FF00  // Green
];
const BACKGROUND_ELEMENTS = {
    planets: 3,
    asteroids: 20,
    spaceDebris: 30
};
const GALAXY_ELEMENTS = {
    planets: 5,
    asteroids: 30,
    spaceDebris: 40,
    nebulaClouds: 4,
    energyOrbs: 15,
    starClusters: 2
};

// Add runway effects
const RUNWAY_EFFECTS = {
    energyLines: 20,
    glowParticles: 50
};

// Add new constants for space elements
const SPACE_ELEMENTS = {
    microStars: 200,
    spaceDust: 150,
    energyFlecks: 100
};

// Add UI enhancement constants
const UI_EFFECTS = {
    scoreGlow: true,
    healthPulse: true,
    comboSparkles: true
};

// Initialize the game
function init() {
    // Check if device is mobile
    isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('Is mobile device:', isMobileDevice);

    // Remove any existing viewport meta tag
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (existingViewport) {
        existingViewport.remove();
    }

    // Add viewport meta tag
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(viewport);

    // Add mobile-specific styles
    const mobileStyles = document.createElement('style');
    mobileStyles.textContent = `
        @media (max-width: 768px) {
            #score { font-size: 24px; }
            #combo { font-size: 20px; }
            #health-bar { height: 15px; }
            .start-screen, .game-over {
                font-size: 24px;
                padding: 20px;
            }
            .button {
                padding: 12px 24px;
                font-size: 18px;
                min-width: 120px;
            }
        }
        body {
            touch-action: none;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            overscroll-behavior: contain;
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        canvas {
            touch-action: none;
        }
        #joystick-base {
            display: none;
            pointer-events: auto;
            position: fixed;
            left: 50%;
            bottom: 150px;
            transform: translateX(-50%);
            width: 120px;
            height: 120px;
            background-color: rgba(108, 92, 231, 0.2);
            border: 3px solid rgba(108, 92, 231, 0.8);
            border-radius: 50%;
            z-index: 9999;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            transition: all 0.3s ease;
            box-shadow: 0 0 20px rgba(108, 92, 231, 0.3);
        }
        #joystick-base.visible {
            display: block;
        }
        #joystick-handle {
            position: absolute;
            width: 50px;
            height: 50px;
            background: radial-gradient(circle at 30% 30%, rgba(108, 92, 231, 1), rgba(108, 92, 231, 0.8));
            border-radius: 50%;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            box-shadow: 0 0 15px rgba(108, 92, 231, 0.6);
            transition: transform 0.3s cubic-bezier(0.4, 0.22, 0.28, 1);
        }
        #joystick-base.active {
            background-color: rgba(108, 92, 231, 0.3);
            box-shadow: 0 0 30px rgba(108, 92, 231, 0.5);
        }
        .game-area {
            cursor: none;
        }
        .custom-cursor {
            position: fixed;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(108, 92, 231, 0.8);
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            transition: transform 0.1s ease;
            display: none;
        }
        .custom-cursor.active {
            transform: scale(0.8);
            background: rgba(108, 92, 231, 0.3);
        }
        .custom-cursor.visible {
            display: block;
        }
    `;
    document.head.appendChild(mobileStyles);

    // Create scene and setup
    setupScene();
    setupEventListeners();
    
    // Create joystick
    createVirtualJoystick();
    
    // Create custom cursor
    createCustomCursor();
    
    // Start animation loop
    lastTime = performance.now();
    animate();
}

// Setup scene and renderer
function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 5, isMobileDevice ? 15 : 20);

    // Create galaxy effect
    createGalaxyEffect();

    // Create camera with adjusted FOV for mobile
    camera = new THREE.PerspectiveCamera(
        isMobileDevice ? 85 : 75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Create renderer with mobile optimizations
    renderer = new THREE.WebGLRenderer({
        antialias: !isMobileDevice,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isMobileDevice ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isMobileDevice;
    document.body.appendChild(renderer.domElement);

    // Create game objects
    createPlayer();
    createGround();
    createLights();
}

// Setup event listeners
function setupEventListeners() {
    // Remove any existing listeners
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('orientationchange', onOrientationChange);

    // Add event listeners
    window.addEventListener('resize', onWindowResize, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('keyup', onKeyUp, { passive: true });

    if (isMobileDevice) {
        console.log('Setting up mobile event listeners');
        document.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: false });
        window.addEventListener('orientationchange', onOrientationChange);
    } else {
        window.addEventListener('mousedown', onMouseDown, { passive: true });
        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('mouseup', onMouseUp, { passive: true });
        // Prevent text selection during gameplay
        window.addEventListener('selectstart', e => {
            if (isGameStarted && !isGameOver) e.preventDefault();
        });
    }
}

// Handle touch events with improved reliability
function onTouchStart(event) {
    event.preventDefault();
    if (!isGameStarted || isGameOver) return;

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    const now = Date.now();
    if (now - lastTouchTime < DOUBLE_TAP_DELAY) {
        if (Math.abs(player.position.y - 0.5) < 0.1) {
            playerVelocity = JUMP_FORCE;
        }
        lastTouchTime = 0;
    } else {
        lastTouchTime = now;
    }

    if (joystickBase) {
        const rect = joystickBase.getBoundingClientRect();
        joystickPosition.x = rect.left + rect.width / 2;
        joystickPosition.y = rect.top + rect.height / 2;
        joystickActive = true;
        joystickBase.classList.add('active');
        updateJoystickPosition(touch.clientX, touch.clientY);
    }
}

function onTouchMove(event) {
    event.preventDefault();
    if (!joystickActive || !isGameStarted || isGameOver) return;

    const touch = event.touches[0];
    updateJoystickPosition(touch.clientX, touch.clientY);
}

function onTouchEnd(event) {
    event.preventDefault();
    if (joystickActive) {
        joystickActive = false;
        joystickBase.classList.remove('active');
        lastHandleX = 0;
        lastHandleY = 0;
        joystickHandle.style.transform = 'translate(-50%, -50%)';
        
        if (Math.abs(lastHandleX / JOYSTICK_RADIUS) < JOYSTICK_DEADZONE) {
            isMoving = false;
        }
    }
}

// Create virtual joystick with improved mobile support
function createVirtualJoystick() {
    // Remove existing joystick if any
    const existingJoystick = document.getElementById('joystick-base');
    if (existingJoystick) {
        existingJoystick.remove();
    }

    // Create joystick base
    joystickBase = document.createElement('div');
    joystickBase.id = 'joystick-base';
    document.body.appendChild(joystickBase);

    // Create joystick handle
    joystickHandle = document.createElement('div');
    joystickHandle.id = 'joystick-handle';
    joystickBase.appendChild(joystickHandle);

    // Add glow effect
    const glowEffect = document.createElement('div');
    glowEffect.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle at center, rgba(108, 92, 231, 0.2) 0%, transparent 70%);
        pointer-events: none;
    `;
    joystickBase.appendChild(glowEffect);

    // Always show the joystick
    joystickBase.style.display = 'block';
}

// Handle orientation change with improved reliability
function onOrientationChange() {
    if (!isMobileDevice) return;
    
    setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        
        if (joystickBase) {
            joystickBase.style.bottom = '150px';
        }

        // Update debug info
        updateDebugInfo('Orientation changed: ' + width + 'x' + height);
    }, 100);
}

// Debug helper function
function updateDebugInfo(message) {
    const debugOverlay = document.getElementById('debug-overlay');
    if (debugOverlay) {
        debugOverlay.textContent = message;
    }
}

// Create player with enhanced appearance
function createPlayer() {
    const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const playerMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x6C5CE7,
        shininess: 100,
        emissive: 0x6C5CE7,
        emissiveIntensity: 0.5
    });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 0.5, 0);
    player.castShadow = true;
    
    // Add player glow
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x6C5CE7,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.5;
    player.add(glow);
    
    scene.add(player);
}

// Create space ground
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(100, 20);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x0a0a1a,
        side: THREE.DoubleSide,
        shininess: 30,
        emissive: 0x1a1a2e,
        emissiveIntensity: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

// Add space lighting
function createLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Add colored point lights for atmosphere
    const blueLight = new THREE.PointLight(0x00ffff, 0.5, 20);
    blueLight.position.set(-5, 5, -10);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0xff00ff, 0.5, 20);
    purpleLight.position.set(5, 5, -10);
    scene.add(purpleLight);
}

// Create obstacles with variety and column alignment
function createObstacle() {
    const types = ['box', 'pyramid', 'cylinder'];
    const type = types[Math.floor(Math.random() * types.length)];
    let geometry, material;
    
    switch(type) {
        case 'box':
            geometry = new THREE.BoxGeometry(1, 1, 1);
            break;
        case 'pyramid':
            geometry = new THREE.ConeGeometry(0.7, 1, 4);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
            break;
    }
    
    material = new THREE.MeshPhongMaterial({ 
        color: 0xFF4757,
        emissive: 0xFF4757,
        emissiveIntensity: 0.5
    });
    
    const obstacle = new THREE.Mesh(geometry, material);
    const columnIndex = Math.floor(Math.random() * 3);
    obstacle.position.set(
        COLUMN_POSITIONS[columnIndex],
        0.5,
        -20
    );
    
    obstacle.castShadow = true;
    
    // Add obstacle glow
    const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF4757,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    obstacle.add(glow);
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

// Create collectibles with column alignment
function createCollectible() {
    const types = ['coin', 'gem', 'star'];
    const type = types[Math.floor(Math.random() * types.length)];
    let geometry, material;
    
    switch(type) {
        case 'coin':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
            material = new THREE.MeshPhongMaterial({ 
                color: 0xFFD700,
                emissive: 0xFFD700,
                emissiveIntensity: 0.5
            });
            break;
        case 'gem':
            geometry = new THREE.OctahedronGeometry(0.4);
            material = new THREE.MeshPhongMaterial({ 
                color: 0x00FF00,
                emissive: 0x00FF00,
                emissiveIntensity: 0.5
            });
            break;
        case 'star':
            geometry = new THREE.StarGeometry(0.5);
            material = new THREE.MeshPhongMaterial({ 
                color: 0xFF00FF,
                emissive: 0xFF00FF,
                emissiveIntensity: 0.5
            });
            break;
    }
    
    const collectible = new THREE.Mesh(geometry, material);
    const columnIndex = Math.floor(Math.random() * 3);
    collectible.position.set(
        COLUMN_POSITIONS[columnIndex],
        1,
        -20
    );
    
    collectible.castShadow = true;
    scene.add(collectible);
    collectibles.push(collectible);
}

// Create power-ups with column alignment
function createPowerUp() {
    const geometry = new THREE.SphereGeometry(0.6, 16, 16);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0x00FFFF,
        emissive: 0x00FFFF,
        emissiveIntensity: 0.8
    });
    
    const powerUp = new THREE.Mesh(geometry, material);
    const columnIndex = Math.floor(Math.random() * 3);
    powerUp.position.set(
        COLUMN_POSITIONS[columnIndex],
        1.5,
        -20
    );
    
    powerUp.castShadow = true;
    scene.add(powerUp);
    powerUps.push(powerUp);
}

// Handle keyboard input with smooth column transitions
function onKeyDown(event) {
    if (!isGameStarted || isGameOver) return;

    switch(event.key) {
        case 'ArrowLeft':
            const currentColumn = COLUMN_POSITIONS.findIndex(pos => 
                Math.abs(player.position.x - pos) < 0.1
            );
            if (currentColumn > 0) {
                targetColumn = currentColumn - 1;
                isMoving = true;
            }
            break;
        case 'ArrowRight':
            const currentCol = COLUMN_POSITIONS.findIndex(pos => 
                Math.abs(player.position.x - pos) < 0.1
            );
            if (currentCol < COLUMN_POSITIONS.length - 1) {
                targetColumn = currentCol + 1;
                isMoving = true;
            }
            break;
        case 'ArrowUp':
            if (Math.abs(player.position.y - 0.5) < 0.1) {
                playerVelocity = JUMP_FORCE;
            }
            break;
    }
}

// Start game with cursor setup
function startGame() {
    // Reset game state
    isGameStarted = true;
    isGameOver = false;
    score = 0;
    health = 100;
    combo = 1;
    highestCombo = 1;
    
    // Reset player position
    player.position.set(0, 0.5, 0);
    player.velocity = 0;
    
    // Clear existing obstacles and collectibles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    collectibles.forEach(collectible => scene.remove(collectible));
    obstacles = [];
    collectibles = [];
    
    // Show joystick for mobile
    if (isMobileDevice) {
        createVirtualJoystick();
        if (joystickBase) {
            joystickBase.classList.add('visible');
            // Force a reflow to ensure the joystick is visible
            joystickBase.offsetHeight;
        }
    }
    
    // Show custom cursor for mouse users
    if (!isMobileDevice) {
        const cursor = document.querySelector('.custom-cursor');
        if (cursor) cursor.classList.add('visible');
    }
    
    // Update UI
    const startScreen = document.querySelector('.start-screen');
    const gameOverScreen = document.getElementById('gameOver');
    
    if (startScreen) {
        startScreen.style.display = 'none';
        // Force a reflow to ensure the screen is hidden
        startScreen.offsetHeight;
    }
    
    if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
    }
    
    document.querySelector('.power-up').classList.remove('active');
    updateScore();
    updateCombo();
    updateHealthBar();
    
    // Log game start
    console.log('Game started:', {
        isMobileDevice,
        joystickVisible: joystickBase ? joystickBase.classList.contains('visible') : false,
        startScreenHidden: startScreen ? startScreen.style.display === 'none' : false
    });
}

// Update joystick position and player movement with improved responsiveness
let lastHandleX = 0;
let lastHandleY = 0;

function updateJoystickPosition(x, y) {
    if (!joystickActive || !joystickBase || !joystickHandle) return;
    
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = JOYSTICK_RADIUS;
    
    // Calculate normalized direction with improved smoothing
    const normalizedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);
    
    // Update joystick handle position with faster response
    const targetHandleX = (normalizedDistance / maxDistance) * JOYSTICK_RADIUS * Math.cos(angle);
    const targetHandleY = (normalizedDistance / maxDistance) * JOYSTICK_RADIUS * Math.sin(angle);
    
    // Smoother interpolation with increased responsiveness
    lastHandleX += (targetHandleX - lastHandleX) * JOYSTICK_SMOOTHING;
    lastHandleY += (targetHandleY - lastHandleY) * JOYSTICK_SMOOTHING;
    
    joystickHandle.style.transform = `translate(calc(-50% + ${lastHandleX}px), calc(-50% + ${lastHandleY}px))`;
    
    // Update player movement with improved responsiveness
    const normalizedX = lastHandleX / JOYSTICK_RADIUS;
    if (Math.abs(normalizedX) > JOYSTICK_DEADZONE) {
        if (normalizedX < -0.3) {
            targetColumn = 0;
        } else if (normalizedX > 0.3) {
            targetColumn = 2;
        } else {
            targetColumn = 1;
        }
        isMoving = true;
    }
    
    // Handle jumping with improved responsiveness
    const normalizedY = lastHandleY / JOYSTICK_RADIUS;
    if (normalizedY < -0.3 && Math.abs(player.position.y - 0.5) < 0.1) {
        playerVelocity = JUMP_FORCE;
    }
}

// Enhanced mouse event handlers
function onMouseDown(event) {
    if (!isGameStarted || isGameOver) return;
    
    isMouseDown = true;
    mouseStartX = event.clientX;
    mouseStartY = event.clientY;
    
    // Handle double click for jump
    const now = Date.now();
    if (now - lastClickTime < DOUBLE_CLICK_DELAY) {
        if (Math.abs(player.position.y - 0.5) < 0.1) {
            playerVelocity = JUMP_FORCE;
        }
        lastClickTime = 0;
    } else {
        lastClickTime = now;
    }

    // Update cursor state
    const cursor = document.querySelector('.custom-cursor');
    if (cursor) cursor.classList.add('active');

    if (joystickBase) {
        const rect = joystickBase.getBoundingClientRect();
        joystickPosition.x = rect.left + rect.width / 2;
        joystickPosition.y = rect.top + rect.height / 2;
        joystickActive = true;
        joystickBase.classList.add('active');
        updateJoystickPosition(event.clientX, event.clientY);
    }
}

function onMouseMove(event) {
    // Update custom cursor
    updateCustomCursor(event);

    if (!isGameStarted || isGameOver) return;

    if (isMouseDown) {
        const dx = (event.clientX - mouseStartX) * MOUSE_SENSITIVITY;
        const normalizedX = dx / window.innerWidth;
        
        // Smooth column transition based on mouse movement
        if (Math.abs(normalizedX) > 0.05) {
            const currentColumn = COLUMN_POSITIONS.findIndex(pos => 
                Math.abs(player.position.x - pos) < 0.1
            );
            
            if (normalizedX < 0 && currentColumn > 0) {
                targetColumn = currentColumn - 1;
                isMoving = true;
            } else if (normalizedX > 0 && currentColumn < COLUMN_POSITIONS.length - 1) {
                targetColumn = currentColumn + 1;
                isMoving = true;
            }
            
            // Update start position for next movement
            mouseStartX = event.clientX;
        }
    }

    // Update joystick if active
    if (joystickActive) {
        updateJoystickPosition(event.clientX, event.clientY);
    }
}

function onMouseUp(event) {
    isMouseDown = false;
    
    // Update cursor state
    const cursor = document.querySelector('.custom-cursor');
    if (cursor) cursor.classList.remove('active');

    if (joystickActive) {
        joystickActive = false;
        joystickBase.classList.remove('active');
        lastHandleX = 0;
        lastHandleY = 0;
        joystickHandle.style.transform = 'translate(-50%, -50%)';
    }
}

// Update game state with smooth transitions
function update(currentTime) {
    if (!isGameStarted || isGameOver) return;

    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Smooth column transition with improved mouse movement
    if (isMoving) {
        const targetX = COLUMN_POSITIONS[targetColumn];
        const dx = targetX - player.position.x;
        const moveSpeed = isMobileDevice ? COLUMN_TRANSITION_SPEED : MOUSE_SMOOTHING;
        player.position.x += dx * moveSpeed;
        
        if (Math.abs(dx) < 0.01) {
            player.position.x = targetX;
            isMoving = false;
        }
    }

    // Update player vertical movement
    playerVelocity -= GRAVITY * deltaTime * 60;
    player.position.y += playerVelocity * deltaTime * 60;
    
    if (player.position.y < 0.5) {
        player.position.y = 0.5;
        if (playerVelocity < -0.1) {
            playerVelocity = -playerVelocity * 0.2;
        } else {
        playerVelocity = 0;
        }
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].position.z += OBSTACLE_SPEED * gameSpeed * deltaTime * 60;
        obstacles[i].rotation.y += 0.01 * deltaTime * 60;

        if (checkCollision(player, obstacles[i])) {
            if (!isInvincible) {
                takeDamage();
                createCollisionParticles(obstacles[i].position);
            }
            scene.remove(obstacles[i]);
            obstacles.splice(i, 1);
        } else if (obstacles[i].position.z > 10) {
            scene.remove(obstacles[i]);
            obstacles.splice(i, 1);
        }
    }

    // Update collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
        collectibles[i].position.z += OBSTACLE_SPEED * gameSpeed * deltaTime * 60;
        collectibles[i].rotation.y += 0.05 * deltaTime * 60;
        collectibles[i].position.y = 1 + Math.sin(currentTime * 0.002 + i) * 0.1;
        
        if (checkCollision(player, collectibles[i])) {
            collectItem(collectibles[i]);
            createCollectParticles(collectibles[i].position);
            scene.remove(collectibles[i]);
            collectibles.splice(i, 1);
        } else if (collectibles[i].position.z > 10) {
            scene.remove(collectibles[i]);
            collectibles.splice(i, 1);
        }
    }

    // Update power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].position.z += OBSTACLE_SPEED * gameSpeed * deltaTime * 60;
        powerUps[i].rotation.y += 0.05 * deltaTime * 60;
        powerUps[i].position.y = 1.5 + Math.sin(currentTime * 0.002 + i) * 0.15;
        
        if (checkCollision(player, powerUps[i])) {
            activatePowerUp();
            createPowerUpParticles(powerUps[i].position);
            scene.remove(powerUps[i]);
            powerUps.splice(i, 1);
        } else if (powerUps[i].position.z > 10) {
            scene.remove(powerUps[i]);
            powerUps.splice(i, 1);
        }
    }

    // Spawn objects
    if (Math.random() < 0.015 * deltaTime * 60) {
        createObstacle();
    }
    
    if (Math.random() < COLLECTIBLE_SPAWN_RATE * deltaTime * 60) {
        createCollectible();
    }
    
    if (Math.random() < 0.003 * deltaTime * 60) {
        createPowerUp();
    }

    // Update states
    if (powerUpActive && Date.now() > powerUpEndTime) {
        powerUpActive = false;
        document.querySelector('.power-up').classList.remove('active');
    }
    
    if (isInvincible && Date.now() > invincibleEndTime) {
        isInvincible = false;
        player.material.emissiveIntensity = 0.2;
    }

    // Update camera
    camera.position.x += (player.position.x - camera.position.x) * 0.05;
    camera.position.y += (player.position.y + 2 - camera.position.y) * 0.05;

    // Update particles
    updateParticles(deltaTime);

    // Check level up
    if (score >= level * LEVEL_UP_SCORE) {
        levelUp();
    }

    // Optimize particle count for mobile
    if (isMobileDevice && particles.length > 50) {
        particles.length = 50;
    }

    // More subtle animation for background elements
    scene.children.forEach(object => {
        if (object.userData) {
            // Handle rotation
            if (object.userData.rotationSpeed) {
                if (typeof object.userData.rotationSpeed === 'number') {
                    object.rotation.z += object.userData.rotationSpeed;
                } else {
                    object.rotation.x += object.userData.rotationSpeed.x;
                    object.rotation.y += object.userData.rotationSpeed.y;
                    object.rotation.z += object.userData.rotationSpeed.z;
                }
            }
            
            // Handle movement
            if (object.userData.movementSpeed) {
                object.position.z += object.userData.movementSpeed;
                if (object.position.z > 0) {
                    object.position.z = -50;
                }
            }
            
            // Handle pulsing
            if (object.userData.pulseSpeed) {
                const scale = object.userData.originalScale + Math.sin(currentTime * object.userData.pulseSpeed) * 0.1;
                object.scale.set(scale, scale, scale);
                
                // Subtle color pulsing for energy orbs
                if (object.userData.color) {
                    const intensity = 0.3 + Math.sin(currentTime * object.userData.pulseSpeed) * 0.2;
                    object.material.emissiveIntensity = intensity;
                    if (object.children[0]) {
                        object.children[0].material.opacity = 0.2 + Math.sin(currentTime * object.userData.pulseSpeed) * 0.1;
                    }
                }
            }
            
            // Handle opacity pulsing
            if (object.userData.originalOpacity) {
                object.material.opacity = object.userData.originalOpacity + Math.sin(currentTime * object.userData.pulseSpeed) * 0.2;
            }
        }
    });

    // Animate micro elements
    scene.children.forEach(object => {
        if (object instanceof THREE.Points) {
            const positions = object.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                // Subtle movement for micro stars
                if (object.material.size === 0.05) {
                    positions[i + 1] += Math.sin(currentTime * 0.001 + i) * 0.01;
                }
                // Gentle drift for space dust
                if (object.material.size === 0.03) {
                    positions[i] += Math.cos(currentTime * 0.0005 + i) * 0.02;
                }
                // Pulsing for energy flecks
                if (object.material.size === 0.04) {
                    const scale = 0.04 + Math.sin(currentTime * 0.002 + i) * 0.01;
                    object.material.size = scale;
                }
            }
            object.geometry.attributes.position.needsUpdate = true;
        }
    });

    // Update UI effects
    if (UI_EFFECTS.scoreGlow) {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            const intensity = 0.5 + Math.sin(currentTime * 0.002) * 0.2;
            scoreElement.style.textShadow = `0 0 ${10 + intensity * 5}px rgba(108, 92, 231, ${0.3 + intensity * 0.2})`;
        }
    }

    if (UI_EFFECTS.healthPulse) {
        const healthBar = document.getElementById('health');
        if (healthBar) {
            const intensity = 0.3 + Math.sin(currentTime * 0.001) * 0.1;
            healthBar.style.boxShadow = `0 0 ${15 + intensity * 5}px rgba(108, 92, 231, ${0.2 + intensity * 0.1})`;
        }
    }

    if (UI_EFFECTS.comboSparkles) {
        const comboElement = document.getElementById('combo');
        if (comboElement) {
            const intensity = 0.4 + Math.sin(currentTime * 0.003) * 0.2;
            comboElement.style.textShadow = `0 0 ${8 + intensity * 4}px rgba(0, 255, 255, ${0.3 + intensity * 0.1})`;
        }
    }
}

// Create particle effects
function createLandingParticles() {
    for (let i = 0; i < 10; i++) {
        const particle = {
            position: new THREE.Vector3(player.position.x, 0.5, player.position.z),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            ),
            lifetime: 1,
            color: 0x6C5CE7
        };
        particles.push(particle);
    }
}

function createCollisionParticles(position) {
    for (let i = 0; i < 15; i++) {
        const particle = {
            position: position.clone(),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.3
            ),
            lifetime: 1,
            color: 0xFF4757
        };
        particles.push(particle);
    }
}

function createCollectParticles(position) {
    for (let i = 0; i < 20; i++) {
        const particle = {
            position: position.clone(),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.2
            ),
            lifetime: 1,
            color: 0xFFD700
        };
        particles.push(particle);
    }
}

function createPowerUpParticles(position) {
    for (let i = 0; i < 25; i++) {
        const particle = {
            position: position.clone(),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.4,
                (Math.random() - 0.5) * 0.3
            ),
            lifetime: 1.5,
            color: 0x00FFFF
        };
        particles.push(particle);
    }
}

// Update particles
function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.position.add(particle.velocity);
        particle.lifetime -= deltaTime;
        
        if (particle.lifetime <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Level up with refined progression
function levelUp() {
    level++;
    gameSpeed += 0.05;
    updateLevel();
    
    // Show level up animation
    const levelUpElement = document.createElement('div');
    levelUpElement.className = 'level-up';
    levelUpElement.innerHTML = `<h2>Level ${level}!</h2>`;
    document.body.appendChild(levelUpElement);
    
    setTimeout(() => {
        levelUpElement.remove();
    }, 2000);
}

// Update level display
function updateLevel() {
    const levelElement = document.getElementById('level');
    if (levelElement) {
        levelElement.textContent = `Level: ${level}`;
    }
}

// Activate power-up with enhanced effects
function activatePowerUp() {
    powerUpActive = true;
    powerUpEndTime = Date.now() + POWER_UP_DURATION;
    document.querySelector('.power-up').classList.add('active');
    
    // Make player invincible temporarily
    isInvincible = true;
    invincibleEndTime = Date.now() + INVINCIBLE_DURATION;
    player.material.emissiveIntensity = 0.8;
}

// Handle window resize with debounce
let resizeTimeout;
function onWindowResize() {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, 100);
}

function onKeyUp(event) {
    switch(event.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
            playerDirection = 0;
            break;
    }
}

// Check collision with optimized distance calculation
function checkCollision(obj1, obj2) {
    const dx = obj1.position.x - obj2.position.x;
    const dy = obj1.position.y - obj2.position.y;
    const dz = obj1.position.z - obj2.position.z;
    return dx * dx + dy * dy + dz * dz < 1;
}

// Handle damage
function takeDamage() {
    if (powerUpActive) return;
    
    health -= 20;
    updateHealthBar();
    
    if (health <= 0) {
        gameOver();
    }
}

// Update health bar
function updateHealthBar() {
    const healthBar = document.getElementById('health');
    healthBar.style.width = `${health}%`;
}

// Collect item
function collectItem(collectible) {
    score += 10 * combo;
    updateScore();
    
    // Update combo
    combo++;
    if (combo > highestCombo) {
        highestCombo = combo;
    }
    updateCombo();
    
    // Reset combo timeout
    if (comboTimeout) {
        clearTimeout(comboTimeout);
    }
    comboTimeout = setTimeout(() => {
        combo = 1;
        updateCombo();
    }, COMBO_TIMEOUT);
    
    // Show collectible animation
    showCollectibleAnimation(collectible.position);
    
    // Random power-up chance
    if (Math.random() < 0.2) {
        activatePowerUp();
    }
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}

// Update combo display
function updateCombo() {
    const comboElement = document.getElementById('combo');
    comboElement.textContent = `Combo: x${combo}`;
    
    if (combo > 1) {
        comboElement.classList.add('active');
    } else {
        comboElement.classList.remove('active');
    }
}

// Show collectible animation
function showCollectibleAnimation(position) {
    const animation = document.createElement('div');
    animation.className = 'collectible-animation';
    animation.textContent = `+${10 * combo}`;
    animation.style.left = `${(position.x + 5) * 10}%`;
    animation.style.top = `${(position.y + 5) * 10}%`;
    document.body.appendChild(animation);
    
    setTimeout(() => {
        animation.remove();
    }, 1200);
}

// Game over with cursor cleanup
function gameOver() {
    isGameOver = true;
    const gameOverScreen = document.getElementById('gameOver');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'block';
        document.getElementById('finalScore').textContent = score;
        document.getElementById('highestCombo').textContent = `x${highestCombo}`;
        
        // Add touch event listener for the restart button
        const restartButton = gameOverScreen.querySelector('.restart-button');
        if (restartButton) {
            restartButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                restartGame();
            }, { passive: false });
        }
    }
    
    if (joystickBase) {
        joystickBase.classList.remove('visible');
    }
    
    // Hide custom cursor
    const cursor = document.querySelector('.custom-cursor');
    if (cursor) cursor.classList.remove('visible');
}

// Add restart game function
function restartGame() {
    // Reset game state
    isGameStarted = false;
    isGameOver = false;
    score = 0;
    health = 100;
    combo = 1;
    highestCombo = 1;
    level = 1;
    gameSpeed = 1;
    
    // Reset player position
    player.position.set(0, 0.5, 0);
    player.velocity = 0;
    
    // Clear existing obstacles and collectibles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    collectibles.forEach(collectible => scene.remove(collectible));
    obstacles = [];
    collectibles = [];
    
    // Hide game over screen
    const gameOverScreen = document.getElementById('gameOver');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
    }
    
    // Show start screen
    const startScreen = document.querySelector('.start-screen');
    if (startScreen) {
        startScreen.style.display = 'flex';
    }
    
    // Reset UI
    updateScore();
    updateCombo();
    updateHealthBar();
    document.querySelector('.power-up').classList.remove('active');
    
    // Log restart
    console.log('Game restarted:', {
        isMobileDevice,
        startScreenVisible: startScreen ? startScreen.style.display !== 'none' : false,
        gameOverScreenHidden: gameOverScreen ? gameOverScreen.style.display === 'none' : false
    });
}

// Animation loop with timestamp
function animate(currentTime) {
    requestAnimationFrame(animate);
    update(currentTime);
    renderer.render(scene, camera);
}

// Create custom cursor
function createCustomCursor() {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
}

// Update custom cursor position
function updateCustomCursor(e) {
    const cursor = document.querySelector('.custom-cursor');
    if (cursor && !isMobileDevice) {
        cursor.style.left = e.clientX - 10 + 'px';
        cursor.style.top = e.clientY - 10 + 'px';
    }
}

// Create galaxy effect
function createGalaxyEffect() {
    // Create star clusters
    for (let i = 0; i < GALAXY_ELEMENTS.starClusters; i++) {
        const clusterGeometry = new THREE.BufferGeometry();
        const clusterMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.15,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        const clusterVertices = [];
        const clusterSize = 15 + Math.random() * 20;
        const starCount = 50 + Math.floor(Math.random() * 50);

        for (let j = 0; j < starCount; j++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * clusterSize;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const z = -200 - (Math.random() * 100);
            clusterVertices.push(x, y, z);
        }

        clusterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(clusterVertices, 3));
        const cluster = new THREE.Points(clusterGeometry, clusterMaterial);
        cluster.position.set(
            (Math.random() - 0.5) * 150,
            (Math.random() - 0.5) * 80,
            0
        );
        scene.add(cluster);
    }

    // Create subtle nebula clouds
    for (let i = 0; i < GALAXY_ELEMENTS.nebulaClouds; i++) {
        const cloudSize = 10 + Math.random() * 15;
        const cloudGeometry = new THREE.SphereGeometry(cloudSize, 32, 32);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            color: NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)],
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        cloud.position.set(
            (Math.random() - 0.5) * 150,
            (Math.random() - 0.5) * 100,
            -200 - (Math.random() * 100)
        );
        
        cloud.userData = {
            rotationSpeed: {
                x: Math.random() * 0.0002,
                y: Math.random() * 0.0002,
                z: Math.random() * 0.0002
            },
            pulseSpeed: Math.random() * 0.0008 + 0.0003,
            originalScale: 1
        };
        
        scene.add(cloud);
    }

    // Create subtle energy orbs
    for (let i = 0; i < GALAXY_ELEMENTS.energyOrbs; i++) {
        const orbSize = Math.random() * 0.5 + 0.2;
        const orbGeometry = new THREE.SphereGeometry(orbSize, 16, 16);
        const orbColor = NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)];
        const orbMaterial = new THREE.MeshPhongMaterial({
            color: orbColor,
            emissive: orbColor,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        
        orb.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 20,
            -50 - (Math.random() * 40)
        );
        
        orb.userData = {
            rotationSpeed: {
                x: Math.random() * 0.01,
                y: Math.random() * 0.01,
                z: Math.random() * 0.01
            },
            pulseSpeed: Math.random() * 0.02 + 0.01,
            originalScale: Math.random() * 0.3 + 0.7,
            color: orbColor
        };
        
        // Add subtle orb glow
        const glowGeometry = new THREE.SphereGeometry(orbSize * 1.3, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: orbColor,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        orb.add(glow);
        
        scene.add(orb);
    }

    // Create runway energy lines
    for (let i = 0; i < RUNWAY_EFFECTS.energyLines; i++) {
        const lineGeometry = new THREE.BufferGeometry();
        const lineMaterial = new THREE.LineBasicMaterial({
            color: NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)],
            transparent: true,
            opacity: 0.6
        });

        const lineVertices = [];
        const z = -RUNWAY_LENGTH/2 + (i * RUNWAY_LENGTH/RUNWAY_EFFECTS.energyLines);
        lineVertices.push(-RUNWAY_WIDTH/2, 0.12, z);
        lineVertices.push(RUNWAY_WIDTH/2, 0.12, z);

        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData = {
            pulseSpeed: Math.random() * 0.02 + 0.01,
            originalOpacity: 0.6
        };
        scene.add(line);
    }

    // Create runway glow particles
    for (let i = 0; i < RUNWAY_EFFECTS.glowParticles; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)],
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        particle.position.set(
            (Math.random() - 0.5) * RUNWAY_WIDTH,
            0.13,
            -RUNWAY_LENGTH/2 + Math.random() * RUNWAY_LENGTH
        );
        
        particle.userData = {
            pulseSpeed: Math.random() * 0.03 + 0.01,
            originalScale: Math.random() * 0.5 + 0.5
        };
        
        scene.add(particle);
    }

    // Create micro stars
    const microStarsGeometry = new THREE.BufferGeometry();
    const microStarsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const microStarsVertices = [];
    for (let i = 0; i < SPACE_ELEMENTS.microStars; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 50;
        const z = (Math.random() - 0.5) * 200;
        microStarsVertices.push(x, y, z);
    }

    microStarsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(microStarsVertices, 3));
    const microStars = new THREE.Points(microStarsGeometry, microStarsMaterial);
    scene.add(microStars);

    // Create space dust
    const dustGeometry = new THREE.BufferGeometry();
    const dustMaterial = new THREE.PointsMaterial({
        color: 0x6C5CE7,
        size: 0.03,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });

    const dustVertices = [];
    for (let i = 0; i < SPACE_ELEMENTS.spaceDust; i++) {
        const x = (Math.random() - 0.5) * 80;
        const y = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 150;
        dustVertices.push(x, y, z);
    }

    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustVertices, 3));
    const spaceDust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(spaceDust);

    // Create energy flecks
    const flecksGeometry = new THREE.BufferGeometry();
    const flecksMaterial = new THREE.PointsMaterial({
        color: 0x00FFFF,
        size: 0.04,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });

    const flecksVertices = [];
    for (let i = 0; i < SPACE_ELEMENTS.energyFlecks; i++) {
        const x = (Math.random() - 0.5) * 60;
        const y = (Math.random() - 0.5) * 30;
        const z = (Math.random() - 0.5) * 100;
        flecksVertices.push(x, y, z);
    }

    flecksGeometry.setAttribute('position', new THREE.Float32BufferAttribute(flecksVertices, 3));
    const energyFlecks = new THREE.Points(flecksGeometry, flecksMaterial);
    scene.add(energyFlecks);

    // Add UI enhancements
    if (UI_EFFECTS.scoreGlow) {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.style.textShadow = '0 0 10px rgba(108, 92, 231, 0.5)';
            scoreElement.style.transition = 'text-shadow 0.3s ease';
        }
    }

    if (UI_EFFECTS.healthPulse) {
        const healthBar = document.getElementById('health');
        if (healthBar) {
            healthBar.style.boxShadow = '0 0 15px rgba(108, 92, 231, 0.3)';
            healthBar.style.transition = 'box-shadow 0.3s ease';
        }
    }

    if (UI_EFFECTS.comboSparkles) {
        const comboElement = document.getElementById('combo');
        if (comboElement) {
            comboElement.style.textShadow = '0 0 8px rgba(0, 255, 255, 0.4)';
            comboElement.style.transition = 'text-shadow 0.3s ease';
        }
    }
}

// Create runway
function createRunway() {
    // Create runway base
    const runwayGeometry = new THREE.PlaneGeometry(RUNWAY_WIDTH, RUNWAY_LENGTH, RUNWAY_SEGMENTS, RUNWAY_SEGMENTS);
    const runwayMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a2e,
        emissive: 0x1a1a2e,
        emissiveIntensity: 0.1,
        side: THREE.DoubleSide
    });
    const runway = new THREE.Mesh(runwayGeometry, runwayMaterial);
    runway.rotation.x = -Math.PI / 2;
    runway.position.y = 0.1;
    scene.add(runway);

    // Create runway lines
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x6C5CE7,
        transparent: true,
        opacity: 0.8
    });

    const lineVertices = [];
    for (let i = 0; i < RUNWAY_SEGMENTS; i++) {
        const z = -RUNWAY_LENGTH/2 + (i * RUNWAY_LENGTH/RUNWAY_SEGMENTS);
        lineVertices.push(-RUNWAY_WIDTH/2, 0.11, z);
        lineVertices.push(RUNWAY_WIDTH/2, 0.11, z);
    }

    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Create runway edges
    const edgeGeometry = new THREE.BufferGeometry();
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x6C5CE7,
        transparent: true,
        opacity: 0.6
    });

    const edgeVertices = [];
    for (let i = 0; i < RUNWAY_SEGMENTS; i++) {
        const z = -RUNWAY_LENGTH/2 + (i * RUNWAY_LENGTH/RUNWAY_SEGMENTS);
        edgeVertices.push(-RUNWAY_WIDTH/2, 0.11, z);
        edgeVertices.push(RUNWAY_WIDTH/2, 0.11, z);
    }

    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeVertices, 3));
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    scene.add(edges);
}

// Create space atmosphere
function createSpaceAtmosphere() {
    // Create nebula particles
    const nebulaGeometry = new THREE.BufferGeometry();
    const nebulaMaterial = new THREE.PointsMaterial({
        color: 0x6C5CE7,
        size: 0.2,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });

    const nebulaVertices = [];
    for (let i = 0; i < 200; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        nebulaVertices.push(x, y, z);
    }

    nebulaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nebulaVertices, 3));
    const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    scene.add(nebula);

    // Create ambient space light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Create colored space lights
    const spaceLights = [
        { color: 0x6C5CE7, position: [-10, 5, -10] },
        { color: 0x00FFFF, position: [10, 5, -10] },
        { color: 0xFF00FF, position: [0, 10, -10] }
    ];

    spaceLights.forEach(light => {
        const pointLight = new THREE.PointLight(light.color, 0.5, 50);
        pointLight.position.set(...light.position);
        scene.add(pointLight);
    });
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    init();
    // Make startGame and restartGame globally available
    window.startGame = startGame;
    window.restartGame = restartGame;
    
    // Add touch event listeners for buttons
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startGame();
        }, { passive: false });
    }
    
    const restartButton = document.querySelector('.restart-button');
    if (restartButton) {
        restartButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            restartGame();
        }, { passive: false });
    }
    
    // Log initialization
    console.log('Game initialized:', {
        isMobileDevice,
        startButtonExists: !!startButton,
        restartButtonExists: !!restartButton,
        windowStartGame: typeof window.startGame === 'function',
        windowRestartGame: typeof window.restartGame === 'function'
    });
}); 