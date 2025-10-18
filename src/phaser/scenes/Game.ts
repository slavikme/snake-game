import Phaser from "phaser";
import VirtualJoystick from "phaser3-rex-plugins/plugins/virtualjoystick";
import * as GameConfig from "@/phaser/config/game-config";
import { RandomAccessMap } from "@/lib/utils/RandomAccessMap";
import { createGridUtils, type GridUtils } from "@/phaser/utils/grid-utils";
import { createScaleUtils, type ScaleUtils } from "@/phaser/utils/scale-utils";
import {
  createGreenButton,
  updateButtonScale,
} from "@/phaser/ui/button-factory";
import {
  createStatsText,
  createTutorialText,
  createGameOverText,
  createErrorText,
} from "@/phaser/ui/text-factory";
import { createFullscreenButton } from "@/phaser/ui/fullscreen-button";
import {
  createInputDetector,
  type InputDetector,
  type InputDevice,
} from "@/phaser/input/input-detector";
import {
  createVirtualJoystick,
  createSprintButton,
  createControlKeys,
  processControlInput,
  type ControlKey,
  type Direction,
} from "@/phaser/input/control-manager";
import {
  createSnake,
  calculateNewHeadPosition,
  isWithinBounds,
  checkSelfCollision,
  checkFoodCollision,
  addSnakeHead,
  removeSnakeTail,
  updateSnakePositions,
} from "@/phaser/game/snake-manager";
import { spawnFood, updateFoodPosition } from "@/phaser/game/food-manager";
import { createFpsTracker, type FpsTracker } from "@/phaser/game/fps-tracker";
import {
  createFullscreenManager,
  type FullscreenManager,
} from "@/phaser/game/fullscreen-manager";

export class Game extends Phaser.Scene {
  static readonly SPEED_SPRINT_FACTOR = GameConfig.SNAKE_SPRINT_FACTOR;

  // Game objects
  private snake: Phaser.GameObjects.Rectangle[] = [];
  private food: Phaser.GameObjects.Rectangle | undefined;
  private border: Phaser.GameObjects.Rectangle | undefined;

  // Game state
  private direction: Direction = GameConfig.SNAKE_INITIAL_DIRECTION;
  private nextDirection: Direction = GameConfig.SNAKE_INITIAL_DIRECTION;
  private snakeSpeed: number = GameConfig.SNAKE_INITIAL_SPEED;
  private lastMoveTime: number = 0;
  private isGameOver: boolean = false;
  private isPaused: boolean = false;
  private isStarted: boolean = false;
  private isSprintEnabled: boolean = false;

  // UI elements
  private startLayer!: Phaser.GameObjects.Container;
  private stats: Phaser.GameObjects.Text | undefined;
  private gameOverText: Phaser.GameObjects.Text | undefined;
  private gameOverButton: Phaser.GameObjects.Container | undefined;
  private errorText: Phaser.GameObjects.Text | undefined;
  private fullscreenButton: Phaser.GameObjects.Container | undefined;
  private sprintButton: Phaser.GameObjects.Arc | undefined;

  // Input
  private cursorsKeyboard: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private controlKeys: ControlKey[] = [];
  private joystick: VirtualJoystick | undefined;

  // Utilities
  private gridUtils!: GridUtils;
  private scaleUtils!: ScaleUtils;
  private inputDetector!: InputDetector;
  private fpsTracker!: FpsTracker;
  private fullscreenManager!: FullscreenManager;
  private emptyCells: RandomAccessMap<string, [number, number]> =
    new RandomAccessMap();

  // Original dimensions for scaling
  private originalWidth: number = 0;
  private originalHeight: number = 0;

  constructor() {
    super("Game");
  }

  /**
   * Initializes the game scene with all necessary components and state.
   */
  create(data?: { primaryInputDevice?: InputDevice; autoStart?: boolean }) {
    this.initializeDimensions();
    this.initializeUtilities();
    this.initializeGameState(data);
    this.initializeUI();
    this.initializeInput(data);
    this.initializeGrid();
    this.initializeGameObjects();

    // Setup resize listener
    this.scale.on("resize", this.handleResize, this);
  }

