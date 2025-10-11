import Phaser from "phaser";
import VirtualJoystick from "phaser3-rex-plugins/plugins/virtualjoystick";

const JOYSTICK_RADIUS = 150;

export class Game extends Phaser.Scene {
  static readonly SPEED_SPRINT_FACTOR = 0.7; // A percentage that makes the snake to be faster; 0.2 means 20% faster when sprint key pressed

  private snake: Phaser.GameObjects.Rectangle[] = [];
  private food!: Phaser.GameObjects.Rectangle;
  private direction: string = "right";
  private nextDirection: string = "right";
  private gridSize: number = 32;
  private snakeSpeed: number = 150;
  private lastMoveTime: number = 0;
  private isGameOver: boolean = false;
  private startLayer!: Phaser.GameObjects.Container;
  private stats: Phaser.GameObjects.Text | undefined;
  private cursorsKeyboard: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private frameTimestamps: number[] = [];
  private calculatedFps: number = 0;
  private controlKeys: {
    isActive: () => boolean;
    direction: string;
    opposite: string;
    isHandled: boolean;
  }[] = [];
  private isPaused: boolean = false;
  private isStarted: boolean = false;
  private isSprintEnabled: boolean = false;
  private joystick: VirtualJoystick | undefined;
  private sprintButton: Phaser.GameObjects.Arc | undefined;

  constructor() {
    super("Game");
  }

