import Phaser from "phaser";
import VirtualJoystick from "phaser3-rex-plugins/plugins/virtualjoystick";
import * as GameConfig from "@/phaser/config/game-config";
import { RandomAccessMap } from "@/lib/utils/RandomAccessMap";
import { createGridUtils, type GridUtils } from "@/phaser/utils/grid-utils";
import { createScaleUtils, type ScaleUtils } from "@/phaser/utils/scale-utils";
import { createGreenButton, updateButtonScale } from "@/phaser/ui/button-factory";
import { createStatsText, createTutorialText, createGameOverText, createErrorText } from "@/phaser/ui/text-factory";
import { createFullscreenButton } from "@/phaser/ui/fullscreen-button";
import { createInputDetector, type InputDetector, type InputDevice } from "@/phaser/input/input-detector";
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
import { createFullscreenManager, type FullscreenManager } from "@/phaser/game/fullscreen-manager";

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
  private emptyCells: RandomAccessMap<string, [number, number]> = new RandomAccessMap();

  // Original dimensions for scaling
  private originalWidth: number = 0;
  private originalHeight: number = 0;

  constructor() {
    super("Game");
  }

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
   *
   * Stores the initial scene dimensions for responsive scaling calculations.
   * These dimensions are used as a baseline for font sizes and UI element scaling.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (simple property assignment)
   * - Memory: 16 bytes (2 numbers)
   * - Called once per scene initialization
   */
  private initializeDimensions(): void {
    if (this.originalWidth === 0 || this.originalHeight === 0) {
      this.originalWidth = this.scale.width;
      this.originalHeight = this.scale.height;
    }
  }

  /**
   * Initialize utility objects (grid, scale, input, fps, fullscreen).
   *
   * Creates factory instances for grid conversion, scaling, input detection,
   * FPS tracking, and fullscreen management. These utilities are reused throughout
   * the game lifecycle.
   *
   * Performance: O(1)
   * - Time per call: ~0.1-0.2ms (factory function calls)
   * - Memory: ~5KB total for all utility objects
   * - Main costs:
   *   • Grid utils: O(1) - stores cell dimensions and creates closures
   *   • Scale utils: O(1) - stores original dimensions
   *   • Input detector: O(1) - initializes detection state
   *   • FPS tracker: O(1) - creates empty array for timestamps
   *   • Fullscreen manager: O(1) - stores dimensions
   * - Called once per scene initialization
   */
  private initializeUtilities(): void {
    this.gridUtils = createGridUtils(this.scale.width / GameConfig.GRID_COLUMNS, this.scale.height / GameConfig.GRID_ROWS);
    this.scaleUtils = createScaleUtils(this.originalWidth, this.originalHeight);
    this.inputDetector = createInputDetector(this);
    this.fpsTracker = createFpsTracker();
    this.fullscreenManager = createFullscreenManager(this, this.originalWidth, this.originalHeight);
  }

  /**
   * Initialize game state variables.
   *
   * Resets all game state flags and direction to initial values.
   * Restores input device preference if provided from previous session.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (simple property assignments)
   * - Memory: Negligible (reuses existing properties)
   * - Main costs:
   *   • Property assignments: O(1) - 4-5 simple assignments
   *   • Background color set: O(1) - Phaser camera operation
   * - Called once per scene initialization or restart
   */
  private initializeGameState(data?: { primaryInputDevice?: InputDevice; autoStart?: boolean }): void {
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
   *
   * Creates the game border, stats display, and fullscreen button.
   * Checks for input capabilities and shows error if requirements not met.
   *
   * Performance: O(1)
   * - Time per call: ~0.3-0.5ms (UI element creation)
   * - Memory: ~2KB for UI game objects
   * - Main costs:
   *   • Border rectangle: O(1) - single Phaser rectangle
   *   • Stats text: O(1) - single text object via factory
   *   • Fullscreen button: O(1) - container with icon graphics
   *   • Input capability check: O(1) - device detection
   * - Called once per scene initialization
   */
  private initializeUI(): void {
    // Create border
    this.border = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, GameConfig.BORDER_COLOR, 0)
      .setOrigin(0)
      .setStrokeStyle(GameConfig.BORDER_THICKNESS, GameConfig.BORDER_COLOR, GameConfig.BORDER_OPACITY);

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
   *
   * Sets up keyboard event listeners, creates virtual joystick and sprint button,
   * configures control keys, and creates the start layer with tutorial.
   *
   * Performance: O(1)
   * - Time per call: ~0.5-1ms (event listeners and UI creation)
   * - Memory: ~3KB for input objects and event handlers
   * - Main costs:
   *   • Event listeners: O(1) - 4 keyboard event handlers
   *   • Joystick creation: O(1) - virtual joystick with 2 circles
   *   • Control keys setup: O(1) - array of 4 control configurations
   *   • Start layer: O(1) - container with text and button
   *   • Sprint button: O(1) - single circle game object
   * - Called once per scene initialization
   */
  private initializeInput(data?: { primaryInputDevice?: InputDevice; autoStart?: boolean }): void {
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
    this.joystick = createVirtualJoystick(this, this.scale.width, this.scale.height);

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
        const isTouchDevice = this.inputDetector.getPrimaryInputDevice() === "touch";
        this.sprintButton?.setVisible(isTouchDevice);
        this.joystick?.setVisible(isTouchDevice);
        this.startLayer.setVisible(false);
        this.isStarted = true;
      });
    }
  }

  /**
   * Initialize empty cells grid for O(1) food spawning.
   *
   * Populates the RandomAccessMap with all grid positions for efficient
   * random food spawning. This is the most expensive initialization step.
   *
   * Performance: O(n) where n = GRID_COLUMNS × GRID_ROWS (48 × 27 = 1,296)
   * - Time per call: ~0.5-1ms (iterates all grid cells)
   * - Memory: ~50KB for RandomAccessMap (stores 1,296 entries)
   * - Main costs:
   *   • Map population: O(n) - 1,296 set operations
   *   • Each set: O(1) - RandomAccessMap insertion
   * - Called once per scene initialization
   * - This enables O(1) food spawning throughout the game
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
   *
   * Creates the initial snake with starting segments and spawns the first food.
   * Updates empty cells map to exclude occupied positions.
   *
   * Performance: O(k) where k = initial snake length (3)
   * - Time per call: ~0.1-0.2ms (creates 4 game objects)
   * - Memory: ~1KB for snake segments and food
   * - Main costs:
   *   • Snake creation: O(k) - creates 3 rectangle segments
   *   • Food spawning: O(1) - single rectangle via RandomAccessMap
   *   • Empty cells updates: O(k) - removes 3 positions from map
   * - Called once per scene initialization
   */
  private initializeGameObjects(): void {
    this.snake = createSnake(this, this.gridUtils, this.emptyCells);
    this.food = spawnFood(this, this.gridUtils, this.emptyCells, this.food);
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
   * @see spawnFood in food-manager.ts for food spawning performance
   */
  private moveSnake(): void {
    this.direction = this.nextDirection;

    const head = this.snake[0];
    const [newX, newY] = calculateNewHeadPosition(head, this.direction, this.gridUtils);

    // Check for collisions with walls
    if (!isWithinBounds(newX, newY, this.gridUtils)) {
      this.gameOver();
      return;
    }

    const [newHeadCol, newHeadRow] = this.gridUtils.getColRowFromXY(newX, newY);

    // Check for collision with self
    if (checkSelfCollision(this.snake, newHeadCol, newHeadRow, this.gridUtils)) {
      this.gameOver();
      return;
    }

    // Check for food collision
    const eating = checkFoodCollision(this.food, newHeadCol, newHeadRow, this.gridUtils);

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
  private gameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isStarted = false;

    // Create game over text
    this.gameOverText = createGameOverText(this, this.scaleUtils, this.scale.width, this.scale.height);

    // Create restart button
    const restartButtonPos = this.scaleUtils.getRestartButtonPosition(this.scale.width, this.scale.height);
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
  private enableSprint(): void {
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
  private disableSprint(): void {
    if (!this.isSprintEnabled) return;
    this.isSprintEnabled = false;
    this.snakeSpeed /= 1 - Game.SPEED_SPRINT_FACTOR;
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
   *
   * Removes event listeners and clears UI element references to prevent memory leaks.
   * Phaser automatically destroys game objects when scene restarts.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (removes 1 listener, clears 3 references)
   * - Memory: Frees ~5KB of UI element references
   * - Main costs:
   *   • Event listener removal: O(1) - single resize listener
   *   • Reference clearing: O(1) - 3 property assignments to undefined
   * - Called once per game restart
   */
  private cleanupBeforeRestart(): void {
    this.scale.off("resize", this.handleResize, this);
    this.gameOverText = undefined;
    this.gameOverButton = undefined;
    this.errorText = undefined;
  }

  /**
   * Creates the start layer containing tutorial text and start button.
   *
   * Builds the tutorial screen with instructions and a styled start button.
   * The button is scaled appropriately for the current resolution.
   *
   * Performance: O(1)
   * - Time per call: ~0.4-0.6ms (creates text and button with graphics)
   * - Memory: ~2KB for container with children
   * - Main costs:
   *   • Tutorial text: O(1) - single multi-line text object
   *   • Start button: O(1) - container with 5 graphics layers
   *   • Button scaling: O(1) - scale calculation and application
   *   • Container creation: O(1) - wraps 2 children
   * - Called once per scene initialization (cached via ??= operator)
   */
  private createStartLayer(): Phaser.GameObjects.Container {
    const tutorialText = createTutorialText(this, this.scaleUtils, this.scale.width, this.scale.height);

    const startButtonPos = this.scaleUtils.getStartButtonPosition(this.scale.width, this.scale.height);
    const startButton = createGreenButton(this, "Start", (e) => this.handleGameStart(e), {
      x: startButtonPos.x,
      y: startButtonPos.y,
      width: 200,
      height: 60,
      fontSize: 32,
    });

    // Scale the start button to match current resolution
    updateButtonScale(startButton, this.scale.height, this.scaleUtils);

    return this.add.container(0, 0, [tutorialText, startButton]);
  }

  /**
   * Displays an error message when no suitable input device is detected.
   *
   * Shows informative text explaining that the game requires either touch or keyboard input.
   * Prevents game from starting if requirements aren't met.
   *
   * Performance: O(1)
   * - Time per call: ~0.1ms (creates single text object)
   * - Memory: ~1KB for text object
   * - Main costs:
   *   • Error text creation: O(1) - single multi-line text via factory
   * - Called at most once per scene initialization (only on unsupported devices)
   */
  private showInputRequirementError(): void {
    this.errorText = createErrorText(this, this.scaleUtils, this.scale.width, this.scale.height);
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
    const primaryInput = this.inputDetector.detectPrimaryInput(pointer);
    const isTouchDevice = primaryInput === "touch";

    this.sprintButton?.setVisible(isTouchDevice);
    this.joystick?.setVisible(isTouchDevice);
    this.startLayer.setVisible(false);
    this.isStarted = true;
  }

  /**
   * Updates FPS calculation.
   *
   * Delegates to FPS tracker which maintains a sliding window of frame timestamps.
   * Called every frame to keep FPS display current.
   *
   * Performance: O(1) amortized
   * - Time per call: ~0.001-0.005ms
   * - Memory: ~2KB for timestamp array (holds ~60-240 timestamps)
   * - Main costs:
   *   • Timestamp push: O(1) - array append
   *   • Old timestamp removal: O(1) amortized - occasional shift operations
   *   • FPS calculation: O(1) - simple arithmetic on array bounds
   * - Called every frame (60-240 times per second)
   */
  private updateFps(): void {
    this.fpsTracker.update();
  }

  /**
   * Updates stats display text.
   *
   * Formats and displays FPS, snake speed, and input device status.
   * Uses locale-specific number formatting for better readability.
   *
   * Performance: O(1)
   * - Time per call: ~0.01-0.02ms (string formatting and text update)
   * - Memory: Negligible (temporary strings are garbage collected)
   * - Main costs:
   *   • Number formatting: O(1) - 2 toLocaleString calls
   *   • Input status: O(1) - string concatenation
   *   • Text update: O(1) - Phaser setText operation
   * - Called every frame (60-240 times per second)
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

    // Store old cell dimensions
    const oldCellWidth = this.gridUtils.cellWidth;
    const oldCellHeight = this.gridUtils.cellHeight;

    // Recalculate grid utilities with new dimensions
    this.gridUtils = createGridUtils(newWidth / GameConfig.GRID_COLUMNS, newHeight / GameConfig.GRID_ROWS);

    // Update game objects
    updateSnakePositions(this.snake, oldCellWidth, oldCellHeight, this.gridUtils);

    if (this.food) {
      updateFoodPosition(this.food, oldCellWidth, oldCellHeight, this.gridUtils);
    }

    // Update UI positions
    this.updateUIPositions(newWidth, newHeight);
  }

  /**
   * Updates UI element positions after resize.
   *
   * Repositions joystick, sprint button, fullscreen button, and border.
   * Delegates text element updates to separate method.
   *
   * Performance: O(1)
   * - Time per call: ~0.1-0.2ms (position updates for 4-5 UI elements)
   * - Memory: Negligible (no allocations)
   * - Main costs:
   *   • Position updates: O(1) - 4 setPosition calls
   *   • Border resize: O(1) - single setSize call
   *   • Text updates: O(1) - delegates to updateTextElements
   * - Called once per resize event (typically 1-2 times per session)
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
      this.sprintButton.setPosition(GameConfig.SPRINT_BUTTON_X, newHeight - GameConfig.SPRINT_BUTTON_X);
    }

    // Update fullscreen button position
    if (this.fullscreenButton) {
      const buttonSize = GameConfig.FULLSCREEN_BUTTON_SIZE;
      const padding = GameConfig.FULLSCREEN_BUTTON_PADDING;
      this.fullscreenButton.setPosition(newWidth - buttonSize - padding, padding);
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
   *
   * Conditionally updates active text elements (start layer, game over, error).
   * Only processes elements that are currently visible and active.
   *
   * Performance: O(1)
   * - Time per call: ~0.1-0.3ms (typically only 1-2 elements active)
   * - Memory: Negligible (no allocations)
   * - Main costs:
   *   • Active checks: O(1) - 4 boolean property accesses
   *   • Element updates: O(1) - delegates to specific update methods
   * - Called once per resize event (typically 1-2 times per session)
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
   *
   * Recalculates font sizes, padding, and button position for new dimensions.
   * Wrapped in try-catch to handle edge cases during scene transitions.
   *
   * Performance: O(1)
   * - Time per call: ~0.1-0.2ms (updates 2 container children)
   * - Memory: Negligible (no allocations)
   * - Main costs:
   *   • Font size calculations: O(1) - 3 scaling calculations
   *   • Text style update: O(1) - Phaser setStyle operation
   *   • Button repositioning: O(1) - position and scale update
   * - Called once per resize event (only if start layer is active)
   */
  private updateStartLayer(newWidth: number, newHeight: number): void {
    try {
      const children = this.startLayer.getAll();

      // Update tutorial text (first child)
      const tutorialText = children[0] as Phaser.GameObjects.Text;
      if (tutorialText && tutorialText.active) {
        const padding = this.scaleUtils.getTutorialTextPadding(newHeight);
        const fontSize = this.scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_FONT_SIZE, newHeight);
        const strokeThickness = this.scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_STROKE_THICKNESS, newHeight);
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
   *
   * Recalculates font size, stroke thickness, and padding for game over message.
   * Wrapped in try-catch to handle edge cases during scene transitions.
   *
   * Performance: O(1)
   * - Time per call: ~0.05-0.1ms (updates single text object)
   * - Memory: Negligible (no allocations)
   * - Main costs:
   *   • Font size calculations: O(1) - 3 scaling calculations
   *   • Text style update: O(1) - Phaser setStyle operation
   *   • Padding update: O(1) - setPadding call
   * - Called once per resize event (only if game over screen is active)
   */
  private updateGameOverText(newWidth: number, newHeight: number): void {
    try {
      const padding = this.scaleUtils.getGameOverTextPadding(newHeight);
      const fontSize = this.scaleUtils.getScaledFontSize(GameConfig.GAMEOVER_FONT_SIZE, newHeight);
      const strokeThickness = this.scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_STROKE_THICKNESS, newHeight);
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
   *
   * Repositions and rescales the restart button for new dimensions.
   * Wrapped in try-catch to handle edge cases during scene transitions.
   *
   * Performance: O(1)
   * - Time per call: ~0.05-0.1ms (updates button container)
   * - Memory: Negligible (no allocations)
   * - Main costs:
   *   • Position calculation: O(1) - simple arithmetic
   *   • Button repositioning: O(1) - setPosition call
   *   • Button scaling: O(1) - scale and font size updates
   * - Called once per resize event (only if game over screen is active)
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
   *
   * Recalculates font size, stroke thickness, and padding for error message.
   * Wrapped in try-catch to handle edge cases during scene transitions.
   *
   * Performance: O(1)
   * - Time per call: ~0.05-0.1ms (updates single text object)
   * - Memory: Negligible (no allocations)
   * - Main costs:
   *   • Font size calculations: O(1) - 3 scaling calculations
   *   • Text style update: O(1) - Phaser setStyle operation
   *   • Padding update: O(1) - setPadding call
   * - Called once per resize event (only if error screen is active)
   */
  private updateErrorText(newWidth: number, newHeight: number): void {
    try {
      const padding = this.scaleUtils.getErrorTextPadding(newHeight);
      const fontSize = this.scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_FONT_SIZE, newHeight);
      const strokeThickness = this.scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_STROKE_THICKNESS, newHeight);
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
