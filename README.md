# 果园大合成 (Fruit Orchard Merge)

An original drop-and-merge physics puzzle game.

## Project Structure

- `core/` - Pure game logic (fruit chain, merging, scoring, game over). Shared between platforms.
- `web/` - Single-page browser preview using Canvas 2D.
- `wechat/` - Native WeChat Mini Game skeleton importing the core logic.

## How to Run the Web Preview

1. Open `web/index.html` in any modern web browser.
2. Click or tap to drop fruits. Connect identical fruits to merge them into larger ones.

## WeChat Mini Game Import

1. Open WeChat Developer Tools.
2. Select "Import Project".
3. Choose the `wechat/` directory.
4. The AppID is set to `touristappid` by default. Change this if you have a registered AppID.

## Ad Placements

The WeChat version includes stubs for the following ad placements (configured with empty ad unit IDs):
- `showRewardedForRevive()`: Watch an ad to clear top fruits and continue.
- `showRewardedForDoubleScore()`: Double final score after game over.
- `showRewardedClearTop()`: Clear top layer during gameplay.
- `showInterstitialAfterGameOver()`: Show interstitial ad after game over.

## Note on Virtual Payments

Virtual payment (e.g., `wx.requestMidasPayment`) is intentionally **not implemented** in v1. The `wechat/pay.js` file serves only as a comment placeholder.

## License & Attribution

This project uses [Matter.js](https://brm.io/matter-js/) for 2D physics. Matter.js is released under the MIT License.