  /**
   * Main game loop called every frame by Phaser.
   */
  update(time: number) {
    this.updateFps();
    this.updateStats();

    if (!this.isStarted || this.isPaused || this.isGameOver) return;

    const newDirection = processControlInput(this.controlKeys, this.direction);
    const isDirectionChanged = newDirection !== null;

    if (isDirectionChanged) {
      this.nextDirection = newDirection;
    }

    // Move snake at fixed intervals
    if (isDirectionChanged || time >= this.lastMoveTime + this.snakeSpeed) {
      this.moveSnake();
      this.lastMoveTime = time;
    }

    this.stats?.setToTop();
  }

  /**
   * Initialize original dimensions for scaling calculations.
   */
  private initializeDimensions(): void {
    if (this.originalWidth === 0 || this.originalHeight === 0) {
      this.originalWidth = this.scale.width;
      this.originalHeight = this.scale.height;
    }
  }

  /**
   * Initialize utility objects (grid, scale, input, fps, fullscreen).
   */
  private initializeUtilities(): void {
    this.gridUtils = createGridUtils(
      this.scale.width / GameConfig.GRID_COLUMNS,
      this.scale.height / GameConfig.GRID_ROWS
    );
    this.scaleUtils = createScaleUtils(this.originalWidth, this.originalHeight);
    this.inputDetector = createInputDetector(this);
    this.fpsTracker = createFpsTracker();
    this.fullscreenManager = createFullscreenManager(
      this,
      this.originalWidth,
      this.originalHeight
    );
  }

  /**
   * Initialize game state variables.
   */
  private initializeGameState(data?: {
    primaryInputDevice?: InputDevice;
    autoStart?: boolean;
  }): void {
    this.isGameOver = false;
    this.direction = GameConfig.SNAKE_INITIAL_DIRECTION;
    this.nextDirection = GameConfig.SNAKE_INITIAL_DIRECTION;
    this.cameras.main.setBackgroundColor(GameConfig.BACKGROUND_COLOR);

    // Restore primary input device from scene data if available
    if (data?.primaryInputDevice) {
      this.inputDetector.setPrimaryInputDevice(data.primaryInputDevice);
    }
  }

  /**
   * Initialize UI elements (border, stats, fullscreen button, error checking).
   */
  private initializeUI(): void {
    // Create border
    this.border = this.add
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

    // Check if device has required input capabilities
    if (!this.inputDetector.hasRequiredInputCapabilities()) {
      this.showInputRequirementError();
      return;
    }

    // Create stats display
    this.stats = createStatsText(this);

    // Create fullscreen toggle button
    this.fullscreenButton = createFullscreenButton(
      this,
      this.scale.width,
      () => this.fullscreenManager.handleEnterFullscreen(),
      () => this.fullscreenManager.handleExitFullscreen()
    );
  }

  /**
   * Initialize input handlers (keyboard, touch, joystick, sprint).
   */
  private initializeInput(data?: {
    primaryInputDevice?: InputDevice;
    autoStart?: boolean;
  }): void {
    // Setup input detection listeners
    this.inputDetector.setupDetectionListeners();

    // Setup keyboard listeners for sprint
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

    // Create virtual joystick for touch controls
    this.joystick = createVirtualJoystick(
      this,
      this.scale.width,
      this.scale.height
    );

    // Setup keyboard controls
    this.cursorsKeyboard = this.input.keyboard?.createCursorKeys();
    this.controlKeys = createControlKeys(this.cursorsKeyboard, this.joystick);

    // Create start layer with tutorial text and button
    this.startLayer ??= this.createStartLayer();

    // Listen for spacebar to start the game
    this.input.keyboard?.once("keydown-SPACE", () => {
      if (!this.isStarted && !this.isGameOver) {
        this.handleGameStart(this.input.activePointer);
      }
    });

    // Create sprint button for touch controls
    this.sprintButton = createSprintButton(
      this,
      this.scale.height,
      () => this.enableSprint(),
      () => this.disableSprint()
    );

    // Auto-start if requested (e.g., after restart)
    if (data?.autoStart && data?.primaryInputDevice) {
      this.time.delayedCall(0, () => {
        const isTouchDevice =
          this.inputDetector.getPrimaryInputDevice() === "touch";
        this.sprintButton?.setVisible(isTouchDevice);
        this.joystick?.setVisible(isTouchDevice);
        this.startLayer.setVisible(false);
        this.isStarted = true;
      });
    }
  }

