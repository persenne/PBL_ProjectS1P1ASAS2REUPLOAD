const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let gameLoopId;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const container = document.getElementById("container");
const canvasTop = document.getElementById("top");
const powerupBox = document.getElementById("powerUp");
const bulletBox = document.getElementById("bulletBox");

// Load images
const backgroundImage = new Image();
backgroundImage.src = "Assets/walls.png";

const doorImage = new Image();
doorImage.src = "Assets/door.png";

const darkness = new Image();
darkness.src = "Assets/darkness.png";

const FRAME_WIDTH = 512;
const FRAME_HEIGHT = 512;
const FRAME_RATE = 150; // Milliseconds per frame

// Define animations with row index and frame count
const animations = {
    idle: { y: 0, frames: 2 },
    walkRight: { y: 1, frames: 3 },
    walkLeft: { y: 2, frames: 3 },
    walkUp: { y: 3, frames: 4 },
    walkDown: { y: 4, frames: 4 },
    shootRight : { y: 5, frames: 4},
    shootLeft : { y: 6, frames: 4},
    shootDown : { y: 7, frames: 4},
    shootUp : { y: 8, frames: 4}
};

const bossPowerups = [
    {
        name: "Chinese Takeout",
        image: "Assets/chineseTakeout.png",
        icon: "Assets/chineseTakeoutIcon.png",
        action: "heal"
    },
    {
        name: "White Powder",
        image: "Assets/whitePowder.png",
        icon: "Assets/whitePowderIcon.png",
        action: "speed"
    },
    {
        name: "Cigarette Pack",
        image: "Assets/cigPack.png",
        icon: "Assets/cigPackIcon.png",
        action: "attack"
    }
];

let bossPowerup = null; // current active boss powerup (only 1 allowed)
let lastBossPowerupTime = 0;
const bossPowerupCooldown = 10000; // 10 seconds between spawn attempts

const enemyTypes = {
    cat:     { size: 15, speed: 4, hp: 1, chasePlayer: true, damage: 1.5, flashWhite: false, flashEndTime: 0},
    eye:     { size: 30, speed: 2, hp: 5, chasePlayer: true, damage: 1, flashWhite: false, flashEndTime: 0},
    meatman: { size: 60, speed: 1, hp: 15, chasePlayer: true, damage: 2, flashWhite: false, flashEndTime: 0}
};


