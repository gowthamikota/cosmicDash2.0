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

// Game settings

const JUMP_FORCE = 0.25;
const GRAVITY = 0.015;
const OBSTACLE_SPEED = 0.12;
const COLLECTIBLE_SPAWN_RATE = 0.015;
const POWER_UP_DURATION = 5000;
const COMBO_TIMEOUT = 2000;
const INVINCIBLE_DURATION = 3000;
const LEVEL_UP_SCORE = 1000;
const COLUMN_TRANSITION_SPEED = 0.2;

// Column positions
const COLUMN_POSITIONS = [-3, 0, 3]; // Left, Center, Right columns

// Initialize the game
function init() {
    // Create scene with space atmosphere
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 5, 20);

    // Create camera with dynamic positioning
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Create renderer with enhanced effects
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Add space lighting
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

    // Create player with enhanced appearance
    const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const playerMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x6C5CE7,
        shininess: 100,
        emissive: 0x6C5CE7,
        emissiveIntensity: 0.2
    });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 0.5, 0);
    player.castShadow = true;
    scene.add(player);

    // Create space ground
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

    // Add column markers with glow effect
    COLUMN_POSITIONS.forEach(x => {
        const markerGeometry = new THREE.PlaneGeometry(0.3, 0.3);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.2
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(x, 0.01, 0);
        scene.add(marker);
    });

    // Create space background
    createSpaceBackground();

    // Add event listeners
    window.addEventListener('resize', onWindowResize, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('keyup', onKeyUp, { passive: true });

    // Initialize UI elements
    updateScore();
    updateCombo();
    updateHealthBar();
    updateLevel();

    // Start animation loop
    lastTime = performance.now();
    animate();
}

// Create space background
function createSpaceBackground() {
    // Add stars
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.1,
        transparent: true
    });

    const starVertices = [];
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Add distant planets
    const planetGeometry = new THREE.SphereGeometry(2, 32, 32);
    const planetMaterial = new THREE.MeshBasicMaterial({
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.3
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.position.set(15, 5, -30);
    scene.add(planet);
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
        emissiveIntensity: 0.2
    });
    
    const obstacle = new THREE.Mesh(geometry, material);
    const columnIndex = Math.floor(Math.random() * 3);
    obstacle.position.set(
        COLUMN_POSITIONS[columnIndex],
        0.5,
        -20
    );
    
    obstacle.castShadow = true;
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

// Update game state with smooth transitions
function update(currentTime) {
    if (!isGameStarted || isGameOver) return;

    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Smooth column transition
    if (isMoving) {
        const targetX = COLUMN_POSITIONS[targetColumn];
        player.position.x += (targetX - player.position.x) * COLUMN_TRANSITION_SPEED;
        
        if (Math.abs(player.position.x - targetX) < 0.01) {
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

// Game over
function gameOver() {
    isGameOver = true;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('highestCombo').textContent = `x${highestCombo}`;
}

// Start game
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
    
    // Update UI
    document.querySelector('.start-screen').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.querySelector('.power-up').classList.remove('active');
    updateScore();
    updateCombo();
    updateHealthBar();
}

// Animation loop with timestamp
function animate(currentTime) {
    requestAnimationFrame(animate);
    update(currentTime);
    renderer.render(scene, camera);
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
init();
    window.startGame = startGame;
}); 