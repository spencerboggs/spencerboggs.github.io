// Canvas Setup
const canvas = document.getElementById('galleryCanvas');
const context = canvas.getContext('2d');

// Set canvas size to take up full available space
function resizeCanvas() {
    const headerHeight = 100; // Approximate header height
    const infoHeight = 100; // Approximate info panel height
    const controlsHeight = 60; // Controls height
    const padding = 20; // Padding around canvas
    
    const availableWidth = window.innerWidth - (padding * 2);
    const availableHeight = window.innerHeight - headerHeight - infoHeight - controlsHeight - (padding * 2);
    
    // Set canvas dimensions to fill available space
    canvas.width = availableWidth;
    canvas.height = availableHeight;
}

// Initial resize
resizeCanvas();

// Resize on window resize
window.addEventListener('resize', resizeCanvas);

// Game Settings
const playerSpeed = 8;
let currentRoom = 0;
let roomData = [];
let maxRooms = 0;
let lastRoom = -1; // Track room changes

// Load gallery data from JSON
async function loadGalleryData() {
    // Use embedded data that was working
    console.log('Loading embedded gallery data...');
    roomData = [
        {
            name: "Room 1",
            description: "Welcome to my awesome gallery. Take a look around the rooms at all of my favorite photos! If you want to see a photo more clearly, just click on it.",
            backgroundColor: "#f0f8f0",
            images: [
                { filename: "photo31.jpg", description: "Photo 31 description" },
                { filename: "photo10.jpg", description: "Photo 10 description" },
                { filename: "photo52.jpg", description: "Photo 52 description" }
            ]
        },
        {
            name: "Room 2",
            description: "",
            backgroundColor: "#f5f5f5",
            images: [
                { filename: "photo7.jpg", description: "Photo 7 description" },
                { filename: "photo89.jpg", description: "Photo 89 description" },
                { filename: "photo15.jpg", description: "Photo 15 description" }
            ]
        },
        {
            name: "Room 3",
            backgroundColor: "#f8f8f8",
            images: [
                { filename: "photo43.jpg", description: "Photo 43 description" },
                { filename: "photo21.jpg", description: "Photo 21 description" },
                { filename: "photo67.jpg", description: "Photo 67 description" }
            ]
        },
        {
            name: "Room 4",
            backgroundColor: "#f0f0f8",
            images: [
                { filename: "photo84.jpg", description: "Photo 84 description" },
                { filename: "photo3.jpg", description: "Photo 3 description" },
                { filename: "photo91.jpg", description: "Photo 91 description" }
            ]
        },
        {
            name: "Room 5",
            backgroundColor: "#f8f8f0",
            images: [
                { filename: "photo56.jpg", description: "Photo 56 description" },
                { filename: "photo18.jpg", description: "Photo 18 description" },
                { filename: "photo74.jpg", description: "Photo 74 description" }
            ]
        },
        {
            name: "Room 6",
            backgroundColor: "#f5f0f5",
            images: [
                { filename: "photo29.jpg", description: "Photo 29 description" },
                { filename: "photo76.jpg", description: "Photo 76 description" },
                { filename: "photo5.jpg", description: "Photo 5 description" }
            ]
        },
        {
            name: "Room 7",
            backgroundColor: "#f0f8f8",
            images: [
                { filename: "photo63.jpg", description: "Photo 63 description" },
                { filename: "photo41.jpg", description: "Photo 41 description" },
                { filename: "photo97.jpg", description: "Photo 97 description" }
            ]
        },
        {
            name: "Room 8",
            backgroundColor: "#f8f0f8",
            images: [
                { filename: "photo12.jpg", description: "Photo 12 description" },
                { filename: "photo88.jpg", description: "Photo 88 description" },
                { filename: "photo35.jpg", description: "Photo 35 description" }
            ]
        },
        {
            name: "Room 9",
            backgroundColor: "#f0f0f0",
            images: [
                { filename: "photo71.jpg", description: "Photo 71 description" },
                { filename: "photo24.jpg", description: "Photo 24 description" },
                { filename: "photo58.jpg", description: "Photo 58 description" }
            ]
        },
        {
            name: "Room 10",
            backgroundColor: "#fff8f0",
            images: [
                { filename: "photo46.jpg", description: "Photo 46 description" },
                { filename: "photo83.jpg", description: "Photo 83 description" },
                { filename: "photo9.jpg", description: "Photo 9 description" }
            ]
        },
        {
            name: "Room 11",
            backgroundColor: "#f8f0f8",
            images: [
                { filename: "photo33.jpg", description: "Photo 33 description" },
                { filename: "photo61.jpg", description: "Photo 61 description" },
                { filename: "photo17.jpg", description: "Photo 17 description" }
            ]
        },
        {
            name: "Room 12",
            backgroundColor: "#f0f8f0",
            images: [
                { filename: "photo78.jpg", description: "Photo 78 description" },
                { filename: "photo26.jpg", description: "Photo 26 description" },
                { filename: "photo94.jpg", description: "Photo 94 description" }
            ]
        },
        {
            name: "Room 13",
            backgroundColor: "#ffffff",
            images: [
                { filename: "photo13.jpg", description: "Photo 13 description" },
                { filename: "photo69.jpg", description: "Photo 69 description" },
                { filename: "photo45.jpg", description: "Photo 45 description" }
            ]
        },
        {
            name: "Room 14",
            backgroundColor: "#f8f8f8",
            images: [
                { filename: "photo82.jpg", description: "Photo 82 description" },
                { filename: "photo38.jpg", description: "Photo 38 description" },
                { filename: "photo6.jpg", description: "Photo 6 description" }
            ]
        },
        {
            name: "Room 15",
            backgroundColor: "#f5f5f5",
            images: [
                { filename: "photo55.jpg", description: "Photo 55 description" },
                { filename: "photo23.jpg", description: "Photo 23 description" },
                { filename: "photo87.jpg", description: "Photo 87 description" }
            ]
        },
        {
            name: "Room 16",
            backgroundColor: "#e8e8f0",
            images: [
                { filename: "photo72.jpg", description: "Photo 72 description" },
                { filename: "photo40.jpg", description: "Photo 40 description" },
                { filename: "photo8.jpg", description: "Photo 8 description" }
            ]
        },
        {
            name: "Room 17",
            backgroundColor: "#f0f0e8",
            images: [
                { filename: "photo19.jpg", description: "Photo 19 description" },
                { filename: "photo65.jpg", description: "Photo 65 description" },
                { filename: "photo93.jpg", description: "Photo 93 description" }
            ]
        },
        {
            name: "Room 18",
            backgroundColor: "#f8f0f0",
            images: [
                { filename: "photo48.jpg", description: "Photo 48 description" },
                { filename: "photo86.jpg", description: "Photo 86 description" },
                { filename: "photo14.jpg", description: "Photo 14 description" }
            ]
        },
        {
            name: "Room 19",
            backgroundColor: "#f0f8f8",
            images: [
                { filename: "photo75.jpg", description: "Photo 75 description" },
                { filename: "photo31.jpg", description: "Photo 31 description" },
                { filename: "photo59.jpg", description: "Photo 59 description" }
            ]
        },
        {
            name: "Room 20",
            backgroundColor: "#fff0f0",
            images: [
                { filename: "photo2.jpg", description: "Photo 2 description" },
                { filename: "photo70.jpg", description: "Photo 70 description" },
                { filename: "photo98.jpg", description: "Photo 98 description" }
            ]
        },
        {
            name: "Room 21",
            backgroundColor: "#f8f8f0",
            images: [
                { filename: "photo37.jpg", description: "Photo 37 description" },
                { filename: "photo95.jpg", description: "Photo 95 description" },
                { filename: "photo53.jpg", description: "Photo 53 description" }
            ]
        },
        {
            name: "Room 22",
            backgroundColor: "#f0f0f8",
            images: [
                { filename: "photo64.jpg", description: "Photo 64 description" },
                { filename: "photo22.jpg", description: "Photo 22 description" },
                { filename: "photo90.jpg", description: "Photo 90 description" }
            ]
        },
        {
            name: "Room 23",
            backgroundColor: "#f5f8f0",
            images: [
                { filename: "photo51.jpg", description: "Photo 51 description" },
                { filename: "photo79.jpg", description: "Photo 79 description" },
                { filename: "photo27.jpg", description: "Photo 27 description" }
            ]
        },
        {
            name: "Room 24",
            backgroundColor: "#f8f5f0",
            images: [
                { filename: "photo68.jpg", description: "Photo 68 description" },
                { filename: "photo36.jpg", description: "Photo 36 description" },
                { filename: "photo4.jpg", description: "Photo 4 description" }
            ]
        },
        {
            name: "Room 25",
            backgroundColor: "#f0f5f8",
            images: [
                { filename: "photo85.jpg", description: "Photo 85 description" },
                { filename: "photo11.jpg", description: "Photo 11 description" },
                { filename: "photo49.jpg", description: "Photo 49 description" }
            ]
        },
        {
            name: "Room 26",
            backgroundColor: "#f5f0f8",
            images: [
                { filename: "photo62.jpg", description: "Photo 62 description" },
                { filename: "photo30.jpg", description: "Photo 30 description" },
                { filename: "photo96.jpg", description: "Photo 96 description" }
            ]
        },
        {
            name: "Room 27",
            backgroundColor: "#f8f5f5",
            images: [
                { filename: "photo39.jpg", description: "Photo 39 description" },
                { filename: "photo77.jpg", description: "Photo 77 description" },
                { filename: "photo15.jpg", description: "Photo 15 description" }
            ]
        },
        {
            name: "Room 28",
            backgroundColor: "#f0f8f5",
            images: [
                { filename: "photo54.jpg", description: "Photo 54 description" },
                { filename: "photo92.jpg", description: "Photo 92 description" },
                { filename: "photo20.jpg", description: "Photo 20 description" }
            ]
        },
        {
            name: "Room 29",
            backgroundColor: "#f5f8f5",
            images: [
                { filename: "photo81.jpg", description: "Photo 81 description" },
                { filename: "photo47.jpg", description: "Photo 47 description" },
                { filename: "photo25.jpg", description: "Photo 25 description" }
            ]
        },
        {
            name: "Room 30",
            backgroundColor: "#f8f0f5",
            images: [
                { filename: "photo16.jpg", description: "Photo 16 description" },
                { filename: "photo73.jpg", description: "Photo 73 description" },
                { filename: "photo1.jpg", description: "Photo 1 description" }
            ]
        },
        {
            name: "Room 31",
            backgroundColor: "#f0f5f8",
            images: [
                { filename: "photo60.jpg", description: "Photo 60 description" },
                { filename: "photo28.jpg", description: "Photo 28 description" },
                { filename: "photo44.jpg", description: "Photo 44 description" }
            ]
        },
        {
            name: "Room 32",
            backgroundColor: "#f5f0f5",
            images: [
                { filename: "photo34.jpg", description: "Photo 34 description" },
                { filename: "photo66.jpg", description: "Photo 66 description" },
                { filename: "photo42.jpg", description: "Photo 42 description" }
            ]
        },
        {
            name: "Room 33",
            backgroundColor: "#f8f8f5",
            images: [
                { filename: "photo50.jpg", description: "Photo 50 description" },
                { filename: "photo80.jpg", description: "Photo 80 description" }
            ]
        }
    ];
    maxRooms = roomData.length;
    console.log('Embedded data loaded:', maxRooms, 'rooms with scrambled photos');
    
    // Load ALL images at once
    loadAllImages();
}