const roomEnemies = {

        "4,1": [
  {
    type: "boss",
    x: canvas.width / 2,
    y: 200,
    size: 150,
    speed: 1,
    hp: 100,
    maxHp: 100,
    chasePlayer: true,
    damage: .5,
    canShoot: true,
    shootCooldown: 1500,
    lastShot: 0,
    canSummon: true,
    summonCooldown: 8000, // every 8 seconds
    lastSummon: 0,
    animationRow: 0,     // Facing down initially
    frameIndex: 0,
    lastFrameTime: 0,
    flashRed: false,
    isPreparingShot: false,
    flashWhite: false, 
    flashEndTime: 0
  }
],

    "1,1": [
        { x: 400, y: 150, size: 15, speed: 4, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
        { x: 400, y: 350, size: 15, speed: 4, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
    ],

    //Y 0
    "4,0": [
        { x: 400, y: 150, size: 15, speed: 4, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
        { x: 1000, y: 200, size: 30, speed: 2, hp: 5, chasePlayer: true, type: "eye", damage: 1, },
    ],
    "1,0": [
        { x: 400, y: 150, size: 30, speed: 1.99, hp: 5, chasePlayer: true, type: "eye", damage: 1, },
        { x: 400, y: 350, size: 30, speed: 2.01, hp: 5, chasePlayer: true, type: "eye", damage: 1, },
    ],
    // Y -1
    "4,-1": [
        { x: 400, y: 150, size: 15, speed: 4.01, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
        { x: 1000, y: 350, size: 15, speed: 3.99, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
        { x: 800, y: 350, size: 15, speed: 4, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
    ],
    "3,-1": [
        { x: 1000, y: 150, size: 15, speed: 3.99, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
        { x: 400, y: 350, size: 15, speed: 4.01, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
    ],
    "2,-1": [
        { x: 1000, y: 150, size: 15, speed: 4, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
        { x: 400, y: 200, size: 30, speed: 2, hp: 5, chasePlayer: true, type: "eye", damage: 1, },
    ],
    "0,-1": [
        { x: 1000, y: 550, size: 60, speed: 1, hp: 15, chasePlayer: true, type: "meatman", damage: 2, },
        { x: 400, y: 350, size: 15, speed: 4, hp: 1, chasePlayer: true, type: "cat", damage: 1.5, },
    ],
 
};

function drawBossHealthBar(boss) {
    const barWidth = 400;
    const barHeight = 20;
    const x = canvas.width / 2 - barWidth / 2;
    const y = 50;

    const healthPercent = boss.hp / boss.maxHp;

    // 🟥 Outline
    ctx.fillStyle = "black";
    ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

    // 🔴 Background
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, barWidth, barHeight);

    // 🟩 Health
    ctx.fillStyle = "lime";
    ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

    // ✏️ Name label (above the bar)
    ctx.font = "32px Pixel";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    ctx.fillText(boss.name || "PHALGAM", canvas.width / 2, y - 10); // default name fallback
}


let currentAnimation = "idle";
let frameIndex = 0;
let lastFrameTime = 0;

const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    size: 20,
    speed: 5,
    dx: 0,
    dy: 0,
    image: new Image(),
    hp: 6,
    maxHP: 6,
    lastDamageTime: 0,
    damageCooldown: 1000
};

player.image.src = "Assets/spritesheet.png"; // Make sure the file path is correct

const enemySprites = {
    eye: new Image(),
    cat: new Image(),
    meatman: new Image(),
    boss: new Image()

    // Add more types here
};

enemySprites.eye.src = "Assets/eye_Spritesheet.png";
enemySprites.cat.src = "Assets/cat_Spritesheet.png";
enemySprites.meatman.src = "Assets/meatman_Spritesheet.png";
enemySprites.boss.src = "Assets/boss.png";

const playerBullets = [];
const enemyBullets = [];
const enemyBulletSize = 15;
const bulletSpeed = 50;
const bulletSize = 25;
let bulletDamage = 1; 
let cooldown = 400;
const keys = { w: false, s: false, a: false, d: false, W: false, S: false, A: false, D: false };
let enemies = []; // This holds the current enemies for the active room
let canShoot = true;
let doorsLocked = false;
const defeatedEnemies = {};
const heartImage = new Image();
heartImage.src = "Assets/heart.png"; // Full heart image

const halfHeartImage = new Image();
halfHeartImage.src = "Assets/halfheart.png"; // Half-heart image

const emptyHeartImage = new Image();
emptyHeartImage.src = "Assets/emptyHeart.png"; // Half-heart image

const bulletImage = new Image();
bulletImage.src = "Assets/bullet.png"; 

const enemyBulletImageV1 = new Image();
enemyBulletImageV1.src = "Assets/enemyBullet.png";

const enemyBulletImageV2 = new Image();
enemyBulletImageV2.src = "Assets/enemyBulletV2.png";

const ENEMY_BULLET_DAMAGE_V1 = .5;   // or enemy.damage
const ENEMY_BULLET_DAMAGE_V2 = .5;

const audio = new Audio("Assets/pistol.mp3");
const catSpawnSound = new Audio("Assets/catSpawn.mp3");
const eyeSpawnSound = new Audio("Assets/eyeSpawn.mp3");
const meatmanSpawnSound = new Audio("Assets/meatmanSpawn.mp3");

const catDeathSound = new Audio("Assets/catDeath.mp3");
const eyeDeathSound = new Audio("Assets/eyeDeath.mp3");
const meatmanDeathSound = new Audio("Assets/meatmanDeath.mp3");
const allEnemySounds = [catSpawnSound, eyeSpawnSound, meatmanSpawnSound];


function drawFrame(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;

    const anim = animations[currentAnimation];

    // Change frame based on time
    if (timestamp - lastFrameTime > FRAME_RATE) {
        frameIndex = (frameIndex + 1) % anim.frames;
        lastFrameTime = timestamp;
    }

    // Draw the sprite frame (smaller size)
    ctx.drawImage(
        player.image,
        frameIndex * FRAME_WIDTH,
        anim.y * FRAME_HEIGHT,
        FRAME_WIDTH, FRAME_HEIGHT, 
        player.x - FRAME_WIDTH / 10, player.y - FRAME_HEIGHT / 10,  // Center the sprite
        FRAME_WIDTH / 4, FRAME_HEIGHT / 4
    );    

    requestAnimationFrame(drawFrame);
}



function updateAnimation() {
   if (keys.w || keys.W) {
        currentAnimation = "walkUp";
    } else if (keys.a || keys.A) {
        currentAnimation = "walkLeft";
    } else if (keys.s || keys.S) {
        currentAnimation = "walkDown";
    } else if (keys.d || keys.D) {
        currentAnimation = "walkRight";
    }
}

const wallColliders = [
    { x: 0, y: 0, width: canvas.width, height: 50 }, // Top border
    { x: 0, y: canvas.height - 50, width: canvas.width, height: 50 }, // Bottom
    { x: 0, y: 0, width: 50, height: canvas.height }, // Left
    { x: canvas.width - 50, y: 0, width: 50, height: canvas.height } // Right
];

function checkWallCollision(oldX, oldY) {
    for (let wall of wallColliders) {
        if (
            player.x < wall.x + wall.width &&
            player.x + player.size > wall.x &&
            player.y < wall.y + wall.height &&
            player.y + player.size > wall.y
        ) {
            // Revert movement if collided
            player.x = oldX;
            player.y = oldY;
        }
    }
}

// Doors with fixed size (93px x 40px)
const doors = {
    right: { x: canvas.width - 93, y: canvas.height / 2 - 20, width: 93, height: 40, rotation: -90 },
    left: { x: 0, y: canvas.height / 2 - 20, width: 93, height: 40, rotation: 90 },
    top: { x: canvas.width / 2 - 46, y: 0, width: 93, height: 50, rotation: 180 },
    bottom: { x: canvas.width / 2 - 46, y: canvas.height - 30, width: 93, height: 30, rotation: 0 }
};

// Movement (WASD)
window.addEventListener("keydown", (e) => {
    if (["w", "a", "s", "d", "W", "A", "S", "D",].includes(e.key)) {
        keys[e.key] = true;
        updateDirection();
        updateAnimation();
    }
});
window.addEventListener("keydown", (e) => {
    const roomKey = `${currentX}x${currentY}`;
    const powerup = powerupConfigs[roomKey];

    if ((e.key === "e" || e.key === "E") && powerup && !powerup.collected) {
        const dx = player.x - powerup.x;
        const dy = player.y - powerup.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
    
        if (distance < 100 && (!hasPowerup || powerup.name === "Cat Paws")) {
            powerup.collected = true;
    
            if (powerup.name === "Cat Paws") {
                bulletBox.src = powerup.icon;
                bulletImage.src = "Assets/catBullet.png";
                cooldown += 200;
                bulletDamage = 3;
            } else {
                hasPowerup = powerup; // only store non-cat-paws
                powerupBox.src = powerup.icon;
            }
        }
    }

    if ((e.key === "e" || e.key === "E") && bossPowerup && !bossPowerup .collected) {
        const dx = player.x - bossPowerup.x;
        const dy = player.y - bossPowerup.y;
        const dist = Math.hypot(dx, dy);
    
        if (dist < 100 && (!hasPowerup || bossPowerup.name === "Cat Paws")) {
            bossPowerup.collected = true;
    
            if (bossPowerup.name === "Cat Paws") {
                bulletBox.src = bossPowerup.icon;
                bulletImage.src = "Assets/catBullet.png";
            } else {
                hasPowerup = bossPowerup;
                powerupBox.src = bossPowerup.icon;
            }
    
            bossPowerup = null; // ❌ allow next one to spawn later
        }
    }    
    

    if (e.code === "Space" && hasPowerup) {
        if (hasPowerup.action === "heal") {
            if (player.hp < player.maxHP) {
                player.hp = Math.min(player.hp + 2, player.maxHP); // +1 heart
                renderHearts();
                powerupBox.src = "Assets/powerUp.png";
            } else {
            }
        }

        if (hasPowerup.action === "speed") {
            player.speed += 3; // Boost speed
            powerupBox.src = "Assets/powerUp.png";
        }

        if (hasPowerup.action === "attack") {
            
            cooldown -= 100;
            powerupBox.src = "Assets/powerUp.png";
        }
        
        hasPowerup = false;
    }
});

window.addEventListener("keyup", (e) => {
    if (["w", "a", "s", "d", "W", "A", "S", "D",].includes(e.key)) {
        keys[e.key] = false;
        updateDirection();
        currentAnimation = "idle";
    }
});

// Shoot with arrow keys (with cooldown)
window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (canShoot) {
            shoot(e.key);
            canShoot = false;
            audio.play();
            setTimeout(() => {
                canShoot = true;
                audio.currentTime = 0;
                currentAnimation = "idle";
              }, cooldown);     
        }
    }
});

// Update movement direction
function updateDirection() {
    player.dx = (keys.d || keys.D - keys.a || keys.A) * player.speed;
    player.dy = (keys.s || keys.S - keys.w || keys.W) * player.speed;
}

function shoot(direction) {
    let bullet = {
        x: player.x + player.size / 2 - bulletSize / 2,
        y: player.y + player.size / 2 - bulletSize / 2,
        dx: 0,
        dy: 0
    };

    switch (direction) {
        case "ArrowUp":
            currentAnimation = "shootUp";
            bullet.dy = -bulletSpeed;
            break;
        case "ArrowDown":
            currentAnimation = "shootDown";
            bullet.dy = bulletSpeed;
            break;
        case "ArrowLeft":
            currentAnimation = "shootLeft";
            bullet.dx = -bulletSpeed;
            break;
        case "ArrowRight":
            currentAnimation = "shootRight";
            bullet.dx = bulletSpeed;
            break;
    }

    playerBullets.push(bullet);
}

// Update game state
function update() {
    let oldX = player.x;
    let oldY = player.y;

    player.x += player.dx;
    player.y += player.dy;

    checkWallCollision(oldX, oldY);

    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));

// Move player playerBullets
for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i];
    b.x += b.dx;
    b.y += b.dy;

    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
        playerBullets.splice(i, 1);
    }
}

