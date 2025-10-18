# Snake Game Architecture

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                         Game.ts (Main Scene)                     │
│                         680 lines                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┬──────────────┬─────────────┐
         │           │           │              │             │
         ▼           ▼           ▼              ▼             ▼
    ┌────────┐  ┌────────┐  ┌────────┐    ┌────────┐   ┌────────┐
    │ Utils  │  │   UI   │  │ Input  │    │  Game  │   │ Config │
    └────────┘  └────────┘  └────────┘    └────────┘   └────────┘
         │           │           │              │             │
         │           │           │              │             │
         ▼           ▼           ▼              ▼             ▼
```

## Detailed Module Structure

### 1. Utils Layer (Foundation)

```
src/phaser/utils/
├── grid-utils.ts
│   ├── createGridUtils()
│   │   ├── getColFromX()
│   │   ├── getRowFromY()
│   │   ├── getColRowFromXY()
│   │   ├── getXFromCol()
│   │   ├── getYFromRow()
│   │   └── getXYFromColRow()
│   └── Types: GridUtils, GridCoordinates, PixelCoordinates
│
└── scale-utils.ts
    ├── createScaleUtils()
    │   ├── getScaledFontSize()
    │   ├── getScaleFactor()
    │   ├── getTutorialTextPadding()
    │   ├── getStartButtonPosition()
    │   ├── getGameOverTextPadding()
    │   ├── getRestartButtonPosition()
    │   └── getErrorTextPadding()
    └── Types: ScaleUtils
```

**Dependencies**: None (pure functions)  
**Used by**: Game.ts, UI modules

---

### 2. UI Layer (Presentation)

```
src/phaser/ui/
├── button-factory.ts
│   ├── createGreenButton()
│   └── updateButtonScale()
│   Dependencies: scale-utils, game-config
│
├── text-factory.ts
│   ├── createStatsText()
│   ├── createTutorialText()
│   ├── createGameOverText()
│   └── createErrorText()
│   Dependencies: scale-utils, game-config
│
└── fullscreen-button.ts
    ├── createFullscreenButton()
    ├── createExpandIcon() [private]
    └── createContractIcon() [private]
    Dependencies: game-config
```

**Dependencies**: Utils, Config  
**Used by**: Game.ts

---

### 3. Input Layer (Control)

```
src/phaser/input/
├── input-detector.ts
│   ├── createInputDetector()
│   │   ├── hasTouchCapability()
│   │   ├── hasPhysicalKeyboard()
│   │   ├── hasRequiredInputCapabilities()
│   │   ├── getInputStatusDisplay()
│   │   ├── detectPrimaryInput()
│   │   ├── setupDetectionListeners()
│   │   ├── getPrimaryInputDevice()
│   │   └── setPrimaryInputDevice()
│   └── Types: InputDetector, InputDevice
│   Dependencies: None
│
└── control-manager.ts
    ├── createVirtualJoystick()
    ├── createSprintButton()
    ├── createControlKeys()
    └── processControlInput()
    Types: Direction, ControlKey
    Dependencies: game-config, phaser3-rex-plugins
```

**Dependencies**: Config, Phaser  
**Used by**: Game.ts

---

### 4. Game Logic Layer (Core)

```
src/phaser/game/
├── snake-manager.ts
│   ├── createSnake()
│   ├── calculateNewHeadPosition()
│   ├── isWithinBounds()
│   ├── checkSelfCollision()
│   ├── checkFoodCollision()
│   ├── addSnakeHead()
│   ├── removeSnakeTail()
│   └── updateSnakePositions()
│   Dependencies: grid-utils, game-config, RandomAccessMap
│
├── food-manager.ts
│   ├── spawnFood()
│   └── updateFoodPosition()
│   Dependencies: grid-utils, game-config, RandomAccessMap
│
├── fps-tracker.ts
│   ├── createFpsTracker()
│   │   ├── update()
│   │   └── getFps()
│   └── Types: FpsTracker
│   Dependencies: game-config
│
└── fullscreen-manager.ts
    ├── createFullscreenManager()
    │   ├── handleEnterFullscreen()
    │   └── handleExitFullscreen()
    └── Types: FullscreenManager
    Dependencies: None
