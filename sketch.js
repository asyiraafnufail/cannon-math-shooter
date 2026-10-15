// ==============================================================
// KONFIGURASI VIRTUAL RESOLUTION (NATIVE RATIO 4:3)
// ==============================================================
const V_WIDTH = 800;
const V_HEIGHT = 600;

let scaleFactor = 1;
let offsetX = 0;
let offsetY = 0;
let virtualMouseX = 400;
let virtualMouseY = 300;

// Variabel Gameplay
let playerX = 400; // Meriam diam di tengah kanvas virtual
let playerY = 515;
let cannonAngle = -Math.PI / 2;

let bullet = null;

let targets = [];
let numTargets = 4;
let baseSpeed = 1.6;

let num1, num2, opSymbol, correctAnswer;
let score = 0;
let level = 1;

let lives = 3;
let maxTime = 600; // ~10 detik pada 60 FPS
let timeLeft = maxTime;

let gameState = 'START';
let osc;

function setup() {
  createCanvas(windowWidth, windowHeight);
  calculateViewport();
  textAlign(CENTER, CENTER);

  // Inisialisasi Audio
  osc = new p5.Oscillator('triangle');
  osc.start();
  osc.amp(0);

  resetGame();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateViewport();
}

function calculateViewport() {
  let scaleX = windowWidth / V_WIDTH;
  let scaleY = windowHeight / V_HEIGHT;
  scaleFactor = min(scaleX, scaleY);

  offsetX = (windowWidth - V_WIDTH * scaleFactor) / 2;
  offsetY = (windowHeight - V_HEIGHT * scaleFactor) / 2;
}

function updateVirtualMouse() {
  virtualMouseX = (mouseX - offsetX) / scaleFactor;
  virtualMouseY = (mouseY - offsetY) / scaleFactor;
}

function draw() {
  background(10);
  updateVirtualMouse();

  push();
  translate(offsetX, offsetY);
  scale(scaleFactor);

  // Area Game Aktif (800 x 600)
  fill(0);
  rectMode(CORNER);
  rect(0, 0, V_WIDTH, V_HEIGHT);

  if (gameState === 'START') {
    drawStartScreen();
  } else if (gameState === 'GAMEOVER') {
    drawGameOverScreen();
  } else {
    runGameLoop();
  }

  pop();
}

// ==============================================================
// LOOP GAMEPLAY UTAMA
// ==============================================================
function runGameLoop() {
  // 1. Timer
  timeLeft--;
  if (timeLeft <= 0) {
    playWrongSound();
    loseLife();
  }

  // Garis Pembatas Antara Area Bola & Dasbor Bawah
  stroke(50);
  strokeWeight(2);
  line(0, 370, V_WIDTH, 370);
  noStroke();

  // Batang Timer Visual di Garis Bawah
  let timerBarWidth = map(timeLeft, 0, maxTime, 0, V_WIDTH);
  fill(timeLeft > 180 ? color(255, 204, 0) : color(255, 50, 50));
  rectMode(CORNER);
  rect(0, 366, timerBarWidth, 6);

  // 2. Dasbor Status Bagian Bawah
  drawBottomHUD();

  // 3. Rotasi Meriam Berdasarkan Virtual Mouse
  let pivotY = playerY - 10;
  let targetAngle = atan2(virtualMouseY - pivotY, virtualMouseX - playerX);
  cannonAngle = constrain(targetAngle, -PI * 0.92, -PI * 0.08);

  // Garis Panduan Bidik Putus-putus
  drawAimLine(playerX, pivotY, cannonAngle);

  // 4. Update & Gambar Bola Target (Area Atas Bersih)
  for (let t of targets) {
    t.x += t.speedX;

    if (t.x < 36) {
      t.x = 36;
      t.speedX *= -1;
    } else if (t.x > V_WIDTH - 36) {
      t.x = V_WIDTH - 36;
      t.speedX *= -1;
    }

    fill(t.col);
    circle(t.x, t.y, 60);

    fill(255);
    textSize(24);
    textStyle(BOLD);
    text(t.val, t.x, t.y);
    textStyle(NORMAL);
  }

  // 5. Update & Gambar Peluru
  if (bullet) {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    fill(255, 60, 60);
    circle(bullet.x, bullet.y, 16);

    for (let t of targets) {
      let d = dist(bullet.x, bullet.y, t.x, t.y);

      if (d < 38) {
        if (t.val === correctAnswer) {
          score += 10;
          timeLeft = maxTime;
          playHitSound();

          // Naik level tiap kelipatan 30 poin
          if (score % 30 === 0) {
            level++;
            baseSpeed += 0.35;
            for (let target of targets) {
              let dir = target.speedX >= 0 ? 1 : -1;
              target.speedX = dir * (baseSpeed + target.speedOffset);
            }
          }

          generateQuestion();
          updateTargetValues();
        } else {
          playWrongSound();
          loseLife();
        }
        bullet = null;
        break;
      }
    }

    if (bullet && (bullet.y < 0 || bullet.x < 0 || bullet.x > V_WIDTH)) {
      bullet = null;
    }
  }

  // 6. Render Meriam
  drawCannon(playerX, playerY, cannonAngle);
}

