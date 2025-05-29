const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameState = {
    inning: 1,
    inningHalf: 'top',
    outs: 0,
    strikes: 0,
    balls: 0,
    vampiresScore: 0,
    werewolvesScore: 0,
    bases: [null, null, null],
    currentBatter: null,
    currentPitcher: null,
    batting: 'vampires',
    gameStarted: false,
    ballInPlay: false,
    ball: null
};

const teams = {
    vampires: {
        name: 'Vampires',
        color: '#8B0000',
        players: [
            { name: 'Edward Cullen', power: 0.9, speed: 0.95, fielding: 0.8 },
            { name: 'Bella Swan', power: 0.7, speed: 0.6, fielding: 0.7 },
            { name: 'Alice Cullen', power: 0.6, speed: 0.98, fielding: 0.9 },
            { name: 'Jasper Hale', power: 0.8, speed: 0.85, fielding: 0.85 },
            { name: 'Emmett Cullen', power: 0.95, speed: 0.7, fielding: 0.75 },
            { name: 'Rosalie Hale', power: 0.85, speed: 0.8, fielding: 0.8 },
            { name: 'Carlisle Cullen', power: 0.7, speed: 0.75, fielding: 0.9 },
            { name: 'Esme Cullen', power: 0.65, speed: 0.7, fielding: 0.85 },
            { name: 'Aro', power: 0.75, speed: 0.8, fielding: 0.8 }
        ],
        currentBatterIndex: 0
    },
    werewolves: {
        name: 'Werewolves',
        color: '#8B4513',
        players: [
            { name: 'Jacob Black', power: 0.92, speed: 0.9, fielding: 0.75 },
            { name: 'Sam Uley', power: 0.85, speed: 0.85, fielding: 0.8 },
            { name: 'Paul Lahote', power: 0.88, speed: 0.82, fielding: 0.7 },
            { name: 'Embry Call', power: 0.75, speed: 0.88, fielding: 0.82 },
            { name: 'Quil Ateara', power: 0.8, speed: 0.8, fielding: 0.78 },
            { name: 'Jared Cameron', power: 0.78, speed: 0.83, fielding: 0.8 },
            { name: 'Seth Clearwater', power: 0.7, speed: 0.92, fielding: 0.85 },
            { name: 'Leah Clearwater', power: 0.73, speed: 0.95, fielding: 0.88 },
            { name: 'Brady Fuller', power: 0.72, speed: 0.78, fielding: 0.75 }
        ],
        currentBatterIndex: 0
    }
};

const field = {
    homeBase: { x: 400, y: 500 },
    firstBase: { x: 550, y: 350 },
    secondBase: { x: 400, y: 200 },
    thirdBase: { x: 250, y: 350 },
    pitcherMound: { x: 400, y: 360 },
    outfieldPositions: [
        { x: 200, y: 100 },
        { x: 400, y: 80 },
        { x: 600, y: 100 }
    ]
};

function drawField() {
    ctx.fillStyle = '#2d5a2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(field.homeBase.x, field.homeBase.y);
    ctx.lineTo(field.firstBase.x, field.firstBase.y);
    ctx.lineTo(field.secondBase.x, field.secondBase.y);
    ctx.lineTo(field.thirdBase.x, field.thirdBase.y);
    ctx.lineTo(field.homeBase.x, field.homeBase.y);
    ctx.stroke();
    
    drawBase(field.homeBase, 'Home');
    drawBase(field.firstBase, '1st');
    drawBase(field.secondBase, '2nd');
    drawBase(field.thirdBase, '3rd');
    
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(field.pitcherMound.x, field.pitcherMound.y, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.fillText('P', field.pitcherMound.x - 5, field.pitcherMound.y + 5);
}

function drawBase(pos, label) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(pos.x - 15, pos.y - 15, 30, 30);
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText(label, pos.x - 15, pos.y + 30);
}