// Load all images at once
function loadAllImages() {
    console.log('Loading all images...');
    roomData.forEach(room => {
        room.images.forEach(imageData => {
            const filename = imageData.filename;
            if (!loadedImages[filename] && !loadingQueue.has(filename)) {
                loadingQueue.add(filename);
                const img = new Image();
                img.onload = () => {
                    loadedImages[filename] = img;
                    loadingQueue.delete(filename);
                };
                img.onerror = () => {
                    console.log(`Failed to load ${filename}`);
                    loadingQueue.delete(filename);
                };
                img.src = `photojpgs/${filename}`;
            }
        });
    });
}

// Player
const player = {
    x: 100,
    y: canvas.height - 80,
    width: 30,
    height: 30,
    color: '#00d9ff'
};

// Floor
const floor = {
    y: canvas.height - 60,
    height: 60,
    color: '#333333'
};

// Optimized image loading - only load current room and adjacent rooms
const loadedImages = {};
const loadingQueue = new Set();
let currentImageDescriptions = {};

// Preload adjacent rooms (no longer needed since we load all images)
function preloadAdjacentRooms() {
    // All images are now loaded at startup
}

// Input handling
const keys = {
    a: false,
    d: false,
    left: false,
    right: false
};

// Player movement
function updatePlayer() {
    if (keys.a || keys.left) {
        player.x -= playerSpeed;
    }
    if (keys.d || keys.right) {
        player.x += playerSpeed;
    }
    
    // Allow player to go off-screen, then transition rooms
    if (player.x + player.width < 0) {
        if (currentRoom > 0) {
            currentRoom--;
            player.x = canvas.width; // Start from right edge of new room
            preloadAdjacentRooms();
            console.log('Moved to room:', currentRoom, 'of', maxRooms);
        } else {
            player.x = 0; // Stop at first room
        }
    }
    if (player.x > canvas.width) {
        if (currentRoom < maxRooms - 1) {
            currentRoom++;
            player.x = -player.width; // Start from left edge of new room
            preloadAdjacentRooms();
            console.log('Moved to room:', currentRoom, 'of', maxRooms);
        } else {
            player.x = canvas.width - player.width; // Stop at last room
        }
    }
}