// ==============================================================
// PANEL STATUS BAWAH (HUD)
// ==============================================================
function drawBottomHUD() {
  // Panel Kiri: Level & Skor
  fill(255);
  textSize(22);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text(`LEVEL: ${level}`, 30, 490);

  fill(255, 215, 0);
  textSize(24);
  text(`SCORE: ${score}`, 30, 530);

  // Panel Kanan: Nyawa (HP)
  let heartStr = "";
  for (let i = 0; i < lives; i++) {
    heartStr += "❤️ ";
  }
  textAlign(RIGHT, CENTER);
  fill(255);
  textSize(18);
  text("HP", V_WIDTH - 30, 490);
  textSize(26);
  text(heartStr, V_WIDTH - 30, 530);

  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
}

// ==============================================================
// VISUAL MERIAM & KOMPONEN
// ==============================================================
function drawCannon(px, py, angle) {
  rectMode(CENTER);

  // Roda Kayu
  fill(120, 70, 30);
  ellipse(px - 40, py + 16, 22, 44);
  ellipse(px + 40, py + 16, 22, 44);
  fill(60, 35, 15);
  ellipse(px - 40, py + 16, 10, 22);
  ellipse(px + 40, py + 16, 10, 22);

  // Moncong Berputar
  push();
  translate(px, py - 10);
  rotate(angle + HALF_PI);

  fill(70, 80, 90);
  rect(0, -30, 22, 42, 5);
  fill(40, 45, 50);
  rect(0, -52, 28, 10, 3);
  pop();

  // Kubah Meriam
  fill(90, 100, 110);
  arc(px, py + 8, 68, 48, PI, 0);

  // Papan Soal Matematika
  fill(20, 20, 20);
  stroke(218, 165, 32);
  strokeWeight(3);
  rect(px, py + 32, 130, 36, 8);
  noStroke();

  fill(255, 215, 0);
  textSize(22);
  textStyle(BOLD);
  text(`${num1} ${opSymbol} ${num2}`, px, py + 32);
  textStyle(NORMAL);
}

function drawAimLine(startX, startY, angle) {
  stroke(255, 255, 255, 140);
  strokeWeight(2);

  let barrelLength = 55;
  let lineLength = 90;
  let dotSpacing = 12;

  for (let i = barrelLength; i < barrelLength + lineLength; i += dotSpacing) {
    let x1 = startX + cos(angle) * i;
    let y1 = startY + sin(angle) * i;
    let x2 = startX + cos(angle) * (i + 6);
    let y2 = startY + sin(angle) * (i + 6);
    line(x1, y1, x2, y2);
  }
  noStroke();
}