  /**
   * Initialize empty cells grid for O(1) food spawning.
   */
  private initializeGrid(): void {
    this.emptyCells.clear();
    for (let col = 0; col < GameConfig.GRID_COLUMNS; col++) {
      for (let row = 0; row < GameConfig.GRID_ROWS; row++) {
        this.emptyCells.set(`${col},${row}`, [col, row]);
      }
    }
  }

  /**
   * Initialize game objects (snake, food).
   */
  private initializeGameObjects(): void {
    this.snake = createSnake(this, this.gridUtils, this.emptyCells);
    this.food = spawnFood(this, this.gridUtils, this.emptyCells, this.food);
  }

  /**
   * Moves the snake one cell in the current direction.
   */
  private moveSnake(): void {
    this.direction = this.nextDirection;

    const head = this.snake[0];
    const [newX, newY] = calculateNewHeadPosition(
      head,
      this.direction,
      this.gridUtils
    );

    // Check for collisions with walls
    if (!isWithinBounds(newX, newY, this.gridUtils)) {
      this.gameOver();
      return;
    }

    const [newHeadCol, newHeadRow] = this.gridUtils.getColRowFromXY(newX, newY);

    // Check for collision with self
    if (
      checkSelfCollision(this.snake, newHeadCol, newHeadRow, this.gridUtils)
    ) {
      this.gameOver();
      return;
    }

    // Check for food collision
    const eating = checkFoodCollision(
      this.food,
      newHeadCol,
      newHeadRow,
      this.gridUtils
    );

    // Add new head
    addSnakeHead(this, this.snake, newX, newY, this.gridUtils, this.emptyCells);

    if (!eating) {
      // Remove tail if not eating
      removeSnakeTail(this.snake, this.gridUtils, this.emptyCells);
    } else {
      // Respawn food
      this.food = spawnFood(this, this.gridUtils, this.emptyCells, this.food);
    }
  }

  /**
   * Handles game over state and displays game over UI.
   */
  private gameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isStarted = false;

    // Create game over text
    this.gameOverText = createGameOverText(
      this,
      this.scaleUtils,
      this.scale.width,
      this.scale.height
    );

    // Create restart button
    const restartButtonPos = this.scaleUtils.getRestartButtonPosition(
      this.scale.width,
      this.scale.height
    );
    this.gameOverButton = createGreenButton(
      this,
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
    updateButtonScale(this.gameOverButton, this.scale.height, this.scaleUtils);

    this.input.keyboard?.once("keydown-SPACE", () => this.resetAndStart());

    this.input.keyboard?.removeAllListeners("keydown");
    this.input.keyboard?.removeAllListeners("keyup");
    this.disableSprint();
  }

  /**
   * Activates sprint mode, increasing snake movement speed.
   */
  private enableSprint(): void {
    if (this.isSprintEnabled) return;
    this.isSprintEnabled = true;
    this.snakeSpeed *= 1 - Game.SPEED_SPRINT_FACTOR;
  }

  /**
   * Deactivates sprint mode, returning to normal snake speed.
   */
  private disableSprint(): void {
    if (!this.isSprintEnabled) return;
    this.isSprintEnabled = false;
    this.snakeSpeed /= 1 - Game.SPEED_SPRINT_FACTOR;
  }

  /**
   * Resets the game and immediately starts a new session.
   */
  private resetAndStart(): void {
    const savedInputDevice = this.inputDetector.getPrimaryInputDevice();
    this.disableSprint();
    this.cleanupBeforeRestart();
    this.scene.restart({
      primaryInputDevice: savedInputDevice,
      autoStart: true,
    });
  }

  /**
   * Cleans up resources before scene restart.
   */
  private cleanupBeforeRestart(): void {
    this.scale.off("resize", this.handleResize, this);
    this.gameOverText = undefined;
    this.gameOverButton = undefined;
    this.errorText = undefined;
  }

