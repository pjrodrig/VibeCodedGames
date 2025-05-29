const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = true;
let gamePaused = false;
let level = 1;
let score = 0;
let enemySpawnTimer = 0;
let powerUpSpawnTimer = 0;
let fpvMode = false;
let invincible = false;

// Developer settings with localStorage support
const defaultSettings = {
    playerSpeed: 3,
    playerMaxHealth: 100,
    shootCooldown: 10,
    enemySpeed: 1.5,
    enemySpawnRate: 180,
    enemyBaseHealth: 50,
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
        if (fpvMode) {
            // In FPV mode, player stays centered, movement affects aim/perspective
            // Keep player position fixed at center for collision detection
            player.x = canvas.width / 2;
            player.y = canvas.height / 2;
        } else {
            const newX = player.x + moveX;
            const newY = player.y + moveY;
            
            if (newX >= player.size / 2 && newX <= canvas.width / 2) {
                player.x = newX;
            }
            if (newY >= player.size / 2 && newY <= canvas.height - player.size / 2) {
                player.y = newY;
            }
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
        if (fpvMode && bullet.depth !== undefined) {
            bullet.depth += bullet.dz;
            // Keep bullets centered but moving forward in depth
            return bullet.depth < 1000;
        } else {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
            return bullet.x < canvas.width + 10;
        }
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
        
        if (fpvMode) {
            // In FPV mode, bullets go straight forward (toward enemies)
            player.bullets.push({
                x: player.x,
                y: player.y,
                dx: 0,
                dy: -8, // Forward in FPV
                dz: 4, // Depth component for FPV
                size: 5,
                damage: 10 + player.power * 5,
                depth: 10 // Start close to player
            });
        } else {
            player.bullets.push({
                x: player.x + player.size / 2,
                y: player.y,
                dx: 4,
                dy: angle * 1.5,
                size: 5,
                damage: 10 + player.power * 5
            });
        }
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
        emoji: getEnemyEmoji(type),
        // FPV mode properties
        depth: fpvMode ? Math.random() * 800 + 200 : 1, // Distance from player in FPV mode
        originalX: 0,
        originalY: 0
    };
    
    enemies.push(enemy);
}

function getEnemyEmoji(type) {
    const emojis = {
        'basic': '🛸',
        'zigzag': '👾',
        'spiral': '🌀',
        'burst': '💥'
    };
    return emojis[type] || '🛸';
}

