const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events;

const canvas = document.getElementById('game-canvas');
const scoreEl = document.getElementById('score');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const restartBtn = document.getElementById('restart-btn');

let engine;
let render;
let runner;
let gameCore;

const GAME_WIDTH = 480;
const GAME_HEIGHT = 800;
let currentFruit = null;
let currentFruitBody = null;
let mouseX = GAME_WIDTH / 2;
let canDrop = true;

function initGame() {
  gameCore = new FruitCore.GameCore();
  const savedBest = localStorage.getItem('bestScore');
  if (savedBest) {
    gameCore.bestScore = parseInt(savedBest, 10);
  }

  engine = Engine.create();

  // Set canvas size
  const container = document.getElementById('game-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;

  // Create renderer
  render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: canvas.width,
      height: canvas.height,
      wireframes: false,
      background: 'transparent'
    }
  });

  // Walls
  const wallOptions = { isStatic: true, render: { fillStyle: '#ccc' } };
  const ground = Bodies.rectangle(canvas.width / 2, canvas.height + 25, canvas.width, 50, wallOptions);
  const leftWall = Bodies.rectangle(-25, canvas.height / 2, 50, canvas.height * 2, wallOptions);
  const rightWall = Bodies.rectangle(canvas.width + 25, canvas.height / 2, 50, canvas.height * 2, wallOptions);

  Composite.add(engine.world, [ground, leftWall, rightWall]);

  // custom drawing
  Events.on(render, 'afterRender', function() {
    const context = render.context;

    // Draw danger line
    context.beginPath();
    context.moveTo(0, FruitCore.DANGER_LINE_Y);
    context.lineTo(canvas.width, FruitCore.DANGER_LINE_Y);
    if (gameCore.dangerStartTime) {
      context.strokeStyle = 'red';
      context.lineWidth = 4;
    } else {
      context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      context.lineWidth = 2;
    }
    context.setLineDash([10, 10]);
    context.stroke();
    context.setLineDash([]);

    // Draw fruits
    const bodies = Composite.allBodies(engine.world);
    for (let body of bodies) {
      if (body.fruitId !== undefined) {
        const fruitDef = FruitCore.FRUIT_CHAIN[body.fruitId];
        context.beginPath();
        context.arc(body.position.x, body.position.y, fruitDef.radius, 0, 2 * Math.PI);
        context.fillStyle = fruitDef.color;
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#333';
        context.stroke();

        context.fillStyle = '#000';
        context.font = `${fruitDef.radius * 0.6}px sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Rotate text with body
        context.save();
        context.translate(body.position.x, body.position.y);
        context.rotate(body.angle);
        context.fillText(fruitDef.name, 0, 0);
        context.restore();
      }
    }

    // Draw current dropping fruit
    if (currentFruitBody && !currentFruitBody.isSleeping) {
        const fruitDef = FruitCore.FRUIT_CHAIN[currentFruitBody.fruitId];
        context.beginPath();
        context.arc(currentFruitBody.position.x, currentFruitBody.position.y, fruitDef.radius, 0, 2 * Math.PI);
        context.fillStyle = fruitDef.color;
        context.globalAlpha = 0.6;
        context.fill();
        context.globalAlpha = 1.0;

        context.fillStyle = '#000';
        context.font = `${fruitDef.radius * 0.6}px sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(fruitDef.name, currentFruitBody.position.x, currentFruitBody.position.y);
    }
  });

  Events.on(engine, 'collisionStart', handleCollisions);

  // Game Loop checking danger line
  Events.on(engine, 'beforeUpdate', function() {
    if (gameCore.isGameOver) return;

    const bodies = Composite.allBodies(engine.world);
    const fruitYs = bodies
        .filter(b => b.fruitId !== undefined && !b.isSensor)
        .map(b => b.position.y - FruitCore.FRUIT_CHAIN[b.fruitId].radius); // Top edge

    if (gameCore.checkDangerLine(fruitYs, Date.now())) {
      endGame();
    }
  });

  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);

  spawnNextFruit();

  // Input
  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('touchmove', handleMove, {passive: true});

  canvas.addEventListener('click', handleDrop);
  canvas.addEventListener('touchend', handleDrop);

  restartBtn.addEventListener('click', restartGame);
}

function handleMove(e) {
  if (!canDrop || gameCore.isGameOver) return;
  const rect = canvas.getBoundingClientRect();
  let clientX = e.clientX;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
  }
  mouseX = clientX - rect.left;

  if (currentFruitBody) {
    const fruitDef = FruitCore.FRUIT_CHAIN[currentFruitBody.fruitId];
    // constrain x
    let x = Math.max(fruitDef.radius, Math.min(canvas.width - fruitDef.radius, mouseX));
    Matter.Body.setPosition(currentFruitBody, { x: x, y: 50 });
  }
}

function handleDrop(e) {
  if (!canDrop || gameCore.isGameOver) return;
  canDrop = false;

  if (currentFruitBody) {
    currentFruitBody.isStatic = false;
    currentFruitBody.isSensor = false; // Make it interact physically
    currentFruitBody = null;

    setTimeout(() => {
      spawnNextFruit();
    }, 1000);
  }
}

function spawnNextFruit() {
  if (gameCore.isGameOver) return;

  const randomId = Math.floor(Math.random() * 4); // spawn 0 to 3
  const fruitDef = FruitCore.FRUIT_CHAIN[randomId];

  let x = Math.max(fruitDef.radius, Math.min(canvas.width - fruitDef.radius, mouseX));

  currentFruitBody = Bodies.circle(x, 50, fruitDef.radius, {
    isStatic: true,
    isSensor: true, // Don't collide while aiming
    restitution: 0.2,
    friction: 0.5,
    render: { visible: false } // we render it manually
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
      updateScoreUI();

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

function updateScoreUI() {
  scoreEl.innerText = gameCore.score;
}

function endGame() {
  gameCore.isGameOver = true;
  Runner.stop(runner);
  localStorage.setItem('bestScore', gameCore.bestScore);

  finalScoreEl.innerText = gameCore.score;
  bestScoreEl.innerText = gameCore.bestScore;
  gameOverEl.style.display = 'flex';
}

function restartGame() {
  gameOverEl.style.display = 'none';
  gameCore.reset();
  updateScoreUI();

  Engine.clear(engine);
  Render.stop(render);
  Runner.stop(runner);
  render.canvas.remove();
  render.canvas = null;
  render.context = null;
  render.textures = {};

  const container = document.getElementById('game-container');
  const newCanvas = document.createElement('canvas');
  newCanvas.id = 'game-canvas';
  container.insertBefore(newCanvas, container.firstChild);

  initGame();
}

window.onload = initGame;
