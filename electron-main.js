const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, 'icon.png'), // Optional: add an icon
        title: 'Game Portal'
    });

    // Load the game portal
    mainWindow.loadFile('index.html');

    // Build menu
    const menu = Menu.buildFromTemplate([
        {
            label: 'Game',
            submenu: [
                {
                    label: 'Game Portal',
                    click: () => {
                        mainWindow.loadFile('index.html');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Pong',
                    click: () => {
                        mainWindow.loadFile(path.join(__dirname, 'games', 'pong', 'index.html'));
                    }
                },
                {
                    label: 'Space Bullet Hell',
                    click: () => {
                        mainWindow.loadFile(path.join(__dirname, 'games', 'space-bullet-hell', 'index.html'));
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'Ctrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Toggle Fullscreen',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// On macOS, re-create window when dock icon is clicked
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});