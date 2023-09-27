// Stuff to do:
// - Mobile controls
// - Model floor as a block
// - Sprite graphics
// - Collisions between mobs/player
class Game {
    w;
    h;
    ctx;
    controller = new Controller();
    player;
    obstacles;
    enemies = [];
    ticker = this.tick.bind(this);
    enemyDropCountDown = 60;
    // Plan for better overlap system:
    // - Refactor to a flat list of sprites.
    // - Add a way to remove a sprite.
    // - Create general overlap detector that given any two sprites will characterize the overlap
    //   (e.g., list surfaces that overlap).
    constructor(w, h) {
        this.w = w;
        this.h = h;
        const canvas = document.getElementById("myCanvas");
        // CSS sizing of the canvas doesn't actualy update its width and height attributes.
        canvas.width = w;
        canvas.height = h;
        this.ctx = canvas.getContext("2d");
        this.player = new PlayerSprite(this.w / 2, this.h - 80);
        this.player.xmin = 0;
        this.player.xmax = this.w - 50;
        this.player.ymax = this.h;
        this.player.place();
        const tierHeight = 120;
        this.obstacles = [
            new ObstacleSprite(100, this.h - tierHeight, this.w - 300, 20),
            new ObstacleSprite(this.w / 2, this.h - tierHeight * 2, this.w * 0.4, 20),
            new ObstacleSprite(100, this.h - tierHeight * 3, 200, 20),
            new ObstacleSprite(400, this.h - tierHeight * 3, 200, 20),
        ];
    }
    run() {
        this.tick();
    }
    tick() {
        this.update();
        this.draw();
        requestAnimationFrame(this.ticker);
    }
    update() {
        this.updateForController();
        this.updateDrops();
        this.player.update();
        for (const e of this.enemies) {
            e.update();
        }
        this.player.updateForOverlaps(this.obstacles);
        this.player.updateForGround();
        for (const e of this.enemies) {
            e.updateForOverlaps(this.obstacles);
            e.updateForGround();
        }
    }
    updateDrops() {
        if (this.enemies.length < 3) {
            if (--this.enemyDropCountDown <= 0) {
                this.dropEnemy();
            }
        }
    }
    dropEnemy() {
        const enemy = new EnemySprite(70 + Math.random() * (this.w - 140), 0);
        this.enemies.push(enemy);
        this.enemyDropCountDown = 60;
    }
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
            this.player.accelerateForJump();
        }
    }
    draw() {
        this.drawBackground();
        for (const obstacle of this.obstacles) {
            obstacle.draw(this.ctx);
        }
        for (const e of this.enemies) {
            e.draw(this.ctx);
        }
        this.player.draw(this.ctx);
    }
    drawBackground() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.w, this.h);
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
class Sprite {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
class MovingSprite extends Sprite {
    constructor(x, y) {
        super(x, y);
    }
    vx = 0;
    vy = 0;
    sz = 50;
    ayFall = 1;
    jumpFrames = 0;
    xmin = 0;
    xmax = 500;
    ymax = 500;
    place(y) {
        this.y = y ?? this.ymax;
        this.vy = 0;
        this.jumpFrames = 0;
    }
    move(x, y) {
        this.x += x;
        this.y += y;
    }
    update() {
        if (this.y < this.ymax) {
            this.vy += this.ayFall;
        }
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < this.xmin) {
            this.x = this.xmin;
            this.vx = -0.8 * this.vx;
        }
        if (this.x > this.xmax) {
            this.x = this.xmax;
            this.vx = -0.8 * this.vx;
        }
    }
    updateForOverlaps(obstacles) {
        for (const obstacle of obstacles) {
            const [ox, oy, ow, oh] = obstacle.xywh();
            if (this.y - this.sz <= oy && oy <= this.y &&
                this.x + this.sz >= ox && this.x <= ox + ow) {
                if (this.vy < 0) {
                    this.y = oy + this.sz;
                    this.vy = 0;
                }
            }
            if (this.y - this.sz <= oy - oh && oy - oh <= this.y &&
                this.x + this.sz >= ox && this.x <= ox + ow) {
                if (this.vy > 0) {
                    this.place(oy - oh);
                }
            }
        }
    }
    updateForGround() {
        if (this.y > this.ymax) {
            this.place();
        }
    }
}
class PlayerSprite extends MovingSprite {
    vxMax = 10;
    axUp = 0.8;
    axDown = 0.4;
    ayJump = 3;
    vyJumpMax = 20;
    maxJumpFrames = 8;
    constructor(x, y) {
        super(x, y);
    }
    accelerateX(direction) {
        this.vx += this.axUp * direction;
        this.vx = clampAbs(this.vx, this.vxMax);
    }
    decelerateX() {
        const newVX = this.vx - Math.sign(this.vx) * this.axDown;
        if (Math.sign(newVX) != Math.sign(this.vx)) {
            this.vx = 0;
        }
        else {
            this.vx = clampAbs(newVX, this.vxMax);
        }
    }
    accelerateForJump() {
        if (this.jumpFrames < this.maxJumpFrames) {
            this.vy -= this.ayJump;
            this.vy = Math.max(this.vy, -this.vyJumpMax);
            this.jumpFrames++;
        }
    }
    draw(ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y - this.sz, this.sz, this.sz);
    }
}
class EnemySprite extends MovingSprite {
    constructor(x, y) {
        super(x, y);
        this.vx = (Math.random() < 0.5 ? -1 : 1) * 2;
    }
    draw(ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - this.sz, this.sz, this.sz);
    }
}
class ObstacleSprite extends Sprite {
    w;
    h;
    constructor(x, y, w, h) {
        super(x, y);
        this.w = w;
        this.h = h;
    }
    draw(ctx) {
        ctx.fillStyle = 'brown';
        ctx.fillRect(this.x, this.y - this.h, this.w, this.h);
    }
    xywh() {
        return [this.x, this.y, this.w, this.h];
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
