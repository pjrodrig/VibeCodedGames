const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = true;
let gamePaused = false;
let level = 1;
let score = 0;
let enemySpawnTimer = 0;
let powerUpSpawnTimer = 0;
let invincible = false;
let enemiesKilled = 0;
let levelKillRequirement = 10; // Enemies to kill per level
let levelTimer = 0; // Frames since level started
let boss = null; // Boss enemy for level 5
let bossDefeated = false;
let finalBossDefeated = false; // Track level 10 boss defeat

// Developer settings with localStorage support
const defaultSettings = {
    playerSpeed: 3,
    playerMaxHealth: 100,
    shootCooldown: 10,
    playerDamageMultiplier: 1.0, // New setting for damage balancing
    enemySpeed: 1.5,
    enemySpawnRate: 180,
    enemyBaseHealth: 50,
    enemyFireRate: 120,
    enemyDamage: 20,
    starCount: 60,
    starSpeed: 0.5,
    gameSpeed: 1
};

// Load settings from localStorage or use defaults
function loadSettings() {
    const saved = localStorage.getItem('spaceBulletHellSettings');
    if (saved) {
        try {
            return {...defaultSettings, ...JSON.parse(saved)};
        } catch (e) {
            console.warn('Failed to parse saved settings, using defaults');
            return {...defaultSettings};
        }
    }
    return {...defaultSettings};
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('spaceBulletHellSettings', JSON.stringify(devSettings));
}

let devSettings = loadSettings();

// Starfield
const stars = [];
const NUM_STARS = 60;

// Initialize starfield
for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 3 + 1, // Depth for parallax (1-4)
        size: Math.random() * 0.7 + 0.3
    });
}

// Player object
const player = {
    x: 100,
    y: canvas.height / 2,
    size: 30,
    speed: devSettings.playerSpeed,
    health: devSettings.playerMaxHealth,
    maxHealth: devSettings.playerMaxHealth,
    shield: 0,
    power: 1,
    emoji: '🚀',
    bullets: [],
    shootCooldown: 0
};

// Game arrays
let enemies = [];
let enemyBullets = [];
let powerUps = [];
let particles = [];
let asteroids = [];

// Asteroid field state
let asteroidFieldActive = false;
let asteroidFieldTimer = 0;
let asteroidFieldDuration = 0;

// Input handling
const keys = {};
let gamepadIndex = -1;
let gamepadConnected = false;

// Keyboard input
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'p' || e.key === 'P') {
        gamePaused = !gamePaused;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Gamepad connection handling
window.addEventListener("gamepadconnected", (e) => {
    gamepadIndex = e.gamepad.index;
    gamepadConnected = true;
    console.log("Gamepad connected:", e.gamepad.id);
});

window.addEventListener("gamepaddisconnected", (e) => {
    if (e.gamepad.index === gamepadIndex) {
        gamepadConnected = false;
        gamepadIndex = -1;
        console.log("Gamepad disconnected");
    }
});

// Get gamepad input state
function getGamepadInput() {
    if (!gamepadConnected || gamepadIndex === -1) return null;
    
    const gamepad = navigator.getGamepads()[gamepadIndex];
    if (!gamepad) return null;
    
    return {
        leftStick: {
            x: gamepad.axes[0],
            y: gamepad.axes[1]
        },
        rightStick: {
            x: gamepad.axes[2] || 0,
            y: gamepad.axes[3] || 0
        },
        buttons: {
            a: gamepad.buttons[0] && gamepad.buttons[0].pressed,
            b: gamepad.buttons[1] && gamepad.buttons[1].pressed,
            x: gamepad.buttons[2] && gamepad.buttons[2].pressed,
            y: gamepad.buttons[3] && gamepad.buttons[3].pressed,
            lb: gamepad.buttons[4] && gamepad.buttons[4].pressed,
            rb: gamepad.buttons[5] && gamepad.buttons[5].pressed,
            lt: gamepad.buttons[6] && gamepad.buttons[6].value > 0.1,
            rt: gamepad.buttons[7] && gamepad.buttons[7].value > 0.1,
            start: gamepad.buttons[9] && gamepad.buttons[9].pressed,
            dpad: {
                up: gamepad.buttons[12] && gamepad.buttons[12].pressed,
                down: gamepad.buttons[13] && gamepad.buttons[13].pressed,
                left: gamepad.buttons[14] && gamepad.buttons[14].pressed,
                right: gamepad.buttons[15] && gamepad.buttons[15].pressed
            }
        }
    };
}

// Player movement and shooting
function updatePlayer() {
    const gamepadInput = getGamepadInput();
    
    // Handle pause input from controller (should work even when paused)
    if (gamepadInput && gamepadInput.buttons.start) {
        // Prevent rapid toggling with a simple cooldown check
        if (!updatePlayer.pauseCooldown) {
            gamePaused = !gamePaused;
            updatePlayer.pauseCooldown = 30; // 30 frame cooldown
        }
    }
    
    if (updatePlayer.pauseCooldown > 0) {
        updatePlayer.pauseCooldown--;
    }
    
    if (gamePaused || !gameRunning) return;
    
    // Movement - keyboard input
    let moveX = 0, moveY = 0;
    
    if (keys['ArrowUp'] || keys['w'] || keys['W']) moveY -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) moveY += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) moveX -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) moveX += 1;
    
    // Movement - controller input (left stick or d-pad)
    if (gamepadInput) {
        // Use left stick with deadzone
        if (Math.abs(gamepadInput.leftStick.x) > 0.15) {
            moveX += gamepadInput.leftStick.x;
        }
        if (Math.abs(gamepadInput.leftStick.y) > 0.15) {
            moveY += gamepadInput.leftStick.y;
        }
        
        // D-pad as alternative
        if (gamepadInput.buttons.dpad.left) moveX -= 1;
        if (gamepadInput.buttons.dpad.right) moveX += 1;
        if (gamepadInput.buttons.dpad.up) moveY -= 1;
        if (gamepadInput.buttons.dpad.down) moveY += 1;
    }
    
    // Normalize diagonal movement and apply movement
    if (moveX !== 0 || moveY !== 0) {
        const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX = (moveX / magnitude) * devSettings.playerSpeed * devSettings.gameSpeed;
        moveY = (moveY / magnitude) * devSettings.playerSpeed * devSettings.gameSpeed;
        
        // Apply movement with boundary checks
        const newX = player.x + moveX;
        const newY = player.y + moveY;
        
        if (newX >= player.size / 2 && newX <= canvas.width / 2) {
            player.x = newX;
        }
        if (newY >= player.size / 2 && newY <= canvas.height - player.size / 2) {
            player.y = newY;
        }
    }
    
    // Shooting - keyboard or controller
    let shouldShoot = keys[' '];
    if (gamepadInput) {
        shouldShoot = shouldShoot || gamepadInput.buttons.a || gamepadInput.buttons.x || 
                     gamepadInput.buttons.rt || gamepadInput.buttons.rb;
    }
    
    if (shouldShoot && player.shootCooldown <= 0) {
        shootPlayerBullet();
        player.shootCooldown = devSettings.shootCooldown - Math.min(player.power, 5);
    }
    
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }
    
    // Update player bullets
    player.bullets = player.bullets.filter(bullet => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
        return bullet.x < canvas.width + 10;
    });
}

function shootPlayerBullet() {
    const bulletCount = Math.min(player.power, 5);
    const spreadAngle = 0.1;
    
    // Play shoot sound
    if (window.audioManager) {
        window.audioManager.playShoot();
    }
    
    for (let i = 0; i < bulletCount; i++) {
        const angle = (i - (bulletCount - 1) / 2) * spreadAngle;
        
        player.bullets.push({
            x: player.x + player.size / 2,
            y: player.y,
            dx: 4,
            dy: angle * 1.5,
            size: 5,
            damage: Math.round((5 + player.power * 3) * devSettings.playerDamageMultiplier) // Reduced base damage
        });
    }
}

