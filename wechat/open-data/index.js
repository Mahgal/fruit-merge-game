const sharedCanvas = wx.getSharedCanvas();
const context = sharedCanvas.getContext('2d');

let isVisible = false;

wx.onMessage(data => {
  if (data.type === 'showLeaderboard') {
    isVisible = true;
    drawLeaderboard();
  } else if (data.type === 'hideLeaderboard') {
    isVisible = false;
    context.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
  }
});

function drawLeaderboard() {
  if (!isVisible) return;

  wx.getFriendCloudStorage({
    keyList: ['score'],
    success: res => {
      let data = res.data;
      // Sort by score descending
      data.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (a.KVDataList.length > 0) scoreA = parseInt(a.KVDataList[0].value) || 0;
        if (b.KVDataList.length > 0) scoreB = parseInt(b.KVDataList[0].value) || 0;
        return scoreB - scoreA;
      });

      context.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);

      // Draw background panel
      const padding = 40;
      const startY = sharedCanvas.height / 2; // Offset below game over text
      context.fillStyle = 'rgba(255, 255, 255, 0.9)';
      context.fillRect(padding, startY, sharedCanvas.width - padding * 2, sharedCanvas.height / 2 - padding);

      context.fillStyle = '#333';
      context.font = '20px sans-serif';
      context.textAlign = 'center';
      context.fillText('好友排行榜', sharedCanvas.width / 2, startY + 30);

      context.textAlign = 'left';
      context.font = '16px sans-serif';
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        let friend = data[i];
        let score = 0;
        if (friend.KVDataList.length > 0) {
          score = friend.KVDataList[0].value;
        }
        let nickname = friend.nickname || 'Unknown';

        let y = startY + 70 + (i * 30);
        context.fillText(`${i + 1}. ${nickname}`, padding + 20, y);
        context.textAlign = 'right';
        context.fillText(score, sharedCanvas.width - padding - 20, y);
        context.textAlign = 'left';
      }
    },
    fail: err => {
      console.error('Failed to get friend cloud storage', err);
    }
  });
}
