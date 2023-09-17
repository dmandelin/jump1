var Game = /** @class */ (function () {
    function Game() {
        this.controller = new Controller();
        this.ticker = this.tick.bind(this);
        var canvas = document.getElementById("myCanvas");
        canvas.width = this.w = window.innerWidth * 0.8;
        canvas.height = this.h = window.innerHeight * 0.8;
        this.ctx = canvas.getContext("2d");
        this.playerSprite = new Sprite(canvas.width / 2, canvas.height - 80);
        this.playerSprite.xmin = 0;
        this.playerSprite.xmax = this.w - 50;
    }
    Game.prototype.run = function () {
        this.tick();
    };
    Game.prototype.tick = function () {
        this.update();
        this.draw();
        requestAnimationFrame(this.ticker);
    };
    Game.prototype.update = function () {
        if (this.controller.L) {
            if (!this.controller.R) {
                this.playerSprite.accelerate(-1);
            }
        }
        else if (this.controller.R) {
            this.playerSprite.accelerate(+1);
        }
        else {
            this.playerSprite.decelerate();
        }
        this.playerSprite.update();
    };
    Game.prototype.draw = function () {
        this.drawBackground();
        this.playerSprite.draw(this.ctx);
    };
    Game.prototype.drawBackground = function () {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.w, this.h);
    };
    return Game;
}());
var Controller = /** @class */ (function () {
    function Controller() {
        var _this = this;
        this.L_ = false;
        this.R_ = false;
        document.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowLeft') {
                _this.L_ = true;
            }
        });
        document.addEventListener('keyup', function (event) {
            if (event.key === 'ArrowLeft') {
                _this.L_ = false;
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowRight') {
                _this.R_ = true;
            }
        });
        document.addEventListener('keyup', function (event) {
            if (event.key === 'ArrowRight') {
                _this.R_ = false;
            }
        });
    }
    Object.defineProperty(Controller.prototype, "L", {
        get: function () { return this.L_; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Controller.prototype, "R", {
        get: function () { return this.R_; },
        enumerable: false,
        configurable: true
    });
    return Controller;
}());
var Sprite = /** @class */ (function () {
    function Sprite(x, y) {
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
    Sprite.prototype.move = function (x, y) {
        this.x += x;
        this.y += y;
        console.log("ps ".concat(this.x, ", ").concat(this.y));
    };
    Sprite.prototype.accelerate = function (direction) {
        this.vx += this.axUp * direction;
        this.vx = clampAbs(this.vx, this.vxMax);
    };
    Sprite.prototype.decelerate = function () {
        this.vx -= Math.sign(this.vx) * this.axDown;
        this.vx = clampAbs(this.vx, this.vxMax);
    };
    Sprite.prototype.update = function () {
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
    };
    Sprite.prototype.draw = function (ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x, this.y - this.sz, this.sz, this.sz);
    };
    return Sprite;
}());
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