function drawStartScreen() {
  fill(255, 215, 0);
  textSize(34);
  textStyle(BOLD);
  text("MATH CANNON SHOOTER", V_WIDTH / 2, 90);

  fill(25, 25, 30);
  stroke(80);
  strokeWeight(2);
  rectMode(CENTER);
  rect(V_WIDTH / 2, 290, 520, 270, 14);
  noStroke();

  fill(255);
  textSize(20);
  textStyle(BOLD);
  text("PANDUAN CARA BERMAIN", V_WIDTH / 2, 195);

  textStyle(NORMAL);
  textSize(16);
  fill(220);
  textAlign(LEFT, TOP);
  text("1. Meriam diam di tengah bawah.", 170, 235);
  text("2. Arahkan mouse / sentuh layar untuk membidik.", 170, 268);
  text("3. Klik Mouse / Ketuk Layar / Spasi untuk menembak.", 170, 301);
  text("4. Tembak bola dengan hasil hitungan yang benar!", 170, 334);
  text("5. Soal bertahap (+, -, ×, ÷) seiring bertambahnya level.", 170, 367);

  textAlign(CENTER, CENTER);
  fill(0, 180, 80);
  rect(V_WIDTH / 2, 490, 320, 50, 10);
  fill(255);
  textSize(18);
  textStyle(BOLD);
  text("KLIK / KETUK / SPASI UNTUK MULAI", V_WIDTH / 2, 490);
  textStyle(NORMAL);
}

function drawGameOverScreen() {
  fill(255, 50, 50);
  textSize(48);
  textStyle(BOLD);
  text("GAME OVER", V_WIDTH / 2, 200);

  fill(255);
  textSize(26);
  textStyle(NORMAL);
  text(`Skor Akhir: ${score}`, V_WIDTH / 2, 280);
  text(`Mencapai Level: ${level}`, V_WIDTH / 2, 325);

  fill(200);
  textSize(18);
  text("Tekan 'R', Spasi, atau Ketuk Layar untuk Main Lagi", V_WIDTH / 2, 410);
}

// ==============================================================
// INPUT & KONTROL (DESKTOP SPASI + MOBILE TOUCH AKTIF)
// ==============================================================
function shoot() {
  if (bullet === null && gameState === 'PLAYING') {
    let bulletSpeed = 12;
    let spawnDist = 55;

    bullet = {
      x: playerX + cos(cannonAngle) * spawnDist,
      y: (playerY - 10) + sin(cannonAngle) * spawnDist,
      vx: cos(cannonAngle) * bulletSpeed,
      vy: sin(cannonAngle) * bulletSpeed
    };
    playShootSound();
  }
}

function handleAction() {
  userStartAudio();

  if (gameState === 'START') {
    gameState = 'PLAYING';
    return;
  }

  if (gameState === 'GAMEOVER') {
    resetGame();
    gameState = 'PLAYING';
    return;
  }

  if (gameState === 'PLAYING') {
    shoot();
  }
}

// Klik Mouse di PC / Laptop
function mousePressed() {
  handleAction();
}

// Layar Sentuh di HP / Tablet
function touchStarted() {
  updateVirtualMouse();
  handleAction();
}

// Keyboard (Spasi & Tombol R)
function keyPressed() {
  userStartAudio();

  let isSpace = (key === ' ' || keyCode === 32);

  if (gameState === 'START') {
    if (isSpace) {
      gameState = 'PLAYING';
    }
    return false; // Mencegah window scrolling saat menekan spasi
  }

  if (gameState === 'GAMEOVER') {
    if (key === 'r' || key === 'R' || isSpace) {
      resetGame();
      gameState = 'PLAYING';
    }
    return false;
  }

  if (gameState === 'PLAYING' && isSpace) {
    shoot();
    return false; // Mencegah window scrolling saat menembak dengan spasi
  }
}

function loseLife() {
  lives--;
  timeLeft = maxTime;
  score = max(0, score - 5);

  if (lives <= 0) {
    gameState = 'GAMEOVER';
    playGameOverSound();
  } else {
    generateQuestion();
    updateTargetValues();
  }
}

