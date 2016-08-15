Number.prototype.pad = function(size) {
	return ( Math.pow( 10, size ) + ~~this ).toString().substring( 1 );
};

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var SCALE = 32;
var startTime = Date.now();
var frames = 0;
var keymap = (function() { var array = []; for (var i = 0; i < 256; i++) { array.push(false); } return array; })();

var clientId, debug;

class World {
	loadWorldMap() {
		var self = this;
		return new Promise(function(resolve) {
			$.get("js/worldmap.dat", function(result) {
				var data = result.split("\n");
				self.map = {};
				for (var y = -64; y < 64; y += 16) {
					var line = data[y + 64].split("");
					for (var x = -64; x < 64; x += 16) {
						var chunk = new Chunk(x, y);
						for (var x1 = 0; x1 < 16; x1 += 1) {
							for (var y1 = 0; y1 < 16; y1 += 1) {
								chunk.addTile(x1, y1, new Tile(line[x1]));
							}
						}
						self.map[[x, y]] = chunk;
					}
				}
				resolve();
			});
		});
	}
}

class Chunk {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.entities = [];
		this.tileMap = {};
	}
	addTile(x, y, tile) {
		this.tileMap[[x, y]] = tile;
	}
	draw(off) {
		var color;
		if (player.getChunk() == this)
			color = "#333333";
		else
			color = "#111111";
		ctx.fillStyle = color;;
		ctx.fillRect((this.x + off.x) * SCALE, (this.y + off.y) * SCALE, 16 * SCALE, 16 * SCALE);
		ctx.strokeStyle = "#999999";
		ctx.strokeRect((this.x + off.x) * SCALE, (this.y + off.y) * SCALE, 16 * SCALE, 16 * SCALE);
	}
	getNeighboringChunks() {
		var neighboring = [];
		for (var i = this.x - 16; i <= this.x + 16; i += 16) {
			for (var j = this.y - 16; j <= this.y + 16; j += 16) {
				if (i >= -64 && i <= 64 && j >= -64 && j <= 64)
					neighboring.push(world.map[[i, j]]);
			}
		}
		return neighboring;
	}
}

class Tile {
	constructor() {

	}
	draw() {
	}
}

class Player {
	constructor() {
		this.x = Math.random() * 127 - 63.5;
		this.y = Math.random() * 127 - 63.5;
		this.speed = 0.004;
	}
	getChunk() {
		var x = Math.floor(this.x / 16) * 16;
		var y = Math.floor(this.y / 16) * 16;
		return world.map[[x, y]];
	}
	update(time) {
		var dx = 0, dy = 0;
		if (keymap[39])
			dx += this.speed * time;
		if (keymap[37])
			dx -= this.speed * time;
		if (keymap[40])
			dy += this.speed * time;
		if (keymap[38])
			dy -= this.speed * time;
		this.x += dx;
		if (this.x < -63.5) this.x = -63.5;
		if (this.x > 63.5) this.x = 63.5;
		this.y += dy;
		if (this.y < -63.5) this.y = -63.5;
		if (this.y > 63.5) this.y = 63.5;
	}
	draw(off) {
		ctx.fillStyle = "#" + this.color;
		ctx.fillRect((this.x + off.x - 0.5) * SCALE, (this.y + off.y - 0.5) * SCALE, SCALE, SCALE);
	}
	drawFlashlight(off) {
		var gradient = ctx.createRadialGradient((this.x + off.x) * SCALE, (this.y + off.y) * SCALE, 0, (this.x + off.x) * SCALE, (this.y + off.y) * SCALE, 16 * SCALE);
		gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
		gradient.addColorStop(1, "black");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
	}
}

class GameCamera {
	constructor(player) {
		this.lookAt = { x: player.x, y: player.y };
	}
	update(time) {
		player.update(time);
		var x = player.x;
		var y = player.y;
		if (x + 64 < (window.scaledWidth / 2))
			x = (window.scaledWidth / 2) - 64;
		if (64 - x < (window.scaledWidth / 2))
			x = 64 - (window.scaledWidth / 2);
		if (y + 64 < (window.scaledHeight / 2))
			y = (window.scaledHeight / 2) - 64;
		if (64 - y < (window.scaledHeight / 2))
			y = 64 - (window.scaledHeight / 2);
		this.lookAt = { x: x, y: y };
	}
	draw() {
		var off = {
			x: -this.lookAt.x + window.scaledWidth / 2,
			y: -this.lookAt.y + window.scaledHeight / 2,
		}
		var playerChunk = player.getChunk();
		var neighboringChunks = playerChunk.getNeighboringChunks();
		playerChunk.draw(off);
		for (var i = 0; i < neighboringChunks.length; i += 1) {
			if (neighboringChunks[i] != undefined)
				neighboringChunks[i].draw(off);
		}
		player.draw(off);
		for (var i = 0; i < otherPlayers.length; i += 1) {
			var otherPlayer = otherPlayers[i];
			otherPlayer.draw(off);
		}
		player.drawFlashlight(off);
	}
}

var world = new World();
var player = new Player();
var gameCamera = new GameCamera(player);
var socket = io.connect("/");
var lastUpdate = Date.now();

var otherPlayers = [];

var update = function(time) {
	gameCamera.update(time);
};

var draw = function() {
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	gameCamera.draw();

	var uptime = (Date.now() - startTime) / 1000;
	ctx.font = "16px sans-serif";
	ctx.fillStyle = "#FFFFFF";
	ctx.fillText("Uptime: " + uptime + "s", 15, 30);
	ctx.fillText("FPS: " + Math.round(frames / (uptime == 0 ? 1 : uptime)), 15, 50);
	ctx.fillText("Coords: (" + Math.round(player.x) + ", " + Math.round(player.y) + ")", 15, 70);
	var chunk = player.getChunk();
	ctx.fillText("Chunk: (" + Math.round(chunk.x) + ", " + Math.round(chunk.y) + ")", 15, 90);
};

var resize = function() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	window.scaledWidth = window.innerWidth / SCALE;
	window.scaledHeight = window.innerHeight / SCALE;
	draw();
};

var currentTime = Date.now();
var frame = function() {
	var newTime = Date.now();
	update(newTime - currentTime);
	draw();
	currentTime = newTime;
	frames += 1;
	if (newTime - lastUpdate > 50) {
		socket.emit("player state", {
			debug: debug,
			coords: { x: player.x, y: player.y }
		});
		lastUpdate = newTime;
	}
	requestAnimationFrame(frame);
};

var init = function() {
	return new Promise(function(resolve) {
		socket.emit("player join");
		socket.on("player join", function(data) {
			player.color = data.color;
			clientId = data.cid;
			console.log(clientId);
			world.loadWorldMap().then(function() {
				resolve();
			});
		});
	});
};

var keydown = function(e) {
	keymap[e.keyCode] = true;
}

var keyup = function(e) {
	keymap[e.keyCode] = false;
}

$(function() {
	init().then(function() {
		console.log("Done initializing.", world);
		resize();
		window.addEventListener("resize", resize);
		document.addEventListener("keydown", keydown);
		document.addEventListener("keyup", keyup);
		requestAnimationFrame(frame);

		socket.on("nearby players", function(nearby) {
			otherPlayers = [];
			for (var i = 0; i < nearby.length; i += 1) {
				var p = new Player();
				p.x = nearby[i].coords.x;
				p.y = nearby[i].coords.y;
				p.color = nearby[i].color;
				otherPlayers.push(p);
			}
		});
	});
});