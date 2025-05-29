# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Game Portal containing multiple HTML5/JavaScript games that can run both as web applications and as a desktop Electron app. The portal serves as a central hub for accessing individual games.

## Architecture

- **Portal Structure**: Main `index.html` serves as game launcher with grid-based navigation
- **Individual Games**: Each game is self-contained in `games/[game-name]/` directories with their own `index.html`, game logic, and styles
- **Dual Runtime**: Can run as web server (`server.js`) or Electron desktop app (`electron-main.js`)

### Game Structure
Each game follows the pattern:
- `index.html` - Game UI and canvas setup
- `game.js` - Core game logic, rendering, and input handling  
- `style.css` - Game-specific styling

### Current Games
- **Pong**: Classic arcade game with boost mechanics
- **Space Bullet Hell**: Top-down shooter with controller support, health bars, and particle effects
- **Twilight Runner**: Themed runner game
- **Twilight Baseball**: Sports game with vampire/werewolf theme

## Development Commands

### Running the Application
```bash
# As Electron desktop app (recommended for performance)
npm start

# As web server on http://localhost:3000
npm run server
```

### Building Executables
```bash
# Windows
npm run build-win

# macOS  
npm run build-mac

# Linux
npm run build-linux
```

Built executables will be in the `dist/` folder.

### Installation
```bash
npm install
```

## Game Development Patterns

### Input Handling
- Keyboard events using `addEventListener('keydown'/'keyup')`
- Controller support via Gamepad API (implemented in Space Bullet Hell)
- Multiple input methods should be supported simultaneously

### Game Loop Structure
- `requestAnimationFrame` for smooth 60fps rendering
- Separate update/render phases
- Game state management (running, paused, game over)

### Visual Effects
- Particle systems for explosions and impacts
- Health/shield bars with color-coded states
- Canvas-based rendering with emoji graphics

### Controller Integration
Games should support:
- Movement via left stick or D-pad
- Action buttons (A, X, RT, RB for shooting)
- START button for pause/unpause
- Visual indicators when controller connected

## Electron Integration

The Electron app provides:
- Native desktop performance
- Menu bar navigation between games
- Fullscreen toggle (F11)
- Developer tools access (Ctrl+Shift+I)
- Cross-platform executable building

## File Organization

- Root level: Portal infrastructure and Electron setup
- `games/*/`: Individual game directories
- `dist/`: Built executable outputs (generated)
- `node_modules/`: Dependencies (generated)

## Development Workflow

- **Commit Between Changes**: Always create git commits between significant changes to maintain clear version history and enable easy rollback if needed