import Phaser from "phaser";

export class Game extends Phaser.Scene {
  private snake: Phaser.GameObjects.Rectangle[] = [];
  private food!: Phaser.GameObjects.Rectangle;
  private direction: string = "right";
  private nextDirection: string = "right";
  private gridSize: number = 32;
  private snakeSpeed: number = 100;
  private lastMoveTime: number = 0;
  private isGameOver: boolean = false;
  private tutorialText!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private frameTimestamps: number[] = [];
  private calculatedFps: number = 0;

  constructor() {
    super("Game");
  }

  create() {
    this.isGameOver = false;
    this.direction = "right";
    this.nextDirection = "right";
    this.cameras.main.setBackgroundColor(0x00ff00);
    this.add.image(512, 384, "background").setAlpha(0.5);

    // Create tutorial text
    this.tutorialText = this.add
      .text(512, 100, "Use arrow keys to move the snake", {
        fontFamily: "Arial Black",
        fontSize: 28,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 8,
        align: "center",
      })
      .setOrigin(0.5);

    this.fpsText = this.add
      .text(5, 5, ``, {
        fontFamily: "Arial",
        fontSize: 14,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 1,
        align: "left",
      })
      .setOrigin(0);

    // Initialize snake
    this.snake = [];
    const startX = 5;
    const startY = 5;

    // Create initial snake body (3 segments), feel free to play with it
    for (let i = 0; i < 3; i++) {
      const segment = this.add
        .rectangle(
          (startX - i) * this.gridSize + 1,
          startY * this.gridSize + 1,
          this.gridSize - 2,
          this.gridSize - 2,
          0x000000
        )
        .setOrigin(0);
      this.snake.push(segment);
    }

    // Spawn initial food
    this.spawnFood();

    // Setup keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Add listener for any key press to hide tutorial
    this.input.keyboard!.on("keydown", () => {
      if (this.tutorialText.visible) {
        this.tutorialText.setVisible(false);
      }
    });
  }

  update(time: number) {
    if (this.isGameOver) return;

    // Calculate FPS manually using frame timestamps
    const currentTime = performance.now();
    this.frameTimestamps.push(currentTime);

    // Keep only the last second of timestamps
    const oneSecondAgo = currentTime - 1000;
    while (
      this.frameTimestamps.length > 0 &&
      this.frameTimestamps[0] < oneSecondAgo
    ) {
      this.frameTimestamps.shift();
    }

    // Calculate FPS based on actual time span between frames
    if (this.frameTimestamps.length >= 2) {
      const oldestTimestamp = this.frameTimestamps[0];
      const newestTimestamp =
        this.frameTimestamps[this.frameTimestamps.length - 1];
      const timeSpan = newestTimestamp - oldestTimestamp;

      if (timeSpan > 0) {
        // FPS = (number of frames - 1) / time span in seconds
        // We subtract 1 because if we have 2 frames, there's only 1 frame interval
        this.calculatedFps =
          ((this.frameTimestamps.length - 1) / timeSpan) * 1000;
      }
    }

    this.fpsText.setText(`${this.calculatedFps.toFixed(1)} fps`);

    // Handle input
    if (this.cursors.left.isDown && this.direction !== "right") {
      this.nextDirection = "left";
    } else if (this.cursors.right.isDown && this.direction !== "left") {
      this.nextDirection = "right";
    } else if (this.cursors.up.isDown && this.direction !== "down") {
      this.nextDirection = "up";
    } else if (this.cursors.down.isDown && this.direction !== "up") {
      this.nextDirection = "down";
    }

    // Move snake at fixed intervals
    if (time >= this.lastMoveTime + this.snakeSpeed) {
      this.moveSnake();
      this.lastMoveTime = time;
    }
  }

  moveSnake() {
    // Update current direction
    this.direction = this.nextDirection;

    // Calculate new head position
    const head = this.snake[0];
    let newX = head.x;
    let newY = head.y;

    switch (this.direction) {
      case "left":
        newX -= this.gridSize;
        break;
      case "right":
        newX += this.gridSize;
        break;
      case "up":
        newY -= this.gridSize;
        break;
      case "down":
        newY += this.gridSize;
        break;
    }

    // Check for collisions with walls
    if (newX < 0 || newX >= 1024 || newY < 0 || newY >= 768) {
      this.gameOver();
      return;
    }

    // Check for collision with self
    for (const segment of this.snake) {
      if (newX === segment.x && newY === segment.y) {
        this.gameOver();
        return;
      }
    }

    // Check for food collision
    const eating = newX === this.food.x && newY === this.food.y;

    // Move snake
    const newHead = this.add
      .rectangle(newX, newY, this.gridSize - 2, this.gridSize - 2, 0x000000)
      .setOrigin(0);
    this.snake.unshift(newHead);

    if (!eating) {
      // Remove tail if not eating
      const tail = this.snake.pop();
      tail?.destroy();
    } else {
      // Spawn new food if eating
      this.food.destroy();
      this.spawnFood();
    }
  }

  spawnFood() {
    const x =
      Math.floor(Math.random() * (1024 / this.gridSize)) * this.gridSize;
    const y = Math.floor(Math.random() * (768 / this.gridSize)) * this.gridSize;
    this.food = this.add
      .rectangle(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2, 0xff0000)
      .setOrigin(0);
  }

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Reset directions
    this.direction = "right";
    this.nextDirection = "right";

    // Destroy all existing game objects
    this.snake.forEach((segment) => segment.destroy());
    this.snake = [];
    if (this.food) {
      this.food.destroy();
    }

    this.add
      .text(512, 384, "GAME OVER", {
        fontFamily: "Arial Black",
        fontSize: 64,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 8,
        align: "center",
      })
      .setOrigin(0.5);

    // Restart the scene after a delay
    this.time.delayedCall(1000, () => {
      this.scene.restart();
    });
  }
}
