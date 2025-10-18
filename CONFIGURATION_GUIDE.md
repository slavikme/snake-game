# Snake Game - Configuration Guide

This document describes all the configurable constants in the game, making it easy to adjust gameplay, visuals, and layout.

## Centralized Configuration

**All game constants are now located in a single file**: `src/phaser/config/game-config.ts`

This centralized approach makes it easy to:

- Adjust all game settings in one place
- Maintain consistency across all scenes
- Quickly find and modify any configuration value

### Files Using the Config

1. **`src/phaser/config/game-config.ts`** - Centralized configuration (all constants)
2. **`src/components/GameBoardPhaser.tsx`** - Phaser game initialization
3. **`src/phaser/scenes/Game.ts`** - Main game scene
4. **`src/phaser/scenes/Preloader.ts`** - Loading screen

All files import from the config using:

```typescript
import * as GameConfig from "@/phaser/config/game-config";
```

---

## Scene Configuration

All Phaser scenes now use **4K resolution (3840x2160)** with a **16:9 aspect ratio**.

## Configuration Reference (`src/phaser/config/game-config.ts`)

All values below are exported constants that can be easily modified.

### Scene Dimensions

```typescript
const SCENE_WIDTH = 3840; // 4K width
const SCENE_HEIGHT = 2160; // 4K height (16:9 aspect ratio)
```

### Grid Configuration

```typescript
const GRID_COLUMNS = 80; // Number of columns in the grid
const GRID_ROWS = 45; // Number of rows in the grid
```

**How it works:**

- You define how many columns and rows you want in the grid (cells, not pixels)
- The game calculates cell sizes **at runtime** based on actual scene dimensions:
  - `cellWidth = sceneWidth / GRID_COLUMNS`
  - `cellHeight = sceneHeight / GRID_ROWS`
- **Supports dynamic resolution**: The game will adapt to any screen size while maintaining the same 80×45 grid
- Grid cells can be rectangular (different width/height) if scene aspect ratio differs from grid ratio

**Benefits:**

- ✅ Resolution-independent gameplay
- ✅ Same grid layout works on any screen size
- ✅ Automatic adaptation to user's display
- ✅ Easy to change resolution without affecting game balance

For example (3440×1440 with 80×45 grid):

- Grid cell width: 43 pixels (3440 / 80)
- Grid cell height: 32 pixels (1440 / 45)

### Snake Configuration

```typescript
const SNAKE_INITIAL_LENGTH = 3; // Number of segments when game starts
const SNAKE_INITIAL_SPEED = 150; // Time in ms between movements (lower = faster)
const SNAKE_INITIAL_POSITION_X = 5; // Starting X position (in grid units)
const SNAKE_INITIAL_POSITION_Y = 5; // Starting Y position (in grid units)
const SNAKE_INITIAL_DIRECTION = "right"; // Starting direction: "left", "right", "up", "down"
const SNAKE_COLOR = 0x00ff00; // Snake color (green)
const SNAKE_SEGMENT_PADDING = 2; // Padding inside each segment for visual gap
const SNAKE_SPRINT_FACTOR = 0.7; // Speed reduction when sprinting (0.7 = 30% faster)
```

**Note**: Sprint factor works inversely - 0.7 means 70% of the original time, making it 30% faster.

### Food Configuration

```typescript
const FOOD_COLOR = 0xff0000; // Food color (red)
```

### Visual/UI Configuration

```typescript
// Border
const BORDER_COLOR = 0xffffff;
const BORDER_OPACITY = 0.5;
const BORDER_THICKNESS = 1;
const BACKGROUND_COLOR = 0x000000;

// Stats Display (FPS, Speed, Input)
const STATS_FONT_SIZE = 24;
const STATS_FONT_FAMILY = "Arial";
const STATS_TEXT_COLOR = "#ffffff";
const STATS_BACKGROUND_COLOR = "#00000053";
const STATS_PADDING_X = 10;
const STATS_PADDING_Y = 5;
```

### Touch Controls Configuration

```typescript
// Virtual Joystick
const JOYSTICK_RADIUS = 225; // Touch joystick radius
const JOYSTICK_MARGIN = 75; // Distance from screen edge
const JOYSTICK_BASE_OPACITY = 0.05;
const JOYSTICK_THUMB_OPACITY = 0.3;
const JOYSTICK_THUMB_RADIUS_FACTOR = 0.25; // Thumb size relative to base

// Sprint Button
const SPRINT_BUTTON_RADIUS = 450; // Touch sprint button radius
const SPRINT_BUTTON_X = 300; // X position from left edge
const SPRINT_BUTTON_OPACITY = 0.05;
```

The joystick is positioned in the bottom-right corner:

- X: `SCENE_WIDTH - JOYSTICK_RADIUS - JOYSTICK_MARGIN`
- Y: `SCENE_HEIGHT - JOYSTICK_RADIUS - JOYSTICK_MARGIN`