// Move enemy playerBullets
for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.x += b.dx;
    b.y += b.dy;

    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
        enemyBullets.splice(i, 1);
    }
}


    checkDoorCollision();
}

// Draw background
function drawBackground() {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(darkness, 0, 0, canvas.width, canvas.height);
}

function drawBullets() {
    // 🎯 Player playerBullets
    for (let bullet of playerBullets) {
        ctx.save();
        ctx.translate(bullet.x + bulletSize / 2, bullet.y + bulletSize / 2);

        // Directional sprite
        if (bullet.dx > 0) ctx.rotate(0); 
        else if (bullet.dx < 0) ctx.rotate(Math.PI);
        else if (bullet.dy > 0) ctx.rotate(Math.PI / 2);
        else if (bullet.dy < 0) ctx.rotate(-Math.PI / 2);

        ctx.drawImage(bulletImage, -bulletSize / 2, -bulletSize / 2, bulletSize, bulletSize);
        ctx.restore();
    }

    // 🔥 Boss/enemy Bullets
    for (let bullet of enemyBullets) {
        const enemyBulletImage = bullet.version === "v1" ? enemyBulletImageV1 : enemyBulletImageV2;
    
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.drawImage(enemyBulletImage, -bullet.size / 2, -bullet.size / 2, bullet.size, bullet.size);
        ctx.restore();
    }
    

}


