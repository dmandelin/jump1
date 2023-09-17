class Game {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly w: number;
    private readonly h: number;

    private readonly controller = new Controller();
    private readonly playerSprite: Sprite;

    private readonly ticker = this.tick.bind(this);

    constructor() {
        const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;    
        canvas.width = this.w = window.innerWidth * 0.8;
        canvas.height = this.h = window.innerHeight * 0.8;
        
        this.ctx = canvas.getContext("2d")!;

        this.playerSprite = new Sprite(canvas.width / 2, canvas.height - 80);
        this.playerSprite.xmin = 0;
        this.playerSprite.xmax = this.w - 50;
    }

    run() {
        this.tick();
    }

    tick() {
        this.update();
        this.draw()
        requestAnimationFrame(this.ticker);
    }

    update() {
        if (this.controller.isDown(Button.Left)) {
            if (!this.controller.isDown(Button.Right)) {
                this.playerSprite.accelerate(-1);
            }
        } else if (this.controller.isDown(Button.Right)) {
            this.playerSprite.accelerate(+1);
        } else {
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

enum Button {
    Left,
    Right,
    Space,
    Count,
}

const bindings = {
    'ArrowLeft': Button.Left,
    'ArrowRight': Button.Right,
    ' ': Button.Space,
}

class Controller {
    private buttons = new Array(Button.Count).fill(false);

    isDown(b: Button): false {
        return this.buttons[b];
    }

    constructor() {
        document.addEventListener('keydown', (event) => {
            const button = bindings[event.key];
            if (button !== undefined) this.buttons[button] = true;
        });
        document.addEventListener('keyup', (event) => {
            const button = bindings[event.key];
            if (button !== undefined) this.buttons[button] = false;
        });
    }
}

class Sprite {
    readonly sz = 50;

    private vx = 0;
    private vy = 0;

    private vxMax = 10;
    private axUp = 0.8;
    private axDown = 0.4;

    xmin = 0;
    xmax = 500;

    constructor(private x: number, private y: number) {
    }

    move(x: number, y: number) {
        this.x += x;
        this.y += y;
    }

    accelerate(direction: 1|-1) {
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

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y - this.sz, this.sz, this.sz);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    new Game().run();
});

function clamp(v: number, min: number, max: number) {
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

function clampAbs(v: number, absMax: number) {
    if (v < -absMax) return -absMax;
    if (v > absMax) return absMax;
    return v;
}