// Enemy types and spawning
function spawnEnemy() {
    const types = ['basic', 'zigzag', 'spiral', 'burst'];
    const type = types[Math.min(Math.floor(Math.random() * (level + 1)), types.length - 1)];
    
    // 90% chance to be a hovering enemy, 10% chance to be a rushing enemy
    const isRusher = Math.random() < 0.1;
    
    const enemy = {
        x: canvas.width + 50,
        y: Math.random() * (canvas.height - 100) + 50,
        targetX: isRusher ? -50 : canvas.width * 0.7 + Math.random() * canvas.width * 0.2, // Stay between 70-90% of screen
        targetY: Math.random() * (canvas.height - 100) + 50,
        type: type,
        size: 30,
        health: devSettings.enemyBaseHealth + level * 10,
        maxHealth: devSettings.enemyBaseHealth + level * 10,
        speed: isRusher ? devSettings.enemySpeed + Math.random() * 1 : devSettings.enemySpeed,
        shootTimer: Math.random() * 60, // Randomize initial shoot timer
        angle: 0,
        isRusher: isRusher,
        movementPhase: 'entering', // 'entering', 'hovering', 'rushing'
        hoverTime: 0,
        emoji: getEnemyEmoji(type)
    };
    
    enemies.push(enemy);
}

function getEnemyEmoji(type) {
    const emojis = {
        'basic': '🛸',
        'zigzag': '👾',
        'spiral': '🌀',
        'burst': '💥',
        'boss': '👹',
        'finalBoss': '🔥'
    };
    return emojis[type] || '🛸';
}

function spawnBoss() {
    boss = {
        x: canvas.width + 100,
        y: canvas.height / 2,
        targetX: canvas.width * 0.75,
        targetY: canvas.height / 2,
        type: 'boss',
        size: 120, // Twice as big as before (was 60)
        health: 2000, // Much more health (was 500)
        maxHealth: 2000,
        speed: 0.5, // Slower movement (was 1)
        shootTimer: 0,
        angle: 0,
        phase: 'entering', // 'entering', 'fighting', 'defeated'
        attackPattern: 0,
        emoji: '👹',
        isBoss: true,
        shieldActive: false,
        shieldTimer: 0,
        shieldDuration: 300, // 5 seconds at 60fps (was 3)
        shieldCooldown: 300 // 5 seconds between shields
    };
    
    // Clear all regular enemies when boss spawns
    enemies = [];
    enemyBullets = [];
    
    console.log('BOSS FIGHT!');
}

function spawnFinalBoss() {
    boss = {
        x: canvas.width + 100,
        y: canvas.height / 2,
        targetX: canvas.width * 0.75,
        targetY: canvas.height / 2,
        type: 'finalBoss',
        size: 150, // Even bigger than first boss
        health: 4000, // Double the first boss health
        maxHealth: 4000,
        speed: 1.5, // Faster than first boss
        shootTimer: 0,
        angle: 0,
        phase: 'entering', // 'entering', 'fighting', 'teleporting', 'dying', 'defeated'
        attackPattern: 0,
        emoji: '💀', // Death emoji for final boss
        isBoss: true,
        isFinalBoss: true,
        shieldActive: false,
        shieldTimer: 0,
        shieldDuration: 240, // 4 seconds at 60fps
        shieldCooldown: 180, // 3 seconds between shields (more frequent)
        teleportTimer: 0,
        teleportCooldown: 360, // Teleport every 6 seconds
        laserCharging: false,
        laserTimer: 0,
        summonTimer: 0
    };
    
    // Clear all regular enemies when boss spawns
    enemies = [];
    enemyBullets = [];
    
    console.log('FINAL BOSS FIGHT! THE ULTIMATE CHALLENGE!');
}

function startAsteroidField(level) {
    asteroidFieldActive = true;
    asteroidFieldTimer = 0;
    
    // Clear enemies for asteroid field
    enemies = [];
    enemyBullets = [];
    
    if (level === 3) {
        asteroidFieldDuration = 3600; // 60 seconds at 60fps (doubled from 30)
        console.log('ASTEROID FIELD! Survive for 60 seconds!');
    } else if (level === 7) {
        asteroidFieldDuration = 5400; // 90 seconds at 60fps (doubled from 45)
        console.log('INTENSE ASTEROID FIELD! Survive for 90 seconds!');
    }
}

function spawnAsteroid(isHardMode) {
    const size = isHardMode ? 
        Math.random() * 40 + 30 : // 30-70 for hard mode
        Math.random() * 30 + 20;   // 20-50 for normal
    
    const speed = isHardMode ?
        Math.random() * 3 + 3 :    // 3-6 for hard mode
        Math.random() * 2 + 2;     // 2-4 for normal
    
    const y = Math.random() * (canvas.height - size) + size / 2;
    
    // Some asteroids move diagonally
    const angleVariation = (Math.random() - 0.5) * 0.5;
    
    asteroids.push({
        x: canvas.width + size,
        y: y,
        size: size,
        speed: speed,
        angle: angleVariation,
        emoji: ['🌑', '☄️', '🪨'][Math.floor(Math.random() * 3)]
    });
}

function updateAsteroids() {
    if (!asteroidFieldActive) return;
    
    // Update timer only if we haven't reached the duration
    if (asteroidFieldTimer < asteroidFieldDuration) {
        asteroidFieldTimer++;
    }
    
    // Check if field is complete
    if (asteroidFieldTimer >= asteroidFieldDuration) {
        // Stop spawning new asteroids but wait for existing ones to leave
        if (asteroids.length === 0) {
            asteroidFieldActive = false;
            enemiesKilled = levelKillRequirement; // Complete the level
            console.log('Asteroid field survived!');
            return;
        }
        // Don't spawn new asteroids after duration is reached
    } else {
        // Spawn asteroids only during the active duration
        const isHardMode = level === 7;
        const spawnRate = isHardMode ? 20 : 30; // Spawn every 20 or 30 frames
        
        if (asteroidFieldTimer % spawnRate === 0) {
            spawnAsteroid(isHardMode);
            
            // Chance for double spawn in hard mode
            if (isHardMode && Math.random() < 0.3) {
                spawnAsteroid(isHardMode);
            }
        }
    }
    
    // Update asteroid positions
    asteroids = asteroids.filter(asteroid => {
        asteroid.x -= asteroid.speed;
        asteroid.y += Math.sin(asteroid.angle) * asteroid.speed * 0.5;
        
        return asteroid.x > -asteroid.size;
    });
}

