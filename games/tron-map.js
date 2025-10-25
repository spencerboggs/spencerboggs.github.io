// Tron Runner Map Data
// Format: [x, y, width, height, type, color]
// Types: 'barrier', 'wall_h', 'wall_v', 'corner'
// Colors: neon colors for different sections

const tronMap = [
    // Section 1: Easy obstacles (0-1000) - Light obstacles
    [500, 200, 30, 30, 'barrier', '#ff0080'],
    [800, 150, 30, 30, 'barrier', '#ff4000'],
    [1200, 300, 30, 30, 'barrier', '#ff8000'],
    
    // Section 2: Medium obstacles (1000-2000) - More obstacles
    [1500, 100, 30, 30, 'barrier', '#ffff00'],
    [1800, 250, 30, 30, 'barrier', '#80ff00'],
    [2200, 180, 30, 30, 'barrier', '#00ff80'],
    [2500, 50, 200, 20, 'wall_h', '#00ffff'],
    [2800, 300, 20, 100, 'wall_v', '#0080ff'],
    
    // Section 3: Hard obstacles (2000-3000) - Walls and barriers
    [3200, 100, 30, 30, 'barrier', '#8000ff'],
    [3500, 200, 30, 30, 'barrier', '#ff00ff'],
    [3800, 150, 30, 30, 'barrier', '#ff0080'],
    [4100, 50, 150, 20, 'wall_h', '#ff4000'],
    [4400, 250, 20, 120, 'wall_v', '#ff8000'],
    [4700, 100, 100, 20, 'wall_h', '#ffff00'],
    
    // Section 4: Very hard obstacles (3000-4000) - Complex patterns
    [5000, 50, 30, 30, 'barrier', '#80ff00'],
    [5300, 200, 30, 30, 'barrier', '#00ff80'],
    [5600, 150, 30, 30, 'barrier', '#00ffff'],
    [5900, 100, 200, 20, 'wall_h', '#0080ff'],
    [6200, 250, 20, 100, 'wall_v', '#8000ff'],
    [6500, 50, 30, 30, 'barrier', '#ff00ff'],
    [6800, 200, 30, 30, 'barrier', '#ff0080'],
    [7100, 150, 30, 30, 'barrier', '#ff4000'],
    [7400, 100, 150, 20, 'wall_h', '#ff8000'],
    [7700, 250, 20, 80, 'wall_v', '#ffff00'],
    
    // Section 5: Extreme obstacles (4000-5000) - Dense patterns
    [8000, 50, 30, 30, 'barrier', '#80ff00'],
    [8300, 200, 30, 30, 'barrier', '#00ff80'],
    [8600, 150, 30, 30, 'barrier', '#00ffff'],
    [8900, 100, 30, 30, 'barrier', '#0080ff'],
    [9200, 250, 30, 30, 'barrier', '#8000ff'],
    [9500, 50, 200, 20, 'wall_h', '#ff00ff'],
    [9800, 200, 20, 100, 'wall_v', '#ff0080'],
    [10100, 150, 30, 30, 'barrier', '#ff4000'],
    [10400, 100, 30, 30, 'barrier', '#ff8000'],
    [10700, 250, 30, 30, 'barrier', '#ffff00'],
    [11000, 50, 150, 20, 'wall_h', '#80ff00'],
    [11300, 200, 20, 80, 'wall_v', '#00ff80'],
    [11600, 150, 30, 30, 'barrier', '#00ffff'],
    [11900, 100, 30, 30, 'barrier', '#0080ff'],
    [12200, 250, 30, 30, 'barrier', '#8000ff'],
    [12500, 50, 200, 20, 'wall_h', '#ff00ff']
];