// ==============================================================
// AUDIO SINTETIS
// ==============================================================
function playShootSound() {
  osc.setType('sawtooth');
  osc.freq(130);
  osc.amp(0.5, 0.01);
  osc.freq(35, 0.15);
  osc.amp(0, 0.15);
}

function playHitSound() {
  osc.setType('sine');
  osc.freq(587.33);
  osc.amp(0.35, 0.01);
  osc.amp(0, 0.08);

  setTimeout(() => {
    osc.freq(880);
    osc.amp(0.35, 0.01);
    osc.amp(0, 0.12);
  }, 90);
}

function playWrongSound() {
  osc.setType('square');
  osc.freq(150);
  osc.amp(0.3, 0.01);
  osc.freq(70, 0.25);
  osc.amp(0, 0.25);
}

function playGameOverSound() {
  let notes = [220, 196, 174, 146];
  osc.setType('triangle');

  for (let i = 0; i < notes.length; i++) {
    setTimeout(() => {
      osc.freq(notes[i]);
      osc.amp(0.35, 0.02);
      osc.amp(0, 0.18);
    }, i * 200);
  }
}

// ==============================================================
// LOGIKA MATEMATIKA & STATE MANAGEMENT
// ==============================================================
function generateQuestion() {
  let allowedOps = ['+'];
  if (level >= 2) allowedOps.push('-');
  if (level >= 3) allowedOps.push('×');
  if (level >= 4) allowedOps.push('÷');

  opSymbol = random(allowedOps);

  if (opSymbol === '+') {
    if (level === 1) {
      num1 = floor(random(1, 10));
      num2 = floor(random(1, 10));
    } else if (level === 2) {
      num1 = floor(random(5, 16));
      num2 = floor(random(3, 14));
    } else {
      num1 = floor(random(10, 25));
      num2 = floor(random(5, 20));
    }
    correctAnswer = num1 + num2;
  } else if (opSymbol === '-') {
    if (level === 2) {
      num1 = floor(random(6, 16));
      num2 = floor(random(1, num1));
    } else {
      num1 = floor(random(12, 30));
      num2 = floor(random(2, num1 - 2));
    }
    correctAnswer = num1 - num2;
  } else if (opSymbol === '×') {
    if (level === 3) {
      num1 = floor(random(2, 6));
      num2 = floor(random(2, 6));
    } else {
      num1 = floor(random(2, 10));
      num2 = floor(random(2, 10));
    }
    correctAnswer = num1 * num2;
  } else if (opSymbol === '÷') {
    num2 = floor(random(2, 7));
    correctAnswer = floor(random(2, 8));
    num1 = num2 * correctAnswer;
  }
}

function resetGame() {
  score = 0;
  level = 1;
  lives = 3;
  baseSpeed = 1.6;
  timeLeft = maxTime;
  bullet = null;

  generateQuestion();
  initTargets();
}

function initTargets() {
  targets = [];
  let colors = ['#E63946', '#457B9D', '#2A9D8F', '#E76F51'];
  // Posisi Y lajur di area atas (terpisah rapi 70px)
  let laneY = [65, 135, 205, 275];

  for (let i = 0; i < numTargets; i++) {
    let dir = i % 2 === 0 ? 1 : -1;
    let speedOffset = i * 0.18;
    let startX = 120 + i * 160;

    targets.push({
      x: startX,
      y: laneY[i],
      val: 0,
      speedOffset: speedOffset,
      speedX: dir * (baseSpeed + speedOffset),
      col: colors[i % colors.length]
    });
  }

  updateTargetValues();
}

function updateTargetValues() {
  let answers = [correctAnswer];

  while (answers.length < numTargets) {
    let offset = floor(random(-3, 4));
    let wrong = correctAnswer + offset;
    if (wrong >= 0 && wrong !== correctAnswer && !answers.includes(wrong)) {
      answers.push(wrong);
    }
  }

  answers.sort(() => Math.random() - 0.5);

  for (let i = 0; i < numTargets; i++) {
    targets[i].val = answers[i];
  }
}