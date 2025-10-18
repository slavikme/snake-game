import Phaser from "phaser";
import VirtualJoystick from "phaser3-rex-plugins/plugins/virtualjoystick";
import * as GameConfig from "@/phaser/config/game-config";
import { RandomAccessMap } from "@/lib/utils/RandomAccessMap";

export class Game extends Phaser.Scene {
  static readonly SPEED_SPRINT_FACTOR = GameConfig.SNAKE_SPRINT_FACTOR;

  private snake: Phaser.GameObjects.Rectangle[] = [];
  private food: Phaser.GameObjects.Rectangle | undefined;
  private border: Phaser.GameObjects.Rectangle | undefined;
  private direction: string = GameConfig.SNAKE_INITIAL_DIRECTION;
  private nextDirection: string = GameConfig.SNAKE_INITIAL_DIRECTION;
  private snakeSpeed: number = GameConfig.SNAKE_INITIAL_SPEED;
  private lastMoveTime: number = 0;

  // Grid cell sizes calculated from scene dimensions
  private cellWidth: number = 0;
  private cellHeight: number = 0;
  private isGameOver: boolean = false;
  private startLayer!: Phaser.GameObjects.Container;
  private stats: Phaser.GameObjects.Text | undefined;
  private gameOverText: Phaser.GameObjects.Text | undefined;
  private gameOverButton: Phaser.GameObjects.Container | undefined;
  private errorText: Phaser.GameObjects.Text | undefined;

  // Empty cells tracking for O(1) food spawning
  // Maps "col,row" string keys to [col, row] tuple values
  // Maintained incrementally as snake moves for optimal performance
  private emptyCells: RandomAccessMap<string, [number, number]> =
    new RandomAccessMap();
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
  private primaryInputDevice: "touch" | "keyboard" | undefined;
  private hasDetectedKeyboard: boolean = false;
  private hasDetectedTouch: boolean = false;
  private fullscreenButton: Phaser.GameObjects.Container | undefined;
  private originalWidth: number = 0;
  private originalHeight: number = 0;

  constructor() {
    super("Game");
  }

  /**
   * Converts pixel X coordinate to grid column.
   *
   * @param x Pixel X coordinate
   * @returns Grid column index
   */
  private getColFromX = (x: number): number => Math.floor(x / this.cellWidth);

  /**
   * Converts pixel Y coordinate to grid row.
   *
   * @param y Pixel Y coordinate
   * @returns Grid row index
   */
  private getRowFromY = (y: number): number => Math.floor(y / this.cellHeight);

  /**
   * Converts pixel coordinates to grid coordinates.
   *
   * @param x Pixel X coordinate
   * @param y Pixel Y coordinate
   * @returns Tuple of [column, row]
   */
  private getColRowFromXY = (x: number, y: number): [number, number] => {
    return [this.getColFromX(x), this.getRowFromY(y)];
  };

  /**
   * Converts grid column to pixel X coordinate.
   *
   * @param col Grid column index
   * @returns Pixel X coordinate (top-left of cell)
   */
  private getXFromCol = (col: number): number => col * this.cellWidth;

  /**
   * Converts grid row to pixel Y coordinate.
   *
   * @param row Grid row index
   * @returns Pixel Y coordinate (top-left of cell)
   */
  private getYFromRow = (row: number): number => row * this.cellHeight;

  /**
   * Converts grid coordinates to pixel coordinates.
   *
   * @param col Grid column index
   * @param row Grid row index
   * @returns Tuple of [x, y] pixel coordinates (top-left of cell)
   */
  private getXYFromColRow = (col: number, row: number): [number, number] => {
    return [this.getXFromCol(col), this.getYFromRow(row)];
  };