```

**Dependencies**: Utils, Config  
**Used by**: Game.ts

---

### 5. Configuration Layer

```
src/phaser/config/
└── game-config.ts
    ├── Scene Configuration
    ├── Grid Configuration
    ├── Snake Configuration
    ├── Food Configuration
    ├── UI Configuration
    ├── Touch Controls Configuration
    ├── Tutorial/Start Screen Configuration
    ├── Button Configuration
    ├── Game Over Screen Configuration
    ├── Fullscreen Button Configuration
    └── Performance Configuration
```

**Dependencies**: None  
**Used by**: All modules

---

## Data Flow

### Game Initialization Flow

```
Game.create()
    │
    ├─► initializeDimensions()
    │   └─► Store original width/height
    │
    ├─► initializeUtilities()
    │   ├─► createGridUtils()
    │   ├─► createScaleUtils()
    │   ├─► createInputDetector()
    │   ├─► createFpsTracker()
    │   └─► createFullscreenManager()
    │
    ├─► initializeGameState()
    │   └─► Reset game variables
    │
    ├─► initializeUI()
    │   ├─► Create border
    │   ├─► Check input capabilities
    │   ├─► createStatsText()
    │   └─► createFullscreenButton()
    │
    ├─► initializeInput()
    │   ├─► setupDetectionListeners()
    │   ├─► Setup keyboard listeners
    │   ├─► createVirtualJoystick()
    │   ├─► createControlKeys()
    │   ├─► createStartLayer()
    │   └─► createSprintButton()
    │
    ├─► initializeGrid()
    │   └─► Populate empty cells map
    │
    └─► initializeGameObjects()
        ├─► createSnake()
        └─► spawnFood()
```

### Game Update Flow

```
Game.update(time)
    │
    ├─► updateFps()
    │   └─► fpsTracker.update()
    │
    ├─► updateStats()
    │   ├─► fpsTracker.getFps()
    │   └─► inputDetector.getInputStatusDisplay()
    │
    └─► [if game is active]
        ├─► processControlInput()
        │   └─► Returns new direction or null
        │
        └─► [if time to move]
            └─► moveSnake()
                ├─► calculateNewHeadPosition()
                ├─► isWithinBounds()
                ├─► checkSelfCollision()
                ├─► checkFoodCollision()
                ├─► addSnakeHead()
                └─► [if not eating]
                    └─► removeSnakeTail()
                    [else]
                    └─► spawnFood()
```

### Resize Flow

```
scale.on('resize')
    │
    └─► handleResize(gameSize)
        ├─► Store old cell dimensions
        ├─► createGridUtils() [new dimensions]
        ├─► updateSnakePositions()
        ├─► updateFoodPosition()
        └─► updateUIPositions()
            ├─► Update joystick position
            ├─► Update sprint button position
            ├─► Update fullscreen button position
            ├─► Update border size
            └─► updateTextElements()
                ├─► updateStartLayer()
                ├─► updateGameOverText()
                ├─► updateGameOverButton()
                └─► updateErrorText()