function updateFinalBoss() {
    // Final boss has more complex mechanics
    
    // Handle teleportation
    boss.teleportTimer++;
    if (boss.teleportTimer >= boss.teleportCooldown && !boss.laserCharging) {
        boss.phase = 'teleporting';
        boss.teleportTimer = 0;
        
        // Create teleport effect
        createParticles(boss.x, boss.y, '✨', 20);
        
        // Teleport to new position
        setTimeout(() => {
            boss.x = Math.random() * (canvas.width * 0.3) + canvas.width * 0.5;
            boss.y = Math.random() * (canvas.height - 200) + 100;
            boss.phase = 'fighting';
            createParticles(boss.x, boss.y, '✨', 20);
        }, 500);
        return;
    }
    
    // Final boss movement - figure 8 pattern
    boss.angle += 0.02;
    boss.x = boss.targetX + Math.sin(boss.angle) * 100;
    boss.y = canvas.height / 2 + Math.sin(boss.angle * 2) * 100;
    
    // Handle shield mechanics (more frequent)
    boss.shieldTimer++;
    
    if (!boss.shieldActive && boss.shieldTimer >= boss.shieldCooldown) {
        boss.shieldActive = true;
        boss.shieldTimer = 0;
    }
    
    if (boss.shieldActive && boss.shieldTimer >= boss.shieldDuration) {
        boss.shieldActive = false;
        boss.shieldTimer = 0;
    }
    
    // Final boss shooting patterns
    boss.shootTimer++;
    
    // Change attack pattern every 300 frames (5 seconds)
    if (boss.shootTimer % 300 === 0) {
        boss.attackPattern = (boss.attackPattern + 1) % 5; // 5 attack patterns
    }
    
    // Execute attack patterns
    switch (boss.attackPattern) {
        case 0: // Machine gun
            if (boss.shootTimer % 10 === 0) {
                shootFinalBossBullet('machinegun');
            }
            break;
        case 1: // Laser beam triple shot with repositioning
            if (!boss.laserSequence) {
                boss.laserSequence = { shot: 0, sequenceTimer: 0 };
            }
            
            boss.laserSequence.sequenceTimer++;
            
            // Start a new laser sequence
            if (boss.laserSequence.shot === 0 && boss.laserSequence.sequenceTimer === 1) {
                boss.laserCharging = true;
                boss.laserTimer = 0;
            }
            
            if (boss.laserCharging) {
                boss.laserTimer++;
                if (boss.laserTimer === 120) { // 2 second charge
                    shootFinalBossBullet('laser');
                    boss.laserCharging = false;
                    boss.laserSequence.shot++;
                    
                    // Reposition after each shot (except the last one)
                    if (boss.laserSequence.shot < 3) {
                        setTimeout(() => {
                            // Teleport to new position
                            createParticles(boss.x, boss.y, '✨', 20);
                            boss.y = Math.random() * (canvas.height - 200) + 100;
                            createParticles(boss.x, boss.y, '✨', 20);
                            
                            // Start charging next laser
                            setTimeout(() => {
                                boss.laserCharging = true;
                                boss.laserTimer = 0;
                            }, 500);
                        }, 500);
                    }
                }
            }
            
            // Reset sequence after 3 shots
            if (boss.laserSequence.shot >= 3 && !boss.laserCharging) {
                boss.laserSequence = null;
            }
            break;
        case 2: // Bullet hell spiral
            if (boss.shootTimer % 5 === 0) {
                shootFinalBossBullet('hellspiral');
            }
            break;
        case 3: // Summon minions
            if (boss.shootTimer % 240 === 0) { // Every 4 seconds
                summonMinions();
            }
            if (boss.shootTimer % 60 === 0) {
                shootFinalBossBullet('spread');
            }
            break;
        case 4: // Everything at once!
            if (boss.shootTimer % 20 === 0) {
                shootFinalBossBullet('chaos');
            }
            break;
    }
    
    // Check if boss is defeated
    if (boss.health <= 0 && boss.phase !== 'dying') {
        boss.phase = 'dying';
        boss.deathTimer = 0;
        finalBossDefeated = true;
        score += 10000; // Huge score bonus
        
        // Initial explosion
        createExplosion(boss.x, boss.y);
        if (window.audioManager) {
            window.audioManager.playExplosion();
        }
        
        updateUI();
    }
}

function updateBossDeath() {
    // Death animation sequence
    boss.deathTimer++;
    
    // Longer sequence for final boss
    const deathDuration = boss.isFinalBoss ? 360 : 180; // 6 seconds for final boss, 3 for regular
    const completionTime = boss.isFinalBoss ? 480 : 240; // 8 seconds for final boss, 4 for regular
    
    // Create staggered explosions
    if (boss.deathTimer % 15 === 0 && boss.deathTimer < deathDuration) { // Every 0.25 seconds
        const offsetX = (Math.random() - 0.5) * boss.size;
        const offsetY = (Math.random() - 0.5) * boss.size;
        createExplosion(boss.x + offsetX, boss.y + offsetY);
        
        // Shake effect
        boss.x += (Math.random() - 0.5) * 4;
        boss.y += (Math.random() - 0.5) * 4;
        
        if (window.audioManager) {
            window.audioManager.playExplosion();
        }
    }
    
    // Final massive explosion
    if (boss.deathTimer === deathDuration) {
        if (boss.isFinalBoss) {
            // Epic final boss explosion
            for (let ring = 0; ring < 3; ring++) {
                setTimeout(() => {
                    // Create expanding rings of explosions
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const dist = boss.size / 2 + ring * 40;
                        createExplosion(
                            boss.x + Math.cos(angle) * dist,
                            boss.y + Math.sin(angle) * dist
                        );
                    }
                    createBigExplosion(boss.x, boss.y);
                }, ring * 200);
            }
        } else {
            // Regular boss explosion
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const dist = boss.size / 2;
                createExplosion(
                    boss.x + Math.cos(angle) * dist,
                    boss.y + Math.sin(angle) * dist
                );
            }
            createBigExplosion(boss.x, boss.y);
        }
    }
    
    // Wait before completing level
    if (boss.deathTimer >= completionTime) {
        boss.phase = 'defeated';
        
        if (boss.isFinalBoss) {
            // Show victory screen instead of continuing
            gameWon();
        } else {
            enemiesKilled = levelKillRequirement; // Complete the level
        }
        
        boss = null;
    }
}

function updateBoss() {
    if (!boss || boss.phase === 'defeated') return;
    
    // Skip normal updates if boss is dying
    if (boss.phase === 'dying') {
        updateBossDeath();
        return;
    }
    
    // Boss movement
    if (boss.phase === 'entering') {
        // Move to position
        const dx = boss.targetX - boss.x;
        const dy = boss.targetY - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
            boss.x += (dx / dist) * boss.speed * 2;
            boss.y += (dy / dist) * boss.speed;
        } else {
            boss.phase = 'fighting';
            boss.x = boss.targetX;
            boss.y = boss.targetY;
        }
    } else if (boss.phase === 'fighting') {
        // Different movement for final boss
        if (boss.isFinalBoss) {
            updateFinalBoss();
            return;
        }
        
        // Boss movement pattern - slow vertical oscillation
        boss.angle += 0.01; // Slower oscillation to match slower movement
        boss.y = canvas.height / 2 + Math.sin(boss.angle) * 150;
        
        // Handle shield mechanics
        boss.shieldTimer++;
        
        // Activate shield periodically
        if (!boss.shieldActive && boss.shieldTimer >= boss.shieldCooldown) {
            boss.shieldActive = true;
            boss.shieldTimer = 0;
            console.log('Boss shield activated!');
        }
        
        // Deactivate shield after duration
        if (boss.shieldActive && boss.shieldTimer >= boss.shieldDuration) {
            boss.shieldActive = false;
            boss.shieldTimer = 0;
            console.log('Boss shield deactivated!');
        }
        
        // Boss shooting patterns
        boss.shootTimer++;
        
        // Change attack pattern every 600 frames (10 seconds at 60fps)
        if (boss.shootTimer % 600 === 0) {
            boss.attackPattern = (boss.attackPattern + 1) % 3;
        }
        
        // Execute attack pattern
        switch (boss.attackPattern) {
            case 0: // Rapid fire
                if (boss.shootTimer % 20 === 0) {
                    shootBossBullet('rapid');
                }
                break;
            case 1: // Spread shot
                if (boss.shootTimer % 60 === 0) {
                    shootBossBullet('spread');
                }
                break;
            case 2: // Spiral attack
                if (boss.shootTimer % 10 === 0) {
                    shootBossBullet('spiral');
                }
                break;
        }
        
        // Check if boss is defeated
        if (boss.health <= 0 && boss.phase !== 'dying') {
            boss.phase = 'dying';
            boss.deathTimer = 0;
            bossDefeated = true;
            score += 5000; // Big score bonus
            
            // Initial explosion
            createExplosion(boss.x, boss.y);
            if (window.audioManager) {
                window.audioManager.playExplosion();
            }
            
            updateUI();
        }
    }
}

