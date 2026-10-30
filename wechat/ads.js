const ads = {
  showRewardedForRevive: function() {
    return new Promise((resolve) => {
      if (typeof wx !== 'undefined' && wx.createRewardedVideoAd) {
        // Stub: Ad unit ID is empty
        const ad = wx.createRewardedVideoAd({ adUnitId: '' });
        ad.show().then(() => resolve(true)).catch(() => resolve(true));
      } else {
        resolve(true);
      }
    });
  },
  showRewardedForDoubleScore: function() {
    return new Promise((resolve) => {
      if (typeof wx !== 'undefined' && wx.createRewardedVideoAd) {
        // Stub
        const ad = wx.createRewardedVideoAd({ adUnitId: '' });
        ad.show().then(() => resolve(true)).catch(() => resolve(true));
      } else {
        resolve(true);
      }
    });
  },
  showRewardedClearTop: function() {
    return new Promise((resolve) => {
      if (typeof wx !== 'undefined' && wx.createRewardedVideoAd) {
        // Stub
        const ad = wx.createRewardedVideoAd({ adUnitId: '' });
        ad.show().then(() => resolve(true)).catch(() => resolve(true));
      } else {
        resolve(true);
      }
    });
  },
  showInterstitialAfterGameOver: function() {
    if (typeof wx !== 'undefined' && wx.createInterstitialAd) {
      // Stub
      const ad = wx.createInterstitialAd({ adUnitId: '' });
      ad.show().catch(err => console.log(err));
    }
  }
};

export default ads;