let currentX = 0;
let currentY = 0;
let roomChanging = false;
let allowRoomElements = true;

const roomConfigs = {
    "-1x2": ["right"],
    "0x0": ["top", "right", "bottom"],  
    "0x1": ["top", "right", "bottom"],
    "0x2": ["left", "bottom"],
    "0x-1": ["top", "right", "bottom"],
    "0x-2": ["top"],
    "1x1": ["left", "right", "bottom"],
    "1x0": ["left", "top", "bottom"],
    "1x-1": ["left", "right", "top"],
    "2x1": ["left"],
    "2x-1": ["left", "right"],
    "3x-1": ["left", "right", "bottom"],
    "3x-2": ["top", "right"],
    "4x-1": ["left", "top", "bottom"],
    "4x-2": ["left", "top"],
    "4x0": ["top","bottom"],
    "4x1": ["bottom"],
};

const powerupImages = {
    "Assets/chineseTakeout.png": new Image(),
    "Assets/whitePowder.png": new Image(),
    "Assets/cigPack.png": new Image(),
    "Assets/catPaws.png": new Image()
  };
  
  powerupImages["Assets/chineseTakeout.png"].src = "Assets/chineseTakeout.png";
  powerupImages["Assets/whitePowder.png"].src = "Assets/whitePowder.png";
  powerupImages["Assets/cigPack.png"].src = "Assets/cigPack.png";
  powerupImages["Assets/catPaws.png"].src = "Assets/catPaws.png";
  
  const powerupConfigs = {
    "2x1": {
      name: "Chinese Takeout",
      image: "Assets/chineseTakeout.png",
      icon: "Assets/chineseTakeoutIcon.png",
      x: 250,
      y: 250,
      action: "heal",
      collected: false
    },
    "1x0": {
      name: "White Powder",
      image: "Assets/whitePowder.png",
      icon: "Assets/whitePowderIcon.png",
      x: 300,
      y: 200,
      action: "speed",
      collected: false
    },
    "4x-2": {
      name: "Cigarette Pack",
      image: "Assets/cigPack.png",
      icon: "Assets/cigPackIcon.png",
      x: 300,
      y: 200,
      action: "attack",
      collected: false
    },
    "-1x2": {
      name: "Cat Paws",
      image: "Assets/catPaws.png",
      icon: "Assets/catBulletBox.png",
      x: 300,
      y: 200,
      action: "cat",
      collected: false
    },
    "0x-2": {
        name: "Cigarette Pack",
        image: "Assets/cigPack.png",
        icon: "Assets/cigPackIcon.png",
        x: 300,
        y: 200,
        action: "attack",
        collected: false
    }
  };

let hasPowerup = false;

function drawPowerups() {
    if (!allowRoomElements) return; // block drawing during transition

    const roomKey = `${currentX}x${currentY}`;
    const powerup = powerupConfigs[roomKey];

    if (bossPowerup && !bossPowerup.collected) {
        const img = powerupImages[bossPowerup.image];
        ctx.drawImage(img, bossPowerup.x, bossPowerup.y, 64, 64);
    }    

    if (powerup && !powerup.collected) {
        const img = powerupImages[powerup.image];
        ctx.drawImage(img, powerup.x, powerup.y, 80, 90);
    }
}

