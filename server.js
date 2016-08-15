var crypto = require("crypto");
var express = require("express");
var http = require("http");

var app = express();
var server = http.Server(app);
var io = require("socket.io")(server);

var sessions = {};

app.use(express.static("public"));

var getNeighboringChunks = function(chunk) {
	var neighboring = [];
	for (var i = chunk.x - 16; i <= chunk.x + 16; i += 16) {
		for (var j = chunk.y - 16; j <= chunk.y + 16; j += 16) {
			if (i >= -64 && i <= 64 && j >= -64 && j <= 64)
				neighboring.push({ x: i, y: j });
		}
	}
	return neighboring;
}

var getChunk = function(obj) {
	var x = Math.floor(obj.x / 16) * 16;
	var y = Math.floor(obj.y / 16) * 16;
	return { x: x, y: y };
}

io.on("connection", function(socket) {
	socket.on("player join", function() {
		var getRandomColor = function() {
			return (function(m,s,c){return (c ? arguments.callee(m,s,c-1) : '#') + s[m.floor(m.random() * s.length)]})(Math,'0123456789ABCDEF',5).replace("#", "");
		};
		var playerColor = getRandomColor();
		while ([0].concat(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(playerColor)).reduce(function(a, b) { return a + parseInt(b, 16); }) < 384) {
			playerColor = getRandomColor();
		}
		socket.cid = crypto.randomBytes(16).toString("hex");
		sessions[socket.cid] = {
			color: playerColor
		};
		socket.emit("player join", {
			color: playerColor,
			cid: socket.cid
		});
		socket.on("disconnect", function() {
			delete sessions[socket.cid];
		});
		socket.on("player state", function(data) {
			sessions[socket.cid]["coords"] = { x: data.coords.x, y: data.coords.y };
			var current = getChunk(data.coords);
			var neighboring = getNeighboringChunks(current);
			var nearby = [];
			for (var cid in sessions) {
				if (cid == socket.cid) continue;
				var player = sessions[cid];
				if (!player.coords) continue;
				var playerChunk = getChunk(player.coords);
				if (neighboring.filter(function(item) { return item.x == playerChunk.x && item.y == playerChunk.y; }).length > 0) {
					nearby.push(player);
				}
			};
			if (data.debug) {
				// console.log("nearby " + socket.cid, nearby);
				// console.log(sessions);
			}
			socket.emit("nearby players", nearby);
		});
	});
});

server.listen(3000, function() {
	console.log("Listening...");
});