function shootFinalBossBullet(pattern) {
    if (!boss) return;
    
    switch (pattern) {
        case 'machinegun':
            // Rapid aimed bullets
            const mgAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const spread = (Math.random() - 0.5) * 0.3; // Some spread
            enemyBullets.push({
                x: boss.x - boss.size / 2,
                y: boss.y,
                dx: Math.cos(mgAngle + spread) * 5,
                dy: Math.sin(mgAngle + spread) * 5,
                size: 4,
                emoji: '🔴',
                damage: devSettings.enemyDamage
            });
            break;
            
        case 'laser':
            // Create a line of bullets as a "laser"
            for (let i = 0; i < 20; i++) {
                enemyBullets.push({
                    x: boss.x - boss.size / 2 - i * 30,
                    y: boss.y,
                    dx: -8,
                    dy: 0,
                    size: 8,
                    emoji: '⚡',
                    damage: devSettings.enemyDamage * 2
                });
            }
            break;
            
        case 'hellspiral':
            // Dense spiral pattern
            const spiralBase = boss.shootTimer * 0.15;
            for (let i = 0; i < 6; i++) {
                const angle = spiralBase + (i / 6) * Math.PI * 2;
                enemyBullets.push({
                    x: boss.x,
                    y: boss.y,
                    dx: Math.cos(angle) * 3,
                    dy: Math.sin(angle) * 3,
                    size: 5,
                    emoji: '🟣',
                    damage: devSettings.enemyDamage
                });
            }
            break;
            
        case 'spread':
            // Wide spread shot
            for (let i = -4; i <= 4; i++) {
                enemyBullets.push({
                    x: boss.x - boss.size / 2,
                    y: boss.y,
                    dx: -4,
                    dy: i * 0.8,
                    size: 6,
                    emoji: '🟠',
                    damage: devSettings.enemyDamage
                });
            }
            break;
            
        case 'chaos':
            // Random directions
            for (let i = 0; i < 3; i++) {
                const randomAngle = Math.random() * Math.PI * 2;
                enemyBullets.push({
                    x: boss.x,
                    y: boss.y,
                    dx: Math.cos(randomAngle) * 4,
                    dy: Math.sin(randomAngle) * 4,
                    size: 5,
                    emoji: ['🔴', '🟠', '🟣', '⚡'][Math.floor(Math.random() * 4)],
                    damage: devSettings.enemyDamage
                });
            }
            break;
    }
}

function summonMinions() {
    // Summon 3 small enemies
    for (let i = 0; i < 3; i++) {
        const minion = {
            x: boss.x,
            y: boss.y + (i - 1) * 60,
            targetX: boss.x - 150,
            targetY: boss.y + (i - 1) * 80,
            type: 'minion',
            size: 20,
            health: 30,
            maxHealth: 30,
            speed: 2,
            shootTimer: i * 30, // Stagger their shots
            angle: 0,
            isMinion: true,
            emoji: '👻',
            movementPhase: 'entering'
        };
        enemies.push(minion);
    }
}

function shootBossBullet(pattern) {
    if (!boss) return;
    
    switch (pattern) {
        case 'rapid':
            // Single aimed bullet
            const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);
            enemyBullets.push({
                x: boss.x - boss.size / 2,
                y: boss.y,
                dx: Math.cos(angleToPlayer) * 3,
                dy: Math.sin(angleToPlayer) * 3,
                size: 6,
                emoji: '🔴'
            });
            break;
            
        case 'spread':
            // 5-way spread
            for (let i = -2; i <= 2; i++) {
                enemyBullets.push({
                    x: boss.x - boss.size / 2,
                    y: boss.y,
                    dx: -3,
                    dy: i * 1.5,
                    size: 5,
                    emoji: '🟠'
                });
            }
            break;
            
        case 'spiral':
            // Spiral pattern
            const spiralAngle = (boss.shootTimer * 0.2) % (Math.PI * 2);
            for (let i = 0; i < 4; i++) {
                const angle = spiralAngle + (i / 4) * Math.PI * 2;
                enemyBullets.push({
                    x: boss.x,
                    y: boss.y,
                    dx: Math.cos(angle) * 2.5,
                    dy: Math.sin(angle) * 2.5,
                    size: 4,
                    emoji: '🟣'
                });
            }
            break;
    }
}

// Enemy movement and shooting
function updateEnemies() {
    if (gamePaused || !gameRunning) return;
    
    // Update boss separately if it exists
    if (boss) {
        updateBoss();
    }
    
    enemies = enemies.filter(enemy => {
        // Standard side-scrolling movement
        if (enemy.movementPhase === 'entering') {
            // Move towards target position
            const dx = enemy.targetX - enemy.x;
            const dy = enemy.targetY - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                enemy.x += (dx / dist) * enemy.speed * 2;
                enemy.y += (dy / dist) * enemy.speed;
            } else {
                enemy.movementPhase = 'hovering';
                enemy.x = enemy.targetX;
                enemy.y = enemy.targetY;
            }
        } else if (enemy.movementPhase === 'hovering' && !enemy.isRusher) {
            // Hovering movement patterns
            enemy.hoverTime++;
            
            switch (enemy.type) {
                case 'basic':
                    // Gentle up and down
                    enemy.y = enemy.targetY + Math.sin(enemy.angle) * 30;
                    enemy.angle += 0.03;
                    break;
                case 'zigzag':
                    // Figure-8 pattern
                    enemy.x = enemy.targetX + Math.sin(enemy.angle) * 40;
                    enemy.y = enemy.targetY + Math.sin(enemy.angle * 2) * 40;
                    enemy.angle += 0.04;
                    break;
                case 'spiral':
                    // Circular motion
                    enemy.x = enemy.targetX + Math.cos(enemy.angle) * 30;
                    enemy.y = enemy.targetY + Math.sin(enemy.angle) * 30;
                    enemy.angle += 0.05;
                    break;
                case 'burst':
                    // Square pattern
                    const phase = Math.floor(enemy.angle) % 4;
                    const progress = enemy.angle % 1;
                    if (phase === 0) enemy.x = enemy.targetX + progress * 40 - 20;
                    else if (phase === 1) enemy.y = enemy.targetY + progress * 40 - 20;
                    else if (phase === 2) enemy.x = enemy.targetX + 20 - progress * 40;
                    else enemy.y = enemy.targetY + 20 - progress * 40;
                    enemy.angle += 0.02;
                    break;
            }
            
            // Occasionally change target position
            if (enemy.hoverTime > 300 && Math.random() < 0.01) {
                enemy.targetY = Math.random() * (canvas.height - 100) + 50;
                enemy.hoverTime = 0;
            }
        } else if (enemy.isRusher || enemy.movementPhase === 'rushing') {
            // Rush across screen
            enemy.x -= enemy.speed * 2;
        }
        
        // Shooting patterns
        enemy.shootTimer++;
        if (enemy.shootTimer > devSettings.enemyFireRate) {
            shootEnemyBullet(enemy);
            enemy.shootTimer = 0;
        }
        
        // Remove if off screen or dead
        if (enemy.dead || enemy.health <= 0) {
            return false;
        }
        
        return enemy.x > -50;
    });
}

function shootEnemyBullet(enemy) {
    switch (enemy.type) {
        case 'basic':
            enemyBullets.push({
                x: enemy.x - enemy.size / 2,
                y: enemy.y,
                dx: -2.5,
                dy: 0,
                size: 4,
                emoji: '⚪'
            });
            break;
            
        case 'zigzag':
            for (let i = -1; i <= 1; i++) {
                enemyBullets.push({
                    x: enemy.x - enemy.size / 2,
                    y: enemy.y,
                    dx: -2,
                    dy: i * 1,
                    size: 4,
                    emoji: '🔴'
                });
            }
            break;
            
        case 'spiral':
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + enemy.angle;
                enemyBullets.push({
                    x: enemy.x,
                    y: enemy.y,
                    dx: Math.cos(angle) * 2,
                    dy: Math.sin(angle) * 2,
                    size: 3,
                    emoji: '🟣'
                });
            }
            break;
            
        case 'burst':
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                enemyBullets.push({
                    x: enemy.x,
                    y: enemy.y,
                    dx: Math.cos(angle) * 1.5,
                    dy: Math.sin(angle) * 1.5,
                    size: 4,
                    emoji: '🟠'
                });
            }
            break;
    }
}