function drawDoors() {
    if (!allowRoomElements) return; // wait for room transition to finish

    const roomKey = `${currentX}x${currentY}`;
    const activeDoors = roomConfigs[roomKey] || [];

    for (let door of activeDoors) {
        let d = doors[door];

        ctx.save();
        ctx.translate(d.x + d.width / 2, d.y + d.height / 2);
        ctx.rotate((d.rotation * Math.PI) / 180);
        ctx.drawImage(doorImage, -d.width / 2, -d.height / 2, d.width, d.height);
        ctx.restore();
    }
}


loadEnemiesForRoom();

function changeRoom(direction) {

    // 🚨 Stop any lingering sounds from the previous room
allEnemySounds.forEach(sound => {
    sound.pause();
    sound.currentTime = 0; // reset to beginning
});

    
    if (roomChanging) return;
    
    roomChanging = true;
    allowRoomElements = false;

    if (direction === "right") currentX += 1;
    else if (direction === "left") currentX -= 1;
    else if (direction === "top") currentY += 1;
    else if (direction === "bottom") currentY -= 1;

    let newMap = `Assets/x${currentX}y${currentY}.png`;

    let slideX = 0, slideY = 0;
    if (direction === "right") slideX = -100;
    else if (direction === "left") slideX = 100;
    else if (direction === "top") slideY = 100;
    else if (direction === "bottom") slideY = -100;

    container.style.transition = "transform 0.5s ease-in-out";
    container.style.transform = `translate(${slideX}vw, ${slideY}vh)`;

    player.speed = 0;

    setTimeout(() => {
        container.style.transition = "none";
        container.style.transform = `translate(${-slideX}vw, ${-slideY}vh)`;

        if (direction === "right") player.x = 150;
        else if (direction === "left") player.x = canvas.width - 150 - player.size;
        else if (direction === "top") player.y = canvas.height - 150 - player.size;
        else if (direction === "bottom") player.y = 150;
    
        roomChanging = false;
        map.src = `${newMap}`;
        requestAnimationFrame(() => {
            loadEnemiesForRoom();
            container.style.transition = "transform 0.3s ease-in-out";
            container.style.transform = "translate(0, 0)";
    
            // 🔥 DELAYED DRAWING AND ENEMY LOADING
            setTimeout(() => {
                allowRoomElements = true;
                player.speed = 4;
            }, 250); // Wait for slide-in animation to finish
        });
    }, 500); // Delay for slide-out
    
}

function checkDoorCollision() {

    if (doorsLocked) return;

    const roomKey = `${currentX}x${currentY}`;
    const activeDoors = roomConfigs[roomKey] || [];

    for (let door of activeDoors) {
        let d = doors[door];
        if (
            player.x < d.x + d.width &&
            player.x + player.size > d.x &&
            player.y < d.y + d.height + 50 &&
            player.y + player.size > d.y - 50
        ) {
            changeRoom(door);
        }
    }
}