// Draw the gallery
function drawGallery() {
    const room = roomData[currentRoom];
    
    // Check if room changed and reset description
    if (currentRoom !== lastRoom) {
        lastRoom = currentRoom;
        resetDescription();
    }
    
    // Clear canvas with room background
    context.fillStyle = room.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw room border
    context.strokeStyle = '#333333';
    context.lineWidth = 2;
    context.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Draw floor
    context.fillStyle = floor.color;
    context.fillRect(0, floor.y, canvas.width, floor.height);
    
    // Draw floor border
    context.strokeStyle = '#555555';
    context.lineWidth = 1;
    context.strokeRect(0, floor.y, canvas.width, floor.height);
    
    // Draw images with same size - no variation
    const baseImageWidth = 400;
    const baseImageHeight = 280;
    const spacing = 80;
    const wallHeight = floor.y - 20;
    
    // Calculate total width needed
    let totalWidth = 0;
    room.images.forEach((imageData, index) => {
        totalWidth += baseImageWidth + (index < room.images.length - 1 ? spacing : 0);
    });
    
    const startX = (canvas.width - totalWidth) / 2;
    let currentX = startX;
    
    room.images.forEach((imageData, index) => {
        const filename = imageData.filename;
        const img = loadedImages[filename];
        
        if (img) {
            // All images same size
            const imageWidth = baseImageWidth;
            const imageHeight = baseImageHeight;
            const imageY = wallHeight - imageHeight - 10;
            
            // Draw image frame
            context.fillStyle = '#ffffff';
            context.fillRect(currentX - 5, imageY - 5, imageWidth + 10, imageHeight + 10);
            
            context.strokeStyle = '#333333';
            context.lineWidth = 2;
            context.strokeRect(currentX - 5, imageY - 5, imageWidth + 10, imageHeight + 10);
            
            // Draw image
            context.drawImage(img, currentX, imageY, imageWidth, imageHeight);
            
            // Check if player is below this image
            if (player.x + player.width/2 >= currentX && player.x + player.width/2 <= currentX + imageWidth) {
                updateInfoText(imageData, index);
            }
            
            currentX += imageWidth + spacing;
        }
    });
    
    // Draw room description above middle image if it exists
    if (room.description && room.description.trim() !== "") {
        const middleImageIndex = Math.floor(room.images.length / 2);
        const middleImageX = startX + (middleImageIndex * (baseImageWidth + spacing));
        const descriptionY = wallHeight - baseImageHeight - 80;
        
        // Text settings
        context.font = '18px Roboto Mono';
        context.fillStyle = '#e0f7ff';
        context.strokeStyle = '#001122';
        context.lineWidth = 1;
        context.textAlign = 'center';
        
        // Calculate text wrapping
        const maxWidth = baseImageWidth + 60;
        const lineHeight = 22;
        const padding = 15;
        const words = room.description.split(' ');
        const lines = [];
        let currentLine = '';
        
        // Wrap text to fit within the box width
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
            const metrics = context.measureText(testLine);
            
            if (metrics.width > maxWidth - (padding * 2) && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        
        // Calculate box dimensions based on text
        const boxHeight = (lines.length * lineHeight) + (padding * 2);
        const boxY = descriptionY - boxHeight - 10;
        
        // Draw description background
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(middleImageX - 30, boxY, maxWidth, boxHeight);
        
        // Draw description border
        context.strokeStyle = '#00d9ff';
        context.lineWidth = 2;
        context.strokeRect(middleImageX - 30, boxY, maxWidth, boxHeight);
        
        // Draw description text lines
        lines.forEach((line, index) => {
            const textY = boxY + padding + (index * lineHeight) + 12;
            // Draw text outline for better readability
            context.strokeText(line, middleImageX + baseImageWidth/2, textY);
            // Draw main text
            context.fillText(line, middleImageX + baseImageWidth/2, textY);
        });
        
        context.textAlign = 'left'; // Reset alignment
    }
    
    // Draw player
    context.fillStyle = player.color;
    context.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player shadow
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.fillRect(player.x + 2, player.y + 2, player.width, player.height);
}

// Lightbox functionality
function openLightbox(imagePath) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    
    lightboxImg.src = `photojpgs/${imagePath}`;
    lightbox.classList.add('active');
    
    // Prevent body scrolling when lightbox is open
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    
    // Re-enable body scrolling
    document.body.style.overflow = 'auto';
}