  /**
   * Creates the start layer containing tutorial text and start button.
   */
  private createStartLayer(): Phaser.GameObjects.Container {
    const tutorialText = createTutorialText(
      this,
      this.scaleUtils,
      this.scale.width,
      this.scale.height
    );

    const startButtonPos = this.scaleUtils.getStartButtonPosition(
      this.scale.width,
      this.scale.height
    );
    const startButton = createGreenButton(
      this,
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
    updateButtonScale(startButton, this.scale.height, this.scaleUtils);

    return this.add.container(0, 0, [tutorialText, startButton]);
  }

  /**
   * Displays an error message when no suitable input device is detected.
   */
  private showInputRequirementError(): void {
    this.errorText = createErrorText(
      this,
      this.scaleUtils,
      this.scale.width,
      this.scale.height
    );
  }

  /**
   * Handles game start when player presses Start button or spacebar.
   */
  private handleGameStart(pointer: Phaser.Input.Pointer): void {
    const primaryInput = this.inputDetector.detectPrimaryInput(pointer);
    const isTouchDevice = primaryInput === "touch";

    this.sprintButton?.setVisible(isTouchDevice);
    this.joystick?.setVisible(isTouchDevice);
    this.startLayer.setVisible(false);
    this.isStarted = true;
  }

  /**
   * Updates FPS calculation.
   */
  private updateFps(): void {
    this.fpsTracker.update();
  }

  /**
   * Updates stats display text.
   */
  private updateStats(): void {
    this.stats?.setText(
      Object.entries({
        fps: this.fpsTracker.getFps().toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
        speed: this.snakeSpeed.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
        input: this.inputDetector.getInputStatusDisplay(),
      }).map(([key, value]) => `${key}: ${value}`)
    );
  }

  /**
   * Handles dynamic resize events from Phaser's scale manager.
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    const newWidth = gameSize.width;
    const newHeight = gameSize.height;

    console.log(`Handling resize: ${newWidth}x${newHeight}`);

    // Store old cell dimensions
    const oldCellWidth = this.gridUtils.cellWidth;
    const oldCellHeight = this.gridUtils.cellHeight;

    // Recalculate grid utilities with new dimensions
    this.gridUtils = createGridUtils(
      newWidth / GameConfig.GRID_COLUMNS,
      newHeight / GameConfig.GRID_ROWS
    );

    // Update game objects
    updateSnakePositions(
      this.snake,
      oldCellWidth,
      oldCellHeight,
      this.gridUtils
    );

    if (this.food) {
      updateFoodPosition(
        this.food,
        oldCellWidth,
        oldCellHeight,
        this.gridUtils
      );
    }

    // Update UI positions
    this.updateUIPositions(newWidth, newHeight);
  }

  /**
   * Updates UI element positions after resize.
   */
  private updateUIPositions(newWidth: number, newHeight: number): void {
    // Update joystick position
    if (this.joystick) {
      this.joystick.setPosition(
        newWidth - GameConfig.JOYSTICK_RADIUS - GameConfig.JOYSTICK_MARGIN,
        newHeight - GameConfig.JOYSTICK_RADIUS - GameConfig.JOYSTICK_MARGIN
      );
    }

    // Update sprint button position
    if (this.sprintButton) {
      this.sprintButton.setPosition(
        GameConfig.SPRINT_BUTTON_X,
        newHeight - GameConfig.SPRINT_BUTTON_X
      );
    }

    // Update fullscreen button position
    if (this.fullscreenButton) {
      const buttonSize = GameConfig.FULLSCREEN_BUTTON_SIZE;
      const padding = GameConfig.FULLSCREEN_BUTTON_PADDING;
      this.fullscreenButton.setPosition(
        newWidth - buttonSize - padding,
        padding
      );
    }

    // Update border size
    if (this.border) {
      this.border.setSize(newWidth, newHeight);
    }

    // Update text elements
    this.updateTextElements(newWidth, newHeight);
  }

  /**
   * Updates text element styles and positions after resize.
   */
  private updateTextElements(newWidth: number, newHeight: number): void {
    // Update start layer
    if (this.startLayer && this.startLayer.active) {
      this.updateStartLayer(newWidth, newHeight);
    }

    // Update game over text
    if (this.gameOverText && this.gameOverText.active) {
      this.updateGameOverText(newWidth, newHeight);
    }

    // Update game over button
    if (this.gameOverButton && this.gameOverButton.active) {
      this.updateGameOverButton(newWidth, newHeight);
    }

    // Update error text
    if (this.errorText && this.errorText.active) {
      this.updateErrorText(newWidth, newHeight);
    }
  }

  /**
   * Updates start layer (tutorial screen) after resize.
   */
  private updateStartLayer(newWidth: number, newHeight: number): void {
    try {
      const children = this.startLayer.getAll();

      // Update tutorial text (first child)
      const tutorialText = children[0] as Phaser.GameObjects.Text;
      if (tutorialText && tutorialText.active) {
        const padding = this.scaleUtils.getTutorialTextPadding(newHeight);
        const fontSize = this.scaleUtils.getScaledFontSize(
          GameConfig.TUTORIAL_FONT_SIZE,
          newHeight
        );
        const strokeThickness = this.scaleUtils.getScaledFontSize(
          GameConfig.TUTORIAL_STROKE_THICKNESS,
          newHeight
        );
        tutorialText.setStyle({
          fixedWidth: newWidth,
          fixedHeight: newHeight,
          fontSize: fontSize,
          strokeThickness: strokeThickness,
        });
        tutorialText.setPadding(0, padding.top, 0, padding.bottom);
      }

      // Update start button (second child)
      const startButton = children[1] as Phaser.GameObjects.Container;
      if (startButton && startButton.active) {
        const pos = this.scaleUtils.getStartButtonPosition(newWidth, newHeight);
        startButton.setPosition(pos.x, pos.y);
        updateButtonScale(startButton, newHeight, this.scaleUtils);
      }
    } catch (error) {
      console.warn("Failed to update start layer:", error);
    }
  }

  /**
   * Updates game over text after resize.
   */
  private updateGameOverText(newWidth: number, newHeight: number): void {
    try {
      const padding = this.scaleUtils.getGameOverTextPadding(newHeight);
      const fontSize = this.scaleUtils.getScaledFontSize(
        GameConfig.GAMEOVER_FONT_SIZE,
        newHeight
      );
      const strokeThickness = this.scaleUtils.getScaledFontSize(
        GameConfig.TUTORIAL_STROKE_THICKNESS,
        newHeight
      );
      this.gameOverText!.setStyle({
        fixedWidth: newWidth,
        fixedHeight: newHeight,
        fontSize: fontSize,
        strokeThickness: strokeThickness,
      });
      this.gameOverText!.setPadding(0, padding.top, 0, padding.bottom);
    } catch (error) {
      console.warn("Failed to update game over text:", error);
    }
  }

  /**
   * Updates game over button after resize.
   */
  private updateGameOverButton(newWidth: number, newHeight: number): void {
    try {
      const pos = this.scaleUtils.getRestartButtonPosition(newWidth, newHeight);
      this.gameOverButton!.setPosition(pos.x, pos.y);
      updateButtonScale(this.gameOverButton!, newHeight, this.scaleUtils);
    } catch (error) {
      console.warn("Failed to update game over button:", error);
    }
  }

  /**
   * Updates error text after resize.
   */
  private updateErrorText(newWidth: number, newHeight: number): void {
    try {
      const padding = this.scaleUtils.getErrorTextPadding(newHeight);
      const fontSize = this.scaleUtils.getScaledFontSize(
        GameConfig.TUTORIAL_FONT_SIZE,
        newHeight
      );
      const strokeThickness = this.scaleUtils.getScaledFontSize(
        GameConfig.TUTORIAL_STROKE_THICKNESS,
        newHeight
      );
      this.errorText!.setStyle({
        fixedWidth: newWidth,
        fixedHeight: newHeight,
        fontSize: fontSize,
        strokeThickness: strokeThickness,
      });
      this.errorText!.setPadding(0, padding.top, 0, padding.bottom);
    } catch (error) {
      console.warn("Failed to update error text:", error);
    }
  }
}