// Power-ups
function spawnPowerUp() {
    const types = ['health', 'power', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const baseY = Math.random() * (canvas.height - 100) + 50;
    powerUps.push({
        x: canvas.width + 50,
        y: baseY,
        baseY: baseY,
        type: type,
        size: 25,
        speed: 0.8,
        floatAngle: Math.random() * Math.PI * 2,
        floatSpeed: 0.02,
        floatRadius: 15,
        emoji: getPowerUpEmoji(type)
    });
}

function getPowerUpEmoji(type) {
    const emojis = {
        'health': '❤️',
        'power': '⚡',
        'shield': '🛡️'
    };
    return emojis[type];
}

function updatePowerUps() {
    if (gamePaused || !gameRunning) return;
    
    powerUps = powerUps.filter(powerUp => {
        // Slow horizontal movement
        powerUp.x -= powerUp.speed;
        
        // Floating motion
        powerUp.floatAngle += powerUp.floatSpeed;
        powerUp.y = powerUp.baseY + Math.sin(powerUp.floatAngle) * powerUp.floatRadius;
        
        return powerUp.x > -50;
    });
}

// Collision detection
function checkCollisions() {
    if (!gameRunning) return;
    
    // Player bullets vs enemies
    const bulletsToRemove = [];
    
    player.bullets.forEach((bullet, bIndex) => {
        enemies.forEach(enemy => {
            if (enemy.dead) return; // Skip already dead enemies
            
            let collision = false;
            
            // Standard 2D collision detection
            collision = distance(bullet.x, bullet.y, enemy.x, enemy.y) < enemy.size / 2 + bullet.size;
            
            if (collision && !bulletsToRemove.includes(bIndex)) {
                enemy.health -= bullet.damage;
                bulletsToRemove.push(bIndex);
                
                // Create particles at the exact collision point
                const hitX = bullet.x;
                const hitY = bullet.y;
                createParticles(hitX, hitY, '💥', 5);
                
                // Create explosion if enemy dies
                if (enemy.health <= 0) {
                    score += 100 * level;
                    enemiesKilled++;
                    // Use enemy position for explosion
                    createExplosion(enemy.x, enemy.y);
                    if (window.audioManager) {
                        window.audioManager.playExplosion();
                    }
                    enemy.dead = true; // Mark for removal instead of immediate removal
                    updateUI();
                } else {
                    // Play enemy hit sound
                    if (window.audioManager) {
                        window.audioManager.playEnemyHit();
                    }
                }
            }
        });
    });
    
    // Remove bullets that hit
    bulletsToRemove.sort((a, b) => b - a); // Sort in descending order
    bulletsToRemove.forEach(index => {
        player.bullets.splice(index, 1);
    });
    
    // Player bullets vs boss
    if (boss && boss.phase === 'fighting') {
        player.bullets = player.bullets.filter(bullet => {
            if (distance(bullet.x, bullet.y, boss.x, boss.y) < boss.size / 2 + bullet.size) {
                if (boss.shieldActive) {
                    // Reflect the bullet back at the player
                    const angleToPlayer = Math.atan2(player.y - bullet.y, player.x - bullet.x);
                    enemyBullets.push({
                        x: bullet.x,
                        y: bullet.y,
                        dx: Math.cos(angleToPlayer) * 4,
                        dy: Math.sin(angleToPlayer) * 4,
                        size: bullet.size + 2, // Slightly larger for visibility
                        emoji: '🔵', // Blue reflected bullet
                        damage: devSettings.enemyDamage, // Use enemy damage for reflected bullets
                        isReflected: true // Mark as reflected for potential special handling
                    });
                    createParticles(bullet.x, bullet.y, '🛡️', 3);
                    if (window.audioManager) {
                        window.audioManager.playEnemyHit();
                    }
                } else {
                    // Normal damage
                    boss.health -= bullet.damage;
                    createParticles(bullet.x, bullet.y, '💥', 5);
                    
                    if (window.audioManager) {
                        window.audioManager.playEnemyHit();
                    }
                    
                    updateUI();
                }
                return false; // Remove bullet either way
            }
            return true;
        });
    }
    
    // Enemy bullets vs player
    enemyBullets = enemyBullets.filter(bullet => {
        if (distance(bullet.x, bullet.y, player.x, player.y) < player.size / 2 + bullet.size) {
            if (!invincible) {
                // Use bullet's damage property if it exists, otherwise use default enemy damage
                const damage = bullet.damage || devSettings.enemyDamage;
                
                if (player.shield > 0) {
                    player.shield -= damage;
                    createParticles(player.x, player.y, '🛡️', 3);
                } else {
                    player.health -= damage;
                    createParticles(player.x, player.y, '💢', 5);
                    if (window.audioManager) {
                        window.audioManager.playPlayerDamage();
                    }
                }
                updateUI();
                
                if (player.health <= 0) {
                    gameOver();
                }
            }
            return false;
        }
        return bullet.x > -10 && bullet.x < canvas.width + 10 && 
               bullet.y > -10 && bullet.y < canvas.height + 10;
    });
    
    // Player vs power-ups
    powerUps = powerUps.filter(powerUp => {
        if (distance(powerUp.x, powerUp.y, player.x, player.y) < player.size / 2 + powerUp.size / 2) {
            applyPowerUp(powerUp.type);
            
            // Create collection animation
            createPowerUpCollectionAnimation(powerUp.x, powerUp.y, powerUp.emoji, powerUp.type);
            
            if (window.audioManager) {
                window.audioManager.playPowerUp();
            }
            return false;
        }
        return true;
    });
    
    // Player vs enemies
    enemies.forEach(enemy => {
        if (enemy.dead) return; // Skip already dead enemies
        
        if (distance(enemy.x, enemy.y, player.x, player.y) < player.size / 2 + enemy.size / 2) {
            // Create explosion at enemy position before marking as dead
            createExplosion(enemy.x, enemy.y);
            enemiesKilled++;
            
            if (!invincible) {
                player.health -= devSettings.enemyDamage * 2; // Collision does double damage
                if (window.audioManager) {
                    window.audioManager.playExplosion();
                    window.audioManager.playPlayerDamage();
                }
                updateUI();
                
                if (player.health <= 0) {
                    gameOver();
                }
            }
            enemy.dead = true; // Mark for removal regardless of invincibility
        }
    });
    
    // Player vs asteroids
    asteroids.forEach(asteroid => {
        if (distance(asteroid.x, asteroid.y, player.x, player.y) < player.size / 2 + asteroid.size / 2) {
            if (!invincible) {
                // Damage based on asteroid size
                const damage = Math.round(asteroid.size / 2);
                player.health -= damage;
                createExplosion(player.x, player.y);
                createParticles(player.x, player.y, '💥', 10);
                
                if (window.audioManager) {
                    window.audioManager.playExplosion();
                    window.audioManager.playPlayerDamage();
                }
                updateUI();
                
                if (player.health <= 0) {
                    gameOver();
                }
            }
            
            // Destroy the asteroid on impact
            asteroid.destroyed = true;
        }
    });
    
    // Remove destroyed asteroids
    asteroids = asteroids.filter(asteroid => !asteroid.destroyed);
    
    // Player vs boss
    if (boss && boss.phase === 'fighting') {
        if (distance(boss.x, boss.y, player.x, player.y) < player.size / 2 + boss.size / 2) {
            if (!invincible) {
                player.health -= devSettings.enemyDamage * 3; // Boss collision does triple damage
                createParticles(player.x, player.y, '💢', 10);
                if (window.audioManager) {
                    window.audioManager.playPlayerDamage();
                }
                updateUI();
                
                if (player.health <= 0) {
                    gameOver();
                }
            }
        }
    }
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function applyPowerUp(type) {
    switch (type) {
        case 'health':
            player.health = Math.min(player.health + 30, player.maxHealth);
            break;
        case 'power':
            player.power = Math.min(player.power + 1, 5);
            break;
        case 'shield':
            player.shield = Math.min(player.shield + 50, 100);
            break;
    }
    updateUI();
}

// Visual effects
function createParticles(x, y, emoji, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 5,
            dy: (Math.random() - 0.5) * 5,
            life: 30,
            emoji: emoji
        });
    }
}