// Check if click is on an image
function checkImageClick(mouseX, mouseY) {
    const room = roomData[currentRoom];
    const baseImageWidth = 400;
    const baseImageHeight = 280;
    const spacing = 80;
    const wallHeight = floor.y - 20;
    
    // Calculate total width needed
    let totalWidth = 0;
    room.images.forEach((imageData, index) => {
        totalWidth += baseImageWidth + (index < room.images.length - 1 ? spacing : 0);
    });
    
    const startX = (canvas.width - totalWidth) / 2;
    let currentX = startX;
    
    for (let index = 0; index < room.images.length; index++) {
        const imageData = room.images[index];
        const imageWidth = baseImageWidth;
        const imageHeight = baseImageHeight;
        const imageY = wallHeight - imageHeight - 10;
        
        // Check if click is within image bounds
        if (mouseX >= currentX - 5 && mouseX <= currentX + imageWidth + 5 &&
            mouseY >= imageY - 5 && mouseY <= imageY + imageHeight + 5) {
            console.log(`Clicked on image ${index + 1}: ${imageData.filename}`);
            openLightbox(imageData.filename);
            return true;
        }
        
        currentX += imageWidth + spacing;
    }
    
    return false;
}

// Reset description text when changing rooms
function resetDescription() {
    const infoText = document.getElementById('infoText');
    const roomIndicator = document.getElementById('roomIndicator');
    const room = roomData[currentRoom];
    
    roomIndicator.textContent = room.name;
    infoText.textContent = `Welcome to ${room.name}. Move around to explore the images.`;
}