// Enemy movement and shooting
function updateEnemies() {
    if (gamePaused || !gameRunning) return;
    
    enemies = enemies.filter(enemy => {
        // FPV mode movement
        if (fpvMode) {
            enemy.depth -= enemy.speed * 3; // Move towards player
            
            // Set position in FPV space
            if (enemy.originalX === 0 && enemy.originalY === 0) {
                enemy.originalX = (Math.random() - 0.5) * 400; // Random X offset
                enemy.originalY = (Math.random() - 0.5) * 300; // Random Y offset
            }
            
            const perspective = 1000 / (enemy.depth + 1);
            enemy.x = canvas.width / 2 + enemy.originalX * perspective;
            enemy.y = canvas.height / 2 + enemy.originalY * perspective;
            enemy.size = 30 * perspective;
            
            // Remove enemy if too close or off screen
            if (enemy.depth <= 10 || enemy.x < -100 || enemy.x > canvas.width + 100) {
                return false;
            }
        }
        // Standard side-scrolling movement
        else if (enemy.movementPhase === 'entering') {
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
        if (enemy.shootTimer > 90) {
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
            
            if (fpvMode && bullet.depth !== undefined && enemy.depth !== undefined) {
                // FPV collision detection based on depth
                collision = Math.abs(bullet.depth - enemy.depth) < 20;
            } else {
                // Standard 2D collision detection
                collision = distance(bullet.x, bullet.y, enemy.x, enemy.y) < enemy.size / 2 + bullet.size;
            }
            
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
    
    // Enemy bullets vs player
    enemyBullets = enemyBullets.filter(bullet => {
        if (distance(bullet.x, bullet.y, player.x, player.y) < player.size / 2 + bullet.size) {
            if (!invincible) {
                if (player.shield > 0) {
                    player.shield -= 10;
                    createParticles(player.x, player.y, '🛡️', 3);
                } else {
                    player.health -= 10;
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
            createParticles(powerUp.x, powerUp.y, powerUp.emoji, 8);
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
            
            if (!invincible) {
                player.health -= 20;
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
    score += 50;
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
    drawPowerUps();
    drawParticles();
    drawCrosshairs();
    
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
    // Don't draw player in FPV mode
    if (fpvMode) return;
    
    ctx.save();
    ctx.font = `${player.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw shield if active
    if (player.shield > 0) {
        ctx.globalAlpha = player.shield / 100;
        ctx.fillText('🛡️', player.x, player.y);
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
        if (fpvMode && bullet.depth !== undefined) {
            // In FPV mode, don't draw player bullets (they're "invisible" going forward)
            return;
        }
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

function drawPowerUps() {
    ctx.font = '25px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    powerUps.forEach(powerUp => {
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        ctx.rotate(Date.now() * 0.002);
        ctx.fillText(powerUp.emoji, 0, 0);
        ctx.restore();
    });
}

function drawParticles() {
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life / 30;
        ctx.fillText(particle.emoji, particle.x, particle.y);
        ctx.restore();
    });
}

function drawCrosshairs() {
    if (!fpvMode) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = 20;
    
    ctx.save();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(centerX - size, centerY);
    ctx.lineTo(centerX + size, centerY);
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size);
    ctx.lineTo(centerX, centerY + size);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Game management
function updateUI() {
    document.getElementById('level').textContent = level;
    document.getElementById('score').textContent = score;
    document.getElementById('health').textContent = Math.max(0, player.health);
    document.getElementById('shield').textContent = Math.max(0, player.shield);
    document.getElementById('power').textContent = player.power;
}

function levelUp() {
    level++;
    player.health = Math.min(player.health + 20, player.maxHealth);
    updateUI();
    // Create star particles at player position, not center of screen
    createParticles(player.x, player.y, '⭐', 20);
    if (window.audioManager) {
        window.audioManager.playPowerUp();
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

function restartGame() {
    // Reset game state
    gameRunning = true;
    gamePaused = false;
    level = 1;
    score = 0;
    
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
    checkCollisions();
    
    // Spawn enemies
    if (gameRunning && !gamePaused) {
        enemySpawnTimer++;
        const maxEnemies = Math.min(3 + level, 10); // Start with 4 enemies, max 10
        
        if (enemySpawnTimer > Math.max(devSettings.enemySpawnRate - level * 15, 90) && enemies.length < maxEnemies) {
            spawnEnemy();
            enemySpawnTimer = 0;
        }
        
        // Spawn power-ups
        powerUpSpawnTimer++;
        if (powerUpSpawnTimer > 300) {
            spawnPowerUp();
            powerUpSpawnTimer = 0;
        }
        
        // Level progression
        if (score > level * 1000) {
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

// FPV toggle functionality
const fpvToggle = document.getElementById('fpv-toggle');

fpvToggle.addEventListener('click', () => {
    fpvMode = !fpvMode;
    fpvToggle.textContent = fpvMode ? 'Switch to Side View' : 'Switch to FPV Mode';
    
    // Reset player position when switching modes
    if (!fpvMode) {
        player.x = 100;
        player.y = canvas.height / 2;
    }
    
    // Clear existing enemies when switching modes to avoid positioning issues
    enemies = [];
    enemyBullets = [];
    powerUps = [];
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

// Start game
updateUI();
gameLoop();

// Make restartGame globally accessible for the button
window.restartGame = restartGame;