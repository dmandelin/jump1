// Stuff to do:
// - Mobile controls
// - Model floor as a block
// - Sprite graphics
// - Collisions between mobs/player

class Game {
    private readonly ctx: CanvasRenderingContext2D;

    private readonly controller = new Controller();
    private readonly player: PlayerSprite;
    private readonly obstacles: ObstacleSprite[];
    private readonly enemies: EnemySprite[] = [];

    private readonly ticker = this.tick.bind(this);
    private enemyDropCountDown = 60;

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
        ]
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
        } else if (this.controller.isDown(Button.Right)) {
            this.player.accelerateX(+1);
        } else {
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

enum Button {
    Left,
    Right,
    Space,
    Count,
}

const bindings = {
    'ArrowLeft': Button.Left,
    'ArrowRight': Button.Right,
    'Space': Button.Space,
    'ControlLeft': Button.Space,
}

class Controller {
    private buttons = new Array(Button.Count).fill(false);

    isDown(b: Button): false {
        return this.buttons[b];
    }

    constructor() {
        document.addEventListener('keydown', (event) => {
            const button = bindings[event.code];
            if (button !== undefined) this.buttons[button] = true;
        });
        document.addEventListener('keyup', (event) => {
            const button = bindings[event.code];
            if (button !== undefined) this.buttons[button] = false;
        });
    }
}

class Sprite {
    constructor(protected x: number, protected y: number) {}
}

class MovingSprite extends Sprite {
    constructor(x: number, y: number) {
        super(x, y);
    }
    
    protected vx = 0;
    protected vy = 0;

    readonly sz = 50;

    private ayFall = 1;
    protected jumpFrames = 0;

    xmin = 0;
    xmax = 500;
    ymax = 500;

    place(y?: number) {
        this.y = y ?? this.ymax;
        this.vy = 0;
        this.jumpFrames = 0;
    }

    move(x: number, y: number) {
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

    updateForOverlaps(obstacles: ObstacleSprite[]) {
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
    private vxMax = 10;
    private axUp = 0.8;
    private axDown = 0.4;
    
    private ayJump = 3;
    private vyJumpMax = 20;
    private maxJumpFrames = 8;

    constructor(x: number, y: number) {
        super(x, y);
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
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y - this.sz, this.sz, this.sz);
    }
}

class EnemySprite extends MovingSprite {
    constructor(x: number, y: number) {
        super(x, y);
        this.vx = (Math.random() < 0.5 ? -1 : 1) * 2;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - this.sz, this.sz, this.sz);
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