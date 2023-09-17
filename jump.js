class Game {
    constructor() {
        this.controller = new Controller();
        this.ticker = this.tick.bind(this);
        const canvas = document.getElementById("myCanvas");
        canvas.width = this.w = window.innerWidth * 0.8;
        canvas.height = this.h = window.innerHeight * 0.8;
        this.ctx = canvas.getContext("2d");
        this.playerSprite = new Sprite(canvas.width / 2, canvas.height - 80);
        this.playerSprite.xmin = 0;
        this.playerSprite.xmax = this.w - 50;
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
        if (this.controller.isDown(Button.Left)) {
            if (!this.controller.isDown(Button.Right)) {
                this.playerSprite.accelerate(-1);
            }
        }
        else if (this.controller.isDown(Button.Right)) {
            this.playerSprite.accelerate(+1);
        }
        else {
            this.playerSprite.decelerate();
        }
        this.playerSprite.update();
    }
    draw() {
        this.drawBackground();
        this.playerSprite.draw(this.ctx);
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
    ' ': Button.Space,
};
class Controller {
    isDown(b) {
        return this.buttons[b];
    }
    constructor() {
        this.buttons = new Array(Button.Count).fill(false);
        document.addEventListener('keydown', (event) => {
            const button = bindings[event.key];
            if (button !== undefined)
                this.buttons[button] = true;
        });
        document.addEventListener('keyup', (event) => {
            const button = bindings[event.key];
            if (button !== undefined)
                this.buttons[button] = false;
        });
    }
}
class Sprite {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.sz = 50;
        this.vx = 0;
        this.vy = 0;
        this.vxMax = 10;
        this.axUp = 0.8;
        this.axDown = 0.4;
        this.xmin = 0;
        this.xmax = 500;
    }
    move(x, y) {
        this.x += x;
        this.y += y;
    }
    accelerate(direction) {
        this.vx += this.axUp * direction;
        this.vx = clampAbs(this.vx, this.vxMax);
    }
    decelerate() {
        this.vx -= Math.sign(this.vx) * this.axDown;
        this.vx = clampAbs(this.vx, this.vxMax);
    }
    update() {
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
    draw(ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y - this.sz, this.sz, this.sz);
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
