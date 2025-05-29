const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const PADDLE_WIDTH = 10;
let PADDLE1_HEIGHT = 80;
let PADDLE2_HEIGHT = 80;
const BALL_SIZE = 10;
const PADDLE_SPEED = 5;
const BALL_SPEED = 4;
const BOOST_MULTIPLIER = 2.5;
const BOOST_COOLDOWN = 10000; // 10 seconds

let player1Score = 0;
let player2Score = 0;
let isCountingDown = false;
let countdownValue = 3;
let ballServeDirection = { dx: 0, dy: 0 };
let gameStarted = false;

let player1BoostAvailable = true;
let player2BoostAvailable = true;
let player1BoostCooldown = 0;
let player2BoostCooldown = 0;

// Random image system
let currentEmoji = '';
let emojiPosition = { x: 0, y: 0 };
const emojis = ['🌟', '🚀', '🎾', '🎯', '🔥', '💫', '⚡', '🌈', '🎪', '🎨', '🎭', '🎮', '🏆', '💎', '🌺'];

const paddle1 = {
    x: 20,
    y: canvas.height / 2 - PADDLE1_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE1_HEIGHT,
    dy: 0
};

const paddle2 = {
    x: canvas.width - 30,
    y: canvas.height / 2 - PADDLE2_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE2_HEIGHT,
    dy: 0
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: BALL_SIZE,
    dx: BALL_SPEED,
    dy: BALL_SPEED / 2
};

const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

function updatePaddles() {
    if (keys['w'] || keys['W']) {
        paddle1.dy = -PADDLE_SPEED;
    } else if (keys['s'] || keys['S']) {
        paddle1.dy = PADDLE_SPEED;
    } else {
        paddle1.dy = 0;
    }

    if (keys['ArrowUp']) {
        paddle2.dy = -PADDLE_SPEED;
    } else if (keys['ArrowDown']) {
        paddle2.dy = PADDLE_SPEED;
    } else {
        paddle2.dy = 0;
    }

    paddle1.y += paddle1.dy;
    paddle2.y += paddle2.dy;

    paddle1.y = Math.max(0, Math.min(canvas.height - paddle1.height, paddle1.y));
    paddle2.y = Math.max(0, Math.min(canvas.height - paddle2.height, paddle2.y));
}

function updateBall() {
    if (isCountingDown || !gameStarted) return;
    
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y - ball.size / 2 <= 0 || ball.y + ball.size / 2 >= canvas.height) {
        ball.dy = -ball.dy;
    }

    if (
        ball.x - ball.size / 2 <= paddle1.x + paddle1.width &&
        ball.x + ball.size / 2 >= paddle1.x &&
        ball.y >= paddle1.y &&
        ball.y <= paddle1.y + paddle1.height &&
        ball.dx < 0
    ) {
        ball.dx = -ball.dx;
        ball.dy = (ball.y - (paddle1.y + paddle1.height / 2)) / 10;
        
        // Check if boost was used
        if (keys['q'] && player1BoostAvailable) {
            ball.dx *= BOOST_MULTIPLIER;
            ball.dy *= BOOST_MULTIPLIER;
            player1BoostAvailable = false;
            player1BoostCooldown = BOOST_COOLDOWN;
        }
    }

    if (
        ball.x + ball.size / 2 >= paddle2.x &&
        ball.x - ball.size / 2 <= paddle2.x + paddle2.width &&
        ball.y >= paddle2.y &&
        ball.y <= paddle2.y + paddle2.height &&
        ball.dx > 0
    ) {
        ball.dx = -ball.dx;
        ball.dy = (ball.y - (paddle2.y + paddle2.height / 2)) / 10;
        
        // Check if boost was used
        if (keys['Shift'] && player2BoostAvailable) {
            ball.dx *= BOOST_MULTIPLIER;
            ball.dy *= BOOST_MULTIPLIER;
            player2BoostAvailable = false;
            player2BoostCooldown = BOOST_COOLDOWN;
        }
    }

    if (ball.x < 0) {
        player2Score++;
        resetBall();
        updateScore();
    }

    if (ball.x > canvas.width) {
        player1Score++;
        resetBall();
        updateScore();
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = 0;
    ball.dy = 0;
    
    ballServeDirection.dx = Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED;
    ballServeDirection.dy = (Math.random() - 0.5) * BALL_SPEED;
    
    // Select new random emoji and position
    currentEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    emojiPosition.x = 100 + Math.random() * (canvas.width - 200);
    emojiPosition.y = 50 + Math.random() * (canvas.height - 100);
    
    isCountingDown = true;
    countdownValue = 3;
    
    const countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue <= 0) {
            clearInterval(countdownInterval);
            isCountingDown = false;
            ball.dx = ballServeDirection.dx;
            ball.dy = ballServeDirection.dy;
            gameStarted = true;
        }
    }, 1000);
}

