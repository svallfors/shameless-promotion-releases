# Shameless Promotion

A cinematic version of your design, with tasteful animation. A Mac app and a Figma plugin.

**[Download the latest release →](https://github.com/svallfors/shameless-promotion-releases/releases/latest)**

You spent three weeks on it. Then the PM needed the team to move on, there was no motion budget, and you posted a screenshot with "just a little something I've been working on" underneath. Shameless Promotion is the end of that sentence. Tag a few layers, send the frame, pick a shot. A few minutes later your design moves like it had a budget. Post it without the apology.

## Install

1. Open the `.dmg` and drag **Shameless Promotion** to Applications. It is signed and notarized, so it opens like any other Mac app.
2. Open Shameless Promotion once.
3. In Figma: **Plugins → Development → Import plugin from manifest…** and pick `manifest.json` from the plugin folder in the release (`shameless-promotion-figma-plugin.zip`, unzipped).

Shameless Promotion runs on Apple silicon Macs with macOS 14 or later.

## How it works

1. Select one or more frames in Figma. Each becomes a scene, left to right.
2. Run **Plugins → Shameless Promotion for Figma**. The plugin opens the Mac app if it is not running, shows the frames it will send, and asks whether to create a new project or add to the one that is open.
3. In the app, aim the camera, pick a shot and a Move, press space to play, and export a film up to 4K.

### Tag the layers that should move

Put an `@` in front of a layer's name in Figma and it enters on its own, with the rest of the frame as the backdrop. A digit right after the tag pins its entrance order (`@1`, `@2`, `@3`); the rest stagger top to bottom. Text layers get a little extra. Nothing else in your file changes.

Video fills ride along as posters. Drop the source file on the Shameless Promotion window to play it.

## Feedback

Something broke, or something is missing? [Open an issue](https://github.com/svallfors/shameless-promotion-releases/issues/new). In the app, **Help → Report a Problem…** prefills one with your versions, and **Help → Export Project for Debugging…** makes a zip you can attach.
