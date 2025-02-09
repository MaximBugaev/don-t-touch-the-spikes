'use strict'

let canvas;
let ctx;

canvas = document.getElementById('canvas');
ctx = canvas.getContext('2d');

window.requestAnimationFrame(gameLoop);

let jumpSfx = document.querySelector('#jump');
let crashSfx = document.querySelector('#crash');
let wallCollSfx = document.querySelector('#wallColl');

let device = 'pc';
screen.availWidth < 768 ? device = 'mobile' : device = 'pc';

jumpSfx.volume = 0.3;
crashSfx.volume = 0.5;
wallCollSfx.volume = 0.3;

let gravity = 0.5;
let score = 0;
let bestScore = 0;

let bestScoreCaption = document.querySelector('.game__best-score');
let aimProgress = document.querySelector('.main-aim__progress')

let mainColor = '#ffd4dd';
let gameStarted = false;
let fontSize = 40;

let bird = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 40,
    height: 40,
    vx: 0,
    vy: 0,
    vector: 'right',
    isJumping: false,
    color: 'red',
    alive: true,
}

function Spike(x, y, w = 25, h = 25) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
}

let spikeColumn = [];
let spikeRow = [];

function spawnSpikeColumn(score) {
    let n;
    spikeColumn.length = 0;

    if(score < 5) {
        n = 4;
    } else if(score < 15) {
        n = 5
    } else if(score < 25) {
        n = 6;
    }  else {
        n = 7;
    }

    let intervalEnd = canvas.height / n;

    for(let i = 1; i <= n; i++) {
        if(i > 1) {
            spikeColumn.push(new Spike(canvas.width - 25, randomInterval(intervalEnd * (i - 1), intervalEnd * i - 30)));
        } else {
            spikeColumn.push(new Spike(canvas.width - 25, randomInterval(15, intervalEnd - 30)));
        }
    }
}

function spawnSpikeRow() {
    let interval = canvas.width / 5;

    for(let i = 1; i <= 10; i++) {
        if(i > 1) {
            spikeRow.push(new Spike(interval * (i - 1) / 2, 25));
        }
    }
}

spawnSpikeRow();

function gameLoop() {
    update();
    wallCollisions();
    draw();
    window.requestAnimationFrame(gameLoop);
}

function update() {
    setMainColor();
    birdMoving();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawScore();
    drawSpikeRow('top');
    drawSpikeRow('bottom');
    if(!gameStarted) {
        drawWaveText('TAP TO START');
    }

    if(bird.alive) {
        drawSpikeColumn();
    } else {
        drawWaveText('TAP TO RETRY')
    }

    drawBird();
}

function drawBird() {
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.width / 2, 0, 2 * Math.PI);
    ctx.fill();
    // ctx.fillRect(bird.x, bird.y, bird.width / 2, 20, 20)
}

function drawSpikeColumn() {
    let spikeX;
    let spikeW;

    spikeColumn.forEach((spike) => {
        if(bird.vector === 'left') {
            spikeX = spike.width;
            spikeW = -spike.width + 1;
        } else {
            spikeX = canvas.width - spike.width;
            spikeW = Math.abs(spike.width) - 1;
        }

        let topAngle = {x: spikeX + spikeW, y: spike.y + spike.height};
        let botAngle = {x: spikeX + spikeW, y: spike.y - spike.height};

        ctx.fillStyle = 'grey';
        ctx.beginPath();
        ctx.moveTo(spikeX, spike.y);
        ctx.lineTo(topAngle.x, topAngle.y);
        ctx.lineTo(botAngle.x, botAngle.y);
        ctx.fill();

        if(rectIntersect(bird.x - bird.width / 2, bird.y - bird.height / 2, 40, 40, spikeX, spike.y, spikeW, 2) ||
         rectIntersect(bird.x - bird.width / 2, bird.y - bird.height / 2, 40, 40, topAngle.x - 1, botAngle.y, 2, spike.height * 2)) {
            endGame();
        }
    })
}

function drawSpikeRow(side) {

    spikeRow.forEach((spike) => {
        let spikeY;
        let spikeH;

        switch (side) {
            case 'top':
                spikeY = spike.y;
                spikeH = spike.height;
                break;
        
            case 'bottom':
                spikeY = canvas.height - spike.y;
                spikeH = -spike.height;
                break;
        }


        ctx.fillStyle = 'grey';
        ctx.beginPath();
        ctx.moveTo(spike.x, spikeY);
        ctx.lineTo(spike.x - spike.width, spikeY - spikeH);
        ctx.lineTo(spike.x + spike.width, spikeY - spikeH);
        ctx.fill();

        if(rectIntersect(bird.x - bird.width / 2, bird.y - bird.height / 2, 40, 40, spike.x, spikeY, 1, 1)) {
            endGame();
        }
    })

}