function updateScore() {
    document.getElementById('player1-score').textContent = player1Score;
    document.getElementById('player2-score').textContent = player2Score;
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw random emoji
    if (currentEmoji) {
        ctx.save();
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.3;
        ctx.fillText(currentEmoji, emojiPosition.x, emojiPosition.y);
        ctx.restore();
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height);
    ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    if (isCountingDown) {
        ctx.save();
        ctx.font = '48px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countdownValue, canvas.width / 2, canvas.height / 2 - 80);
        
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        const arrowLength = 50;
        const endX = ball.x + (ballServeDirection.dx / Math.abs(ballServeDirection.dx)) * arrowLength;
        const endY = ball.y + (ballServeDirection.dy / Math.abs(ballServeDirection.dx)) * arrowLength;
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        const headLength = 10;
        const angle = Math.atan2(endY - ball.y, endX - ball.x);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Draw boost indicators
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    
    // Player 1 boost indicator
    if (player1BoostAvailable) {
        ctx.fillStyle = '#0f0';
        ctx.fillText('BOOST READY (Q)', 10, 30);
    } else {
        ctx.fillStyle = '#f00';
        const cooldownSeconds = Math.ceil(player1BoostCooldown / 1000);
        ctx.fillText(`BOOST: ${cooldownSeconds}s`, 10, 30);
    }
    
    // Player 2 boost indicator
    ctx.textAlign = 'right';
    if (player2BoostAvailable) {
        ctx.fillStyle = '#0f0';
        ctx.fillText('BOOST READY (SHIFT)', canvas.width - 10, 30);
    } else {
        ctx.fillStyle = '#f00';
        const cooldownSeconds = Math.ceil(player2BoostCooldown / 1000);
        ctx.fillText(`BOOST: ${cooldownSeconds}s`, canvas.width - 10, 30);
    }
}

function updateBoostCooldowns() {
    if (player1BoostCooldown > 0) {
        player1BoostCooldown -= 16; // Approximately 60fps
        if (player1BoostCooldown <= 0) {
            player1BoostAvailable = true;
            player1BoostCooldown = 0;
        }
    }
    
    if (player2BoostCooldown > 0) {
        player2BoostCooldown -= 16;
        if (player2BoostCooldown <= 0) {
            player2BoostAvailable = true;
            player2BoostCooldown = 0;
        }
    }
}

function gameLoop() {
    updatePaddles();
    updateBall();
    updateBoostCooldowns();
    draw();
    requestAnimationFrame(gameLoop);
}

// Add event listeners for paddle size controls
const paddle1SizeInput = document.getElementById('paddle1-size');
const paddle2SizeInput = document.getElementById('paddle2-size');
const paddle1SizeValue = document.getElementById('paddle1-size-value');
const paddle2SizeValue = document.getElementById('paddle2-size-value');

paddle1SizeInput.addEventListener('input', (e) => {
    PADDLE1_HEIGHT = parseInt(e.target.value);
    paddle1.height = PADDLE1_HEIGHT;
    paddle1.y = Math.max(0, Math.min(canvas.height - paddle1.height, paddle1.y));
    paddle1SizeValue.textContent = PADDLE1_HEIGHT;
});

paddle2SizeInput.addEventListener('input', (e) => {
    PADDLE2_HEIGHT = parseInt(e.target.value);
    paddle2.height = PADDLE2_HEIGHT;
    paddle2.y = Math.max(0, Math.min(canvas.height - paddle2.height, paddle2.y));
    paddle2SizeValue.textContent = PADDLE2_HEIGHT;
});

resetBall();
gameLoop();