// Stuff to do:
// - Model floor as a block
// - Sprite graphics
// - Collisions between mobs/player

class Game {
    private readonly ctx: CanvasRenderingContext2D;

    private readonly controller = new Controller();
    private readonly player: PlayerSprite;
    private readonly obstacles: ObstacleSprite[];
    private readonly enemies: EnemySprite[] = [];

    private xView = 0;

    private readonly enemyImage = new Image();
    private enemyDropCountDown = 60;

    private readonly ticker = this.tick.bind(this);

    private metersOn = false;
    private tPrev = 0;
    private dtFrameAvg = 0;
    private dtAvg = 0;
    private dtUpdateAvg = 0;
    private dtDrawAvg = 0;

    // Plan for better overlap system:
    // - Refactor to a flat list of sprites.
    // - Add a way to remove a sprite.
    // - Create general overlap detector that given any two sprites will characterize the overlap
    //   (e.g., list surfaces that overlap).

    constructor(private readonly w, private readonly h) {
        const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
        // CSS sizing of the canvas doesn't actualy update its width and height attributes.
        canvas.width = w;
        canvas.height = h;
        
        this.ctx = canvas.getContext("2d")!;

        const playerImage = new Image();
        playerImage.src = 'img/bunny.png';
        this.player = new PlayerSprite(playerImage, this.w / 2, this.h - 200, 31, 50);
        this.player.xmin = 0;
        this.player.xmax = this.w * 2 - 50;

        this.enemyImage.src = 'img/skeleton.png';

        const tierHeight = 120;
        this.obstacles = [
            // Bottom
            new ObstacleSprite(0, this.h + 1, this.w * 2, 1),
            // Left
            new ObstacleSprite(-200, this.h, 200, this.h),
            // Right
            new ObstacleSprite(this.w * 2, this.h, 200, this.h),
            // Platforms
            new ObstacleSprite(100, this.h - tierHeight, this.w - 300, 20),
            new ObstacleSprite(this.w / 2, this.h - tierHeight * 2, this.w * 0.4, 20),
            new ObstacleSprite(100, this.h - tierHeight * 3, 200, 20),
            new ObstacleSprite(400, this.h - tierHeight * 3, 200, 20),
            // Further right
            new ObstacleSprite(this.w, this.h - tierHeight * 2, this.w * 0.4, 20),
            new ObstacleSprite(this.w * 1.3, this.h - tierHeight * 3, this.w * 0.5, 20),
        ]

        document.addEventListener('keydown', (event) => {
            if (event.key === 'm') {
                this.metersOn = !this.metersOn;
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
        this.draw()
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
        for (const e of this.enemies) {
            e.update();
        }

        this.player.updateForOverlaps(this.obstacles);
        for (const e of this.enemies) {
            e.updateForOverlaps(this.obstacles);
        }

        this.scrollForPlayer();
    }

    updateDrops() {
        if (this.enemies.length < 3) {
            if (--this.enemyDropCountDown <= 0) {
                this.dropEnemy();
            }
        }
    }

    dropEnemy() {
        const enemy = new EnemySprite(this.enemyImage, 70 + Math.random() * (this.w - 140), 0, 28, 50);
        this.enemies.push(enemy);
        this.enemyDropCountDown = 60;
    }

    updateForController() {
        if (this.controller.isDown(Button.Left)) {
            if (!this.controller.isDown(Button.Right)) {
                this.player.accelerateX(-1);
            }
        } else if (this.controller.isDown(Button.Right)) {
            this.player.accelerateX(+1);
        } else {
            this.player.decelerateX();
        }

        if (this.controller.isDown(Button.Space)) {
            this.player.accelerateForJump();
        }
    }

    scrollForPlayer() {
        const xPlayerOnView = this.player.getX() - this.xView;
        const xShiftNeeded = xPlayerOnView < 200 ?
            xPlayerOnView - 200 : (
                xPlayerOnView > this.w - 400 ?
                xPlayerOnView - (this.w - 400) :
                0);
        if (!xShiftNeeded) return;

        this.ctx.translate(-xShiftNeeded, 0);
        this.xView += xShiftNeeded;
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

        this.drawMeters();
    }

    drawBackground() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.w * 2, this.h);
    }

    drawMeters() {
        if (!this.metersOn) return;

        const fps = 1e3 / this.dtFrameAvg;

        const x = this.w - 80;
        let y = 0;
        this.ctx.fillStyle = '#eef';
        this.ctx.font = '16px sans-serif';
        this.ctx.fillText(`FPS: ${fps.toFixed(1)}`, x, y += 20)
        this.ctx.fillText(`dt:  ${(this.dtFrameAvg).toFixed(0.1)}`, x, y += 20)
        this.ctx.fillText(` c:  ${(this.dtAvg).toFixed(0.1)}`, x, y += 20)
        this.ctx.fillText(`  u: ${(this.dtUpdateAvg).toFixed(0.1)}`, x, y += 20)
        this.ctx.fillText(`  d: ${(this.dtDrawAvg).toFixed(0.1)}`, x, y += 20)
    }
}

enum Button {
    Left,
    Right,
    Space,
    Count,
}

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
    private buttons = new Array(Button.Count).fill(false);