function createExplosion(x, y) {
    createParticles(x, y, '🔥', 10);
    createParticles(x, y, '💥', 5);
}

function createBigExplosion(x, y) {
    // Create a massive explosion effect
    createParticles(x, y, '💥', 20);
    createParticles(x, y, '🔥', 30);
    createParticles(x, y, '✨', 15);
    
    // Create expanding shockwave particles
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * 8,
            dy: Math.sin(angle) * 8,
            life: 60,
            emoji: '💫',
            size: 20
        });
    }
}

function createPowerUpCollectionAnimation(x, y, emoji, type) {
    // Create ring of particles expanding outward
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * 3,
            dy: Math.sin(angle) * 3,
            life: 40,
            emoji: '✨'
        });
    }
    
    // Create floating text effect
    particles.push({
        x: x,
        y: y,
        dx: 0,
        dy: -2,
        life: 60,
        emoji: emoji,
        size: 30,
        isText: true
    });
    
    // Add colored sparkles based on type
    const sparkleEmoji = type === 'health' ? '❤️' : type === 'shield' ? '🔵' : '⚡';
    for (let i = 0; i < 6; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            dx: (Math.random() - 0.5) * 2,
            dy: -Math.random() * 2 - 1,
            life: 30,
            emoji: sparkleEmoji,
            size: 12
        });
    }
}

function updateParticles() {
    particles = particles.filter(particle => {
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;
        particle.dx *= 0.98;
        particle.dy *= 0.98;
        return particle.life > 0;
    });
}

// Drawing functions
function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    drawStars();
    
    // Draw game objects
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawBoss();
    drawAsteroids();
    drawPowerUps();
    drawParticles();
    
    // Draw pause screen
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        
        // Show resume instructions
        ctx.font = '20px Arial';
        ctx.fillText('Press P or START to resume', canvas.width / 2, canvas.height / 2 + 60);
    }
    
    // Draw controller status indicator
    if (gamepadConnected) {
        ctx.fillStyle = '#0f0';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('🎮 Controller Connected', 10, 30);
    }
}

function drawStars() {
    // Update and draw stars
    stars.forEach(star => {
        // Move stars based on their depth (parallax effect)
        if (!gamePaused) {
            star.x -= star.z * devSettings.starSpeed;
            
            // Wrap around when star goes off screen
            if (star.x < 0) {
                star.x = canvas.width;
                star.y = Math.random() * canvas.height;
                star.z = Math.random() * 3 + 1;
                star.size = Math.random() * 0.7 + 0.3;
            }
        }
        
        // Draw star with brightness based on depth
        const brightness = (1 - (star.z - 1) / 3) * 0.6; // Brighter stars, max 60% opacity
        ctx.fillStyle = `rgba(200, 200, 255, ${brightness})`; // Slight blue tint
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size / star.z, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPlayer() {
    ctx.save();
    ctx.font = `${player.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw shield bubble if active
    if (player.shield > 0) {
        ctx.strokeStyle = '#4169E1'; // Royal blue
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + (player.shield / 100) * 0.4; // Opacity based on shield strength
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    ctx.fillText(player.emoji, player.x, player.y);
    
    // Draw health bar above player
    const barWidth = 50;
    const barHeight = 6;
    const healthPercent = Math.max(0, player.health) / player.maxHealth;
    
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(player.x - barWidth / 2, player.y - player.size / 2 - 15, barWidth, barHeight);
    
    // Health bar
    if (healthPercent > 0.6) {
        ctx.fillStyle = '#0f0'; // Green
    } else if (healthPercent > 0.3) {
        ctx.fillStyle = '#ff0'; // Yellow
    } else {
        ctx.fillStyle = '#f00'; // Red
    }
    ctx.fillRect(player.x - barWidth / 2, player.y - player.size / 2 - 15, barWidth * healthPercent, barHeight);
    
    // Shield bar (if active)
    if (player.shield > 0) {
        const shieldPercent = player.shield / 100;
        ctx.fillStyle = '#00f'; // Blue
        ctx.fillRect(player.x - barWidth / 2, player.y - player.size / 2 - 25, barWidth * shieldPercent, 3);
    }
    
    ctx.restore();
}

function drawBullets() {
    // Player bullets
    ctx.fillStyle = '#0ff';
    player.bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Enemy bullets
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    enemyBullets.forEach(bullet => {
        ctx.fillText(bullet.emoji, bullet.x, bullet.y);
    });
}

function drawEnemies() {
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    enemies.forEach(enemy => {
        ctx.fillText(enemy.emoji, enemy.x, enemy.y);
        
        // Health bar
        const barWidth = 40;
        const barHeight = 4;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size / 2 - 10, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size / 2 - 10, barWidth * healthPercent, barHeight);
    });
}

function drawAsteroids() {
    asteroids.forEach(asteroid => {
        ctx.font = `${asteroid.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(asteroid.emoji, asteroid.x, asteroid.y);
    });
    
    // Draw progress indicator during asteroid field
    if (asteroidFieldActive) {
        const progress = asteroidFieldTimer / asteroidFieldDuration;
        const barWidth = 300;
        const barHeight = 20;
        const barX = (canvas.width - barWidth) / 2;
        const barY = 50;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Progress bar
        ctx.fillStyle = '#0f0';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        
        if (asteroidFieldTimer >= asteroidFieldDuration) {
            // Show clearing message when done but waiting for asteroids to leave
            ctx.fillText(`ASTEROID FIELD - Clearing remaining asteroids (${asteroids.length})`, canvas.width / 2, barY - 10);
        } else {
            // Show normal countdown
            const timeLeft = Math.ceil((asteroidFieldDuration - asteroidFieldTimer) / 60);
            ctx.fillText(`ASTEROID FIELD - ${timeLeft}s remaining`, canvas.width / 2, barY - 10);
        }
    }
}

function drawBoss() {
    if (!boss || boss.phase === 'defeated') return;
    
    ctx.save();
    
    // Add visual effects during death
    if (boss.phase === 'dying') {
        // Flashing effect
        if (boss.deathTimer % 10 < 5) {
            ctx.globalAlpha = 0.5;
        }
        
        // Red tint
        ctx.filter = 'hue-rotate(180deg) brightness(1.5)';
    }
    
    // Draw shield bubble if active
    if (boss.shieldActive) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.2; // Pulsing effect
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.size / 2 + 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // Inner shield glow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.size / 2 + 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    // Draw boss emoji
    ctx.font = `${boss.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boss.emoji, boss.x, boss.y);
    
    // Draw boss health bar at top of screen
    const barWidth = 400;
    const barHeight = 20;
    const healthPercent = Math.max(0, boss.health) / boss.maxHealth;
    
    // Boss health bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width / 2 - barWidth / 2, 30, barWidth, barHeight);
    
    // Boss health bar
    if (healthPercent > 0.66) {
        ctx.fillStyle = '#0f0'; // Green
    } else if (healthPercent > 0.33) {
        ctx.fillStyle = '#ff0'; // Yellow
    } else {
        ctx.fillStyle = '#f00'; // Red
    }
    ctx.fillRect(canvas.width / 2 - barWidth / 2, 30, barWidth * healthPercent, barHeight);
    
    // Boss name
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText('BOSS', canvas.width / 2, 20);
    
    // Attack pattern indicator
    let patterns;
    if (boss.isFinalBoss) {
        patterns = ['Machine Gun', 'LASER BEAM', 'Bullet Hell', 'Summon Minions', 'CHAOS MODE'];
        
        // Show laser charging warning
        if (boss.laserCharging) {
            // Pulsing warning text
            const pulse = Math.sin(boss.laserTimer * 0.1) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            ctx.font = '28px Arial';
            ctx.fillText('⚠️ LASER CHARGING ⚠️', canvas.width / 2, 100);
            
            // Charging percentage
            const chargePercent = Math.min(boss.laserTimer / 120, 1);
            ctx.font = '20px Arial';
            ctx.fillStyle = '#ff0';
            ctx.fillText(`${Math.floor(chargePercent * 100)}%`, canvas.width / 2, 130);
            
            // Draw laser targeting line with increasing intensity
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + chargePercent * 0.5})`;
            ctx.lineWidth = 3 + chargePercent * 5;
            ctx.beginPath();
            ctx.moveTo(boss.x - boss.size / 2, boss.y);
            ctx.lineTo(0, boss.y);
            ctx.stroke();
            
            // Add glow effect at high charge
            if (chargePercent > 0.7) {
                ctx.strokeStyle = `rgba(255, 255, 0, ${(chargePercent - 0.7) * 2})`;
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(boss.x - boss.size / 2, boss.y);
                ctx.lineTo(0, boss.y);
                ctx.stroke();
            }
        }
    } else {
        patterns = ['Rapid Fire', 'Spread Shot', 'Spiral Attack'];
    }
    ctx.font = '16px Arial';
    ctx.fillStyle = '#ff0';
    ctx.fillText(patterns[boss.attackPattern], canvas.width / 2, 60);
    
    // Shield status indicator
    if (boss.shieldActive) {
        ctx.fillStyle = '#00ffff';
        ctx.font = '18px Arial';
        ctx.fillText('🛡️ SHIELD ACTIVE - REFLECTING BULLETS! 🛡️', canvas.width / 2, 80);
    }
    
    ctx.restore();
}