function updateEnemies() {
    const now = Date.now();
    
    for (let enemy of enemies) {

        if (enemy.type === "boss") {
            const now = Date.now();
            let dx = player.x - enemy.x;
            let dy = player.y - enemy.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
        
            // 👁️ Face the player
            if (Math.abs(dx) > Math.abs(dy)) {
                enemy.animationRow = dx > 0 ? 2 : 1; // right : left
            } else {
                enemy.animationRow = dy > 0 ? 0 : 3; // down : up
            }
        
            // 🔁 Animate boss always
            if (now - enemy.lastFrameTime > FRAME_RATE) {
                enemy.frameIndex = (enemy.frameIndex + 1) % 4;
                enemy.lastFrameTime = now;
            }
        
            if (enemy.chasePlayer) {
                let unitX = dx / distance;
                enemy.x += unitX * enemy.speed;
            }

            // 🔫 Shoot at player
            if (
                enemy.canShoot &&
                !enemy.isPreparingShot &&
                now - enemy.lastShot > enemy.shootCooldown
            ) {
                enemy.isPreparingShot = true;
                enemy.flashRed = true;
            
                setTimeout(() => {
                    enemy.lastShot = Date.now();
                    enemy.flashRed = false;
                    enemy.isPreparingShot = false;
            
                    const speed = 7.5;
                    const useVersion1 = Math.random() < 0.5;
            
                    if (useVersion1) {
                        let dx = player.x - enemy.x;
                        let dy = player.y - enemy.y;
                        const distance = Math.hypot(dx, dy);
            
                        enemyBullets.push({
                            x: enemy.x,
                            y: enemy.y,
                            dx: (dx / distance) * speed,
                            dy: (dy / distance) * speed,
                            size: 150,
                            version: "v1",
                            owner: enemy,
                            damage: ENEMY_BULLET_DAMAGE_V1
                        });
                    } else {
                        for (let i = 0; i < 5; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const dx = Math.cos(angle);
                            const dy = Math.sin(angle);
            
                            enemyBullets.push({
                                x: enemy.x,
                                y: enemy.y,
                                dx: dx * speed,
                                dy: dy * speed,
                                size: 100,
                                version: "v2",
                                owner: enemy,
                                damage: ENEMY_BULLET_DAMAGE_V2
                            });
                        }
                    }
                }, 200); // delay before firing
            }            
                        
        
            // 👾 Summon minions from other rooms
            if (enemy.canSummon && now - enemy.lastSummon > enemy.summonCooldown) {
                enemy.lastSummon = now;
            
                const summonTypes = Object.keys(enemyTypes); // ['cat', 'eye', 'meatman']
                const spawnCount = Math.floor(Math.random() * 2) + 1;
            
                for (let i = 0; i < spawnCount; i++) {
                    const type = summonTypes[Math.floor(Math.random() * summonTypes.length)];
                    const baseStats = enemyTypes[type];
            
                    const newEnemy = {
                        ...baseStats,
                        type,
                        x: enemy.x + (Math.random() * 100 - 50),
                        y: enemy.y + (Math.random() * 100 - 50),
                        dx: 0,
                        dy: 0,
                        frameIndex: 0,
                        animationRow: 0,
                        lastFrameTime: 0,
                        lastDamageTime: 0,
                        flashWhite: false, 
                        flashEndTime: 0,
                        image: enemySprites[type]
                    };
            
                    enemies.push(newEnemy);
            
                    // optional: play minion sound
                    switch (type) {
                        case "cat": catSpawnSound.play(); break;
                        case "eye": eyeSpawnSound.play(); break;
                        case "meatman": meatmanSpawnSound.play(); break;
                    }
                }
            }

            // 💝 Attempt to spawn a powerup
if (!bossPowerup && now - lastBossPowerupTime > bossPowerupCooldown) {
    lastBossPowerupTime = now;

    // Pick a random powerup
    const powerupData = bossPowerups[Math.floor(Math.random() * bossPowerups.length)];

    // Generate random spawn position (far from boss)
    let px, py, attempts = 0;
    do {
        px = enemy.x + (Math.random() * 240 - 120); // range: -120 to +120
        py = enemy.y + (Math.random() * 240 - 120);
        attempts++;
    } while (attempts < 10 && Math.hypot(px - enemy.x, py - enemy.y) < 300);
    

    bossPowerup = {
        ...powerupData,
        x: px,
        y: py,
        collected: false
    };

    console.log("💝 Boss dropped a " + bossPowerup.name);
}

            
            
        }
        
        
        
        if (enemy.chasePlayer && enemy.type !== "boss") {
            let dx = player.x - enemy.x;
            let dy = player.y - enemy.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let unitX = dx / distance;
            let unitY = dy / distance;

            // Set direction row based on movement
            if (Math.abs(dx) > Math.abs(dy)) {
                enemy.animationRow = dx > 0 ? 2 : 1; // right : left
            } else {
                enemy.animationRow = dy > 0 ? 0 : 3; // down : up
            }

            enemy.x += unitX * enemy.speed;
            enemy.y += unitY * enemy.speed;
        }

        // Frame animation timing
        if (now - enemy.lastFrameTime > FRAME_RATE) {
            enemy.frameIndex = (enemy.frameIndex + 1) % 4; // assuming 4 frames per row
            enemy.lastFrameTime = now;
        }

        if (enemy.flashWhite && Date.now() > enemy.flashEndTime) {
            enemy.flashWhite = false;
        }
        
    }
}

function drawEnemies() {
    for (let enemy of enemies) {
        if (!enemy.image && enemySprites[enemy.type]) {
            enemy.image = enemySprites[enemy.type];
        }

        if (!enemy.image) continue; // skip if no sprite exists

        const scale = enemy.size / 32; // default size is 32
        const drawWidth = (FRAME_WIDTH / 4) * scale;
        const drawHeight = (FRAME_HEIGHT / 4) * scale;

        // ⚡ Handle flash states
        if (enemy.flashWhite) {
            ctx.filter = "brightness(1000%)"; // pure white flash
        } else if (enemy.flashRed) {
            ctx.filter = "brightness(100%) saturate(10000%) hue-rotate(0deg)"; // red tint
        } else {
            ctx.filter = "none";
        }

        ctx.drawImage(
            enemy.image,
            enemy.frameIndex * FRAME_WIDTH,
            enemy.animationRow * FRAME_HEIGHT,
            FRAME_WIDTH, FRAME_HEIGHT,
            enemy.x - drawWidth / 2,
            enemy.y - drawHeight / 2,
            drawWidth, drawHeight
        );

        ctx.filter = "none"; // always reset after drawing
    }
}