function drawPlayers() {
    const battingTeam = gameState.batting === 'vampires' ? teams.vampires : teams.werewolves;
    const fieldingTeam = gameState.batting === 'vampires' ? teams.werewolves : teams.vampires;
    
    ctx.fillStyle = battingTeam.color;
    ctx.beginPath();
    ctx.arc(field.homeBase.x, field.homeBase.y - 10, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = fieldingTeam.color;
    ctx.beginPath();
    ctx.arc(field.pitcherMound.x, field.pitcherMound.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    field.outfieldPositions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
        ctx.fill();
    });
    
    [field.firstBase, field.secondBase, field.thirdBase].forEach((base, index) => {
        if (gameState.bases[index]) {
            ctx.fillStyle = battingTeam.color;
            ctx.beginPath();
            ctx.arc(base.x, base.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawBall() {
    if (gameState.ball) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gameState.ball.x, gameState.ball.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateUI() {
    document.getElementById('vampires-score').textContent = gameState.vampiresScore;
    document.getElementById('werewolves-score').textContent = gameState.werewolvesScore;
    document.getElementById('inning').textContent = gameState.inning;
    document.getElementById('inning-half').textContent = gameState.inningHalf === 'top' ? 'Top' : 'Bottom';
    document.getElementById('balls').textContent = gameState.balls;
    document.getElementById('strikes').textContent = gameState.strikes;
    document.getElementById('outs').textContent = gameState.outs;
    
    const battingTeam = gameState.batting === 'vampires' ? teams.vampires : teams.werewolves;
    document.getElementById('current-batter').textContent = gameState.currentBatter?.name || battingTeam.players[battingTeam.currentBatterIndex].name;
    
    ['base-1', 'base-2', 'base-3'].forEach((baseId, index) => {
        const baseElement = document.getElementById(baseId);
        const baseSpan = baseElement.querySelector('span');
        if (gameState.bases[index]) {
            baseSpan.textContent = gameState.bases[index].name;
            baseElement.classList.add('occupied');
        } else {
            baseSpan.textContent = 'Empty';
            baseElement.classList.remove('occupied');
        }
    });
}

function pitch() {
    if (!gameState.gameStarted || gameState.ballInPlay) return;
    
    gameState.ballInPlay = true;
    const pitchType = Math.random();
    const isStrike = pitchType < 0.6;
    
    gameState.ball = { 
        x: field.pitcherMound.x, 
        y: field.pitcherMound.y,
        vx: 0,
        vy: 8,
        isStrike: isStrike
    };
    
    animatePitch();
}

function animatePitch() {
    if (!gameState.ball) return;
    
    gameState.ball.y += gameState.ball.vy;
    
    if (gameState.ball.y >= field.homeBase.y) {
        if (gameState.ball.isStrike) {
            gameState.strikes++;
            if (gameState.strikes >= 3) {
                strikeOut();
            }
        } else {
            gameState.balls++;
            if (gameState.balls >= 4) {
                walk();
            }
        }
        gameState.ball = null;
        gameState.ballInPlay = false;
        updateUI();
    } else {
        requestAnimationFrame(() => {
            render();
            animatePitch();
        });
    }
}

function swing() {
    if (!gameState.gameStarted || !gameState.ballInPlay || !gameState.ball) return;
    
    const battingTeam = gameState.batting === 'vampires' ? teams.vampires : teams.werewolves;
    const batter = battingTeam.players[battingTeam.currentBatterIndex];
    
    const hitChance = Math.random();
    const hitPower = batter.power;
    
    if (gameState.ball.y > field.homeBase.y - 50 && gameState.ball.y < field.homeBase.y) {
        if (hitChance < 0.7) {
            const angle = Math.random() * Math.PI / 2 + Math.PI / 4;
            const power = hitPower * (Math.random() * 0.5 + 0.5);
            
            gameState.ball.vx = Math.cos(angle) * power * 15;
            gameState.ball.vy = -Math.sin(angle) * power * 20;
            
            animateHit();
        } else {
            gameState.strikes++;
            if (gameState.strikes >= 3) {
                strikeOut();
            }
            gameState.ball = null;
            gameState.ballInPlay = false;
            updateUI();
        }
    }
}

function animateHit() {
    if (!gameState.ball) return;
    
    gameState.ball.x += gameState.ball.vx;
    gameState.ball.y += gameState.ball.vy;
    gameState.ball.vy += 0.5;
    
    if (gameState.ball.y > canvas.height || gameState.ball.x < 0 || gameState.ball.x > canvas.width) {
        const distance = Math.sqrt(Math.pow(gameState.ball.x - field.homeBase.x, 2) + Math.pow(gameState.ball.y - field.homeBase.y, 2));
        
        if (distance > 300) {
            homeRun();
        } else if (distance > 200) {
            advanceRunners(2);
        } else if (distance > 100) {
            advanceRunners(1);
        } else {
            gameState.outs++;
            if (gameState.outs >= 3) {
                endInningHalf();
            }
        }
        
        nextBatter();
        gameState.ball = null;
        gameState.ballInPlay = false;
        updateUI();
    } else {
        requestAnimationFrame(() => {
            render();
            animateHit();
        });
    }
}

function strikeOut() {
    gameState.outs++;
    if (gameState.outs >= 3) {
        endInningHalf();
    }
    nextBatter();
}

function walk() {
    advanceRunners(1, true);
    nextBatter();
}

function homeRun() {
    let runs = 1;
    gameState.bases.forEach(runner => {
        if (runner) runs++;
    });
    
    if (gameState.batting === 'vampires') {
        gameState.vampiresScore += runs;
    } else {
        gameState.werewolvesScore += runs;
    }
    
    gameState.bases = [null, null, null];
}

function advanceRunners(bases, forceAdvance = false) {
    const newBases = [null, null, null];
    
    for (let i = 2; i >= 0; i--) {
        if (gameState.bases[i]) {
            const newBase = i + bases;
            if (newBase >= 3) {
                if (gameState.batting === 'vampires') {
                    gameState.vampiresScore++;
                } else {
                    gameState.werewolvesScore++;
                }
            } else {
                newBases[newBase] = gameState.bases[i];
            }
        }
    }
    
    if (forceAdvance || bases > 0) {
        const battingTeam = gameState.batting === 'vampires' ? teams.vampires : teams.werewolves;
        newBases[bases - 1] = battingTeam.players[battingTeam.currentBatterIndex];
    }
    
    gameState.bases = newBases;
}

function nextBatter() {
    const battingTeam = gameState.batting === 'vampires' ? teams.vampires : teams.werewolves;
    battingTeam.currentBatterIndex = (battingTeam.currentBatterIndex + 1) % battingTeam.players.length;
    gameState.currentBatter = battingTeam.players[battingTeam.currentBatterIndex];
    gameState.strikes = 0;
    gameState.balls = 0;
}

function endInningHalf() {
    gameState.bases = [null, null, null];
    gameState.outs = 0;
    gameState.strikes = 0;
    gameState.balls = 0;
    
    if (gameState.inningHalf === 'top') {
        gameState.inningHalf = 'bottom';
        gameState.batting = 'werewolves';
    } else {
        gameState.inningHalf = 'top';
        gameState.batting = 'vampires';
        gameState.inning++;
        
        if (gameState.inning > 9) {
            endGame();
        }
    }
    
    const battingTeam = gameState.batting === 'vampires' ? teams.vampires : teams.werewolves;
    battingTeam.currentBatterIndex = 0;
}

function endGame() {
    gameState.gameStarted = false;
    const winner = gameState.vampiresScore > gameState.werewolvesScore ? 'Vampires' : 'Werewolves';
    alert(`Game Over! ${winner} win ${gameState.vampiresScore} - ${gameState.werewolvesScore}`);
}

function startGame() {
    gameState.gameStarted = true;
    gameState.inning = 1;
    gameState.inningHalf = 'top';
    gameState.outs = 0;
    gameState.strikes = 0;
    gameState.balls = 0;
    gameState.vampiresScore = 0;
    gameState.werewolvesScore = 0;
    gameState.bases = [null, null, null];
    gameState.batting = 'vampires';
    
    teams.vampires.currentBatterIndex = 0;
    teams.werewolves.currentBatterIndex = 0;
    
    updateUI();
    render();
}

function render() {
    drawField();
    drawPlayers();
    drawBall();
}

document.getElementById('pitch-btn').addEventListener('click', pitch);
document.getElementById('swing-btn').addEventListener('click', swing);
document.getElementById('start-btn').addEventListener('click', startGame);

render();
updateUI();