function endGame() {
    if(bird.alive) {
        crashSfx.play();
    }

    bird.alive = false;
    bird.color = 'grey';
    document.removeEventListener('mousedown', birdJump);
    document.removeEventListener('touchstart', birdJump);
    
    document.addEventListener('mousedown', retryGame);
    document.addEventListener('touchstart', retryGame);
}

function retryGame() {
    bird = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 40,
        height: 40,
        vx: 0,
        vy: 0,
        vector: 'right',
        isJumping: false,
        color: 'red',
        alive: true,
    }
    
    score > bestScore ? bestScore = score : score;
    bestScoreCaption.textContent = `Best Score: ${bestScore}`;
    aimProgress.value = bestScore;

    score = 0;

    mainColor = '#ffd4dd';

    spikeColumn = [];
    document.removeEventListener('mousedown', retryGame);
    document.removeEventListener('touchstart', retryGame);

    device === 'pc' ? document.addEventListener('mousedown', birdJump) : document.addEventListener('touchstart', birdJump);
}

function drawScore() {
    ctx.beginPath();
    ctx.fillStyle = '#E0F4F5';
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 + 15, 0, 2 * Math.PI);
    ctx.fill();

    let outScore = score;

    if(score < 10) {outScore = '0' + score};

    ctx.font = '400px Roboto';
    ctx.fillStyle = mainColor;
    ctx.fillText(`${outScore}`, 27, canvas.height / 2 + 150)
}

function setMainColor() {
    switch (score) {
        case 5:
            
            mainColor = '#76bcf5';
            break;

        case 10:
            
            mainColor = '#FFDE6B';
            break;

        case 15:
            
            mainColor = '#82b21e';
            break;

        case 20: 
            
            mainColor = '#fcaf67';
            break;

        case 25: 
            
            mainColor = '#ff9ac7';
            break;

        case 30: 

            mainColor = '#cc925d';
            break;

        case 35: 

            mainColor = '#D2D2D4';
            break;
    }
}

function drawBackground() {
    ctx.fillStyle = mainColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function birdMoving() {
    bird.x += bird.vx;
    if(bird.isJumping) {
        bird.y += bird.vy;
        bird.vy += gravity;
    }
}

function wallCollisions() {
    if(bird.x + bird.width / 2 >= canvas.width) {

        bird.vx *= -1;
        bird.vector = 'left'

        if(bird.alive) {
            score++;
            wallCollSfx.play();
        }

        spawnSpikeColumn(score);

    } else if(bird.x - bird.width / 2 <= 0) {

        bird.vx *= -1;
        bird.vector = 'right'

        if(bird.alive) {
            score++;
            wallCollSfx.play();
        }

        spawnSpikeColumn(score);
        
        
    } else if (bird.y - bird.height / 2 <= 0) {
        if(bird.alive) {
            wallCollSfx.play();
        }

        bird.vy *= -1;
    } else if (bird.y + bird.height / 2 >= canvas.height) {
        if(bird.alive) {
            wallCollSfx.play();
        }

        bird.vy *= -1;
    }
}

let factor = 1

function drawWaveText(str) {
    ctx.font = `${fontSize}px Roboto`;
    ctx.fillStyle = 'red';
    ctx.fillText(str, 200 - fontSize * 2.3, canvas.height / 1.3)

    fontSize > 60 ? factor *= -1 : factor;
    fontSize < 40 ? factor *= -1 : factor;

    fontSize+=factor
}

function randomInterval(min, max) {
    return Math.floor(Math.random() * (max - min - 1) + min)
}

function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    if (x2 > w1 + x1 || x1 > w2 + x2 || y2 > h1 + y1 || y1 > h2 + y2){
        return false;
    }
    return true;
}

function birdJump() {
    bird.isJumping = true;
    gameStarted = true;
    bird.vy = -10;
    bird.vx = bird.vector === 'right' ? 6 : -6;
    jumpSfx.play();
}

device === 'pc' ? document.addEventListener('mousedown', birdJump) : document.addEventListener('touchstart', birdJump);