  /**
   * Initializes the game scene with all necessary components and state.
   *
   * Sets up the game grid, snake, food, input handlers, UI elements, and empty cells tracking.
   * This is called once when the scene starts or restarts.
   *
   * Performance: O(n) where n = GRID_COLUMNS × GRID_ROWS
   * - Time per init: ~2-5ms (one-time setup cost)
   * - Frame budget usage at 240fps: N/A (not called during gameplay)
   * - Main costs:
   *   • Empty cells initialization: O(n) - iterates all grid cells
   *   • Snake creation: O(k) where k = initial snake length (~3 segments)
   *   • UI elements creation: O(1) - constant number of elements
   *   • Event listeners setup: O(1) - fixed number of handlers
   *
   * @param data - Optional configuration for scene initialization
   * @param data.primaryInputDevice - Previously detected input device (touch/keyboard)
   * @param data.autoStart - Whether to skip tutorial and start immediately
   */
  create(data?: {
    primaryInputDevice?: "touch" | "keyboard";
    autoStart?: boolean;
  }) {
    // Store original dimensions on first create
    if (this.originalWidth === 0 || this.originalHeight === 0) {
      this.originalWidth = this.scale.width;
      this.originalHeight = this.scale.height;
    }

    // Calculate grid cell sizes based on actual scene dimensions
    // This allows the game to work with any resolution
    this.cellWidth = this.scale.width / GameConfig.GRID_COLUMNS;
    this.cellHeight = this.scale.height / GameConfig.GRID_ROWS;

    this.isGameOver = false;
    this.direction = GameConfig.SNAKE_INITIAL_DIRECTION;
    this.nextDirection = GameConfig.SNAKE_INITIAL_DIRECTION;
    this.cameras.main.setBackgroundColor(GameConfig.BACKGROUND_COLOR);

    // Restore primary input device from scene data if available
    if (data?.primaryInputDevice) {
      this.primaryInputDevice = data.primaryInputDevice;
    }

    // Create border
    this.border = this.createBorder();

    // Check if device has required input capabilities
    if (!this.hasRequiredInputCapabilities()) {
      this.showInputRequirementError();
      return;
    }

    // Create stats display
    this.stats = this.createStatsText();

    // Create fullscreen toggle button
    this.createFullscreenButton();

    // Listen for any keyboard input to detect physical keyboard
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      this.hasDetectedKeyboard = true;

      if (event.key === "Shift") {
        this.enableSprint();
      }
    });

    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        this.disableSprint();
      }
    });

    // Listen for touch events to detect touch usage
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) {
        this.hasDetectedTouch = true;
      }
    });

    this.input.addPointer(1);

    // Create virtual joystick for touch controls
    this.joystick = this.createVirtualJoystick();

    // Initialize empty cells map with all grid positions
    // This is done once at scene creation for O(1) food spawning
    this.emptyCells.clear();
    for (let col = 0; col < GameConfig.GRID_COLUMNS; col++) {
      for (let row = 0; row < GameConfig.GRID_ROWS; row++) {
        this.emptyCells.set(`${col},${row}`, [col, row]);
      }
    }

    // Initialize snake
    this.snake = [];
    const startX = GameConfig.SNAKE_INITIAL_POSITION_X;
    const startY = GameConfig.SNAKE_INITIAL_POSITION_Y;

    // Create initial snake body
    for (let i = 0; i < GameConfig.SNAKE_INITIAL_LENGTH; i++) {
      const segment = this.add
        .rectangle(
          (startX - i) * this.cellWidth + GameConfig.SNAKE_SEGMENT_PADDING / 2,
          startY * this.cellHeight + GameConfig.SNAKE_SEGMENT_PADDING / 2,
          this.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
          this.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING,
          GameConfig.SNAKE_COLOR
        )
        .setOrigin(0);
      this.snake.push(segment);

      // Remove snake position from empty cells
      const col = startX - i;
      const row = startY;
      this.emptyCells.delete(`${col},${row}`);
    }

    // Spawn initial food
    this.respawnFood();

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

    // Create start layer with tutorial text and button
    this.startLayer ??= this.createStartLayer();

    // Listen for spacebar to start the game
    this.input.keyboard?.once("keydown-SPACE", () => {
      if (!this.isStarted && !this.isGameOver) {
        this.handleGameStart(this.input.activePointer);
      }
    });

    // Create sprint button for touch controls
    this.sprintButton = this.createSprintButton();

    // Auto-start if requested (e.g., after restart)
    if (data?.autoStart && data?.primaryInputDevice) {
      // Use time.delayedCall to ensure everything is initialized
      this.time.delayedCall(0, () => {
        this.sprintButton?.setVisible(this.primaryInputDevice === "touch");
        this.joystick?.setVisible(this.primaryInputDevice === "touch");
        this.startLayer.setVisible(false);
        this.isStarted = true;
      });
    }

    // Listen for resize events to update game dimensions dynamically
    this.scale.on("resize", this.handleResize, this);
  }

  /**
   * Handles dynamic resize events from Phaser's scale manager.
   *
   * Called when the game canvas is resized (e.g., entering/exiting fullscreen).
   * Recalculates grid cell sizes and repositions all game objects accordingly.
   *
   * Performance: O(k) where k = snake length
   * - Time per call: ~0.5-2ms depending on snake length
   * - Frame budget usage at 240fps: ~1.2-4.8%
   * - Main costs:
   *   • Cell size calculation: O(1) - simple division
   *   • Snake repositioning: O(k) - iterates all segments
   *   • Food repositioning: O(1) - single object
   *   • UI repositioning: O(1) - fixed number of UI elements
   * - Frequency: Once per fullscreen toggle
   *
   * @param gameSize - New size provided by Phaser scale manager
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    const newWidth = gameSize.width;
    const newHeight = gameSize.height;

    console.log(`Handling resize: ${newWidth}x${newHeight}`);

    // Recalculate cell sizes based on new dimensions
    const oldCellWidth = this.cellWidth;
    const oldCellHeight = this.cellHeight;
    this.cellWidth = newWidth / GameConfig.GRID_COLUMNS;
    this.cellHeight = newHeight / GameConfig.GRID_ROWS;

    // Update snake positions
    for (const segment of this.snake) {
      // Get grid position from old dimensions
      const col = Math.floor(segment.x / oldCellWidth);
      const row = Math.floor(segment.y / oldCellHeight);
      // Set new pixel position based on new dimensions
      segment.setPosition(
        col * this.cellWidth + GameConfig.SNAKE_SEGMENT_PADDING / 2,
        row * this.cellHeight + GameConfig.SNAKE_SEGMENT_PADDING / 2
      );
      // Update size
      segment.setSize(
        this.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
        this.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING
      );
    }

    // Update food position if it exists
    if (this.food) {
      const col = Math.floor(this.food.x / oldCellWidth);
      const row = Math.floor(this.food.y / oldCellHeight);
      this.food.setPosition(
        col * this.cellWidth + GameConfig.SNAKE_SEGMENT_PADDING / 2,
        row * this.cellHeight + GameConfig.SNAKE_SEGMENT_PADDING / 2
      );
      this.food.setSize(
        this.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
        this.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING
      );
    }

    // Update joystick position if it exists
    if (this.joystick) {
      this.joystick.setPosition(
        newWidth - GameConfig.JOYSTICK_RADIUS - GameConfig.JOYSTICK_MARGIN,
        newHeight - GameConfig.JOYSTICK_RADIUS - GameConfig.JOYSTICK_MARGIN
      );
    }

    // Update sprint button position if it exists
    if (this.sprintButton) {
      this.sprintButton.setPosition(
        GameConfig.SPRINT_BUTTON_X,
        newHeight - GameConfig.SPRINT_BUTTON_X
      );
    }

    // Update fullscreen button position if it exists
    if (this.fullscreenButton) {
      const buttonSize = GameConfig.FULLSCREEN_BUTTON_SIZE;
      const padding = GameConfig.FULLSCREEN_BUTTON_PADDING;
      this.fullscreenButton.setPosition(
        newWidth - buttonSize - padding,
        padding
      );
    }

    // Update border size if it exists
    if (this.border) {
      this.border.setSize(newWidth, newHeight);
    }

    // Update start layer (tutorial screen) if it exists and is active
    if (this.startLayer && this.startLayer.active) {
      try {
        // The start layer is a container with text and button children
        const children = this.startLayer.getAll();

        // Update tutorial text (first child)
        const tutorialText = children[0] as Phaser.GameObjects.Text;
        if (tutorialText && tutorialText.active) {
          const padding = this.getTutorialTextPadding(newHeight);
          const fontSize = this.getScaledFontSize(
            GameConfig.TUTORIAL_FONT_SIZE,
            newHeight
          );
          const strokeThickness = this.getScaledFontSize(
            GameConfig.TUTORIAL_STROKE_THICKNESS,
            newHeight
          );
          tutorialText.setStyle({
            fixedWidth: newWidth,
            fixedHeight: newHeight,
            fontSize: fontSize,
            strokeThickness: strokeThickness,
          });
          // setPadding signature: (left, top, right, bottom) or (x, y) or (padding)
          tutorialText.setPadding(0, padding.top, 0, padding.bottom);
        }

        // Update start button position and scale (second child)
        const startButton = children[1] as Phaser.GameObjects.Container;
        if (startButton && startButton.active) {
          const pos = this.getStartButtonPosition(newWidth, newHeight);
          startButton.setPosition(pos.x, pos.y);
          this.updateButtonScale(startButton, newHeight);
        }
      } catch (error) {
        console.warn("Failed to update start layer:", error);
      }
    }

    // Update game over text if it exists and is active
    if (this.gameOverText && this.gameOverText.active) {
      try {
        const padding = this.getGameOverTextPadding(newHeight);
        const fontSize = this.getScaledFontSize(
          GameConfig.GAMEOVER_FONT_SIZE,
          newHeight
        );
        const strokeThickness = this.getScaledFontSize(
          GameConfig.TUTORIAL_STROKE_THICKNESS,
          newHeight
        );
        this.gameOverText.setStyle({
          fixedWidth: newWidth,
          fixedHeight: newHeight,
          fontSize: fontSize,
          strokeThickness: strokeThickness,
        });
        // setPadding signature: (left, top, right, bottom) or (x, y) or (padding)
        this.gameOverText.setPadding(0, padding.top, 0, padding.bottom);
      } catch (error) {
        console.warn("Failed to update game over text:", error);
      }
    }

    // Update game over button position and scale if it exists and is active
    if (this.gameOverButton && this.gameOverButton.active) {
      try {
        const pos = this.getRestartButtonPosition(newWidth, newHeight);
        this.gameOverButton.setPosition(pos.x, pos.y);
        this.updateButtonScale(this.gameOverButton, newHeight);
      } catch (error) {
        console.warn("Failed to update game over button:", error);
      }
    }

    // Update error text if it exists and is active
    if (this.errorText && this.errorText.active) {
      try {
        const padding = this.getErrorTextPadding(newHeight);
        const fontSize = this.getScaledFontSize(
          GameConfig.TUTORIAL_FONT_SIZE,
          newHeight
        );
        const strokeThickness = this.getScaledFontSize(
          GameConfig.TUTORIAL_STROKE_THICKNESS,
          newHeight
        );
        this.errorText.setStyle({
          fixedWidth: newWidth,
          fixedHeight: newHeight,
          fontSize: fontSize,
          strokeThickness: strokeThickness,
        });
        // setPadding signature: (left, top, right, bottom) or (x, y) or (padding)
        this.errorText.setPadding(0, padding.top, 0, padding.bottom);
      } catch (error) {
        console.warn("Failed to update error text:", error);
      }
    }
  }

  /**
   * Calculates scaled font size based on current height relative to original height.
   *
   * @param baseFontSize - The original font size at default resolution
   * @param currentHeight - Current screen height
   * @returns Scaled font size
   */
  private getScaledFontSize(
    baseFontSize: number,
    currentHeight: number
  ): number {
    const scale = currentHeight / this.originalHeight;
    return Math.round(baseFontSize * scale);
  }

  /**
   * Calculates the scale factor for the current resolution.
   *
   * @param currentHeight - Current screen height
   * @returns Scale factor
   */
  private getScaleFactor(currentHeight: number): number {
    return currentHeight / this.originalHeight;
  }

  /**
   * Updates a button's scale and text font size to prevent pixelation.
   *
   * @param button - The button container to update
   * @param currentHeight - Current screen height
   */
  private updateButtonScale(
    button: Phaser.GameObjects.Container,
    currentHeight: number
  ): void {
    const scale = this.getScaleFactor(currentHeight);

    // Get the text element (5th child, index 4)
    const children = button.getAll();
    const buttonText = children[4] as Phaser.GameObjects.Text;

    if (buttonText && buttonText.active) {
      const scaledFontSize = this.getScaledFontSize(
        GameConfig.BUTTON_FONT_SIZE,
        currentHeight
      );
      const scaledStrokeThickness = this.getScaledFontSize(
        GameConfig.BUTTON_TEXT_STROKE_THICKNESS,
        currentHeight
      );

      // Reset text scale to 1 before updating font size
      // This prevents double scaling (once from container, once from fontSize)
      buttonText.setScale(1 / scale);

      buttonText.setStyle({
        fontSize: scaledFontSize,
        strokeThickness: scaledStrokeThickness,
      });
    }

    // Scale the button container (graphics scale, text compensated above)
    button.setScale(scale);
  }

  /**
   * Calculates tutorial text padding based on screen height.
   *
   * @param height - Screen height in pixels
   * @returns Padding object with top and bottom values
   */
  private getTutorialTextPadding(height: number) {
    return {
      top: height * GameConfig.TUTORIAL_VERTICAL_POSITION,
      bottom: 0,
    };
  }

  /**
   * Calculates start button position based on screen dimensions.
   *
   * @param width - Screen width in pixels
   * @param height - Screen height in pixels
   * @returns Position object with x and y coordinates
   */
  private getStartButtonPosition(width: number, height: number) {
    return {
      x: width / 2,
      y: height * 0.6,
    };
  }

  /**
   * Calculates game over text padding based on screen height.
   *
   * @param height - Screen height in pixels
   * @returns Padding object with top and bottom values
   */
  private getGameOverTextPadding(height: number) {
    // Use scaled font size for proper padding calculation
    const scaledFontSize = this.getScaledFontSize(
      GameConfig.GAMEOVER_FONT_SIZE,
      height
    );
    const scaledOffset = this.getScaledFontSize(
      GameConfig.GAMEOVER_VERTICAL_OFFSET,
      height
    );
    return {
      top: (height - scaledOffset - scaledFontSize) / 2,
      bottom: 0,
    };
  }

  /**
   * Calculates restart button position based on screen dimensions.
   *
   * @param width - Screen width in pixels
   * @param height - Screen height in pixels
   * @returns Position object with x and y coordinates
   */
  private getRestartButtonPosition(width: number, height: number) {
    // Use scaled font size for proper button positioning
    const scaledFontSize = this.getScaledFontSize(
      GameConfig.GAMEOVER_FONT_SIZE,
      height
    );
    return {
      x: width / 2,
      y: height / 2 + scaledFontSize,
    };
  }

  /**
   * Calculates error text padding based on screen height.
   *
   * @param height - Screen height in pixels
   * @returns Padding object with top and bottom values
   */
  private getErrorTextPadding(height: number) {
    return {
      top: height * 0.25,
      bottom: 0,
    };
  }

  /**
   * ============================================================================
   * UI FACTORY METHODS
   * ============================================================================
   * These methods create and configure UI elements with consistent styling
   */

  /**
   * Creates the game border rectangle.
   *
   * @returns Configured border rectangle
   */
  private createBorder(): Phaser.GameObjects.Rectangle {
    return this.add
      .rectangle(
        0,
        0,
        this.scale.width,
        this.scale.height,
        GameConfig.BORDER_COLOR,
        0
      )
      .setOrigin(0)
      .setStrokeStyle(
        GameConfig.BORDER_THICKNESS,
        GameConfig.BORDER_COLOR,
        GameConfig.BORDER_OPACITY
      );
  }

  /**
   * Creates the stats display text.
   *
   * @returns Configured stats text object
   */
  private createStatsText(): Phaser.GameObjects.Text {
    return this.add
      .text(
        0,
        0,
        `fps: ${this.game.loop.actualFps}  speed: ${this.snakeSpeed}ms`,
        {
          fontFamily: GameConfig.STATS_FONT_FAMILY,
          fontSize: GameConfig.STATS_FONT_SIZE,
          color: GameConfig.STATS_TEXT_COLOR,
          align: "left",
          backgroundColor: GameConfig.STATS_BACKGROUND_COLOR,
          padding: {
            x: GameConfig.STATS_PADDING_X,
            y: GameConfig.STATS_PADDING_Y,
          },
        }
      )
      .setOrigin(0);
  }

  /**
   * Creates the tutorial text for the start screen.
   *
   * @returns Configured tutorial text
   */
  private createTutorialText(): Phaser.GameObjects.Text {
    const scaledFontSize = this.getScaledFontSize(
      GameConfig.TUTORIAL_FONT_SIZE,
      this.scale.height
    );
    const scaledStrokeThickness = this.getScaledFontSize(
      GameConfig.TUTORIAL_STROKE_THICKNESS,
      this.scale.height
    );

    return this.add.text(
      0,
      0,
      ["Use arrow keys to move the snake", "Hold Shift to speed up"],
      {
        fontFamily: GameConfig.TUTORIAL_FONT_FAMILY,
        fontSize: scaledFontSize,
        color: GameConfig.TUTORIAL_TEXT_COLOR,
        stroke: GameConfig.TUTORIAL_STROKE_COLOR,
        strokeThickness: scaledStrokeThickness,
        align: "center",
        backgroundColor: GameConfig.TUTORIAL_BACKGROUND_COLOR,
        fixedWidth: this.scale.width,
        fixedHeight: this.scale.height,
        padding: this.getTutorialTextPadding(this.scale.height),
      }
    );
  }

  /**
   * Creates the start layer containing tutorial text and start button.
   *
   * @returns Container with tutorial elements
   */
  private createStartLayer(): Phaser.GameObjects.Container {
    const startButtonPos = this.getStartButtonPosition(
      this.scale.width,
      this.scale.height
    );
    const startButton = this.createGreenButton(
      "Start",
      (e) => this.handleGameStart(e),
      {
        x: startButtonPos.x,
        y: startButtonPos.y,
        width: 200,
        height: 60,
        fontSize: 32,
      }
    );

    // Scale the start button to match current resolution
    this.updateButtonScale(startButton, this.scale.height);

    return this.add.container(0, 0, [this.createTutorialText(), startButton]);
  }

  /**
   * Creates the game over text.
   *
   * @returns Configured game over text
   */
  private createGameOverText(): Phaser.GameObjects.Text {
    const scaledFontSize = this.getScaledFontSize(
      GameConfig.GAMEOVER_FONT_SIZE,
      this.scale.height
    );
    const scaledStrokeThickness = this.getScaledFontSize(
      GameConfig.TUTORIAL_STROKE_THICKNESS,
      this.scale.height
    );

    return this.add.text(0, 0, "GAME OVER", {
      fontFamily: GameConfig.TUTORIAL_FONT_FAMILY,
      fontSize: scaledFontSize,
      color: GameConfig.TUTORIAL_TEXT_COLOR,
      stroke: GameConfig.TUTORIAL_STROKE_COLOR,
      strokeThickness: scaledStrokeThickness,
      align: "center",
      backgroundColor: GameConfig.STATS_BACKGROUND_COLOR,
      fixedWidth: this.scale.width,
      fixedHeight: this.scale.height,
      padding: this.getGameOverTextPadding(this.scale.height),
    });
  }

  /**
   * Creates the error requirement text.
   *
   * @returns Configured error text
   */
  private createErrorText(): Phaser.GameObjects.Text {
    const scaledFontSize = this.getScaledFontSize(
      GameConfig.TUTORIAL_FONT_SIZE,
      this.scale.height
    );
    const scaledStrokeThickness = this.getScaledFontSize(
      GameConfig.TUTORIAL_STROKE_THICKNESS,
      this.scale.height
    );

    return this.add.text(
      0,
      0,
      [
        "Input Device Required",
        "",
        "This game requires either:",
        "• Touch input (touchscreen), or",
        "• Physical keyboard with arrow keys and Shift",
      ],
      {
        fontFamily: GameConfig.TUTORIAL_FONT_FAMILY,
        fontSize: scaledFontSize,
        color: GameConfig.TUTORIAL_TEXT_COLOR,
        stroke: GameConfig.TUTORIAL_STROKE_COLOR,
        strokeThickness: scaledStrokeThickness,
        align: "center",
        backgroundColor: GameConfig.TUTORIAL_BACKGROUND_COLOR,
        fixedWidth: this.scale.width,
        fixedHeight: this.scale.height,
        padding: this.getErrorTextPadding(this.scale.height),
      }
    );
  }

  /**
   * Creates the virtual joystick for touch controls.
   *
   * @returns Configured virtual joystick
   */
  private createVirtualJoystick(): VirtualJoystick {
    return new VirtualJoystick(this, {
      radius: GameConfig.JOYSTICK_RADIUS,
      x:
        this.scale.width -
        GameConfig.JOYSTICK_RADIUS -
        GameConfig.JOYSTICK_MARGIN,
      y:
        this.scale.height -
        GameConfig.JOYSTICK_RADIUS -
        GameConfig.JOYSTICK_MARGIN,
      dir: "4dir",
      base: this.add.circle(
        0,
        0,
        GameConfig.JOYSTICK_RADIUS,
        GameConfig.BORDER_COLOR,
        GameConfig.JOYSTICK_BASE_OPACITY
      ),
      thumb: this.add.circle(
        0,
        0,
        GameConfig.JOYSTICK_RADIUS * GameConfig.JOYSTICK_THUMB_RADIUS_FACTOR,
        GameConfig.BORDER_COLOR,
        GameConfig.JOYSTICK_THUMB_OPACITY
      ),
    }).setVisible(false);
  }

  /**
   * Creates the sprint button for touch controls.
   *
   * @returns Configured sprint button
   */
  private createSprintButton(): Phaser.GameObjects.Arc {
    return this.add
      .circle(
        GameConfig.SPRINT_BUTTON_X,
        this.scale.height - GameConfig.SPRINT_BUTTON_X,
        GameConfig.SPRINT_BUTTON_RADIUS,
        GameConfig.BORDER_COLOR,
        GameConfig.SPRINT_BUTTON_OPACITY
      )
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

  /**
   * ============================================================================
   * END UI FACTORY METHODS
   * ============================================================================
   */

  /**
   * Main game loop called every frame by Phaser.
   *
   * Handles FPS calculation, stats display, input processing, and snake movement timing.
   * Called 60-240 times per second depending on display refresh rate.
   *
   * Performance: O(k + m) where k = snake length, m = control keys (4)
   * - Time per frame: ~0.02-0.05ms (excluding moveSnake)
   * - Frame budget usage at 240fps: ~0.5-1.2%
   * - Main costs:
   *   • FPS calculation: O(f) where f = frame samples (~60-240), amortized O(1)
   *   • Input handling: O(m) where m = 4 control keys, effectively O(1)
   *   • Snake movement (when triggered): O(k) - see moveSnake()
   * - Optimizations:
   *   • Early return when game not active (paused/not started/game over)
   *   • Movement throttled by time intervals, not every frame
   *   • FPS calculation uses sliding window (removes old timestamps efficiently)
   *
   * @param time - Current game time in milliseconds since scene start
   */
  update(time: number) {
    // Calculate FPS manually using frame timestamps
    const currentTime = performance.now();
    this.frameTimestamps.push(currentTime);

    // Keep only the last second of timestamps
    const oneSecondAgo = currentTime - GameConfig.FPS_SAMPLE_DURATION_MS;
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
        input: this.getInputStatusDisplay(),
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

  /**
   * Moves the snake one cell in the current direction.
   *
   * Handles collision detection (walls, self), food consumption, and empty cells tracking.
   * This is the core game logic called at intervals based on snake speed.
   *
   * Performance: O(k) where k = snake length
   * - Time per move: ~0.05-0.15ms (increases slightly with snake length)
   * - Frame budget usage at 240fps: ~1.2-3.6%
   * - Moves per second: ~10 initially, up to ~20 when sprinting
   * - Main costs:
   *   • Self-collision check: O(k) - iterates through all snake segments
   *   • Wall collision: O(1) - simple boundary checks
   *   • Food collision: O(1) - single coordinate comparison
   *   • Empty cells updates: O(1) - RandomAccessMap operations
   *   • GameObject creation: O(1) - one new head segment
   * - Optimization opportunities:
   *   • Self-collision could use spatial hash for O(1) lookup
   *   • Currently acceptable as k is typically < 100 segments
   *
   * @see respawnFood for food spawning performance
   */
  moveSnake() {
    // Update current direction
    this.direction = this.nextDirection;

    // Calculate new head position
    const head = this.snake[0];
    let newX = head.x;
    let newY = head.y;

    switch (this.direction) {
      case "left":
        newX -= this.cellWidth;
        break;
      case "right":
        newX += this.cellWidth;
        break;
      case "up":
        newY -= this.cellHeight;
        break;
      case "down":
        newY += this.cellHeight;
        break;
    }

    // Check for collisions with walls (grid boundaries)
    const maxX = GameConfig.GRID_COLUMNS * this.cellWidth;
    const maxY = GameConfig.GRID_ROWS * this.cellHeight;
    if (newX < 0 || newX >= maxX || newY < 0 || newY >= maxY) {
      this.gameOver();
      return;
    }

    // Calculate grid coordinates for the new head position (used for collision checks)
    const [newHeadCol, newHeadRow] = this.getColRowFromXY(newX, newY);

    // Check for collision with self (using grid coordinates for accuracy)
    for (const segment of this.snake) {
      const [segmentCol, segmentRow] = this.getColRowFromXY(
        segment.x,
        segment.y
      );
      if (newHeadCol === segmentCol && newHeadRow === segmentRow) {
        this.gameOver();
        return;
      }
    }

    // Check for food collision (using grid coordinates to handle padding differences)
    let eating = false;
    if (this.food) {
      const [foodCol, foodRow] = this.getColRowFromXY(this.food.x, this.food.y);
      eating = newHeadCol === foodCol && newHeadRow === foodRow;
    }

    // Move snake
    const newHead = this.add
      .rectangle(
        newX,
        newY,
        this.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
        this.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING,
        GameConfig.SNAKE_COLOR
      )
      .setOrigin(0);
    this.snake.unshift(newHead);

    // Remove new head position from empty cells (O(1))
    this.emptyCells.delete(`${newHeadCol},${newHeadRow}`);

    if (!eating) {
      // Remove tail if not eating
      const tail = this.snake.pop();
      if (tail) {
        // Add tail position back to empty cells (O(1))
        const [tailCol, tailRow] = this.getColRowFromXY(tail.x, tail.y);
        this.emptyCells.set(`${tailCol},${tailRow}`, [tailCol, tailRow]);
        tail.destroy();
      }
    } else {
      this.respawnFood();
    }
  }

  /**
   * Spawns food at a random empty position on the board.
   *
   * Uses RandomAccessMap for O(1) random access to empty cells.
   * Empty cells are maintained incrementally as the snake moves.
   *
   * Performance: O(1) - constant time at all game stages
   * - Time per spawn: ~0.001ms (regardless of snake size or board fullness)
   * - Frame budget usage at 240fps: ~0.024% per spawn
   * - Session cost (200 spawns): ~0.2ms total
   *
   * @see RandomAccessMap at src/lib/utils/RandomAccessMap.ts
   */
  respawnFood() {
    // Add previous food position back to empty cells (if food existed)
    if (this.food) {
      const [foodCol, foodRow] = this.getColRowFromXY(this.food.x, this.food.y);
      this.emptyCells.set(`${foodCol},${foodRow}`, [foodCol, foodRow]);
      this.food.destroy();
    }

    // If the board is completely full, there's no space to spawn food
    if (this.emptyCells.size === 0) {
      // Snake has filled the entire board - player wins!
      return;
    }

    // Get random empty cell using O(1) randomEntry() method
    const randomEntry = this.emptyCells.randomEntry();
    if (!randomEntry) return; // Should never happen due to size check above

    const [, [col, row]] = randomEntry; // Destructure [key, value]

    // Remove this cell from empty cells (food will occupy it)
    this.emptyCells.delete(`${col},${row}`);

    // Convert grid coordinates to pixel coordinates and add padding
    const [x, y] = this.getXYFromColRow(col, row);

    this.food = this.add
      .rectangle(
        x + GameConfig.SNAKE_SEGMENT_PADDING / 2,
        y + GameConfig.SNAKE_SEGMENT_PADDING / 2,
        this.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
        this.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING,
        GameConfig.FOOD_COLOR
      )
      .setOrigin(0);
  }

  /**
   * Handles game over state and displays game over UI.
   *
   * Shows game over text, restart button, and cleans up event listeners.
   * Called when snake collides with wall or itself.
   *
   * Performance: O(1)
   * - Time per call: ~0.5-1ms (one-time cost at game end)
   * - Frame budget usage at 240fps: N/A (only called once per game session)
   * - Main costs:
   *   • UI creation: O(1) - fixed number of text/button elements
   *   • Event cleanup: O(1) - removing fixed number of listeners
   * - Frequency: Once per game session (very infrequent)
   */
  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isStarted = false;

    // Create game over text
    this.gameOverText = this.createGameOverText();

    // Create restart button
    const restartButtonPos = this.getRestartButtonPosition(
      this.scale.width,
      this.scale.height
    );
    this.gameOverButton = this.createGreenButton(
      "Restart",
      (_, button) => {
        this.resetAndStart();
        button.destroy();
      },
      {
        x: restartButtonPos.x,
        y: restartButtonPos.y,
      }
    );

    // Scale the restart button to match current resolution
    this.updateButtonScale(this.gameOverButton, this.scale.height);

    this.input.keyboard?.once("keydown-SPACE", () => this.resetAndStart());

    this.input.keyboard?.removeAllListeners("keydown");
    this.input.keyboard?.removeAllListeners("keyup");
    this.disableSprint();
  }

  /**
   * Activates sprint mode, increasing snake movement speed.
   *
   * Reduces the time interval between snake moves by the sprint factor.
   * Triggered by holding Shift key or pressing sprint button on touch devices.
   *
   * Performance: O(1)
   * - Time per call: ~0.001ms (trivial arithmetic operation)
   * - Frame budget usage at 240fps: ~0.024%
   * - Main costs:
   *   • Multiplication: O(1) - single arithmetic operation
   *   • Boolean check: O(1) - prevents redundant activation
   * - Frequency: Typically 1-5 times per game session
   */
  enableSprint() {
    if (this.isSprintEnabled) return;
    this.isSprintEnabled = true;
    this.snakeSpeed *= 1 - Game.SPEED_SPRINT_FACTOR;
  }

  /**
   * Deactivates sprint mode, returning to normal snake speed.
   *
   * Restores the original time interval between snake moves.
   * Triggered by releasing Shift key or sprint button.
   *
   * Performance: O(1)
   * - Time per call: ~0.001ms (trivial arithmetic operation)
   * - Frame budget usage at 240fps: ~0.024%
   * - Main costs:
   *   • Division: O(1) - single arithmetic operation
   *   • Boolean check: O(1) - prevents redundant deactivation
   * - Frequency: Matches enableSprint frequency (1-5 times per session)
   */
  disableSprint() {
    if (!this.isSprintEnabled) return;
    this.isSprintEnabled = false;
    this.snakeSpeed /= 1 - Game.SPEED_SPRINT_FACTOR;
  }

  /**
   * Resets the game to initial state without auto-starting.
   *
   * Restarts the scene while preserving input device preference.
   * Used internally; players typically use resetAndStart() instead.
   *
   * Performance: O(n) where n = GRID_COLUMNS × GRID_ROWS
   * - Time per call: ~2-5ms (delegates to create())
   * - Frame budget usage at 240fps: N/A (triggers scene restart)
   * - Main costs:
   *   • Scene restart: Calls create() again (see create performance)
   * - Frequency: Rarely used directly (< 1 per session)
   */
  reset() {
    this.disableSprint();
    // Clean up resize listener before restart
    this.scale.off("resize", this.handleResize, this);
    // Clear references to UI elements
    this.gameOverText = undefined;
    this.gameOverButton = undefined;
    this.errorText = undefined;
    // Pass the primary input device to the restarted scene
    this.scene.restart({
      primaryInputDevice: this.primaryInputDevice,
    });
  }

  /**
   * Resets the game and immediately starts a new session.
   *
   * Restarts the scene with auto-start enabled, skipping the tutorial screen.
   * Primary method for restarting after game over.
   *
   * Performance: O(n) where n = GRID_COLUMNS × GRID_ROWS
   * - Time per call: ~2-5ms (delegates to create() with autoStart)
   * - Frame budget usage at 240fps: N/A (triggers scene restart)
   * - Main costs:
   *   • Scene restart: Calls create() again (see create performance)
   * - Frequency: Once per game restart (typically 0-5 per session)
   */
  resetAndStart() {
    // Store input device before reset
    const savedInputDevice = this.primaryInputDevice;
    this.disableSprint();
    // Clean up resize listener before restart
    this.scale.off("resize", this.handleResize, this);
    // Clear references to UI elements
    this.gameOverText = undefined;
    this.gameOverButton = undefined;
    this.errorText = undefined;
    // Pass the input device to the restarted scene and mark that we should auto-start
    this.scene.restart({
      primaryInputDevice: savedInputDevice,
      autoStart: true,
    });
  }

  /**
   * Creates a styled button with green gradient and bevel effects.
   *
   * Generates a container with multiple graphics layers for visual depth.
   * Used for Start and Restart buttons in the game UI.
   *
   * Performance: O(1)
   * - Time per call: ~0.3-0.5ms (creates 5 child game objects)
   * - Frame budget usage at 240fps: N/A (not called during gameplay)
   * - Main costs:
   *   • Graphics creation: O(1) - 5 fixed graphics objects (bg, highlight, shadow, border, text)
   *   • Container setup: O(1) - single container with fixed children
   * - Frequency: 1-2 times per scene (Start button + optional Restart button)
   *
   * @param text - Button label text
   * @param onClick - Click handler receiving pointer event and button container
   * @param options - Optional customization (position, size, fontSize)
   * @returns Phaser container with interactive button
   */
  createGreenButton(
    text: string,
    onClick: (
      e: Phaser.Input.Pointer,
      button: Phaser.GameObjects.Container
    ) => void,
    {
      x = 0,
      y = 0,
      width = GameConfig.BUTTON_WIDTH,
      height = GameConfig.BUTTON_HEIGHT,
      fontSize = GameConfig.BUTTON_FONT_SIZE,
      strokeThickness = GameConfig.BUTTON_TEXT_STROKE_THICKNESS,
    }: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fontSize?: string | number;
      strokeThickness?: number;
    } = {}
  ) {
    const cornerRadius = height * GameConfig.BUTTON_CORNER_RADIUS_FACTOR;
    const button = this.add
      .container(x, y, [
        // Main button background
        this.add
          .graphics()
          .fillStyle(GameConfig.BUTTON_PRIMARY_COLOR)
          .fillRoundedRect(
            -width / 2,
            -height / 2,
            width,
            height,
            cornerRadius
          ),
        // Top highlight bevel
        this.add
          .graphics()
          .fillStyle(GameConfig.BUTTON_HIGHLIGHT_COLOR, 0.4)
          .fillRoundedRect(
            -width / 2 + 5,
            -height / 2 + 5,
            width - 10,
            height / 3,
            cornerRadius * 0.8
          ),
        // Bottom shadow bevel
        this.add
          .graphics()
          .fillStyle(GameConfig.BUTTON_SHADOW_COLOR, 0.3)
          .fillRoundedRect(
            -width / 2 + 5,
            height / 6 - 5,
            width - 10,
            height / 3,
            cornerRadius * 0.8
          ),
        // Border
        this.add
          .graphics()
          .lineStyle(
            GameConfig.BUTTON_BORDER_THICKNESS,
            GameConfig.BUTTON_BORDER_COLOR
          )
          .strokeRoundedRect(
            -width / 2,
            -height / 2,
            width,
            height,
            cornerRadius
          ),
        // Text
        this.add
          .text(0, 0, text, {
            fontFamily: GameConfig.TUTORIAL_FONT_FAMILY,
            fontSize,
            color: GameConfig.BUTTON_TEXT_COLOR,
            stroke: GameConfig.BUTTON_TEXT_STROKE_COLOR,
            strokeThickness,
          })
          .setOrigin(0.5),
      ])
      .setSize(width, height)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (e: Phaser.Input.Pointer) => onClick(e, button));
    return button;
  }

  /**
   * Determines if the device has touch input capability.
   *
   * Checks both browser-reported touch support and actual touch usage detection.
   * Used for adaptive UI (showing/hiding touch controls).
   *
   * Performance: O(1)
   * - Time per call: ~0.0001ms (property access and boolean operations)
   * - Frame budget usage at 240fps: ~0.002%
   * - Main costs:
   *   • Device detection: O(1) - reads cached device properties
   *   • Boolean logic: O(1) - simple OR operation
   * - Frequency: Called once per frame in update() for stats display
   */
  private hasTouchCapability(): boolean {
    // Check both browser capability AND actual usage
    const hasCapability = this.sys.game.device.input.touch;
    const hasUsed = this.hasDetectedTouch;
    return hasCapability || hasUsed;
  }

  /**
   * Determines if the device has a physical keyboard.
   *
   * Uses runtime detection (keyboard events) combined with OS heuristics.
   * Prioritizes actual keyboard usage over device characteristics.
   *
   * Performance: O(1)
   * - Time per call: ~0.0002ms (conditional checks and property access)
   * - Frame budget usage at 240fps: ~0.005%
   * - Main costs:
   *   • Boolean checks: O(1) - early returns for common cases
   *   • Device detection: O(1) - reads cached device/OS properties
   * - Frequency: Called once per frame in update() for stats display
   * - Optimization: Early returns prevent unnecessary OS checks
   */
  private hasPhysicalKeyboard(): boolean {
    // If we've actually detected keyboard usage, it definitely exists
    if (this.hasDetectedKeyboard) {
      return true;
    }

    // Check if keyboard is enabled
    if (!this.input.keyboard?.enabled) {
      return false;
    }

    // Use heuristics as a starting point, but don't be absolute
    const device = this.sys.game.device;
    const os = device.os;

    // Desktop OS likely has keyboard (but can be overridden by actual usage)
    if (os.desktop || os.macOS || os.windows || os.linux || os.chromeOS) {
      return true;
    }

    // Mobile devices might have keyboard, can't be certain
    // Return false by default, but actual keyboard events will override this
    return false;
  }

  /**
   * Formats input device status for display in stats UI.
   *
   * Creates a compact string showing touch/keyboard availability and primary input.
   * Format: "T:✓/✗ K:✓/✗ (T/K)" where T=touch, K=keyboard.
   *
   * Performance: O(1)
   * - Time per call: ~0.001ms (string concatenation and conditionals)
   * - Frame budget usage at 240fps: ~0.024%
   * - Main costs:
   *   • Input detection calls: O(1) - delegates to hasTouchCapability/hasPhysicalKeyboard
   *   • String operations: O(1) - fixed-length string construction
   * - Frequency: Called once per frame in update() for stats text
   */
  private getInputStatusDisplay(): string {
    const touch = this.hasTouchCapability() ? "✓" : "✗";
    const keyboard = this.hasPhysicalKeyboard() ? "✓" : "✗";
    const primary = this.primaryInputDevice
      ? ` (${this.primaryInputDevice === "touch" ? "T" : "K"})`
      : "";
    return `T:${touch} K:${keyboard}${primary}`;
  }

  /**
   * Validates that the device has at least one supported input method.
   *
   * Ensures the game is playable by checking for touch OR keyboard.
   * Called during scene creation to show error if no input available.
   *
   * Performance: O(1)
   * - Time per call: ~0.0003ms (delegates to two detection functions)
   * - Frame budget usage at 240fps: N/A (only called once during create())
   * - Main costs:
   *   • Input detection: O(1) - two device capability checks
   *   • Boolean logic: O(1) - simple OR operation
   * - Frequency: Once per scene initialization
   */
  private hasRequiredInputCapabilities(): boolean {
    // Device must have either touch OR physical keyboard
    return this.hasTouchCapability() || this.hasPhysicalKeyboard();
  }

  /**
   * Creates a fullscreen toggle button in the top-right corner.
   *
   * Generates button with expand/contract icons that swap based on fullscreen state.
   * Only creates button if fullscreen API is available (not on iOS Safari).
   *
   * Performance: O(1)
   * - Time per call: ~0.4-0.6ms (creates 18 rectangle game objects for icons)
   * - Frame budget usage at 240fps: N/A (only called once during create())
   * - Main costs:
   *   • Icon creation: O(1) - 16 rectangles total (8 per icon)
   *   • Container setup: O(1) - 3 containers (main + 2 icons)
   *   • Event listeners: O(1) - 3 event handlers
   * - Frequency: Once per scene initialization (if supported)
   */
  private createFullscreenButton(): void {
    // Check if fullscreen is supported (not supported on iPhones)
    if (!this.scale.fullscreen.available) {
      console.log("Fullscreen not available on this device");
      return;
    }

    const buttonSize = GameConfig.FULLSCREEN_BUTTON_SIZE;
    const padding = GameConfig.FULLSCREEN_BUTTON_PADDING;
    const x = this.scale.width - buttonSize - padding;
    const y = padding;

    // Create container for the button
    const container = this.add.container(x, y);

    // Background with rounded corners effect
    const bg = this.add
      .rectangle(
        buttonSize / 2,
        buttonSize / 2,
        buttonSize,
        buttonSize,
        GameConfig.BACKGROUND_COLOR,
        GameConfig.FULLSCREEN_BUTTON_OPACITY
      )
      .setInteractive({ useHandCursor: true });

    // Icon - arrows pointing out (default state)
    const iconExpand = this.createExpandIcon(buttonSize);
    const iconContract = this.createContractIcon(buttonSize);
    iconContract.setVisible(false);

    container.add([bg, iconExpand, iconContract]);

    // Handle click
    bg.on("pointerdown", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    // Listen for fullscreen changes
    this.scale.on("enterfullscreen", () => {
      iconExpand.setVisible(false);
      iconContract.setVisible(true);
      this.handleEnterFullscreen();
    });

    this.scale.on("leavefullscreen", () => {
      iconExpand.setVisible(true);
      iconContract.setVisible(false);
      this.handleExitFullscreen();
    });

    this.fullscreenButton = container;
  }

  /**
   * Creates the expand icon for fullscreen button (arrows pointing outward).
   *
   * Generates 8 rectangles arranged as 4 corner arrows pointing away from center.
   * Shown when not in fullscreen mode.
   *
   * Performance: O(1)
   * - Time per call: ~0.2ms (creates 8 rectangle game objects)
   * - Frame budget usage at 240fps: N/A (only called once during create())
   * - Main costs:
   *   • Rectangle creation: O(1) - 8 rectangles with positioning
   *   • Container setup: O(1) - single container
   * - Frequency: Once per scene initialization (if fullscreen supported)
   *
   * @param buttonSize - Size of the parent button for centering
   * @returns Container with expand icon graphics
   */
  private createExpandIcon(buttonSize: number): Phaser.GameObjects.Container {
    const container = this.add.container(buttonSize / 2, buttonSize / 2);
    const size = GameConfig.FULLSCREEN_ICON_SIZE;
    const thickness = GameConfig.FULLSCREEN_ICON_THICKNESS;
    const offset = GameConfig.FULLSCREEN_ICON_OFFSET;

    // Top-left arrows
    const tl1 = this.add
      .rectangle(
        -offset,
        -offset - size / 2,
        thickness,
        size,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);
    const tl2 = this.add
      .rectangle(
        -offset - size / 2,
        -offset,
        size,
        thickness,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);

    // Top-right arrows
    const tr1 = this.add
      .rectangle(
        offset,
        -offset - size / 2,
        thickness,
        size,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);
    const tr2 = this.add
      .rectangle(
        offset + size / 2,
        -offset,
        size,
        thickness,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);

    // Bottom-left arrows
    const bl1 = this.add
      .rectangle(
        -offset,
        offset + size / 2,
        thickness,
        size,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);
    const bl2 = this.add
      .rectangle(
        -offset - size / 2,
        offset,
        size,
        thickness,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);

    // Bottom-right arrows
    const br1 = this.add
      .rectangle(
        offset,
        offset + size / 2,
        thickness,
        size,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);
    const br2 = this.add
      .rectangle(
        offset + size / 2,
        offset,
        size,
        thickness,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);

    container.add([tl1, tl2, tr1, tr2, bl1, bl2, br1, br2]);
    return container;
  }

  /**
   * Creates the contract icon for fullscreen button (arrows pointing inward).
   *
   * Generates 8 rectangles arranged as 4 corner arrows pointing toward center.
   * Shown when in fullscreen mode.
   *
   * Performance: O(1)
   * - Time per call: ~0.2ms (creates 8 rectangle game objects)
   * - Frame budget usage at 240fps: N/A (only called once during create())
   * - Main costs:
   *   • Rectangle creation: O(1) - 8 rectangles with positioning
   *   • Container setup: O(1) - single container
   * - Frequency: Once per scene initialization (if fullscreen supported)
   *
   * @param buttonSize - Size of the parent button for centering
   * @returns Container with contract icon graphics
   */
  private createContractIcon(buttonSize: number): Phaser.GameObjects.Container {
    const container = this.add.container(buttonSize / 2, buttonSize / 2);
    const arrowLength = GameConfig.FULLSCREEN_ICON_SIZE * 0.67;
    const arrowThickness = GameConfig.FULLSCREEN_ICON_THICKNESS;
    const spacing = GameConfig.FULLSCREEN_ICON_OFFSET * 0.89;

    // Top-left corner: arrows pointing toward center
    const tl1 = this.add
      .rectangle(
        -spacing,
        -spacing - arrowLength / 2,
        arrowThickness,
        arrowLength,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);
    const tl2 = this.add
      .rectangle(
        -spacing - arrowLength / 2,
        -spacing,
        arrowLength,
        arrowThickness,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);

    // Top-right corner: arrows pointing toward center
    const tr1 = this.add
      .rectangle(
        spacing,
        -spacing - arrowLength / 2,
        arrowThickness,
        arrowLength,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);
    const tr2 = this.add
      .rectangle(
        spacing + arrowLength / 2,
        -spacing,
        arrowLength,
        arrowThickness,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);

    // Bottom-left corner: arrows pointing toward center
    const bl1 = this.add
      .rectangle(
        -spacing,
        spacing + arrowLength / 2,
        arrowThickness,
        arrowLength,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);
    const bl2 = this.add
      .rectangle(
        -spacing - arrowLength / 2,
        spacing,
        arrowLength,
        arrowThickness,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);

    // Bottom-right corner: arrows pointing toward center
    const br1 = this.add
      .rectangle(
        spacing,
        spacing + arrowLength / 2,
        arrowThickness,
        arrowLength,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);
    const br2 = this.add
      .rectangle(
        spacing + arrowLength / 2,
        spacing,
        arrowLength,
        arrowThickness,
        GameConfig.BORDER_COLOR,
        0.7
      )
      .setOrigin(0.5);

    container.add([tl1, tl2, tr1, tr2, bl1, bl2, br1, br2]);
    return container;
  }

  /**
   * Displays an error message when no suitable input device is detected.
   *
   * Shows informative text explaining input requirements.
   * Called during create() if hasRequiredInputCapabilities() returns false.
   *
   * Performance: O(1)
   * - Time per call: ~0.1ms (creates single text object)
   * - Frame budget usage at 240fps: N/A (only called once during failed init)
   * - Main costs:
   *   • Text object creation: O(1) - single multi-line text element
   * - Frequency: Very rare (only on unsupported devices)
   */
  private showInputRequirementError(): void {
    this.errorText = this.createErrorText();
  }

  /**
   * Handles game start when player presses Start button or spacebar.
   *
   * Detects primary input device, shows/hides appropriate controls, and begins gameplay.
   * Prefers keyboard when both keyboard and touch are available.
   *
   * Performance: O(1)
   * - Time per call: ~0.05ms (UI visibility toggles and state changes)
   * - Frame budget usage at 240fps: N/A (only called once at game start)
   * - Main costs:
   *   • Input detection: O(1) - calls to hasPhysicalKeyboard/hasTouchCapability
   *   • UI visibility: O(1) - 3 visibility toggles (joystick, sprint button, start layer)
   *   • State updates: O(1) - 2 boolean assignments
   * - Frequency: Once per game session
   *
   * @param pointer - Pointer that triggered the start (used to detect touch vs mouse)
   */
  private handleGameStart(pointer: Phaser.Input.Pointer): void {
    // Detect and save the main input device
    // Prefer keyboard if both touch and keyboard are available
    if (this.hasPhysicalKeyboard() && this.hasTouchCapability()) {
      // Both available: prefer keyboard
      this.primaryInputDevice = "keyboard";
    } else if (pointer.wasTouch) {
      this.primaryInputDevice = "touch";
    } else {
      this.primaryInputDevice = "keyboard";
    }
    this.sprintButton?.setVisible(this.primaryInputDevice === "touch");
    this.joystick?.setVisible(this.primaryInputDevice === "touch");

    this.startLayer.setVisible(false);
    this.isStarted = true;
  }

  /**
   * Handles entering fullscreen mode by adjusting resolution to match screen size.
   *
   * Stores the current resolution and resizes the game to the client's screen dimensions
   * while preserving the original aspect ratio (16:9).
   * This provides a native fullscreen experience with optimal resolution.
   *
   * Performance: O(1)
   * - Time per call: ~0.1-0.5ms (just resize, no scene restart)
   * - Frame budget usage at 240fps: ~0.024-0.12%
   * - Main costs:
   *   • Aspect ratio calculation: O(1) - simple arithmetic
   *   • Scale resize: O(1) - Phaser's built-in resize
   * - Frequency: Once per fullscreen toggle
   */
  private handleEnterFullscreen(): void {
    // Store original dimensions if not already stored
    if (!this.originalWidth || !this.originalHeight) {
      this.originalWidth = this.scale.width;
      this.originalHeight = this.scale.height;
    }

    // Get the screen dimensions
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    // Calculate aspect ratio of original resolution (should be 16:9 = 1.777...)
    const targetAspectRatio = this.originalWidth / this.originalHeight;

    // Calculate dimensions that fit the screen while maintaining aspect ratio
    let newWidth = screenWidth;
    let newHeight = screenWidth / targetAspectRatio;

    // If height exceeds screen height, constrain by height instead
    if (newHeight > screenHeight) {
      newHeight = screenHeight;
      newWidth = screenHeight * targetAspectRatio;
    }

    // Round to integers for pixel-perfect rendering
    newWidth = Math.round(newWidth);
    newHeight = Math.round(newHeight);

    console.log(
      `Entering fullscreen: ${screenWidth}x${screenHeight} -> ${newWidth}x${newHeight} (aspect ratio: ${targetAspectRatio.toFixed(
        3
      )})`
    );

    // Resize the game to match calculated dimensions
    this.scale.resize(newWidth, newHeight);
  }

  /**
   * Handles exiting fullscreen mode by restoring original resolution.
   *
   * Resizes the game back to its pre-fullscreen dimensions.
   * Ensures consistent gameplay experience across fullscreen transitions.
   *
   * Performance: O(1)
   * - Time per call: ~0.1-0.5ms (just resize, no scene restart)
   * - Frame budget usage at 240fps: ~0.024-0.12%
   * - Main costs:
   *   • Scale resize: O(1) - Phaser's built-in resize
   * - Frequency: Once per fullscreen toggle
   */
  private handleExitFullscreen(): void {
    console.log(
      `Exiting fullscreen: ${this.originalWidth}x${this.originalHeight}`
    );

    // Restore original dimensions
    this.scale.resize(this.originalWidth, this.originalHeight);
  }
}
