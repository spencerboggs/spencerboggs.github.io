// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

const borderPercent = 0.1;
const scaleFactor = Math.min(
    (window.innerWidth * (1 - borderPercent)) / 1024,
    (window.innerHeight * (1 - borderPercent)) / 576
);

canvas.width = 1024;
canvas.height = 576;
canvas.style.transformOrigin = '0 0';
canvas.style.transform = `scale(${scaleFactor})`;
canvas.style.position = 'absolute';
canvas.style.left = `${(window.innerWidth - canvas.width * scaleFactor) / 2}px`;
canvas.style.top = `${(window.innerHeight - canvas.height * scaleFactor) / 2}px`;

// Game Settings
const gravity = 0.5;
let playerColor = '#333';
let canvasColor = '#e0e0e0';
let roomLimit = -20;
let currentRoom = -10; // Separate room tracking system
let hasFallen = false; // Track if falling sequence has occurred
let hasPressedS10Times = false; // Track if player has pressed s 10 times

// Screen shake and fall mechanics
let shakeCount = 0;
let maxShakeCount = 10;
let isShaking = false;
let isFalling = false;
let fallLevel = 0;
let maxFallLevels = 5;
let shakeOffset = { x: 0, y: 0 };

// Audio Context and Sound Effects
let audioContext;
let lightSwitchSound;

// Initialize audio
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create light switch sound (click)
        function createLightSwitchSound() {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.05);

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        }

        // Store sound creation functions
        lightSwitchSound = createLightSwitchSound;

    } catch (e) {
        console.log('Audio not supported');
    }
}

// Play light switch sound
function playLightSwitchSound() {
    if (audioContext && lightSwitchSound) {
        try {
            lightSwitchSound();
        } catch (e) {
            console.log('Light switch sound error:', e);
        }
    }
}

// Screen shake function
function startScreenShake() {
    if (isShaking) return;

    isShaking = true;
    shakeCount++;

    // Create shake effect
    const shakeIntensity = 10;
    shakeOffset.x = (Math.random() - 0.5) * shakeIntensity;
    shakeOffset.y = (Math.random() - 0.5) * shakeIntensity;

    // Apply shake to canvas
    canvas.style.transform = `scale(${scaleFactor}) translate(${shakeOffset.x}px, ${shakeOffset.y}px)`;

    // Stop shaking after short duration
    setTimeout(() => {
        isShaking = false;
        shakeOffset.x = 0;
        shakeOffset.y = 0;
        canvas.style.transform = `scale(${scaleFactor})`;

        // Check if we've reached max shakes
        if (shakeCount >= maxShakeCount) {
            hasPressedS10Times = true; // Mark that s has been pressed 10 times
            startFallSequence();
        }
    }, 200);
}

// Fall sequence function
function startFallSequence() {
    isFalling = true;
    fallLevel = 0;

    // Start falling animation
    function fallStep() {
        if (fallLevel < maxFallLevels) {
            fallLevel++;

            // Transition background color (from sky blue to darker)
            const colorProgress = fallLevel / maxFallLevels;
            const currentR = 173; // #add8e6 red component
            const currentG = 216; // #add8e6 green component  
            const currentB = 230; // #add8e6 blue component

            const newR = Math.floor(currentR * (1 - colorProgress));
            const newG = Math.floor(currentG * (1 - colorProgress));
            const newB = Math.floor(currentB * (1 - colorProgress));

            canvasColor = `rgb(${newR}, ${newG}, ${newB})`;

            // Animate player falling from top to bottom
            const startY = -player.height;
            const endY = canvas.height - player.height - 10;
            const startTime = Date.now();
            const fallDuration = 800; // 800ms fall time

            function animateFall() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / fallDuration, 1);

                // Linear fall (no easing for simplicity)
                player.position.y = startY + (endY - startY) * progress;
                // Completely override physics during fall
                player.velocity.y = 0;
                player.velocity.x = 0;
                player.isJumping = false;

                if (progress < 1) {
                    requestAnimationFrame(animateFall);
                } else {
                    // Continue to next level after fall completes
                    setTimeout(fallStep, 200);
                }
            }

            // Start the animation immediately
            animateFall();
        } else {
            // End fall sequence - transport to blank room
            isFalling = false;
            shakeCount = 0;
            fallLevel = 0;

            // Transport player to blank room (no number display)
            player.position.x = canvas.width / 2;
            player.position.y = canvas.height - player.height - 10;
            canvasColor = 'black';
            playerColor = 'white';
            player.color = playerColor;
            roomLimit = -30;
            currentRoom = -30; // Set room to a value that doesn't show messages
        }
    }

    fallStep();
}


const keys = {
    d: { pressed: false },
    a: { pressed: false },
};

// Player Class
class Player {
    constructor(position) {
        this.speed = 15;
        this.jumpHeight = -10; // Will be room-based before falling, fixed after
        this.position = position;
        this.velocity = { x: 0, y: 1 };
        this.height = 100;
        this.isJumping = false;
        this.color = playerColor;
    }

    draw() {
        context.fillStyle = this.color;
        context.fillRect(this.position.x, this.position.y, 100, this.height);
    }

