class Game {
    constructor() {
        this.controller = new Controller();
        this.enemies = [];
        this.ticker = this.tick.bind(this);
        this.enemyDropCountDown = 60;
        const canvas = document.getElementById("myCanvas");
        canvas.width = this.w = window.innerWidth * 0.8;
        canvas.height = this.h = window.innerHeight * 0.8;
        this.ctx = canvas.getContext("2d");
        this.player = new PlayerSprite(canvas.width / 2, canvas.height - 80);
        this.player.xmin = 0;
        this.player.xmax = this.w - 50;
        this.player.ymax = this.h;
        this.player.place();
        const tierHeight = 120;
        this.obstacles = [
            new ObstacleSprite(100, canvas.height - tierHeight, canvas.width - 300, 20),
            new ObstacleSprite(canvas.width / 2, canvas.height - tierHeight * 2, canvas.width * 0.4, 20),
            new ObstacleSprite(100, canvas.height - tierHeight * 3, 200, 20),
            new ObstacleSprite(400, canvas.height - tierHeight * 3, 200, 20),
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
const bindings = {
    'ArrowLeft': Button.Left,
    'ArrowRight': Button.Right,
    'Space': Button.Space,
    'ControlLeft': Button.Space,
};
class Controller {
    isDown(b) {
        return this.buttons[b];
    }
    constructor() {
        this.buttons = new Array(Button.Count).fill(false);
        document.addEventListener('keydown', (event) => {
            const button = bindings[event.code];
            if (button !== undefined)
                this.buttons[button] = true;
        });
        document.addEventListener('keyup', (event) => {
            const button = bindings[event.code];
            if (button !== undefined)
                this.buttons[button] = false;
        });
    }
}
class Sprite {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
class MovingSprite extends Sprite {
    constructor(x, y) {
        super(x, y);
        this.vx = 0;
        this.vy = 0;
        this.sz = 50;
        this.ayFall = 1;
        this.jumpFrames = 0;
        this.xmin = 0;
        this.xmax = 500;
        this.ymax = 500;
    }
    place(y) {
        this.y = y !== null && y !== void 0 ? y : this.ymax;
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
    constructor(x, y) {
        super(x, y);
        this.vxMax = 10;
        this.axUp = 0.8;
        this.axDown = 0.4;
        this.ayJump = 3;
        this.vyJumpMax = 20;
        this.maxJumpFrames = 8;
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
document.addEventListener("DOMContentLoaded", function () {
    new Game().run();
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