function drawPowerUps() {
    ctx.font = '25px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    powerUps.forEach(powerUp => {
        // Draw without rotation to keep powerups upright
        ctx.fillText(powerUp.emoji, powerUp.x, powerUp.y);
    });
}

function drawParticles() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    particles.forEach(particle => {
        ctx.save();
        
        // Set font size based on particle size
        const fontSize = particle.size || 16;
        ctx.font = `${fontSize}px Arial`;
        
        // Fade out based on initial life
        const maxLife = particle.isText ? 60 : 40;
        ctx.globalAlpha = particle.life / maxLife;
        
        ctx.fillText(particle.emoji, particle.x, particle.y);
        ctx.restore();
    });
}


// Game management
function updateUI() {
    document.getElementById('level').textContent = level;
    document.getElementById('score').textContent = score;
    document.getElementById('health').textContent = Math.max(0, player.health);
    document.getElementById('shield').textContent = Math.max(0, player.shield);
    document.getElementById('power').textContent = player.power;
    document.getElementById('kills').textContent = enemiesKilled;
    document.getElementById('killsRequired').textContent = levelKillRequirement;
}

function levelUp() {
    level++;
    enemiesKilled = 0; // Reset kill count for new level
    levelTimer = 0; // Reset level timer
    
    // Check if this is a special level
    if (level === 3 || level === 7) {
        // Asteroid field levels
        startAsteroidField(level);
        levelKillRequirement = 1; // Will be completed by surviving
    } else if (level === 5 && !bossDefeated) {
        spawnBoss();
        levelKillRequirement = 1; // Just need to defeat the boss
    } else if (level === 10 && !finalBossDefeated) {
        spawnFinalBoss();
        levelKillRequirement = 1; // Just need to defeat the final boss
    } else {
        // Increase kill requirement for next level (scales up)
        levelKillRequirement = 10 + (level - 1) * 5; // 10, 15, 20, 25, etc.
    }
    
    // Don't restore player health - they need to survive with what they have
    updateUI();
    // Create star particles at player position, not center of screen
    createParticles(player.x, player.y, '⭐', 20);
    if (window.audioManager) {
        window.audioManager.playPowerUp();
    }
    
    // Show level up message
    if (level === 3) {
        console.log(`Level ${level}! ASTEROID FIELD - Survive for 30 seconds!`);
    } else if (level === 7) {
        console.log(`Level ${level}! INTENSE ASTEROID FIELD - Survive for 45 seconds!`);
    } else if (level === 5 && !bossDefeated) {
        console.log(`Level ${level}! BOSS FIGHT!`);
    } else if (level === 10 && !finalBossDefeated) {
        console.log(`Level ${level}! FINAL BOSS - THE ULTIMATE CHALLENGE!`);
    } else {
        console.log(`Level ${level}! Kill ${levelKillRequirement} enemies to advance.`);
    }
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
    if (window.audioManager) {
        window.audioManager.playGameOver();
    }
}

function gameWon() {
    gameRunning = false;
    
    // Create or update victory screen
    let victoryScreen = document.getElementById('victoryScreen');
    if (!victoryScreen) {
        victoryScreen = document.createElement('div');
        victoryScreen.id = 'victoryScreen';
        victoryScreen.className = 'game-over';
        victoryScreen.innerHTML = `
            <h2>🎉 CONGRATULATIONS! 🎉</h2>
            <p>You have defeated the final boss!</p>
            <p>You are a true space hero!</p>
            <p>Final Score: <span id="victoryScore">0</span></p>
            <p>Levels Completed: 10</p>
            <button onclick="restartGame()">Play Again</button>
        `;
        document.querySelector('.game-container').appendChild(victoryScreen);
    }
    
    document.getElementById('victoryScore').textContent = score;
    victoryScreen.style.display = 'block';
    
    // Create celebration particles
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const x = Math.random() * canvas.width;
            const y = canvas.height;
            for (let j = 0; j < 5; j++) {
                particles.push({
                    x: x,
                    y: y,
                    dx: (Math.random() - 0.5) * 8,
                    dy: -Math.random() * 10 - 5,
                    life: 120,
                    emoji: ['🎆', '🎇', '✨', '⭐', '🌟'][Math.floor(Math.random() * 5)],
                    size: 30
                });
            }
        }, i * 100);
    }
}

function restartGame() {
    // Reset game state
    gameRunning = true;
    gamePaused = false;
    level = 1;
    score = 0;
    enemiesKilled = 0;
    levelKillRequirement = 10;
    levelTimer = 0;
    boss = null;
    bossDefeated = false;
    finalBossDefeated = false;
    
    // Reset player
    player.x = 100;
    player.y = canvas.height / 2;
    player.health = 100;
    player.shield = 0;
    player.power = 1;
    player.bullets = [];
    
    // Clear arrays
    enemies = [];
    enemyBullets = [];
    powerUps = [];
    particles = [];
    asteroids = [];
    
    // Reset asteroid field
    asteroidFieldActive = false;
    asteroidFieldTimer = 0;
    asteroidFieldDuration = 0;
    
    // Reset timers
    enemySpawnTimer = 0;
    powerUpSpawnTimer = 0;
    
    // Reset cooldowns
    updatePlayer.pauseCooldown = 0;
    
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    
    updateUI();
}

// Handle controller input for game over screen
function handleGameOverInput() {
    const gamepadInput = getGamepadInput();
    if (gamepadInput && (gamepadInput.buttons.a || gamepadInput.buttons.start)) {
        restartGame();
    }
}

// Update enemy bullets
function updateEnemyBullets() {
    if (gamePaused || !gameRunning) return;
    
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
        return bullet.x > -10 && bullet.x < canvas.width + 10 && 
               bullet.y > -10 && bullet.y < canvas.height + 10;
    });
}

