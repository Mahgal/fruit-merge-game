const social = {
  init: function() {
    if (typeof wx !== 'undefined' && wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });
      wx.onShareAppMessage(() => {
        return {
          title: '你能合成大西瓜吗？快来挑战吧！',
          imageUrl: '' // No external images
        };
      });
    }
  },
  updateScore: function(score) {
    if (typeof wx !== 'undefined' && wx.setUserCloudStorage) {
      wx.setUserCloudStorage({
        KVDataList: [{ key: 'score', value: String(score) }],
        success: res => console.log('Score updated in cloud', res),
        fail: err => console.error('Failed to update score', err)
      });
    }
  }
};

export default social;