The sprint button is positioned in the bottom-left corner:

- X: `SPRINT_BUTTON_X`
- Y: `SCENE_HEIGHT - SPRINT_BUTTON_X`

### Tutorial/Start Screen Configuration

```typescript
const TUTORIAL_FONT_SIZE = 42;
const TUTORIAL_FONT_FAMILY = "Arial Black";
const TUTORIAL_TEXT_COLOR = "#ffffff";
const TUTORIAL_STROKE_COLOR = "#000000";
const TUTORIAL_STROKE_THICKNESS = 12;
const TUTORIAL_BACKGROUND_COLOR = "#000000aa";
const TUTORIAL_VERTICAL_POSITION = 0.3; // Percentage of screen height
```

### Button Configuration

```typescript
const BUTTON_WIDTH = 300;
const BUTTON_HEIGHT = 90;
const BUTTON_FONT_SIZE = 42;
const BUTTON_PRIMARY_COLOR = 0x22c55e; // Green
const BUTTON_HIGHLIGHT_COLOR = 0x4ade80; // Light green
const BUTTON_SHADOW_COLOR = 0x166534; // Dark green
const BUTTON_BORDER_COLOR = 0x16a34a; // Border green
const BUTTON_BORDER_THICKNESS = 4;
const BUTTON_CORNER_RADIUS_FACTOR = 0.2; // Corner radius as fraction of height
const BUTTON_TEXT_COLOR = "#ffffff";
const BUTTON_TEXT_STROKE_COLOR = "#000000";
const BUTTON_TEXT_STROKE_THICKNESS = 12;
```

### Game Over Screen Configuration

```typescript
const GAMEOVER_FONT_SIZE = 96;
const GAMEOVER_VERTICAL_OFFSET = 150; // Distance from center
```

### Fullscreen Button Configuration

```typescript
const FULLSCREEN_BUTTON_SIZE = 66;
const FULLSCREEN_BUTTON_PADDING = 24;
const FULLSCREEN_BUTTON_OPACITY = 0.5;
const FULLSCREEN_ICON_SIZE = 18;
const FULLSCREEN_ICON_THICKNESS = 3;
const FULLSCREEN_ICON_OFFSET = 9;
```

The fullscreen button is positioned in the top-right corner:

- X: `SCENE_WIDTH - FULLSCREEN_BUTTON_SIZE - FULLSCREEN_BUTTON_PADDING`
- Y: `FULLSCREEN_BUTTON_PADDING`

### Performance Configuration

```typescript
const FPS_SAMPLE_DURATION_MS = 1000; // Time window for FPS calculation
```

---

## Preloader Scene Configuration (`src/phaser/scenes/Preloader.ts`)

```typescript
const SCENE_WIDTH = 3840;
const SCENE_HEIGHT = 2160;
const PROGRESS_BAR_WIDTH = 700;
const PROGRESS_BAR_HEIGHT = 48;
const PROGRESS_BAR_BORDER_WIDTH = 2;
const PROGRESS_BAR_INNER_HEIGHT = 40;
const PROGRESS_BAR_INNER_PADDING = 6;
```

---

## Quick Configuration Examples

### Make the game faster

Change `SNAKE_INITIAL_SPEED` to a lower value:

```typescript
const SNAKE_INITIAL_SPEED = 100; // Was 150, now faster
```

### Change snake starting position

```typescript
const SNAKE_INITIAL_POSITION_X = 40; // Center horizontally (80 columns / 2)
const SNAKE_INITIAL_POSITION_Y = 22; // Center vertically (45 rows / 2)
```

### Change the grid dimensions (fewer/more cells)

```typescript
const GRID_COLUMNS = 60; // Was 80, now fewer columns (larger cells)
const GRID_ROWS = 34; // Was 45, now fewer rows (larger cells)
```

This will result in:

- Grid cell size: 57 pixels (3440 / 60)
- Grid cell height: 42 pixels (1440 / 34)

### Change sprint speed boost

```typescript
const SNAKE_SPRINT_FACTOR = 0.5; // Was 0.7, now 50% faster when sprinting
```

### Adjust button sizes for touch devices

```typescript
const JOYSTICK_RADIUS = 300; // Larger joystick
const SPRINT_BUTTON_RADIUS = 600; // Larger sprint button
```

### Change snake and food colors

```typescript
const SNAKE_COLOR = 0x0000ff; // Blue snake
const FOOD_COLOR = 0xffff00; // Yellow food
```

---

## Notes

- All color values are in hexadecimal format (e.g., `0xff0000` for red)
- All measurements are in pixels unless specified otherwise
- Position calculations are relative to scene dimensions for responsiveness
- The game scales automatically to fit the screen while maintaining aspect ratio
