'use strict'

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { get, getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js';
import { firebaseConfig } from '../config.js'

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let user = localStorage.getItem('username');

let bestScore = 0;
let bestScoreCaption = document.querySelector('.game-info__best-score');

let canvas;
let ctx;

canvas = document.getElementById('canvas');
ctx = canvas.getContext('2d');

let device = 'pc';
screen.availWidth < 768 ? device = 'mobile' : device = 'pc';

while(true) {
    if(localStorage.getItem('username')) {
        main();
        break;
    }

    user = prompt('Для начала игры введите имя (минимум 3 символа):', '');

    if(user.trim() && user.trim().length > 2 && user.trim().length < 18) {

        get(ref(db, "users/" + user)).then((snapshot) => {
                if (snapshot.exists()) {
                    main();
                    localStorage.setItem('username', user);
                    device === 'pc' ? canvas.addEventListener('mousedown', birdJump) : canvas.addEventListener('touchstart', birdJump);
                } else {
                    addUser(user, user);
                    localStorage.setItem('username', user);
                    device === 'pc' ? canvas.addEventListener('mousedown', birdJump) : canvas.addEventListener('touchstart', birdJump);
                }
        })
        .catch((error) => {
            console.error("Ошибка при получении данных:", error)
        })

        alert('Ваш прогресс автоматически сохраняется. Приятной игры!');

        break;
    } else {
        alert('Неверно! Попробуйте ещё раз')
    }
}


function addUser(collectionName, username) {
    set(ref(db, 'users/' + collectionName), {
        username: username,
        bestScore: 0,
    })
}

function saveBestScore(collectionName, bestScore) {
    set(ref(db, 'users/' + collectionName), {
        username: collectionName,
        bestScore: bestScore,
    })
}

const userRef = ref(db, 'users/');
let usersCollection = [];
let leaderboard = document.querySelector('.leaderboard-table__body');
let playersNum = document.querySelector('.leaderboard__players-num');

let isCurrentUser;
let isAdmin;

onValue(userRef, (snapshot) => {
    usersCollection = [];
    const sortedData = Object.entries(snapshot.val()).sort((a, b) => b[1]['bestScore'] - a[1]['bestScore']);

    sortedData.forEach(item => {
        usersCollection.push({
            bestScore: item[1]['bestScore'],
            username: item[1]['username'],
            login: item[0],
        });
    })
    
    playersNum.textContent = 'Всего игроков: ' + usersCollection.length;
    console.log(usersCollection)

    usersCollection.length = 15;

    leaderboard.innerHTML = '';

    usersCollection.forEach((item, index) => {
        isCurrentUser = item.login === user;
        isAdmin = item.login === 'max';

        leaderboard.insertAdjacentHTML('beforeend', `
            <tr class='${index === 0 ? 'first-place' : ''} ${index === 1 ? 'second-place' : ''} ${index === 2 ? 'third-place' : ''}'>
                <td>${index + 1}</td>
                <td>${item.username + (isCurrentUser ? ' <span class="active-player">(you)</span>' : '')}</td>
                <td>${item.bestScore}</td>
            </tr>
            `);

    })
});

async function main() {
    try {
        const data = await getData(user);
        alert('Добро пожаловать, ' + data.username + '! ' + 'Приятной игры!')
    if (data && data.username) {
        console.log("Полученные данные:", data);
        bestScore = data.bestScore;
        bestScoreCaption.textContent = `Best score: ${bestScore}`;
        device === 'pc' ? canvas.addEventListener('mousedown', birdJump) : canvas.addEventListener('touchstart', birdJump);
    }
    } catch (error) {
        alert("Внимание! Проверьте подключение к интернету! Ваш прогресс не сохраняется")
    }
}

function getData(user) {
    return new Promise((resolve, reject) => {
        
        alert('Подключение к серверу...')

        const dataRef = ref(db, `users/${user}`);
        get(dataRef)
            .then((snapshot) => {
                resolve(snapshot.val());
            })
            .catch((error) => {
                reject(error);
            });
    });
}

//////////////////

window.requestAnimationFrame(gameLoop);

let crashSfx = document.querySelector('#crash');
let wallCollSfx = document.querySelector('#wallColl');

crashSfx.volume = 0.5;
wallCollSfx.volume = 0.3;

let gravity = 0.5;
let score = 0;

// let aimProgress = document.querySelector('.main-aim__progress')

let mainColor = '#ffd4dd';
let spikesColor = '#A64A55';
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

let fpsInterval, startTime, now, then, elapsed;


function startAnimating(fps) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    animate();
}

