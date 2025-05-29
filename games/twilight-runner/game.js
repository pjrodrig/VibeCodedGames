const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('twilightHighScore') || 0;
let gameSpeed = 2.5;
let groundY = canvas.height - 100;

// Edward and Bella
const edward = {
    x: 100,
    y: groundY,
    width: 60,
    height: 80,
    velocityY: 0,
    velocityX: 0,
    jumping: false,
    jumpPower: -12,
    gravity: 0.25,
    runFrame: 0,
    speed: 3
};

// Load sprite image
const sprite = new Image();
sprite.src = 'bellaOnEdwardsBack.webp';
let spriteLoaded = false;
sprite.onload = () => {
    spriteLoaded = true;
};

// Game objects
let obstacles = [];
let trees = [];
let particles = [];
let clouds = [];

// Controls
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && gameRunning && !edward.jumping) {
        jump();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

canvas.addEventListener('click', () => {
    if (gameRunning && !edward.jumping) {
        jump();
    }
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameRunning && !edward.jumping) {
        jump();
    }
});

function jump() {
    edward.jumping = true;
    edward.velocityY = edward.jumpPower;
    createJumpParticles();
}

function createJumpParticles() {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: edward.x,
            y: edward.y + edward.height,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * -2,
            life: 20,
            emoji: '✨'
        });
    }
}

// Initialize background elements
function initBackground() {
    // Create initial trees
    for (let i = 0; i < 5; i++) {
        trees.push({
            x: Math.random() * canvas.width,
            emoji: Math.random() > 0.5 ? '🌲' : '🌳',
            size: Math.random() * 30 + 40,
            speed: Math.random() * 0.5 + 0.5
        });
    }
    
    // Create initial clouds
    for (let i = 0; i < 3; i++) {
        clouds.push({
            x: Math.random() * canvas.width,
            y: Math.random() * 100 + 20,
            emoji: '☁️',
            size: Math.random() * 20 + 30,
            speed: Math.random() * 0.2 + 0.1
        });
    }
}

// Spawn obstacles
function spawnObstacle() {
    const types = [
        { emoji: '🪨', width: 40, height: 40, y: groundY + 20 },
        { emoji: '🌳', width: 30, height: 60, y: groundY },
        { emoji: '⚾', width: 35, height: 30, y: groundY - 40 },
        { emoji: '🐺', width: 45, height: 40, y: groundY + 20 }
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    
    obstacles.push({
        x: canvas.width,
        y: type.y,
        width: type.width,
        height: type.height,
        emoji: type.emoji,
        passed: false
    });
}

// Update game objects
function update() {
    if (!gameRunning) return;
    
    // Update Edward horizontal movement
    edward.velocityX = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) {
        edward.velocityX = -edward.speed;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        edward.velocityX = edward.speed;
    }
    
    edward.x += edward.velocityX;
    
    // Keep Edward within bounds
    if (edward.x < 0) edward.x = 0;
    if (edward.x > canvas.width - edward.width) edward.x = canvas.width - edward.width;
    
    // Update Edward vertical movement
    if (edward.jumping) {
        edward.velocityY += edward.gravity;
        edward.y += edward.velocityY;
        
        if (edward.y >= groundY) {
            edward.y = groundY;
            edward.jumping = false;
            edward.velocityY = 0;
        }
    }
    
    // Update run animation
    edward.runFrame += 0.2;
    
    // Update obstacles
    obstacles = obstacles.filter(obstacle => {
        obstacle.x -= gameSpeed;
        
        // Check if passed for scoring
        if (!obstacle.passed && obstacle.x + obstacle.width < edward.x) {
            obstacle.passed = true;
            score += 10;
            updateScore();
        }
        
        // Check collision
        if (checkCollision(edward, obstacle)) {
            gameOver();
        }
        
        return obstacle.x > -obstacle.width;
    });
    
    // Spawn new obstacles
    if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 300) {
        if (Math.random() < 0.02) {
            spawnObstacle();
        }
    }
    
    // Update background elements
    trees.forEach(tree => {
        tree.x -= tree.speed * gameSpeed * 0.3;
        if (tree.x < -tree.size) {
            tree.x = canvas.width + tree.size;
            tree.emoji = Math.random() > 0.5 ? '🌲' : '🌳';
        }
    });
    
    clouds.forEach(cloud => {
        cloud.x -= cloud.speed * gameSpeed * 0.2;
        if (cloud.x < -cloud.size) {
            cloud.x = canvas.width + cloud.size;
            cloud.y = Math.random() * 100 + 20;
        }
    });
    
    // Update particles
    particles = particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2;
        particle.life--;
        return particle.life > 0;
    });
    
    // Increase difficulty
    if (score > 0 && score % 100 === 0) {
        gameSpeed += 0.25;
    }
}