function loadEnemiesForRoom() {
    doorsLocked = true;
    const key = `${currentX},${currentY}`;

    if (defeatedEnemies[key]) {
        enemies.length = 0;
        doorsLocked = false;
        return;
    }

    enemies.length = 0;

    if (roomEnemies[key]) {
        for (let enemyData of roomEnemies[key]) {
            const baseStats = enemyTypes[enemyData.type];
            
            enemies.push({
                ...baseStats,
                ...enemyData, // overrides go last (x, y, or optional custom values)
                dx: 0,
                dy: 0,
                lastDamageTime: 0,
                frameIndex: enemyData.frameIndex || 0,
                lastFrameTime: enemyData.lastFrameTime || 0,
                animationRow: enemyData.animationRow || 0,
                image: enemySprites[enemyData.type]
            });
        
            if (enemyData.hp > 0) {
                switch (enemyData.type) {
                    case "cat":
                        catSpawnSound.play();
                        break;
                    case "eye":
                        eyeSpawnSound.play();
                        break;
                    case "meatman":
                        meatmanSpawnSound.play();
                        break;
                }
            }            
        }
        
    } else {
        doorsLocked = false;
    }
}

function triggerVictory() {
    window.location.href = "win.html";
}



function triggerJumpscare() {

    if (player.hp <= 0) {  
        
    // Stop game loop
    cancelAnimationFrame(gameLoopId);

    // Freeze input
    window.removeEventListener("keydown", shoot);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "128px Pixel";
    ctx.textAlign = "center";
    ctx.fillText("You Died", canvas.width / 2, canvas.height / 2);
    ctx.font = "64px Pixel";
    ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 100);

    window.addEventListener("keydown", handleRestartKey);

    }

}

function handleRestartKey(e) {
    if (e.key === "r" || e.key === "R") {
        window.removeEventListener("keydown", handleRestartKey);
        restartGame();
    }
}


function checkPlayerCollision() {
    const currentTime = Date.now();

    // Check collision with enemies
    // Check collision with enemies
for (let enemy of enemies) {
    if (
        player.x < enemy.x + enemy.size &&
        player.x + player.size > enemy.x &&
        player.y < enemy.y + enemy.size &&
        player.y + player.size > enemy.y 
    ) {
        // Only deal damage if not a boss
        if (enemy.name !== "boss") {
            if (currentTime - player.lastDamageTime > player.damageCooldown) {
                player.hp -= enemy.damage;
                player.lastDamageTime = currentTime;
            }
        }
    }
}

// Check collision with enemy bullets
for (let bullet of enemyBullets) {
    if (
        player.x < bullet.x + bullet.size &&
        player.x + player.size > bullet.x &&
        player.y < bullet.y + bullet.size &&
        player.y + player.size > bullet.y
    ) {
        if (currentTime - player.lastDamageTime > player.damageCooldown) {
            player.hp -= 1;
            player.lastDamageTime = currentTime;
        }
    }
}
    
}

function checkEnemyBulletsHitEnemies() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];

        for (let j = enemies.length - 1; j >= 0; j--) {
            const target = enemies[j];

            if (target.type === "boss") continue; // 🛡️ don't let the boss shoot himself

            const distX = bullet.x - target.x;
            const distY = bullet.y - target.y;
            const dist = Math.hypot(distX, distY);

            if (dist < target.size / 2) {
                // 💥 Damage enemy
                target.hp -= 1;

                if (target.hp <= 0) {
                    enemies.splice(j, 1);
                }

                enemyBullets.splice(i, 1); // remove bullet
                break;
            }
        }
    }
}


function checkBulletCollision() {
    const key = `${currentX},${currentY}`; // Declare key here

    for (let i = playerBullets.length - 1; i >= 0; i--) {
        let bullet = playerBullets[i];

        for (let j = 0; j < enemies.length; j++) {
            let enemy = enemies[j];

            // Check if the bullet collides with the enemy
            if (
                bullet.x < enemy.x + enemy.size &&
                bullet.x + bulletSize > enemy.x &&
                bullet.y < enemy.y + enemy.size &&
                bullet.y + bulletSize > enemy.y
            ) {
                // Bullet hit the enemy: decrease enemy HP
                enemy.hp -= bulletDamage;

                // ⚡ Trigger white flash
                enemy.flashWhite = true;
                enemy.flashEndTime = Date.now() + 100; // flash for 100ms


                // Remove the bullet
                playerBullets.splice(i, 1);

                // If the enemy's HP is 0 or less, remove it from the game

                
                if (enemy.hp <= 0) {
                    switch (enemy.type) {
                        case "cat":
                            catDeathSound.play();
                            break;
                        case "eye":
                            eyeDeathSound.play();
                            break;
                        case "meatman":
                            meatmanDeathSound.play();
                            break;
                    }
                    

                    if (enemy.type === "boss") {
                        enemies = []; // 💥 wipe all enemies including minions
                        triggerVictory();
                        return;
                    } else {
                        enemies.splice(j, 1);
                    }
                    

                    // 🟢 Unlock doors if all enemies are dead
                    if (enemies.length === 0) {
                        doorsLocked = false;
                        defeatedEnemies[key] = true; // Mark enemies in this room as defeated
                    }
                }
            }
        }
    }
}

