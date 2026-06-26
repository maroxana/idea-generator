const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const timeEl = document.getElementById("time");
const scoreEl = document.getElementById("score");
const flashEl = document.getElementById("flash");
const panel = document.getElementById("gameOverPanel");
const finalScoreText = document.getElementById("finalScoreText");
const restartButton = document.getElementById("restartButton");

const state = {
  running: true,
  startTime: performance.now(),
  lastFrame: performance.now(),
  score: 0,
  scorePulse: 0,
  flashUntil: 0,
  missHoldUntil: 0,
  timeLeft: 60,
  width: 0,
  height: 0,
  wallY: 70,
  wallThickness: 14,
  gapWidth: 260,
  paddleY: 0,
  paddleWidth: 80,
  paddleHeight: 9,
  paddleX: 0,
  keys: { left: false, right: false },
  pointerActive: false,
  pointerX: 0,
  shake: 0,
  ball: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 12,
    onHold: false,
    holdX: 0,
    holdY: 0,
  },
};

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  state.wallY = Math.max(56, state.height * 0.12);
  state.paddleY = state.height - Math.max(80, state.height * 0.12);
  if (!state.paddleX) {
    state.paddleX = state.width / 2;
  }
  clampPaddle();
  if (!state.ball.onHold && state.ball.vx === 0 && state.ball.vy === 0) {
    resetBall(true);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampPaddle() {
  const half = state.paddleWidth / 2;
  state.paddleX = clamp(state.paddleX, half + 16, state.width - half - 16);
}

function launchBall({ randomAngle = 45, speedMultiplier = 1, fromHold = false } = {}) {
  const angle = (Math.random() * randomAngle * 2 - randomAngle) * (Math.PI / 180);
  const direction = fromHold ? -1 : -1;
  const baseSpeed = state.height / 1.5;
  const speed = baseSpeed * speedMultiplier;
  state.ball.vx = Math.sin(angle) * speed;
  state.ball.vy = direction * Math.cos(angle) * speed;
  state.ball.onHold = false;
}

function resetBall(immediate = false) {
  state.ball.x = state.paddleX;
  state.ball.y = immediate ? state.paddleY - 18 : state.paddleY - 18;
  state.ball.holdX = state.ball.x;
  state.ball.holdY = state.ball.y;
  state.ball.onHold = false;
  launchBall({ randomAngle: 45, speedMultiplier: 1, fromHold: false });
}

function holdBallAbovePaddle() {
  state.ball.onHold = true;
  state.ball.holdX = state.paddleX;
  state.ball.holdY = state.paddleY - 26;
  state.ball.x = state.ball.holdX;
  state.ball.y = state.ball.holdY;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.missHoldUntil = performance.now() + 2000;
}

function respawnAfterHold() {
  state.ball.x = state.paddleX;
  state.ball.y = state.paddleY - 18;
  launchBall({ randomAngle: 45, speedMultiplier: speedMultiplierForTime(), fromHold: true });
}

function speedMultiplierForTime() {
  const elapsed = clamp((performance.now() - state.startTime) / 60000, 0, 1);
  return 1 + elapsed * 0.5;
}

function flashGreen() {
  state.flashUntil = performance.now() + 130;
  flashEl.classList.add("on");
  window.setTimeout(() => {
    if (performance.now() >= state.flashUntil) {
      flashEl.classList.remove("on");
    }
  }, 140);
}

function updateTime() {
  const elapsed = (performance.now() - state.startTime) / 1000;
  state.timeLeft = Math.max(0, 60 - elapsed);
  timeEl.textContent = Math.ceil(state.timeLeft).toString();
  if (state.timeLeft <= 0 && state.running) {
    endGame();
  }
}

function endGame() {
  state.running = false;
  panel.style.display = "block";
  finalScoreText.textContent = `You scored ${state.score} ball${state.score === 1 ? "" : "s"}.`;
  document.getElementById("finalScoreTitle").textContent = "Time's Up";
}

function resetGame() {
  state.running = true;
  state.startTime = performance.now();
  state.lastFrame = performance.now();
  state.score = 0;
  state.gapWidth = 260;
  state.scorePulse = 0;
  state.flashUntil = 0;
  state.missHoldUntil = 0;
  panel.style.display = "none";
  flashEl.classList.remove("on");
  state.paddleX = state.width / 2;
  clampPaddle();
  resetBall(true);
  scoreEl.textContent = "0";
  timeEl.textContent = "60";
}

function spawnBallFromPaddle() {
  state.ball.x = state.paddleX;
  state.ball.y = state.paddleY - 18;
  launchBall({ randomAngle: 45, speedMultiplier: speedMultiplierForTime(), fromHold: false });
}

function handlePaddleCollision() {
  const ball = state.ball;
  const paddleTop = state.paddleY - state.paddleHeight / 2;
  const paddleBottom = state.paddleY + state.paddleHeight / 2;
  const withinY = ball.y + ball.radius >= paddleTop && ball.y - ball.radius <= paddleBottom;
  const withinX = ball.x >= state.paddleX - state.paddleWidth / 2 - ball.radius && ball.x <= state.paddleX + state.paddleWidth / 2 + ball.radius;

  if (withinY && withinX && ball.vy > 0) {
    const offset = (ball.x - state.paddleX) / (state.paddleWidth / 2);
    const normalized = clamp(offset, -1, 1);
    const hitStrength = 0.5 + Math.abs(normalized);
    const angle = normalized * (Math.PI / 4) * hitStrength;
    const speed = Math.hypot(ball.vx, ball.vy) * 1.01;
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.abs(Math.cos(angle) * speed);
    ball.y = paddleTop - ball.radius - 1;
  }
}

function handleWallCollision(dt) {
  const ball = state.ball;
  const gapLeft = state.width / 2 - state.gapWidth / 2;
  const gapRight = state.width / 2 + state.gapWidth / 2;
  const wallTop = state.wallY;
  const wallBottom = state.wallY + state.wallThickness;

  if (ball.y - ball.radius <= wallBottom && ball.y + ball.radius >= wallTop && ball.vy < 0) {
    if (ball.x > gapLeft && ball.x < gapRight) {
      scoreBall();
      return;
    }
    if (ball.x <= gapLeft || ball.x >= gapRight) {
      ball.y = wallBottom + ball.radius + 1;
      ball.vy = Math.abs(ball.vy);
    }
  }

  if (ball.y - ball.radius > state.height + 40) {
    holdBallAbovePaddle();
  }
}

function scoreBall() {
  state.score += 1;
  scoreEl.textContent = String(state.score);
  flashGreen();
  state.gapWidth = Math.max(70, state.gapWidth * 0.92);
  spawnBallFromPaddle();
}

function updatePaddle(dt) {
  const movement = (state.keys.right - state.keys.left) * 540 * dt;
  if (movement) {
    state.paddleX += movement;
  } else if (state.pointerActive) {
    const diff = state.pointerX - state.paddleX;
    state.paddleX += diff * Math.min(1, dt * 8);
  }
  clampPaddle();
}

function updateBall(dt) {
  const ball = state.ball;
  if (ball.onHold) {
    ball.x = state.paddleX;
    ball.y = state.paddleY - 26;
    if (performance.now() >= state.missHoldUntil) {
      respawnAfterHold();
    }
    return;
  }

  const speedBoost = speedMultiplierForTime();
  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  const desiredSpeed = (state.height / 1.5) * speedBoost;
  const scale = desiredSpeed / currentSpeed;
  if (Number.isFinite(scale) && scale > 0) {
    ball.vx *= scale;
    ball.vy *= scale;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.radius >= state.width) {
    ball.x = state.width - ball.radius;
    ball.vx = -Math.abs(ball.vx);
  }

  handlePaddleCollision();
  handleWallCollision(dt);

  if (ball.y + ball.radius < 0) {
    holdBallAbovePaddle();
  }

  if (ball.y - ball.radius > state.height) {
    holdBallAbovePaddle();
  }
}

function drawBird(ball) {
  const r = ball.radius;
  const dir = ball.vx >= 0 ? 1 : -1;
  const flap = Math.sin(performance.now() / 80) * 0.5;

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.scale(dir, 1);

  // body
  ctx.fillStyle = "#ffd23f";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // wing
  ctx.fillStyle = "#f3a712";
  ctx.beginPath();
  ctx.ellipse(-r * 0.15, flap * r * 0.35, r * 0.7, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // beak
  ctx.fillStyle = "#ff7b00";
  ctx.beginPath();
  ctx.moveTo(r * 0.8, -r * 0.1);
  ctx.lineTo(r * 1.55, 0.05 * r);
  ctx.lineTo(r * 0.8, r * 0.3);
  ctx.closePath();
  ctx.fill();

  // eye
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(r * 0.38, -r * 0.35, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(r * 0.46, -r * 0.35, r * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, state.width, state.height);

  ctx.save();
  ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);

  ctx.fillStyle = "#f5f5f5";
  ctx.globalAlpha = 1;

  const wallLeft = state.width / 2 - state.gapWidth / 2;
  const wallRight = state.width / 2 + state.gapWidth / 2;
  ctx.fillRect(0, state.wallY, wallLeft, state.wallThickness);
  ctx.fillRect(wallRight, state.wallY, state.width - wallRight, state.wallThickness);

  ctx.fillRect(state.paddleX - state.paddleWidth / 2, state.paddleY - state.paddleHeight / 2, state.paddleWidth, state.paddleHeight);

  drawBird(state.ball);

  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  for (let y = 0; y < state.height; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(state.width, y + 0.5);
    ctx.stroke();
  }
}

function loop(now) {
  const dt = Math.min(0.02, (now - state.lastFrame) / 1000);
  state.lastFrame = now;

  if (state.running) {
    updateTime();
    updatePaddle(dt);
    updateBall(dt);
  }

  draw();

  if (now < state.flashUntil) {
    flashEl.classList.add("on");
  } else {
    flashEl.classList.remove("on");
  }

  requestAnimationFrame(loop);
}

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  state.pointerX = clamp(x, state.paddleWidth / 2 + 16, rect.width - state.paddleWidth / 2 - 16);
  state.pointerActive = true;
  if (state.running && !state.ball.onHold) {
    state.paddleX = state.pointerX;
  }
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  setPointerFromEvent(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (event.buttons === 0 && !state.pointerActive) return;
  setPointerFromEvent(event);
});

canvas.addEventListener("pointerup", () => {
  state.pointerActive = false;
});

window.addEventListener("mousemove", (event) => {
  if (event.pointerType === "touch") return;
  const rect = canvas.getBoundingClientRect();
  state.pointerX = clamp(event.clientX - rect.left, state.paddleWidth / 2 + 16, rect.width - state.paddleWidth / 2 - 16);
  state.pointerActive = true;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") state.keys.left = true;
  if (event.key === "ArrowRight") state.keys.right = true;
  if (event.key === " " && !state.running) resetGame();
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") state.keys.left = false;
  if (event.key === "ArrowRight") state.keys.right = false;
});

restartButton.addEventListener("click", resetGame);
window.addEventListener("resize", resize);

resize();
resetGame();
requestAnimationFrame(loop);
