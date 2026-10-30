const FRUIT_CHAIN = [
  { id: 0, name: '草莓', radius: 15, score: 2, color: '#ff4b4b' },
  { id: 1, name: '橙子', radius: 25, score: 4, color: '#ffa500' },
  { id: 2, name: '苹果', radius: 35, score: 8, color: '#ff0800' },
  { id: 3, name: '桃子', radius: 45, score: 16, color: '#ffb6c1' },
  { id: 4, name: '梨', radius: 55, score: 32, color: '#d1e231' },
  { id: 5, name: '菠萝', radius: 65, score: 64, color: '#ffe135' },
  { id: 6, name: '椰子', radius: 75, score: 128, color: '#965a3e' },
  { id: 7, name: '西瓜', radius: 95, score: 256, color: '#fc3c44' }
];

const DANGER_LINE_Y = 150;
const DANGER_TIME_MS = 2000;

function getNextFruit(currentFruitId) {
  if (currentFruitId >= 0 && currentFruitId < FRUIT_CHAIN.length - 1) {
    return FRUIT_CHAIN[currentFruitId + 1];
  }
  return null;
}

function getMergeScore(fruitId) {
  const nextFruit = getNextFruit(fruitId);
  if (nextFruit) {
    return nextFruit.score;
  }
  return 512;
}

class GameCore {
  constructor() {
    this.score = 0;
    this.bestScore = 0;
    this.isGameOver = false;
    this.dangerStartTime = null;
  }

  addScore(points) {
    this.score += points;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }
  }

  checkDangerLine(fruitsY, currentTime) {
    if (this.isGameOver) return true;

    const isAboveLine = fruitsY.some(y => y < DANGER_LINE_Y);

    if (isAboveLine) {
      if (!this.dangerStartTime) {
        this.dangerStartTime = currentTime;
      } else if (currentTime - this.dangerStartTime >= DANGER_TIME_MS) {
        this.isGameOver = true;
        return true;
      }
    } else {
      this.dangerStartTime = null;
    }

    return false;
  }

  reset() {
    this.score = 0;
    this.isGameOver = false;
    this.dangerStartTime = null;
  }
}

const FruitCore = {
  FRUIT_CHAIN,
  DANGER_LINE_Y,
  DANGER_TIME_MS,
  getNextFruit,
  getMergeScore,
  GameCore
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FruitCore;
}
if (typeof window !== 'undefined') {
  window.FruitCore = FruitCore;
}