// Main game loop
function gameLoop() {
    // Handle controller input for game over screen
    if (!gameRunning) {
        handleGameOverInput();
    }
    
    updatePlayer();
    updateEnemies();
    updateEnemyBullets();
    updatePowerUps();
    updateParticles();
    updateAsteroids();
    checkCollisions();
    
    // Spawn enemies
    if (gameRunning && !gamePaused && !boss && !asteroidFieldActive) { // Don't spawn enemies during boss fight or asteroid field
        enemySpawnTimer++;
        
        // Increase max enemies more aggressively with levels
        const baseEnemies = 3;
        const maxEnemies = Math.min(baseEnemies + level * 2, 15); // 5, 7, 9, 11... max 15
        
        // Decrease spawn rate more aggressively with levels
        const baseSpawnRate = devSettings.enemySpawnRate;
        const spawnRate = Math.max(baseSpawnRate - level * 20, 60); // Faster spawning at higher levels
        
        if (enemySpawnTimer > spawnRate && enemies.length < maxEnemies) {
            spawnEnemy();
            enemySpawnTimer = 0;
        }
        
        // Spawn power-ups (less frequent and more random)
        powerUpSpawnTimer++;
        const minSpawnTime = 600; // 10 seconds minimum
        const maxSpawnTime = 1200; // 20 seconds maximum
        
        if (powerUpSpawnTimer > minSpawnTime + Math.random() * (maxSpawnTime - minSpawnTime)) {
            spawnPowerUp();
            powerUpSpawnTimer = 0;
        }
        
        // Level progression based on kills
        levelTimer++;
        
        // Check if player has killed enough enemies
        if (enemiesKilled >= levelKillRequirement) {
            levelUp();
        }
        
        // Optional: Add time-based level up as fallback (e.g., after 2 minutes)
        const maxLevelTime = 60 * 120; // 120 seconds at 60 fps
        if (levelTimer >= maxLevelTime) {
            levelUp();
        }
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// Player settings (separate from developer settings)
function loadPlayerSettings() {
    const saved = localStorage.getItem('spaceBulletHellPlayerSettings');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.warn('Failed to parse saved player settings');
            return {};
        }
    }
    return {};
}

function savePlayerSettings(settings) {
    localStorage.setItem('spaceBulletHellPlayerSettings', JSON.stringify(settings));
}

const playerSettings = loadPlayerSettings();

// Volume slider functionality
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');

// Load saved volume setting
if (playerSettings.volume !== undefined) {
    volumeSlider.value = playerSettings.volume;
    volumeValue.textContent = `${playerSettings.volume}%`;
    if (window.audioManager) {
        window.audioManager.setVolume(playerSettings.volume / 100);
    }
}

volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    if (window.audioManager) {
        window.audioManager.setVolume(volume);
    }
    volumeValue.textContent = `${e.target.value}%`;
    
    // Save volume setting
    playerSettings.volume = parseInt(e.target.value);
    savePlayerSettings(playerSettings);
});


// Developer panel functionality
const devToggle = document.getElementById('dev-toggle');
const devPanel = document.getElementById('developer-panel');
let devPanelVisible = false;

devToggle.addEventListener('click', () => {
    devPanelVisible = !devPanelVisible;
    devPanel.style.display = devPanelVisible ? 'block' : 'none';
    devToggle.textContent = devPanelVisible ? 'Hide Developer Panel' : 'Show Developer Panel';
});

// Make developer panel draggable
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

devPanel.addEventListener('mousedown', (e) => {
    // Don't drag if clicking on sliders or inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
        return;
    }
    
    isDragging = true;
    dragOffset.x = e.clientX - devPanel.offsetLeft;
    dragOffset.y = e.clientY - devPanel.offsetTop;
    devPanel.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        e.preventDefault();
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep panel within viewport bounds
        const maxX = window.innerWidth - devPanel.offsetWidth;
        const maxY = window.innerHeight - devPanel.offsetHeight;
        
        devPanel.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
        devPanel.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
        devPanel.style.right = 'auto'; // Override right positioning
    }
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        devPanel.style.cursor = 'move';
    }
});

// Helper function to set up slider
function setupSlider(id, property, callback) {
    const slider = document.getElementById(id);
    const valueSpan = document.getElementById(id + '-value');
    
    // Set initial values from saved settings
    slider.value = devSettings[property];
    valueSpan.textContent = devSettings[property];
    
    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        devSettings[property] = value;
        valueSpan.textContent = value;
        saveSettings(); // Save to localStorage when changed
        if (callback) callback(value);
    });
}

// Set up all sliders
setupSlider('player-speed', 'playerSpeed', (value) => {
    player.speed = value;
});

setupSlider('player-health', 'playerMaxHealth', (value) => {
    player.maxHealth = value;
    if (player.health > value) player.health = value;
});

setupSlider('shoot-cooldown', 'shootCooldown');

setupSlider('player-damage-multiplier', 'playerDamageMultiplier');

setupSlider('enemy-speed', 'enemySpeed');

setupSlider('enemy-spawn-rate', 'enemySpawnRate');

setupSlider('enemy-health', 'enemyBaseHealth');

setupSlider('star-count', 'starCount', (value) => {
    // Adjust star count
    while (stars.length < value) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * 3 + 1,
            size: Math.random() * 0.7 + 0.3
        });
    }
    while (stars.length > value) {
        stars.pop();
    }
});

setupSlider('star-speed', 'starSpeed');

setupSlider('game-speed', 'gameSpeed');

setupSlider('enemy-fire-rate', 'enemyFireRate');

setupSlider('enemy-damage', 'enemyDamage');

// Invincibility toggle
const invincibilityToggle = document.getElementById('invincibility-toggle');
const invincibilityStatus = document.getElementById('invincibility-status');

invincibilityToggle.addEventListener('change', (e) => {
    invincible = e.target.checked;
    invincibilityStatus.textContent = invincible ? 'ON' : 'OFF';
    invincibilityStatus.style.color = invincible ? '#00ff00' : '#ff6600';
});

// Developer panel control buttons
const saveDefaultsBtn = document.getElementById('save-defaults-btn');
const resetDefaultsBtn = document.getElementById('reset-defaults-btn');
const advanceLevelBtn = document.getElementById('advance-level-btn');

saveDefaultsBtn.addEventListener('click', () => {
    // Display current values for easy copying
    const currentValues = {
        playerSpeed: devSettings.playerSpeed,
        playerMaxHealth: devSettings.playerMaxHealth,
        shootCooldown: devSettings.shootCooldown,
        enemySpeed: devSettings.enemySpeed,
        enemySpawnRate: devSettings.enemySpawnRate,
        enemyBaseHealth: devSettings.enemyBaseHealth,
        starCount: devSettings.starCount,
        starSpeed: devSettings.starSpeed,
        gameSpeed: devSettings.gameSpeed
    };
    
    console.log('=== CURRENT DEVELOPER SETTINGS ===');
    console.log('Copy these values to update defaultSettings in the code:');
    console.log(JSON.stringify(currentValues, null, 2));
    console.log('=====================================');
    
    // Store in global variable for easy access
    window.currentDevSettings = currentValues;
    
    alert('Current settings logged to console. Tell Claude to "commit the developer panel settings as defaults" to update the code.');
});

resetDefaultsBtn.addEventListener('click', () => {
    // Reset all settings to original defaults
    Object.assign(devSettings, defaultSettings);
    
    // Update all sliders and their values
    document.querySelectorAll('.slider-group input[type="range"]').forEach(slider => {
        const property = slider.id.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase()).replace(/^[a-z]/, match => match.toLowerCase());
        if (property.includes('-')) {
            // Handle special cases like player-speed -> playerSpeed
            const camelCase = property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
            if (devSettings[camelCase] !== undefined) {
                slider.value = devSettings[camelCase];
                document.getElementById(slider.id + '-value').textContent = devSettings[camelCase];
            }
        }
    });
    
    // Trigger callbacks for sliders that need them
    player.speed = devSettings.playerSpeed;
    player.maxHealth = devSettings.playerMaxHealth;
    if (player.health > player.maxHealth) player.health = player.maxHealth;
    
    // Update star count
    while (stars.length < devSettings.starCount) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * 3 + 1,
            size: Math.random() * 0.7 + 0.3
        });
    }
    while (stars.length > devSettings.starCount) {
        stars.pop();
    }
    
    saveSettings();
    alert('Settings reset to defaults!');
});

advanceLevelBtn.addEventListener('click', () => {
    // Force complete the current level
    enemiesKilled = levelKillRequirement;
    console.log(`Developer: Advanced to level ${level + 1}`);
});

// Start game
updateUI();
gameLoop();

// Make restartGame globally accessible for the button
window.restartGame = restartGame;