    isDown(b: Button): false {
        return this.buttons[b];
    }

    constructor() {
        document.addEventListener('keydown', (event) => {
            const button = keyBindings[event.code];
            if (button !== undefined) this.buttons[button] = true;
        });
        document.addEventListener('keyup', (event) => {
            const button = keyBindings[event.code];
            if (button !== undefined) this.buttons[button] = false;
        });
        for (const [buttonId, button] of Object.entries(buttonBindings)) {
            const element = document.getElementById(buttonId);
            if (!element) continue;
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
    constructor(protected x: number, protected y: number) {}

    getX() {
        return this.x;
    }
}

class MovingSprite extends Sprite {
    constructor(x: number, y: number, protected w: number, protected h: number) {
        super(x, y);
    }
    
    protected vx = 0;
    protected vy = 0;

    private ayFall = 1;
    protected jumpFrames = 0;

    xmin = 0;
    xmax = 500;

    move(x: number, y: number) {
        this.x += x;
        this.y += y;
    }

    update() {
        this.vy += this.ayFall;

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

    updateForOverlaps(obstacles: ObstacleSprite[]) {
        for (const obstacle of obstacles) {
            const [ox, oy, ow, oh] = obstacle.xywh();
            
            if (this.y - this.h <= oy && oy <= this.y &&
                this.x + this.w >= ox && this.x <= ox + ow) {
                if (this.vy < 0) {
                    this.y = oy + this.h;
                    this.vy = 0;
                }
            }

            if (this.y - this.h <= oy - oh && oy - oh <= this.y &&
                this.x + this.w >= ox && this.x <= ox + ow) {
                if (this.vy > 0) {
                    this.y = oy - oh;
                    this.vy = 0;
                    this.jumpFrames = 0;
                }
            }
        }
    }
}

class PlayerSprite extends MovingSprite {
    private vxMax = 10;
    private axUp = 0.8;
    private axDown = 0.4;
    
    private ayJump = 3;
    private vyJumpMax = 20;
    private maxJumpFrames = 8;

    constructor(private readonly image: HTMLImageElement, x: number, y: number, w: number, h: number) {
        super(x, y, w, h);
    }

    accelerateX(direction: 1|-1) {
        this.vx += this.axUp * direction;
        this.vx = clampAbs(this.vx, this.vxMax);
    }

    decelerateX() {
        const newVX = this.vx - Math.sign(this.vx) * this.axDown;
        if (Math.sign(newVX) != Math.sign(this.vx)) {
            this.vx = 0;
        } else {
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

    draw(ctx: CanvasRenderingContext2D) {
        ctx.drawImage(this.image, this.x, this.y - this.h);
    }
}

class EnemySprite extends MovingSprite {
    constructor(private readonly image: HTMLImageElement, x: number, y: number, w: number, h: number) {
        super(x, y, w, h);
        this.vx = (Math.random() < 0.5 ? -1 : 1) * 2;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = 'red';
        ctx.drawImage(this.image, this.x, this.y - this.h);
    }
}

class ObstacleSprite extends Sprite {
    constructor(x: number, y: number, protected w: number, protected h: number) {
        super(x, y);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = 'brown';
        ctx.fillRect(this.x, this.y - this.h, this.w, this.h);
    }

    xywh() {
        return [this.x, this.y, this.w, this.h];
    }
}

document.addEventListener("DOMContentLoaded", () => {
    let game: Game;
    const canvas = document.querySelector('canvas');

    const resizeObserver = new ResizeObserver(entries => {
        if (game) return;
        for (let entry of entries) {
            if (entry.target === canvas) {
                (game = new Game(entry.contentRect.width, entry.contentRect.height)).run();
            }
        }
    });
    
    resizeObserver.observe(canvas);
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