// Update info text with stable descriptions
function updateInfoText(imageData, imageIndex) {
    const room = roomData[currentRoom];
    const infoText = document.getElementById('infoText');
    const roomIndicator = document.getElementById('roomIndicator');
    
    roomIndicator.textContent = `${room.name} - Image ${imageIndex + 1}`;
    
    // Use the description from JSON data
    infoText.textContent = imageData.description;
}

// Game loop
function gameLoop() {
    updatePlayer();
    drawGallery();
    requestAnimationFrame(gameLoop);
}

// Start the game
async function startGame() {
    console.log('Starting art gallery game');
    await loadGalleryData();
    preloadAdjacentRooms();
    gameLoop();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'a':
            keys.a = true;
            break;
        case 'd':
            keys.d = true;
            break;
        case 'arrowleft':
            keys.left = true;
            break;
        case 'arrowright':
            keys.right = true;
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'a':
            keys.a = false;
            break;
        case 'd':
            keys.d = false;
            break;
        case 'arrowleft':
            keys.left = false;
            break;
        case 'arrowright':
            keys.right = false;
            break;
    }
});

// Canvas click event listener
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    checkImageClick(mouseX, mouseY);
});

// Lightbox event listeners
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);

// Close lightbox when clicking outside the image
document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') {
        closeLightbox();
    }
});

// Close lightbox with ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// Initialize
startGame();