startAnimating(65);

function animate() {

    requestAnimationFrame(animate);

    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        gameLoop();
    }
}

function gameLoop() {
    update();
    wallCollisions();
    draw();
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
    let spikeVerticalHitbox;

    spikeColumn.forEach((spike) => {
        if(bird.vector === 'left') {
            spikeX = spike.width;
            spikeW = -spike.width; //-1
        } else {
            spikeX = canvas.width - spike.width;
            spikeW = Math.abs(spike.width); // +1
        }

        let topAngle = {x: spikeX + spikeW, y: spike.y + spike.height};
        let botAngle = {x: spikeX + spikeW, y: spike.y - spike.height};

        if(bird.vector === 'left') {
            spikeVerticalHitbox = topAngle.x 
        } else {
            spikeVerticalHitbox = topAngle.x - 2
        }

        ctx.fillStyle = spikesColor;
        ctx.beginPath();
        ctx.moveTo(spikeX, spike.y);
        ctx.lineTo(topAngle.x, topAngle.y);
        ctx.lineTo(botAngle.x, botAngle.y);
        ctx.fill();

        if(rectIntersect(bird.x - bird.width / 2, bird.y - bird.height / 2, 40, 40, spikeX, spike.y, spikeW, 2) ||
         rectIntersect(bird.x - bird.width / 2, bird.y - bird.height / 2, 40, 40, spikeVerticalHitbox, botAngle.y + 2, 2, spike.height * 2 - 10)) {
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


        ctx.fillStyle = spikesColor;
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
    canvas.removeEventListener('mousedown', birdJump);
    canvas.removeEventListener('touchstart', birdJump);
    
    canvas.addEventListener('mousedown', retryGame);
    canvas.addEventListener('touchstart', retryGame);
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
    
    if(score > bestScore) {
        bestScore = score;
        bestScoreCaption.textContent = `Best score: ${bestScore}`;

        saveBestScore(user, bestScore)

    }
    // aimProgress.value = bestScore;

    score = 0;

    mainColor = '#ffd4dd';
    spikesColor = '#A64A55';

    spikeColumn = [];
    canvas.removeEventListener('mousedown', retryGame);
    canvas.removeEventListener('touchstart', retryGame);

    device === 'pc' ? canvas.addEventListener('mousedown', birdJump) : canvas.addEventListener('touchstart', birdJump);
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
        case 5: //5
            spikesColor = '#085A63';
            mainColor = '#76bcf5';
            break;

        case 10: //10
            spikesColor = '#E89C91';
            mainColor = '#FFDE6B';
            break;

        case 15: //15
            spikesColor = '#236F0F';
            mainColor = '#82b21e';
            break;

        case 20: //20
            spikesColor = '#D30715';
            mainColor = '#fcaf67';
            break;

        case 25: //25
            spikesColor = '#A34AAD';
            mainColor = '#ff9ac7';
            break;

        case 30: //30
            spikesColor = '#AE9689';
            mainColor = '#00204C';
            break;

        case 35: //35
            spikesColor = 'grey';
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
    // jumpSfx.play();
}

function showPatchNote() {
    alert(`
        20.02:
        - добавлена таблица лидеров;
        - добавлена темная тема;
        ??.02 (скоро):
        - смена ника;
        ??.03 (скоро): 
        - новый режим
        `)
}

document.querySelector('.game-info__patch-note').addEventListener('click', showPatchNote);