// ============================================================================
// PHASER SNAKE GAME - CENTRALIZED CONFIGURATION
// ============================================================================
// All game constants in one place for easy configuration and maintenance

// ============================================================================
// SCENE CONFIGURATION
// ============================================================================

// Scene dimensions
export const DEFAULT_SCENE_WIDTH = 1920;
export const DEFAULT_SCENE_HEIGHT = 1080;

// ============================================================================
// GRID CONFIGURATION
// ============================================================================

// Grid dimensions are defined in cells, not pixels
// This allows the game to scale to any resolution while maintaining the same gameplay grid
// Calculate grid dimensions to create square cells
// Based on scene dimensions (1920x1080), we want ~50 columns
// Cell size = 1920 / 50 = 38.4, round to 40 for clean division
// Columns: 1920 / 40 = 48
// Rows: 1080 / 40 = 27
export const GRID_COLUMNS = 48; // Number of columns in the grid (creates 40px cells)
export const GRID_ROWS = 27; // Number of rows in the grid (creates 40px cells)

// Note: Grid cell sizes (width/height) are calculated at runtime based on actual scene dimensions
// This allows dynamic resolution changes without changing gameplay

// ============================================================================
// SNAKE CONFIGURATION
// ============================================================================

export const SNAKE_INITIAL_LENGTH = 3; // Number of segments when game starts
export const SNAKE_INITIAL_SPEED = 150; // Time in ms between snake movements
export const SNAKE_INITIAL_POSITION_X = 5; // Starting X position in grid units
export const SNAKE_INITIAL_POSITION_Y = 5; // Starting Y position in grid units
export const SNAKE_INITIAL_DIRECTION = "right"; // Starting direction: "left", "right", "up", "down"
export const SNAKE_COLOR = 0x00ff00; // Snake color (green)
export const SNAKE_SEGMENT_PADDING = ((GRID_COLUMNS + GRID_ROWS) / 2) * 0.05; // Padding inside each segment for visual gap
export const SNAKE_SPRINT_FACTOR = 0.7; // Speed reduction when sprinting (0.7 = 30% faster)

// ============================================================================
// FOOD CONFIGURATION
// ============================================================================

export const FOOD_COLOR = 0xff0000; // Food color (red)

// ============================================================================
// UI CONFIGURATION
// ============================================================================

// Border
export const BORDER_COLOR = 0xffffff;
export const BORDER_OPACITY = 0.5;
export const BORDER_THICKNESS = 1;
export const BACKGROUND_COLOR = 0x000000;

// Stats display (FPS, Speed, Input)
export const STATS_FONT_SIZE = 24;
export const STATS_FONT_FAMILY = "Arial";
export const STATS_TEXT_COLOR = "#ffffff";
export const STATS_BACKGROUND_COLOR = "#00000053";
export const STATS_PADDING_X = 10;
export const STATS_PADDING_Y = 5;

// ============================================================================
// TOUCH CONTROLS CONFIGURATION
// ============================================================================

// Virtual Joystick
export const JOYSTICK_RADIUS = 225; // Touch joystick radius
export const JOYSTICK_MARGIN = 75; // Distance from screen edge
export const JOYSTICK_BASE_OPACITY = 0.05;
export const JOYSTICK_THUMB_OPACITY = 0.3;
export const JOYSTICK_THUMB_RADIUS_FACTOR = 0.25; // Thumb size relative to base radius

// Sprint button
export const SPRINT_BUTTON_RADIUS = 450; // Touch sprint button radius
export const SPRINT_BUTTON_X = 300; // X position from left edge
export const SPRINT_BUTTON_OPACITY = 0.05;

// ============================================================================
// TUTORIAL/START SCREEN CONFIGURATION
// ============================================================================

export const TUTORIAL_FONT_SIZE = 42;
export const TUTORIAL_FONT_FAMILY = "Arial Black";
export const TUTORIAL_TEXT_COLOR = "#ffffff";
export const TUTORIAL_STROKE_COLOR = "#000000";
export const TUTORIAL_STROKE_THICKNESS = 12;
export const TUTORIAL_BACKGROUND_COLOR = "#000000aa";
export const TUTORIAL_VERTICAL_POSITION = 0.3; // Percentage of screen height

// ============================================================================
// BUTTON CONFIGURATION
// ============================================================================

export const BUTTON_WIDTH = 200;
export const BUTTON_HEIGHT = 60;
export const BUTTON_FONT_SIZE = 32;
export const BUTTON_PRIMARY_COLOR = 0x22c55e; // Green
export const BUTTON_HIGHLIGHT_COLOR = 0x4ade80; // Light green
export const BUTTON_SHADOW_COLOR = 0x166534; // Dark green
export const BUTTON_BORDER_COLOR = 0x16a34a; // Border green
export const BUTTON_BORDER_THICKNESS = 4;
export const BUTTON_CORNER_RADIUS_FACTOR = 0.2; // Corner radius as fraction of height
export const BUTTON_TEXT_COLOR = "#ffffff";
export const BUTTON_TEXT_STROKE_COLOR = "#000000";
export const BUTTON_TEXT_STROKE_THICKNESS = 8;

// ============================================================================
// GAME OVER SCREEN CONFIGURATION
// ============================================================================

export const GAMEOVER_FONT_SIZE = 96;
export const GAMEOVER_VERTICAL_OFFSET = 150; // Distance from center

// ============================================================================
// FULLSCREEN BUTTON CONFIGURATION
// ============================================================================

export const FULLSCREEN_BUTTON_SIZE = 66;
export const FULLSCREEN_BUTTON_PADDING = 24;
export const FULLSCREEN_BUTTON_OPACITY = 0.5;
export const FULLSCREEN_ICON_SIZE = 18;
export const FULLSCREEN_ICON_THICKNESS = 3;
export const FULLSCREEN_ICON_OFFSET = 9;

// ============================================================================
// PERFORMANCE CONFIGURATION
// ============================================================================

export const FPS_SAMPLE_DURATION_MS = 1000; // Time window for FPS calculation

// ============================================================================
// PRELOADER CONFIGURATION
// ============================================================================

export const PROGRESS_BAR_WIDTH = 700;
export const PROGRESS_BAR_HEIGHT = 48;
export const PROGRESS_BAR_BORDER_WIDTH = 2;
export const PROGRESS_BAR_INNER_HEIGHT = 40;
export const PROGRESS_BAR_INNER_PADDING = 6;