  create() {
    this.isGameOver = false;
    this.direction = "right";
    this.nextDirection = "right";
    this.cameras.main.setBackgroundColor(0x000000);

    this.stats = this.add
      .text(
        0,
        0,
        `fps: ${this.game.loop.actualFps}  speed: ${this.snakeSpeed}ms`,
        {
          fontFamily: "Arial",
          fontSize: 14,
          color: "#ffffff",
          align: "left",
          backgroundColor: "#00000053",
          padding: { x: 6, y: 3 },
        }
      )
      .setOrigin(0);

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        this.enableSprint();
      }
    });

    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        this.disableSprint();
      }
    });

    this.input.addPointer(1);

    this.joystick = new VirtualJoystick(this, {
      radius: JOYSTICK_RADIUS,
      x: 1024 - JOYSTICK_RADIUS - 50,
      y: 768 - JOYSTICK_RADIUS - 50,
      dir: "4dir",
      base: this.add.circle(0, 0, JOYSTICK_RADIUS, 0xffffff, 0.05),
      thumb: this.add.circle(0, 0, JOYSTICK_RADIUS / 4, 0xffffff, 0.3),
    }).setVisible(false);

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
          0x00ff00
        )
        .setOrigin(0);
      this.snake.push(segment);
    }

    // Spawn initial food
    this.spawnFood();

    // Setup keyboard controls
    this.cursorsKeyboard = this.input.keyboard?.createCursorKeys();

    this.controlKeys = [
      {
        isActive: () =>
          this.cursorsKeyboard?.left?.isDown || this.joystick?.left || false,
        direction: "left",
        opposite: "right",
        isHandled: false,
      },
      {
        isActive: () =>
          this.cursorsKeyboard?.right?.isDown || this.joystick?.right || false,
        direction: "right",
        opposite: "left",
        isHandled: false,
      },
      {
        isActive: () =>
          this.cursorsKeyboard?.up?.isDown || this.joystick?.up || false,
        direction: "up",
        opposite: "down",
        isHandled: false,
      },
      {
        isActive: () =>
          this.cursorsKeyboard?.down?.isDown || this.joystick?.down || false,
        direction: "down",
        opposite: "up",
        isHandled: false,
      },
    ];

    // Create tutorial text
    this.startLayer ??= this.add.container(0, 0, [
      this.add.text(
        0,
        0,
        ["Use arrow keys to move the snake", "Hold Shift to speed up"],
        {
          fontFamily: "Arial Black",
          fontSize: 28,
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 8,
          align: "center",
          backgroundColor: "#000000aa",
          fixedWidth: 1024,
          fixedHeight: 768,
          padding: { top: 768 * 0.3, bottom: 0 },
        }
      ),
      // button start
      this.createGreenButton(
        "Start",
        (e) => {
          if (e.wasTouch) {
            this.sprintButton?.setVisible(true);
            this.joystick?.setVisible(true);
          }
          this.startLayer.setVisible(false);
          this.isStarted = true;
        },
        { x: 1024 / 2, y: 768 * 0.6 }
      ),
    ]);

    this.sprintButton = this.add
      .circle(200, 768 - 200, 300, 0xffffff, 0.05)
      .setOrigin(0.5)
      .setVisible(false)
      .setInteractive()
      .on("pointerdown", () => {
        this.enableSprint();
      })
      .on("pointerup", () => {
        this.disableSprint();
      });
  }

  update(time: number) {
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

    this.stats?.setText(
      Object.entries({
        fps: this.calculatedFps.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
        speed: this.snakeSpeed.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
      }).map(([key, value]) => `${key}: ${value}`)
    );

    if (!this.isStarted || this.isPaused || this.isGameOver) return;

    // Handle input
    let isDirectionChanged = false;
    for (const controlKey of this.controlKeys) {
      if (controlKey.isActive()) {
        if (
          !controlKey.isHandled &&
          this.direction !== controlKey.direction &&
          this.direction !== controlKey.opposite
        ) {
          this.nextDirection = controlKey.direction;
          isDirectionChanged = true;
          controlKey.isHandled = true;
        }
      } else {
        controlKey.isHandled = false;
      }
    }

    // Move snake at fixed intervals
    if (isDirectionChanged || time >= this.lastMoveTime + this.snakeSpeed) {
      this.moveSnake();
      this.lastMoveTime = time;
    }

    this.stats?.setToTop();
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
      .rectangle(newX, newY, this.gridSize - 2, this.gridSize - 2, 0x00ff00)
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
    this.isStarted = false;

    this.add.text(0, 0, "GAME OVER", {
      fontFamily: "Arial Black",
      fontSize: 64,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 8,
      align: "center",
      backgroundColor: "#00000053",
      fixedWidth: 1024,
      fixedHeight: 768,
      padding: { top: (768 - 100 - 64) / 2, bottom: 0 },
    });

    this.createGreenButton(
      "Restart",
      (_, button) => {
        this.resetAndStart();
        button.destroy();
      },
      {
        x: 1024 / 2,
        y: 768 / 2 + 64,
      }
    );

    this.input.keyboard?.removeAllListeners();
    this.disableSprint();
  }

  enableSprint() {
    if (this.isSprintEnabled) return;
    this.isSprintEnabled = true;
    this.snakeSpeed *= 1 - Game.SPEED_SPRINT_FACTOR;
  }

  disableSprint() {
    if (!this.isSprintEnabled) return;
    this.isSprintEnabled = false;
    this.snakeSpeed /= 1 - Game.SPEED_SPRINT_FACTOR;
  }

  reset() {
    this.disableSprint();
    this.scene.restart();
  }

  resetAndStart() {
    this.reset();
    this.isStarted = true;
  }

  createGreenButton(
    text: string,
    onClick: (
      e: Phaser.Input.Pointer,
      button: Phaser.GameObjects.Container
    ) => void,
    {
      x = 0,
      y = 0,
      width = 200,
      height = 60,
      fontSize = 28,
    }: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fontSize?: string | number;
    } = {}
  ) {
    const button = this.add
      .container(x, y, [
        // Main button background
        this.add
          .graphics()
          .fillStyle(0x22c55e)
          .fillRoundedRect(-width / 2, -height / 2, width, height, height / 5),
        // Top highlight bevel
        this.add
          .graphics()
          .fillStyle(0x4ade80, 0.4)
          .fillRoundedRect(
            -width / 2 + 5,
            -height / 2 + 5,
            width - 10,
            height / 3,
            height / 6
          ),
        // Bottom shadow bevel
        this.add
          .graphics()
          .fillStyle(0x166534, 0.3)
          .fillRoundedRect(
            -width / 2 + 5,
            height / 6 - 5,
            width - 10,
            height / 3,
            height / 6
          ),
        // Border
        this.add
          .graphics()
          .lineStyle(3, 0x16a34a)
          .strokeRoundedRect(-width / 2, -height / 2, width, height, 12),
        // Text
        this.add
          .text(0, 0, text, {
            fontFamily: "Arial Black",
            fontSize,
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 8,
          })
          .setOrigin(0.5),
      ])
      .setSize(width, height)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (e: Phaser.Input.Pointer) => onClick(e, button));
    return button;
  }
}
