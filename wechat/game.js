import './matter.min.js';
import FruitCore from '../core/core.js';
import ads from './ads.js';
import social from './social.js';
import checkin from './checkin.js';
import pay from './pay.js'; // Stubs only

const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;

const canvas = wx.createCanvas();
const context = canvas.getContext('2d');
const info = wx.getSystemInfoSync();
const GAME_WIDTH = info.windowWidth;
const GAME_HEIGHT = info.windowHeight;

let engine;
let render;
let runner;
let gameCore;

let currentFruit = null;
let currentFruitBody = null;
let mouseX = GAME_WIDTH / 2;
let canDrop = true;

// Open data context for leaderboard
const openDataContext = wx.getOpenDataContext();
const sharedCanvas = openDataContext.canvas;
sharedCanvas.width = GAME_WIDTH;
sharedCanvas.height = GAME_HEIGHT;

function initGame() {
  gameCore = new FruitCore.GameCore();

  const savedBest = wx.getStorageSync('bestScore');
  if (savedBest) {
    gameCore.bestScore = parseInt(savedBest, 10);
  }

  engine = Engine.create();

  render = Render.create({
    canvas: canvas,
    context: context,
    engine: engine,
    options: {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      wireframes: false,
      background: '#fce4ec'
    }
  });

  const wallOptions = { isStatic: true, render: { fillStyle: '#ccc' } };
  const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 25, GAME_WIDTH, 50, wallOptions);
  const leftWall = Bodies.rectangle(-25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);
  const rightWall = Bodies.rectangle(GAME_WIDTH + 25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);

  Composite.add(engine.world, [ground, leftWall, rightWall]);

  Events.on(render, 'afterRender', function() {
    const ctx = render.context;

    // Draw danger line
    ctx.beginPath();
    ctx.moveTo(0, FruitCore.DANGER_LINE_Y);
    ctx.lineTo(GAME_WIDTH, FruitCore.DANGER_LINE_Y);
    if (gameCore.dangerStartTime) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
    } else {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
    }
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw fruits
    const bodies = Composite.allBodies(engine.world);
    for (let body of bodies) {
      if (body.fruitId !== undefined) {
        const fruitDef = FruitCore.FRUIT_CHAIN[body.fruitId];
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, fruitDef.radius, 0, 2 * Math.PI);
        ctx.fillStyle = fruitDef.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#333';
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = `${fruitDef.radius * 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.fillText(fruitDef.name, 0, 0);
        ctx.restore();
      }
    }

    // Draw current dropping fruit
    if (currentFruitBody && !currentFruitBody.isSleeping) {
        const fruitDef = FruitCore.FRUIT_CHAIN[currentFruitBody.fruitId];
        ctx.beginPath();
        ctx.arc(currentFruitBody.position.x, currentFruitBody.position.y, fruitDef.radius, 0, 2 * Math.PI);
        ctx.fillStyle = fruitDef.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = '#000';
        ctx.font = `${fruitDef.radius * 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fruitDef.name, currentFruitBody.position.x, currentFruitBody.position.y);
    }

    // Draw UI
    ctx.fillStyle = '#333';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`分数: ${gameCore.score}`, 20, 20);

    if (gameCore.isGameOver) {
      // Draw Game Over overlay
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '48px sans-serif';
      ctx.fillText('游戏结束', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100);

      ctx.font = '24px sans-serif';
      ctx.fillText(`得分: ${gameCore.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
      ctx.fillText(`最高分: ${gameCore.bestScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);

      // Draw Leaderboard
      ctx.drawImage(sharedCanvas, 0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Draw Restart Button (simple text btn)
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(GAME_WIDTH / 2 - 80, GAME_HEIGHT / 2 + 80, 160, 50);
      ctx.fillStyle = '#fff';
      ctx.fillText('重新开始', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 105);
    }
  });

  Events.on(engine, 'collisionStart', handleCollisions);

  Events.on(engine, 'beforeUpdate', function() {
    if (gameCore.isGameOver) return;

    const bodies = Composite.allBodies(engine.world);
    const fruitYs = bodies
        .filter(b => b.fruitId !== undefined && !b.isSensor)
        .map(b => b.position.y - FruitCore.FRUIT_CHAIN[b.fruitId].radius);

    if (gameCore.checkDangerLine(fruitYs, Date.now())) {
      endGame();
    }
  });

  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);

  spawnNextFruit();

  wx.onTouchStart(handleTouch);
  wx.onTouchMove(handleMove);
  wx.onTouchEnd(handleDrop);
}

