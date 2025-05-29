# Game Portal

A collection of HTML5/JavaScript games that can run both as web applications and as a desktop Electron app. The portal serves as a central hub for accessing individual games with a clean, modern interface.

![Game Portal](https://img.shields.io/badge/games-4-blue) ![Platform](https://img.shields.io/badge/platform-web%20%7C%20desktop-green) ![License](https://img.shields.io/badge/license-MIT-yellow)

## 🎮 Featured Games

- **🏓 Pong** - Classic arcade game with boost mechanics and modern controls
- **🚀 Space Bullet Hell** - Top-down shooter with controller support, health bars, and particle effects
- **🧛 Twilight Runner** - Themed runner game where Edward carries Bella through the forest
- **⚾ Twilight Baseball** - Sports game featuring vampires vs werewolves baseball showdown

## 🚀 Getting Started

### Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd PB
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## 🎯 How to Run

You can run the Game Portal in two ways:

### Option 1: Desktop App (Recommended)
Run as an Electron desktop application for the best performance:

```bash
npm start
```

This will launch the Game Portal in a native desktop window with:
- Native desktop performance
- Menu bar navigation between games  
- Fullscreen toggle (F11)
- Developer tools access (Ctrl+Shift+I)

### Option 2: Web Server
Run as a web application in your browser:

```bash
npm run server
```

Then open your browser and navigate to: `http://localhost:3000`

## 🎮 Game Controls

### Universal Controls
- **Keyboard**: Arrow keys, WASD for movement
- **Controller**: Full gamepad support (Xbox/PlayStation controllers)
- **Pause**: P key or START button on controller

### Space Bullet Hell Specific
- **Shooting**: Space bar, A, X, RT, or RB buttons
- **Movement**: Arrow keys, WASD, left stick, or D-pad
- **Pause**: P key or START button

### Pong Specific  
- **Player 1**: W/S keys or Up/Down arrows
- **Player 2**: Up/Down arrow keys
- **Boost**: Hold for speed boost (limited energy)

## 🔧 Building Executables

Create standalone executable files for distribution:

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

Built executables will be available in the `dist/` folder.

## 🛠️ Development

### Project Structure
```
PB/
├── index.html              # Main portal page
├── server.js              # Web server for browser mode
├── electron-main.js       # Electron main process
├── audio-utils.js         # Shared audio management
├── games/                 # Individual game directories
│   ├── pong/
│   ├── space-bullet-hell/
│   ├── twilight-runner/
│   └── twilight-baseball/
└── package.json           # Project dependencies and scripts
```

### Adding New Games
1. Create a new directory in `games/`
2. Add `index.html`, game logic, and styles
3. Update the main `index.html` to include your game card
4. Follow the existing game patterns for consistency

### Game Development Guidelines
- Use `requestAnimationFrame` for smooth 60fps rendering
- Implement both keyboard and gamepad controls
- Include pause functionality
- Use the shared `audio-utils.js` for sound management
- Follow canvas-based rendering with emoji graphics

## 🎵 Audio Features

Games include integrated audio management with:
- Sound effects for actions (shooting, explosions, power-ups)
- Background music support
- Volume controls with localStorage persistence
- Mute/unmute functionality

## 📋 Features

### Game Portal
- ✅ Grid-based game navigation
- ✅ Responsive design
- ✅ Hover effects and animations
- ✅ Clean, modern UI

### Individual Games
- ✅ Canvas-based graphics
- ✅ Gamepad controller support  
- ✅ Keyboard controls
- ✅ Pause/resume functionality
- ✅ Audio management
- ✅ Particle effects
- ✅ Health/progress bars
- ✅ Local storage for settings

### Technical Features
- ✅ Dual runtime (web + desktop)
- ✅ Cross-platform executable building
- ✅ Developer tools integration
- ✅ Hot reload for development

## 🐛 Troubleshooting

### Game not loading
- Ensure all dependencies are installed: `npm install`
- Check that you're running from the correct directory
- Try clearing browser cache if using web mode

### Controller not detected
- Ensure controller is connected before starting the game
- Try reconnecting the controller
- Check browser controller support (Chrome/Firefox recommended)

### Audio not working
- Check browser audio permissions
- Ensure volume is not muted in game settings
- Try refreshing the page/restarting the app

### Performance issues
- Use desktop mode (`npm start`) for better performance
- Close other browser tabs when using web mode
- Check system resources if running multiple games

## 📄 License

This project is licensed under the MIT License - see the package.json file for details.

## 🤝 Contributing

Feel free to contribute by:
- Adding new games
- Improving existing games
- Fixing bugs
- Enhancing the portal interface
- Adding new features

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Ensure you have the latest Node.js version
3. Try reinstalling dependencies: `rm -rf node_modules && npm install`
4. Check the browser console for error messages

---

**Enjoy gaming! 🎮**