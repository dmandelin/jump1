// Stuff to do:
// - Animate bunny feet
// - Don't keep jumping if button is held down
// - Better sensitivity on jump amount
// Refactorings:
// - Corral images
// - Jump animation code
// - Better hiding of player

class Game {
    private readonly ctx: CanvasRenderingContext2D;

    private readonly controller = new Controller();
    private readonly player: PlayerSprite;
    private readonly obstacles: ObstacleSprite[];
    private readonly enemies: EnemySprite[] = [];

    private xView = 0;

    private readonly stonePlayerImage = new Image();
    private playerRespawnCountdown = -1;

    private readonly enemyImage = new Image();
    private enemyLimit = 3;
    private enemyDropCountDown = 60;

    private readonly trophy: TrophySprite;

    private readonly ticker = this.tick.bind(this);

    protected score = 0;
    protected overlappedTrophy = false;

    private metersOn = false;
    private tPrev = 0;
    private dtFrameAvg = 0;
    private dtAvg = 0;
    private dtUpdateAvg = 0;
    private dtDrawAvg = 0;

    constructor(private readonly w, private readonly h) {
        const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
        // CSS sizing of the canvas doesn't actualy update its width and height attributes.
        canvas.width = w;
        canvas.height = h;
        
        this.ctx = canvas.getContext("2d")!;

        this.stonePlayerImage.src = 'img/stonebunny.png';
        const playerImage = new Image();
        playerImage.src = 'img/bunny.png';
        this.player = new PlayerSprite(playerImage, 180, this.h - 200, 31, 50);
        this.player.xmin = 0;
        this.player.xmax = this.w * 2 - 50;

        this.enemyImage.src = 'img/skeleton.png';

        const trophyImage = new Image();
        trophyImage.src = 'img/trophy.png';
        this.trophy = new TrophySprite(trophyImage, this.w * 2 - 100, 100, 32, 32);

        const wallImage = new Image();
        wallImage.src = 'img/wall.png';

        const tierHeight = 120;
        this.obstacles = [
            // Bottom
            new ObstacleSprite(wallImage, 0, this.h + 1, this.w * 2, 1),
            // Left
            new ObstacleSprite(wallImage, -200, this.h, 200, this.h),
            // Right
            new ObstacleSprite(wallImage, this.w * 2, this.h, 300, this.h),
            // Platforms
            new ObstacleSprite(wallImage, 100, 20 + this.h - tierHeight, this.w - 300, 20),
            new ObstacleSprite(wallImage, this.w / 2, 20 + this.h - tierHeight * 2, this.w * 0.4, 20),
            new ObstacleSprite(wallImage, 100, 20 + this.h - tierHeight * 3, 200, 20),
            new ObstacleSprite(wallImage, 400, 20 + this.h - tierHeight * 3, 200, 20),
            // Further right
            new ObstacleSprite(wallImage, this.w, this.h - tierHeight * 2, this.w * 0.4, 20),
            new ObstacleSprite(wallImage, this.w * 1.3, this.h - tierHeight * 3, this.w * 0.5, 20),
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

        if (!this.player.hidden) {
            for (const e of this.enemies) {
                if (this.player.overlaps(e)) {
                    this.obstacles.push(new ObstacleSprite(
                        this.stonePlayerImage,
                        this.player.x, this.player.y, this.player.w, this.player.h));
                    this.player.hide();
                    this.playerRespawnCountdown = 180;
                }
            }
        }

        if (this.playerRespawnCountdown > 0) {
            if (--this.playerRespawnCountdown == 0) {
                if (this.player.hidden) {
                    this.player.respawn(this.w / 2, this.h - 200);
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
        } else {
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
            this.player.jump();
        }
    }

    scrollForPlayer() {
        const xPlayerOnView = this.player.x - this.xView;
        const xShiftNeeded = xPlayerOnView < 150 ?
            xPlayerOnView - 150 : (
                xPlayerOnView > this.w - 300 ?
                xPlayerOnView - (this.w - 300) :
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
        this.drawScore()
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

enum OverlapDirection {
    Left, Right, Top, Bottom,
}

class Sprite {
    constructor(protected image: HTMLImageElement,
        protected x_: number, protected y_: number, 
        protected w_: number, protected h_: number) {}

    get x() { return this.x_; }
    protected set x(v: number) { this.x_ = v;}
    get y() { return this.y_; }
    protected set y(v: number) { this.y_ = v;}
    get w() { return this.w_; }
    protected set w(v: number) { this.w_ = v;}
    get h() { return this.h_; }
    protected set h(v: number) { this.h_ = v;}
    xywh() { return [this.x, this.y, this.w, this.h];}

    get l() { return this.x_; }
    protected set l(v: number) { this.x_ = v; }
    get r() { return this.x_ + this.w_; }
    protected set r(v: number) { this.x_ = v - this.w_; }
    get t() { return this.y_ - this.h_; }
    protected set t(v: number) { this.y_ = this.h_ + v;}
    get b() { return this.y_; }
    protected set b(v: number) { this.y_ = v; }

    get cx() { return this.x_ + 0.5 * this.w_; }
    get cy() { return this.y_ + 0.5 * this.h_; }

    protected vx = 0;
    protected vy = 0;

    overlaps(other: Sprite): boolean {
        return this.r > other.l && this.l < other.r && this.b > other.t && this.t < other.b;
    }

    overlapDirectionWith(other: Sprite): OverlapDirection {
        if (this.vx >= 0) {
            if (this.vy >= 0) {
                return this.vx == 0 || (this.vy / this.vx) > (this.b - other.t) / (this.r - other.l)
                    ? OverlapDirection.Top : OverlapDirection.Left;
            } else {
                return this.vx == 0 || (this.vy / this.vx) < (this.t - other.b) / (this.r - other.l)
                    ? OverlapDirection.Bottom : OverlapDirection.Left;
            }
        } else {
            if (this.vy >= 0) {
                return this.vx == 0 || (this.vy / this.vx) < (this.b - other.t) / (this.l - other.r)
                    ? OverlapDirection.Top : OverlapDirection.Right;
            } else {
                return this.vx == 0 || (this.vy / this.vx) > (this.t - other.b) / (this.l - other.r)
                    ? OverlapDirection.Bottom : OverlapDirection.Right;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.drawImage(this.image, this.x, this.y - this.h);
    }
}

class MovingSprite extends Sprite {  
    protected ground: ObstacleSprite|undefined;
    private ayFall = 1;

    xmin = 0;
    xmax = 500;

    hidden = false;

    hide() {
        this.hidden = true;
    }

    move(x: number, y: number) {
        this.x += x;
        this.y += y;
    }

    update() {
        if (this.hidden) return;

        if (this.ground) {
            this.y += 2;
            if (!this.overlaps(this.ground)) {
                this.launched();
            }
            this.y -= 2;
        }
        
        if (!this.ground) this.vy += this.ayFall;

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

    landed(ground: ObstacleSprite) {
        this.ground = ground;
    }

    launched() {
        this.ground = undefined;
    }

    updateForOverlaps(obstacles: ObstacleSprite[]) {
        if (this.hidden) return;

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
                        if (this.vx > 0) this.vx *= -1;
                        break;
                    case OverlapDirection.Right:
                        this.l = obstacle.r;
                        if (this.vx < 0) this.vx *= -1;
                        break;
                }
            }
        }
    }
}

class PlayerSprite extends MovingSprite {
    private vxMax = 7;
    private axAccel = 0.6;
    private axAccelInAir = 0.2;
    private axDecel = 0.4;
    
    private ayJump = 10;
    private vyJumpMax = 17;
    private canJump = true;

    respawn(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.canJump = true;
        this.hidden = false;
    }

    accelerateX(direction: 1|-1) {
        if (this.hidden) return;
        const ax = this.ground ? this.axAccel : this.axAccelInAir;
        this.vx += ax * direction;
        this.vx = clampAbs(this.vx, this.vxMax);
    }

    decelerateX() {
        if (this.hidden) return;
        if (!this.ground) return;
        const newVX = this.vx - Math.sign(this.vx) * this.axDecel;
        if (Math.sign(newVX) != Math.sign(this.vx)) {
            this.vx = 0;
        } else {
            this.vx = clampAbs(newVX, this.vxMax);
        }
    }

    jump() {
        if (this.hidden) return;
        if (!this.canJump) return;
        this.vy -= this.ayJump;
        if (this.vy <= -this.vyJumpMax) {
            this.vy = -this.vyJumpMax;
            this.canJump = false;
            this.launched();
            return;
        }
    }

    launched() {
        super.launched()
        this.canJump = false;
    }

    landed(ground: ObstacleSprite) {
        super.landed(ground);
        this.canJump = true;
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.hidden) return;
        ctx.drawImage(this.image, this.x, this.y - this.h);
    }
}

class EnemySprite extends MovingSprite {
    constructor(image: HTMLImageElement, x: number, y: number,  w: number, h: number) {
        super(image, x, y, w, h);
        this.vx = (Math.random() < 0.5 ? -1 : 1) * 2;
    }
}

class TrophySprite extends Sprite {
}

class ObstacleSprite extends Sprite {
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.image.height) return;
        for (let y = this.y - this.h; y < this.y; y += this.image.height) {
            ctx.drawImage(this.image, 0, 0, this.w, this.h, this.x, y, this.w, this.h);
        }
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