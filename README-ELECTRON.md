# Game Portal - Electron App

This game portal can run as a standalone desktop application using Electron for better performance.

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

### As Electron App (Recommended for better performance)
```bash
npm start
```

### As Web Server (Original method)
```bash
npm run server
```
Then open http://localhost:3000 in your browser.

## Building Executables

### Windows
```bash
npm run build-win
```

### macOS
```bash
npm run build-mac
```

### Linux
```bash
npm run build-linux
```

Built executables will be in the `dist` folder.

## Features

- **Better Performance**: Runs as a native app without browser overhead
- **Menu Bar**: Quick access to games via File menu
- **Fullscreen**: Press F11 to toggle fullscreen mode
- **Developer Tools**: Press Ctrl+Shift+I (Cmd+Alt+I on Mac) to debug

## Games Included

1. **Pong** - Classic arcade game with boost mechanics
2. **Space Bullet Hell** - Dodge bullets and defeat enemies in space

## Controls

### Pong
- Player 1: W/S keys, Q boost
- Player 2: Arrow Up/Down, Shift boost

### Space Bullet Hell
- Move: Arrow Keys or WASD
- Shoot: Space
- Pause: P