    update() {
        this.draw();
        
        // Don't apply any physics during falling animation
        if (!isFalling) {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;

            if (this.position.y + this.height < canvas.height - 10) {
                this.velocity.y += gravity;
                this.isJumping = true;
            } else {
                this.velocity.y = 0;
                this.isJumping = false;
                // Only apply ground collision if not falling
                if (!isFalling) {
                    this.position.y = canvas.height - this.height - 10;
                }
            }

            if (this.position.x > canvas.width) {
                this.position.x = -100;
                currentRoom -= 2;
                // Modify jump height based on room only before sky room
                if (canvasColor !== '#add8e6') {
                    this.jumpHeight -= 2;
                }
                // Reset shake count when leaving final room
                if (currentRoom !== 0) {
                    shakeCount = 0;
                }
            } else if (this.position.x < -100 && currentRoom < 0) {
                this.position.x = canvas.width;
                currentRoom += 2;
                // Modify jump height based on room only before sky room
                if (canvasColor !== '#add8e6') {
                    this.jumpHeight += 2;
                }
                // Reset shake count when leaving final room
                if (currentRoom !== 0) {
                    shakeCount = 0;
                }
            }

            if (currentRoom === 0 && this.position.x < 0) {
                this.position.x = 0;
            }
            if (currentRoom === roomLimit && this.position.x > canvas.width - 100) {
                this.position.x = canvas.width - 100;
            }
            
            // Add left wall collision for post-fall room
            if (hasPressedS10Times && this.position.x < 0) {
                this.position.x = 0;
            }

            if (this.position.y + this.height < 0) {
                canvasColor = '#add8e6';
                playerColor = '#333';
                this.color = playerColor;
                this.position.y = canvas.height - this.height - 10;
                roomLimit = -10;
                currentRoom = -10; // Set to sky room (whoa... room)
                this.jumpHeight = Math.floor(this.jumpHeight * 2 / 3); // Set jump height to two-thirds
            }
        }
    }
}

const player = new Player({ x: 100, y: 0 });

// Display Messages
const messages = {
    lightRoom: {
        '0': "you can't leave me",
        '-2': "please don't go...",
        '-4': "don't go...",
        '-6': "where are you going?",
        '-8': "hello?",
        '-10': "hello friend...",
        '-12': "looking for something?",
        '-14': "what are you looking for?",
        '-16': "there's nothing here...",
        '-18': "just an endless void...",
        '-20': "..."
    },
    darkRoom: {
        '0': "...",
        '-2': "oh...",
        '-4': "you turned off the lights...",
        '-10': "why did you do that?",
        '-16': "i don't like the dark...",
        '-22': "oh...",
        '-24': "this is new..."
    },
    skyRoom: {
        '-10': "whoa...",
        '-8': "we're outside.",
        '-6': "well...",
        '-4': "that's cool i guess.",
        '-2': "...",
        '0': "",
    }
};

// Render Level Text
function renderLevelText() {
    let currentMessages;
    let fontColor = '#e0e0e0';
    if (canvasColor === '#e0e0e0') {
        currentMessages = messages.lightRoom;
    } else if (canvasColor === 'black') {
        currentMessages = messages.darkRoom;
    } else if (canvasColor === '#add8e6') {
        currentMessages = messages.skyRoom;
        fontColor = '#a3a3a3';
    }

    // Display room numbers only before sky room and before 10 s presses
    if (canvasColor !== '#add8e6' && !hasPressedS10Times) {
        context.fillStyle = fontColor;
        context.font = '300px Arial';
        context.textAlign = 'center';
        context.fillText(`${Math.abs(currentRoom) / 2}`, canvas.width / 2, canvas.height / 2);
    }

    context.font = '50px Arial';
    context.fillStyle = fontColor;
    context.textAlign = 'center';

    context.fillText(currentMessages[currentRoom] || '', canvas.width / 2, canvas.height - 50);

    if (currentRoom === -2 && canvasColor === '#e0e0e0') {
        context.font = '30px Arial';
        context.fillText('[]', canvas.width / 2, canvas.height - 115);
    }

    if (currentRoom === -20 && canvasColor === '#e0e0e0') {
        context.font = '30px Arial';
        context.fillText('find the switch', 200, canvas.height / 2);
        context.fillText('turn off the lights', 850, canvas.height / 2);
    }

    if (currentRoom === 0 && canvasColor === '#add8e6') {
        context.fillStyle = '#add8e6';
        context.font = '200px Arial';
        context.fillText('S', canvas.width / 2, canvas.height / 2 + 100);
        context.fillStyle = fontColor;
    }
}

// Game Loop Functions
function drawCanvas() {
    window.requestAnimationFrame(drawCanvas);
    context.fillStyle = canvasColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    player.update();

    player.velocity.x = keys.d.pressed ? player.speed : keys.a.pressed ? -player.speed : 0;
}

function level() {
    window.requestAnimationFrame(level);
    renderLevelText();
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'w':
        case ' ':
            if (!player.isJumping) {
                player.velocity.y = player.jumpHeight;
                player.isJumping = true;
            }
            break;
        case 'a':
            keys.a.pressed = true;
            break;
        case 'd':
            keys.d.pressed = true;
            break;
        case 's':
            if (currentRoom === -2) player.velocity.y = 10;
            // Check if in final leftmost room of sky room (currentRoom = 0, anywhere in room)
            if (currentRoom === 0 && canvasColor === '#add8e6') {
                startScreenShake();
            }
            break;
        case 'Enter':
            if (currentRoom === -2) {
                canvasColor = 'black';
                playerColor = 'white';
                player.color = playerColor;
                roomLimit = -24;
                playLightSwitchSound();
            }
            break;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'a') keys.a.pressed = false;
    if (e.key === 'd') keys.d.pressed = false;
});

// Initialize audio and start game
initAudio();

// Start Game
drawCanvas();
level();