function checkCollision(edward, obstacle) {
    const edwardLeft = edward.x;
    const edwardRight = edward.x + edward.width;
    const edwardTop = edward.y;
    const edwardBottom = edward.y + edward.height;
    
    const obstacleLeft = obstacle.x;
    const obstacleRight = obstacle.x + obstacle.width;
    const obstacleTop = obstacle.y - obstacle.height;
    const obstacleBottom = obstacle.y;
    
    return edwardRight > obstacleLeft + 10 &&
           edwardLeft < obstacleRight - 10 &&
           edwardBottom > obstacleTop + 10 &&
           edwardTop < obstacleBottom - 10;
}

// Drawing functions
function draw() {
    // Clear canvas completely
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw moon
    ctx.font = '60px Arial';
    ctx.globalAlpha = 0.3;
    ctx.fillText('🌙', canvas.width - 100, 80);
    ctx.globalAlpha = 1;
    
    // Draw clouds
    clouds.forEach(cloud => {
        ctx.font = `${cloud.size}px Arial`;
        ctx.globalAlpha = 0.5;
        ctx.fillText(cloud.emoji, cloud.x, cloud.y);
    });
    ctx.globalAlpha = 1;
    
    // Draw ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, groundY + 80, canvas.width, canvas.height - groundY);
    
    // Draw ground line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 80);
    ctx.lineTo(canvas.width, groundY + 80);
    ctx.stroke();
    
    // Draw background trees
    trees.forEach(tree => {
        ctx.font = `${tree.size}px Arial`;
        ctx.globalAlpha = 0.3;
        ctx.fillText(tree.emoji, tree.x, groundY + 70);
    });
    ctx.globalAlpha = 1;
    
    // Draw obstacles
    ctx.font = '40px Arial';
    obstacles.forEach(obstacle => {
        ctx.fillText(obstacle.emoji, obstacle.x, obstacle.y);
    });
    
    // Draw particles
    particles.forEach(particle => {
        ctx.font = '20px Arial';
        ctx.globalAlpha = particle.life / 20;
        ctx.fillText(particle.emoji, particle.x, particle.y);
    });
    ctx.globalAlpha = 1;
    
    // Draw Edward and Bella
    drawEdwardAndBella();
}

function drawEdwardAndBella() {
    ctx.save();
    
    // Add running bobbing effect
    let yOffset = 0;
    if (!edward.jumping) {
        yOffset = Math.sin(edward.runFrame) * 3;
    }
    
    // Draw the sprite if loaded, otherwise use emoji fallback
    if (spriteLoaded) {
        // Draw the image without mirroring (they're already facing right)
        ctx.drawImage(sprite, edward.x, edward.y + yOffset, edward.width, edward.height);
    } else {
        // Fallback to emoji
        ctx.font = '40px Arial';
        ctx.fillText('🧛', edward.x, edward.y + edward.height - 10 + yOffset);
        ctx.font = '30px Arial';
        ctx.fillText('👩', edward.x + 5, edward.y + 10 + yOffset);
    }
    
    // Draw sparkles around them
    if (Math.random() < 0.3) {
        particles.push({
            x: edward.x + Math.random() * edward.width,
            y: edward.y + Math.random() * edward.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 15,
            emoji: '✨'
        });
    }
    
    ctx.restore();
}

// Game functions
function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    resetGame();
    gameRunning = true;
    initBackground();
    gameLoop();
}

function resetGame() {
    score = 0;
    gameSpeed = 2.5;
    obstacles = [];
    particles = [];
    edward.y = groundY;
    edward.jumping = false;
    edward.velocityY = 0;
    updateScore();
}

function gameOver() {
    gameRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('twilightHighScore', highScore);
    }
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'flex';
}

function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    resetGame();
    gameRunning = true;
    gameLoop();
}

function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('highScore').textContent = highScore;
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;
    
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize
updateScore();

// Make functions globally accessible
window.startGame = startGame;
window.restartGame = restartGame;