function renderHearts() {
    const container = document.getElementById("hearts-container");
    container.innerHTML = "";

    const totalHearts = player.maxHP / 2;
    const fullHearts = Math.floor(player.hp / 2);
    const halfHearts = player.hp % 2;

    for (let i = 0; i < totalHearts; i++) {
        const img = document.createElement("img");

        if (i < fullHearts) {
            img.src = heartImage.src;
        } else if (i === fullHearts && halfHearts) {
            img.src = halfHeartImage.src;
        } else {
            img.src = emptyHeartImage.src;
        }

        img.classList.add("heart-icon");
        container.appendChild(img);
    }
}

// Game Loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    update();
    checkPlayerCollision();
    checkEnemyBulletsHitEnemies();
    checkBulletCollision();  
    drawPowerups(); 
    drawDoors(); // Draw doors before player so they are behind
    drawBullets();
    updateEnemies();
    drawEnemies();
    const boss = enemies.find(e => e.type === "boss");
    if (boss) drawBossHealthBar(boss);
    renderHearts(); // Add this line
    triggerJumpscare();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function restartGame() {

    // Reset position
    player.hp = player.maxHP;
    player.lastDamageTime = 0;

    // Reset progress
    currentX = 0;
    currentY = 0;
    enemies.length = 0;
    playerBullets.length = 0;
    enemyBullets.length = 0;
    for (let key in powerupConfigs) {
        powerupConfigs[key].collected = false;
    }
    for (let key in defeatedEnemies) {
        delete defeatedEnemies[key];
    }

    // Reset powerup effects
    hasPowerup = false;
    powerupBox.src = "Assets/powerUp.png";
    bulletImage.src = "Assets/bullet.png";
    cooldown = 300;

    // Reset map image
    map.src = `Assets/x0y0.png`;

    // Load room + resume game
    loadEnemiesForRoom();
    roomChanging = false;
    player.speed = 4;
}

// Start the game when images load
player.image.onload = () => requestAnimationFrame(drawFrame);
doorImage.onload = gameLoop;
backgroundImage.onload = gameLoop;
Promise.all([
    new Promise(res => doorImage.onload = res),
    new Promise(res => backgroundImage.onload = res),
]).then(() => {
    requestAnimationFrame(gameLoop);
});

const dialogues = [
    {
      name: "Jaja",
      avatar: "Assets/jajaHeadshot.png",
      text: "- Kanku berikan semua,"
    },
    {
      name: "Jaja",
      avatar: "Assets/jajaHeadshot.png",
      text: "- Agar kau gembira sentiasa."
    },
    {
      name: "Jaja",
      avatar: "Assets/jajaHeadshot.png",
      text: "Engkau tetap pergi..."
    },
    {
      name: "Jaja",
      avatar: "Assets/jajaHeadshot.png",
      text: "Pergi meninggalkanku sendiri."
    }
  ];

  let currentIndex = 0;
  let isTyping = false;
  let typingTimeout;
  const avatarEl = document.getElementById("avatar");
  const nameEl = document.getElementById("character-name");
  const textEl = document.getElementById("dialogue-text");
  const buttonEl = document.getElementById("next-button");
  const boxEl = document.getElementById("dialogue-box");
  const popSound = document.getElementById("pop-sound");

  function playPop() {
    popSound.playbackRate = 10;
    popSound.currentTime = 0;
    popSound.play();
  }

  async function typeText(text) {
    isTyping = true;
    buttonEl.disabled = true;
    textEl.textContent = "";
    for (let i = 0; i < text.length; i++) {
      textEl.textContent += text[i];
      if (text[i] !== " ") playPop();
      await new Promise(resolve => {
        typingTimeout = setTimeout(resolve, 25);
      });
      if (!isTyping) return;
    }
    isTyping = false;
    buttonEl.disabled = false;
  }

  function showDialogue(index) {
    const line = dialogues[index];
    avatarEl.src = line.avatar;
    nameEl.textContent = line.name;
    typeText(line.text);
  }

    currentIndex++;
    if (currentIndex < dialogues.length) {
      showDialogue(currentIndex);
    } else {
      buttonEl.disabled = true;
      setTimeout(() => {
        boxEl.classList.add("fade-out");
      }, 500);
    }
  });

  window.onload = () => {
    showDialogue(currentIndex);
    setTimeout(() => {
      boxEl.classList.add("fade-in");
    }, 100);
  };