function handleTouch(e) {
  if (gameCore.isGameOver) {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Check restart button click
    if (x >= GAME_WIDTH / 2 - 80 && x <= GAME_WIDTH / 2 + 80 &&
        y >= GAME_HEIGHT / 2 + 80 && y <= GAME_HEIGHT / 2 + 130) {
      restartGame();
    }
    return;
  }
  handleMove(e);
}

function handleMove(e) {
  if (!canDrop || gameCore.isGameOver) return;
  mouseX = e.touches[0].clientX;

  if (currentFruitBody) {
    const fruitDef = FruitCore.FRUIT_CHAIN[currentFruitBody.fruitId];
    let x = Math.max(fruitDef.radius, Math.min(GAME_WIDTH - fruitDef.radius, mouseX));
    Matter.Body.setPosition(currentFruitBody, { x: x, y: 50 });
  }
}

function handleDrop(e) {
  if (!canDrop || gameCore.isGameOver) return;
  canDrop = false;

  if (currentFruitBody) {
    currentFruitBody.isStatic = false;
    currentFruitBody.isSensor = false;
    currentFruitBody = null;

    setTimeout(() => {
      spawnNextFruit();
    }, 1000);
  }
}

function spawnNextFruit() {
  if (gameCore.isGameOver) return;

  const randomId = Math.floor(Math.random() * 4);
  const fruitDef = FruitCore.FRUIT_CHAIN[randomId];

  let x = Math.max(fruitDef.radius, Math.min(GAME_WIDTH - fruitDef.radius, mouseX));

  currentFruitBody = Bodies.circle(x, 50, fruitDef.radius, {
    isStatic: true,
    isSensor: true,
    restitution: 0.2,
    friction: 0.5,
    render: { visible: false }
  });
  currentFruitBody.fruitId = randomId;

  Composite.add(engine.world, currentFruitBody);
  canDrop = true;
}

function handleCollisions(event) {
  const pairs = event.pairs;

  let bodiesToRemove = [];
  let bodiesToAdd = [];

  for (let i = 0; i < pairs.length; i++) {
    const bodyA = pairs[i].bodyA;
    const bodyB = pairs[i].bodyB;

    if (bodyA.fruitId !== undefined && bodyB.fruitId !== undefined && bodyA.fruitId === bodyB.fruitId) {
      if (bodiesToRemove.includes(bodyA) || bodiesToRemove.includes(bodyB)) continue;

      const id = bodyA.fruitId;
      const nextFruitDef = FruitCore.getNextFruit(id);

      bodiesToRemove.push(bodyA);
      bodiesToRemove.push(bodyB);

      gameCore.addScore(FruitCore.FRUIT_CHAIN[id].score);

      if (nextFruitDef) {
        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;

        const newBody = Bodies.circle(midX, midY, nextFruitDef.radius, {
          restitution: 0.2,
          friction: 0.5,
          render: { visible: false }
        });
        newBody.fruitId = id + 1;
        bodiesToAdd.push(newBody);
      }
    }
  }

  if (bodiesToRemove.length > 0) {
    Composite.remove(engine.world, bodiesToRemove);
    Composite.add(engine.world, bodiesToAdd);
  }
}

function endGame() {
  gameCore.isGameOver = true;
  wx.setStorageSync('bestScore', gameCore.bestScore);

  social.updateScore(gameCore.score);

  // Tell open data context to draw leaderboard
  openDataContext.postMessage({
    type: 'showLeaderboard'
  });

  ads.showInterstitialAfterGameOver();
}

function restartGame() {
  gameCore.reset();

  openDataContext.postMessage({
    type: 'hideLeaderboard'
  });

  Engine.clear(engine);
  Composite.clear(engine.world);

  const wallOptions = { isStatic: true, render: { fillStyle: '#ccc' } };
  const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 25, GAME_WIDTH, 50, wallOptions);
  const leftWall = Bodies.rectangle(-25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);
  const rightWall = Bodies.rectangle(GAME_WIDTH + 25, GAME_HEIGHT / 2, 50, GAME_HEIGHT * 2, wallOptions);

  Composite.add(engine.world, [ground, leftWall, rightWall]);

  spawnNextFruit();
}

// Ensure matter.js is available by downloading a stub or using CDN (in web). For WeChat, we assume matter.min.js is placed next to this. We'll download it in bash.
social.init();
checkin.init();

initGame();