```

## Key Design Patterns

### 1. Factory Pattern

Used for creating utility objects with encapsulated state:

```typescript
const gridUtils = createGridUtils(cellWidth, cellHeight);
const scaleUtils = createScaleUtils(originalWidth, originalHeight);
const inputDetector = createInputDetector(scene);
```

### 2. Dependency Injection

Utilities are passed as parameters to functions that need them:

```typescript
createSnake(scene, gridUtils, emptyCells);
spawnFood(scene, gridUtils, emptyCells, currentFood);
```

### 3. Single Responsibility Principle

Each module has one clear purpose:

- `grid-utils` → Coordinate conversions only
- `snake-manager` → Snake logic only
- `input-detector` → Input detection only

### 4. Composition over Inheritance

Game.ts composes functionality from multiple modules rather than inheriting:

```typescript
class Game extends Phaser.Scene {
  private gridUtils!: GridUtils;
  private scaleUtils!: ScaleUtils;
  private inputDetector!: InputDetector;
  // ... uses these utilities
}
```

## Module Coupling Matrix

|                 | grid-utils | scale-utils | button | text | fullscreen-btn | input-det | control | snake | food | fps | fs-mgr |
| --------------- | ---------- | ----------- | ------ | ---- | -------------- | --------- | ------- | ----- | ---- | --- | ------ |
| **Game.ts**     | ✓          | ✓           | ✓      | ✓    | ✓              | ✓         | ✓       | ✓     | ✓    | ✓   | ✓      |
| **grid-utils**  | -          | ✗           | ✗      | ✗    | ✗              | ✗         | ✗       | ✗     | ✗    | ✗   | ✗      |
| **scale-utils** | ✗          | -           | ✗      | ✗    | ✗              | ✗         | ✗       | ✗     | ✗    | ✗   | ✗      |
| **button**      | ✗          | ✓           | -      | ✗    | ✗              | ✗         | ✗       | ✗     | ✗    | ✗   | ✗      |
| **text**        | ✗          | ✓           | ✗      | -    | ✗              | ✗         | ✗       | ✗     | ✗    | ✗   | ✗      |
| **fullscreen**  | ✗          | ✗           | ✗      | ✗    | -              | ✗         | ✗       | ✗     | ✗    | ✗   | ✗      |
| **input-det**   | ✗          | ✗           | ✗      | ✗    | ✗              | -         | ✗       | ✗     | ✗    | ✗   | ✗      |
| **control**     | ✗          | ✗           | ✗      | ✗    | ✗              | ✗         | -       | ✗     | ✗    | ✗   | ✗      |
| **snake**       | ✓          | ✗           | ✗      | ✗    | ✗              | ✗         | ✗       | -     | ✗    | ✗   | ✗      |
| **food**        | ✓          | ✗           | ✗      | ✗    | ✗              | ✗         | ✗       | ✗     | -    | ✗   | ✗      |
| **fps**         | ✗          | ✗           | ✗      | ✗    | ✗              | ✗         | ✗       | ✗     | ✗    | -   | ✗      |
| **fs-mgr**      | ✗          | ✗           | ✗      | ✗    | ✗              | ✗         | ✗       | ✗     | ✗    | ✗   | -      |

**Legend**: ✓ = depends on, ✗ = no dependency, - = self

**Low coupling**: Most modules have zero dependencies on each other!

## Testing Strategy

### Unit Tests (Recommended)

```typescript
// grid-utils.test.ts
describe("grid-utils", () => {
  test("getColFromX converts pixel to column", () => {
    const gridUtils = createGridUtils(40, 40);
    expect(gridUtils.getColFromX(80)).toBe(2);
  });
});

// snake-manager.test.ts
describe("snake-manager", () => {
  test("checkSelfCollision detects collision", () => {
    const snake = [
      /* mock segments */
    ];
    const result = checkSelfCollision(snake, 5, 5, mockGridUtils);
    expect(result).toBe(true);
  });
});
```

### Integration Tests

```typescript
// Game.integration.test.ts
describe("Game Scene", () => {
  test("snake moves correctly", () => {
    // Test full snake movement cycle
  });

  test("food spawns after eating", () => {
    // Test food respawn logic
  });
});
```

## Performance Characteristics

### Time Complexity by Module

| Module        | Operation          | Complexity     | Notes                  |
| ------------- | ------------------ | -------------- | ---------------------- |
| grid-utils    | All operations     | O(1)           | Simple arithmetic      |
| scale-utils   | All operations     | O(1)           | Simple calculations    |
| snake-manager | createSnake        | O(n)           | n = initial length (3) |
| snake-manager | checkSelfCollision | O(k)           | k = snake length       |
| food-manager  | spawnFood          | O(1)           | Uses RandomAccessMap   |
| fps-tracker   | update             | O(1) amortized | Sliding window         |

### Memory Usage

- **grid-utils**: ~1KB (function closures)
- **empty cells map**: ~10KB (48×27 entries)
- **snake segments**: ~100 bytes × length
- **Total overhead**: < 50KB for all utilities

## Future Architecture Considerations

### Potential Additions

1. **Event System**

   ```
   src/phaser/events/
   └── game-events.ts
       ├── EventEmitter
       └── Event types (FOOD_EATEN, GAME_OVER, etc.)
   ```

2. **State Machine**

   ```
   src/phaser/state/
   └── game-state-machine.ts
       ├── States: MENU, PLAYING, PAUSED, GAME_OVER
       └── Transitions
   ```

3. **Asset Manager**

   ```
   src/phaser/assets/
   └── asset-loader.ts
       ├── Image loading
       ├── Sound loading
       └── Sprite sheet management
   ```

4. **Particle System**
   ```
   src/phaser/effects/
   └── particles.ts
       ├── Food collection effect
       └── Death effect
   ```

## Conclusion

The new architecture provides:

- ✅ **Clear separation of concerns**
- ✅ **Low coupling between modules**
- ✅ **High cohesion within modules**
- ✅ **Easy to test**
- ✅ **Easy to extend**
- ✅ **Type-safe interfaces**
- ✅ **Excellent code organization**
