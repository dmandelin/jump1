// - Stone bunny crumbles after a while
// - Skeletons don't slow down on wall collision
// - More platforms and things
// - Some interesting behavior when skeletons collide with each other (maybe)
// Fancier features to add:
// - ladders
// - springs
// - trapdoors
// - slanted surfaces
// - traps that can be sprung to attack skeletons
// - flying enemy
// Refactorings:
// - Better hiding of player
const Images = {
    player: img('bunny.png'),
    playerR1: img('bunny-right-1.png'),
    playerR2: img('bunny-right-2.png'),
    playerL1: img('bunny-left-1.png'),
    playerL2: img('bunny-left-2.png'),
    playerStone: img('stonebunny.png'),
    skeleton: img('skeleton.png'),
    goal: img('trophy.png'),
    wall: img('wall.png'),
};
function img(filename) {
    const image = new Image();
    image.src = 'img/' + filename;
    return image;
}
class Game {
    w;
    h;
    ctx;
    controller = new Controller();
    player;
    obstacles;
    enemies = [];
    xView = 0;
    playerRespawnCountdown = -1;
    enemyLimit = 3;
    enemyDropCountDown = 60;
    trophy;
    ticker = this.tick.bind(this);
    score = 0;
    overlappedTrophy = false;
    metersOn = false;
    tPrev = 0;
    dtFrameAvg = 0;
    dtAvg = 0;
    dtUpdateAvg = 0;
    dtDrawAvg = 0;
    constructor(w, h) {
        this.w = w;
        this.h = h;
        const canvas = document.getElementById("myCanvas");
        // CSS sizing of the canvas doesn't actually update its width and height attributes.
        canvas.width = w;
        canvas.height = h;
        this.ctx = canvas.getContext("2d");
        const tierHeight = 120;
        this.obstacles = [
            // Start block
            new ObstacleSprite(Images.wall, 0, 0.4 * this.h, 50, 50),
            // Bottom
            new ObstacleSprite(Images.wall, 0, this.h + 1, this.w * 2, 1),
            // Left
            new ObstacleSprite(Images.wall, -300, this.h, 300, this.h),
            // Right
            new ObstacleSprite(Images.wall, this.w * 2, this.h, 300, this.h),
            // Platforms
            new ObstacleSprite(Images.wall, 100, 20 + this.h - tierHeight, this.w - 300, 20),
            new ObstacleSprite(Images.wall, this.w / 2, 20 + this.h - tierHeight * 2, this.w * 0.4, 20),
            new ObstacleSprite(Images.wall, 400, 20 + this.h - tierHeight * 3, 200, 20),
            // Further right
            new ObstacleSprite(Images.wall, this.w, this.h - tierHeight * 2, this.w * 0.4, 20),
            new ObstacleSprite(Images.wall, this.w * 1.3, this.h - tierHeight * 3, this.w * 0.5, 20),
        ];
        this.trophy = new TrophySprite(Images.goal, this.w * 2 - 100, 100, 32, 32);
        this.player = new PlayerSprite(10, 0.36 * this.h - 50, 31, 50);
        this.player.xmin = 0;
        this.player.xmax = this.w * 2 - 50;
        this.scrollForPlayer();
        document.addEventListener('keydown', (event) => {
            if (event.key === 'm') {
                this.metersOn = !this.metersOn;
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'e') {
                if (this.enemyLimit) {
                    this.enemyLimit = 0;
                    this.enemies.length = 0;
                }
                else {
                    this.enemyLimit = 3;
                }
            }
        });
    }
    run() {
        this.tick();
    }
    tick() {
        const t0 = performance.now();
        const dtFrame = t0 - this.tPrev;
        this.update();
        const t1 = performance.now();
        this.draw();
        requestAnimationFrame(this.ticker);
        const t2 = performance.now();
        const dtUpdate = t1 - t0;
        const dtDraw = t2 - t1;
        const dt = t2 - t0;
        const α = this.dtAvg == 0 ? 1 : 0.2;
        this.dtAvg = α * dt + (1 - α) * this.dtAvg;
        this.dtUpdateAvg = α * dtUpdate + (1 - α) * this.dtUpdateAvg;
        this.dtDrawAvg = α * dtDraw + (1 - α) * this.dtDrawAvg;
        if (this.tPrev != 0) {
            this.dtFrameAvg = α * dtFrame + (1 - α) * this.dtFrameAvg;
        }
        this.tPrev = t0;
    }
    update() {
        this.updateForController();
        this.updateDrops();
        this.player.update();
        const heldGround = new Set();
        for (const e of this.enemies) {
            if (e.holdGround) {
                if (heldGround.has(e.ground)) {
                    e.holdGround = false;
                }
                heldGround.add(e.ground);
            }
            e.update();
        }
        this.player.updateForOverlaps(this.obstacles);
        for (const e of this.enemies) {
            e.updateForOverlaps(this.obstacles);
        }
        if (!this.player.hidden) {
            for (const e of this.enemies) {
                if (this.player.overlaps(e)) {
                    this.obstacles.push(new ObstacleSprite(Images.playerStone, this.player.x, this.player.y, this.player.w, this.player.h));
                    this.player.hide();
                    this.playerRespawnCountdown = 180;
                }
            }
        }
        if (this.playerRespawnCountdown > 0) {
            if (--this.playerRespawnCountdown == 0) {
                if (this.player.hidden) {
                    this.player.respawn();
                }
                this.playerRespawnCountdown = -1;
            }
        }
        if (!this.player.hidden && this.player.overlaps(this.trophy)) {
            if (!this.overlappedTrophy) {
                ++this.score;
                ++this.enemyLimit;
                this.overlappedTrophy = true;
            }
        }
        else {
            this.overlappedTrophy = false;
        }
        this.scrollForPlayer();
    }
    updateDrops() {
        if (this.enemies.length < this.enemyLimit) {
            if (--this.enemyDropCountDown <= 0) {
                this.dropEnemy();
            }
        }
    }
    dropEnemy() {
        const enemy = new EnemySprite(Images.skeleton, 70 + Math.random() * (this.w - 140), 0, 28, 50);
        this.enemies.push(enemy);
        this.enemyDropCountDown = 60;
    }
    jumpDownCount = 0;
    jumpHeld = false;
    updateForController() {
        if (this.controller.isDown(Button.Left)) {
            if (!this.controller.isDown(Button.Right)) {
                this.player.accelerateX(-1);
            }
        }
        else if (this.controller.isDown(Button.Right)) {
            this.player.accelerateX(+1);
        }
        else {
            this.player.decelerateX();
        }
        if (this.controller.isDown(Button.Space)) {
            if (++this.jumpDownCount == this.player.jumpChargeMax) {
                this.player.jump(this.jumpDownCount);
                this.jumpHeld = true;
            }
        }
        else {
            if (this.jumpDownCount) {
                if (!this.jumpHeld) {
                    this.player.jump(this.jumpDownCount);
                }
                this.jumpDownCount = 0;
            }
            this.jumpHeld = false;
        }
    }
    scrollLead = 300;
    scrollForPlayer() {
        const xPlayerOnView = this.player.x - this.xView;
        const xShiftNeeded = xPlayerOnView < this.scrollLead ?
            this.scrollLead - xPlayerOnView : (xPlayerOnView > this.w - this.scrollLead ?
            (this.w - this.scrollLead) - xPlayerOnView :
            0);
        if (!xShiftNeeded)
            return;
        this.ctx.translate(xShiftNeeded, 0);
        this.xView -= xShiftNeeded;
    }
    draw() {
        this.drawBackground();
        for (const obstacle of this.obstacles) {
            obstacle.draw(this.ctx);
        }
        for (const e of this.enemies) {
            e.draw(this.ctx);
        }
        this.drawScore();
        this.trophy.draw(this.ctx);
        this.player.draw(this.ctx);
        this.drawMeters();
    }
    drawBackground() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.w * 2, this.h);
    }
    drawScore() {
        if (this.score) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px monospace';
            this.ctx.fillText(String(this.score), this.w - 30 + this.xView, 30);
        }
    }
    drawMeters() {
        if (!this.metersOn)
            return;
        const fps = 1e3 / this.dtFrameAvg;
        const x = this.w - 80;
        let y = 0;
        this.ctx.fillStyle = '#eef';
        this.ctx.font = '16px sans-serif';
        this.ctx.fillText(`FPS: ${fps.toFixed(1)}`, x, y += 20);
        this.ctx.fillText(`dt:  ${(this.dtFrameAvg).toFixed(0.1)}`, x, y += 20);
        this.ctx.fillText(` c:  ${(this.dtAvg).toFixed(0.1)}`, x, y += 20);
        this.ctx.fillText(`  u: ${(this.dtUpdateAvg).toFixed(0.1)}`, x, y += 20);
        this.ctx.fillText(`  d: ${(this.dtDrawAvg).toFixed(0.1)}`, x, y += 20);
    }
}
var Button;
(function (Button) {
    Button[Button["Left"] = 0] = "Left";
    Button[Button["Right"] = 1] = "Right";
    Button[Button["Space"] = 2] = "Space";
    Button[Button["Count"] = 3] = "Count";
})(Button || (Button = {}));
const keyBindings = {
    'ArrowLeft': Button.Left,
    'ArrowRight': Button.Right,
    'Space': Button.Space,
    'ControlLeft': Button.Space,
};
const buttonBindings = {
    'left': Button.Left,
    'right': Button.Right,
    'up': Button.Space,
};
class Controller {
    buttons = new Array(Button.Count).fill(false);
    isDown(b) {
        return this.buttons[b];
    }
    constructor() {
        document.addEventListener('keydown', (event) => {
            const button = keyBindings[event.code];
            if (button !== undefined)
                this.buttons[button] = true;
        });
        document.addEventListener('keyup', (event) => {
            const button = keyBindings[event.code];
            if (button !== undefined)
                this.buttons[button] = false;
        });
        for (const [buttonId, button] of Object.entries(buttonBindings)) {
            const element = document.getElementById(buttonId);
            if (!element)
                continue;
            element.addEventListener('mousedown', (event) => {
                this.buttons[button] = true;
            });
            element.addEventListener('mouseup', (event) => {
                this.buttons[button] = false;
            });
            element.addEventListener('touchstart', (event) => {
                this.buttons[button] = true;
            });
            element.addEventListener('touchend', (event) => {
                this.buttons[button] = false;
            });
        }
    }
}
var OverlapDirection;
(function (OverlapDirection) {
    OverlapDirection[OverlapDirection["Left"] = 0] = "Left";
    OverlapDirection[OverlapDirection["Right"] = 1] = "Right";
    OverlapDirection[OverlapDirection["Top"] = 2] = "Top";
    OverlapDirection[OverlapDirection["Bottom"] = 3] = "Bottom";
})(OverlapDirection || (OverlapDirection = {}));
class Ghost {
    x_;
    y_;
    w_;
    h_;
    constructor(x_, y_, w_, h_) {
        this.x_ = x_;
        this.y_ = y_;
        this.w_ = w_;
        this.h_ = h_;
    }
    get x() { return this.x_; }
    set x(v) { this.x_ = v; }
    get y() { return this.y_; }
    set y(v) { this.y_ = v; }
    get w() { return this.w_; }
    set w(v) { this.w_ = v; }
    get h() { return this.h_; }
    set h(v) { this.h_ = v; }
    xywh() { return [this.x, this.y, this.w, this.h]; }
    get l() { return this.x_; }
    set l(v) { this.x_ = v; }
    get r() { return this.x_ + this.w_; }
    set r(v) { this.x_ = v - this.w_; }
    get t() { return this.y_ - this.h_; }
    set t(v) { this.y_ = this.h_ + v; }
    get b() { return this.y_; }
    set b(v) { this.y_ = v; }
    get cx() { return this.x_ + 0.5 * this.w_; }
    get cy() { return this.y_ + 0.5 * this.h_; }
    overlaps(other) {
        return this.r > other.l && this.l < other.r && this.b > other.t && this.t < other.b;
    }
}
class Sprite extends Ghost {
    image;
    constructor(image, x, y, w, h) {
        super(x, y, w, h);
        this.image = image;
    }
    vx_ = 0;
    vy_ = 0;
    get vx() { return this.vx_; }
    set vx(v) { this.vx_ = v; }
    get vy() { return this.vy_; }
    set vy(v) { this.vy_ = v; }
    overlapDirectionWith(other) {
        if (this.vx >= 0) {
            if (this.vy >= 0) {
                return this.vx == 0 || (this.vy / this.vx) > (this.b - other.t) / (this.r - other.l)
                    ? OverlapDirection.Top : OverlapDirection.Left;
            }
            else {
                return this.vx == 0 || (this.vy / this.vx) < (this.t - other.b) / (this.r - other.l)
                    ? OverlapDirection.Bottom : OverlapDirection.Left;
            }
        }
        else {
            if (this.vy >= 0) {
                return this.vx == 0 || (this.vy / this.vx) < (this.b - other.t) / (this.l - other.r)
                    ? OverlapDirection.Top : OverlapDirection.Right;
            }
            else {
                return this.vx == 0 || (this.vy / this.vx) > (this.t - other.b) / (this.l - other.r)
                    ? OverlapDirection.Bottom : OverlapDirection.Right;
            }
        }
    }
    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y - this.h);
    }
}
class MovingSprite extends Sprite {
    ground_;
    ayFall = 1;
    xmin = 0;
    xmax = 500;
    hidden = false;
    hide() {
        this.hidden = true;
    }
    get ground() { return this.ground_; }
    set ground(v) { this.ground_ = v; }
    get grounded() { return !!this.ground; }
    move(x, y) {
        this.x += x;
        this.y += y;
    }
    update() {
        if (this.hidden)
            return;
        if (this.ground) {
            this.y += 2;
            if (!this.overlaps(this.ground)) {
                this.launched();
            }
            this.y -= 2;
        }
        if (!this.ground)
            this.vy += this.ayFall;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < this.xmin) {
            this.x = this.xmin;
            this.vx = -1 * this.vx;
        }
        if (this.x > this.xmax) {
            this.x = this.xmax;
            this.vx = -1 * this.vx;
        }
    }
    landed(ground) {
        this.ground = ground;
    }
    launched() {
        this.ground = undefined;
    }
    updateForOverlaps(obstacles) {
        if (this.hidden)
            return;
        for (const obstacle of obstacles) {
            if (this.overlaps(obstacle)) {
                switch (this.overlapDirectionWith(obstacle)) {
                    case OverlapDirection.Top:
                        this.b = obstacle.t;
                        this.vy = 0;
                        this.landed(obstacle);
                        break;
                    case OverlapDirection.Bottom:
                        this.t = obstacle.b;
                        this.vy = 0;
                        this.launched();
                        break;
                    case OverlapDirection.Left:
                        this.r = obstacle.l;
                        if (this.vx > 0)
                            this.vx *= -0.5;
                        break;
                    case OverlapDirection.Right:
                        this.l = obstacle.r;
                        if (this.vx < 0)
                            this.vx *= -0.5;
                        break;
                }
            }
        }
    }
}
class PlayerSprite extends MovingSprite {
    xRespawn;
    yRespawn;
    vxMax = 7;
    axAccel = 0.6;
    axAccelInAir = 0.2;
    axDecel = 0.4;
    ayJump = 5;
    vyJumpMax = 17;
    jumpChargeMax = 8;
    animationImagesL = [Images.playerL1, Images.playerL2];
    animationImagesR = [Images.playerR1, Images.playerR2];
    animationFrame = 0;
    animationSubFrame = 0;
    subFramesPerFrame = 5;
    constructor(x, y, w, h) {
        super(Images.playerR1, x, y, w, h);
        this.xRespawn = x;
        this.yRespawn = y;
        this.vx = (Math.random() < 0.5 ? -1 : 1) * 2;
    }
    update() {
        super.update();
        if (this.vx == 0)
            return;
        const images = this.vx < 0 ? this.animationImagesL : this.animationImagesR;
        if (++this.animationSubFrame == this.subFramesPerFrame) {
            this.animationSubFrame = 0;
            if (++this.animationFrame == images.length)
                this.animationFrame = 0;
        }
        this.image = images[this.animationFrame];
    }
    respawn() {
        this.x = this.xRespawn;
        this.y = this.yRespawn;
        this.vx = 0;
        this.vy = 0;
        this.hidden = false;
    }
    accelerateX(direction) {
        if (this.hidden)
            return;
        const ax = this.ground ? this.axAccel : this.axAccelInAir;
        this.vx += ax * direction;
        this.vx = clampAbs(this.vx, this.vxMax);
    }
    decelerateX() {
        if (this.hidden)
            return;
        if (!this.ground)
            return;
        const newVX = this.vx - Math.sign(this.vx) * this.axDecel;
        if (Math.sign(newVX) != Math.sign(this.vx)) {
            this.vx = 0;
        }
        else {
            this.vx = clampAbs(newVX, this.vxMax);
        }
    }
    jump(charge) {
        if (this.hidden)
            return;
        if (!this.grounded)
            return;
        this.vy -= Math.min(charge, this.jumpChargeMax) / this.jumpChargeMax * this.vyJumpMax;
        this.launched();
    }
    draw(ctx) {
        if (this.hidden)
            return;
        ctx.drawImage(this.image, this.x, this.y - this.h);
    }
}
class EnemySprite extends MovingSprite {
    holdGround = true;
    constructor(image, x, y, w, h) {
        super(image, x, y, w, h);
        this.vx = (Math.random() < 0.5 ? -1 : 1) * 2;
    }
    update() {
        if (this.holdGround) {
            this.turnIfNearEdge();
        }
        super.update();
    }
    turnIfNearEdge() {
        if (!this.ground)
            return;
        if (!this.ground.overlaps(new Ghost(this.x + this.vx * 15, this.y + 2, this.w, this.h))) {
            this.vx *= -1;
        }
    }
}
class TrophySprite extends Sprite {
}
class ObstacleSprite extends Sprite {
    draw(ctx) {
        if (!this.image.height)
            return;
        for (let y = this.y - this.h; y < this.y; y += this.image.height) {
            ctx.drawImage(this.image, 0, 0, this.w, this.h, this.x, y, this.w, this.h);
        }
    }
}
document.addEventListener("DOMContentLoaded", () => {
    let game;
    const canvas = document.querySelector('canvas');
    const resizeObserver = new ResizeObserver(entries => {
        if (game)
            return;
        for (let entry of entries) {
            if (entry.target === canvas) {
                (game = new Game(entry.contentRect.width, entry.contentRect.height)).run();
            }
        }
    });
    resizeObserver.observe(canvas);
});
function clamp(v, min, max) {
    if (v < min)
        return min;
    if (v > max)
        return max;
    return v;
}
function clampAbs(v, absMax) {
    if (v < -absMax)
        return -absMax;
    if (v > absMax)
        return absMax;
    return v;
}
