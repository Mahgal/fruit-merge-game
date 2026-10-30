const checkin = {
  init: function() {
    if (typeof wx !== 'undefined') {
      const today = new Date().toDateString();
      const lastCheckin = wx.getStorageSync('lastCheckinDate');

      if (lastCheckin !== today) {
        // Give one free clear top prop
        let props = wx.getStorageSync('clearTopProps') || 0;
        wx.setStorageSync('clearTopProps', props + 1);
        wx.setStorageSync('lastCheckinDate', today);
        console.log('Daily check-in completed. Prop granted.');
      }
    }
  },
  useClearTopProp: function() {
    if (typeof wx !== 'undefined') {
      let props = wx.getStorageSync('clearTopProps') || 0;
      if (props > 0) {
        wx.setStorageSync('clearTopProps', props - 1);
        return true;
      }
    }
    return false;
  }
};

export default checkin;
