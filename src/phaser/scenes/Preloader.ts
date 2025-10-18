import Phaser from "phaser";
import * as GameConfig from "@/phaser/config/game-config";

export class Preloader extends Phaser.Scene {
  constructor() {
    super("Preloader");
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(this.scale.width / 2, this.scale.height / 2, "background");

    //  A simple progress bar. This is the outline of the bar.
    this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        GameConfig.PROGRESS_BAR_WIDTH,
        GameConfig.PROGRESS_BAR_HEIGHT
      )
      .setStrokeStyle(GameConfig.PROGRESS_BAR_BORDER_WIDTH, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(
      this.scale.width / 2 -
        GameConfig.PROGRESS_BAR_WIDTH / 2 +
        GameConfig.PROGRESS_BAR_INNER_PADDING,
      this.scale.height / 2,
      GameConfig.PROGRESS_BAR_INNER_PADDING,
      GameConfig.PROGRESS_BAR_INNER_HEIGHT,
      0xffffff
    );

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on("progress", (progress: number) => {
      //  Update the progress bar
      bar.width =
        GameConfig.PROGRESS_BAR_INNER_PADDING +
        (GameConfig.PROGRESS_BAR_WIDTH -
          2 * GameConfig.PROGRESS_BAR_INNER_PADDING) *
          progress;
    });
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath("/phaser/assets");
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start("Game");
  }
}
