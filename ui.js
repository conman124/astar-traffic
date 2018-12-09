(function() {
	var STATES = {
		DEFAULT: 'default',
		ADDING_ROAD: 'adding_road'
	};

	function UI(canvas, model) {
		this.model = model;
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");

		this.render = this.render.bind(this);

		document.addEventListener("mousemove", this.onMouseMove.bind(this));
		document.addEventListener("keydown", this.onKeyDown.bind(this));
		document.addEventListener("mousedown", this.onMouseDown.bind(this));
		document.addEventListener("contextmenu", this.onContext.bind(this));

		this.roadSize = 1;
		this.roadSpeed = 35;
		this.mouseX = -10;
		this.mouseY = -10;

		this.state = STATES.DEFAULT;
	}

	UI.prototype.start = function() {
		requestAnimationFrame(this.render);
	}

	UI.prototype.render = function() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		switch(this.state) {
			case STATES.DEFAULT: this.renderDefault(); break;
			case STATES.ADDING_ROAD: this.renderAddingRoad(); break;
		}

		this.ctx.fillStyle = "#ff0000";
		this.ctx.fillText(`Size ${this.roadSize}, speed ${this.roadSpeed}`, this.mouseX + 10, this.mouseY+4);

		requestAnimationFrame(this.render);
	}

	UI.prototype.renderDefault = function() {
		if(this.nearestPoint || this.nearestRoad) {
			this.ctx.lineWidth = 1;
			this.ctx.beginPath();
			this.ctx.ellipse(this.effMouseX, this.effMouseY, 6, 6, 0, 0, Math.PI * 2, false);
			this.ctx.stroke();
		}
	}

	UI.prototype.renderAddingRoad = function() {
		this.ctx.beginPath();
		this.ctx.moveTo(this.p1.x, this.p1.y);
		this.ctx.lineTo(this.effMouseX, this.effMouseY);
		this.ctx.lineWidth = this.roadSize * 2 - 1;
		this.ctx.stroke();

		if(this.nearestPoint || this.nearestRoad) {
			this.ctx.lineWidth = 1;
			this.ctx.beginPath();
			this.ctx.ellipse(this.effMouseX, this.effMouseY, 6, 6, 0, 0, Math.PI * 2, false);
			this.ctx.stroke();
		}
	}

	UI.prototype.onMouseMove = function(e) {
		this.mouseX = e.clientX;
		this.mouseY = e.clientY;

		this.calculateEffectiveMouse();
	}

	function findIntersect(m1, b1, m2, b2) {
		var x = (b2 - b1) / (m1 - m2);
		var y = m1 * x + b1;
		return {x, y};
	}

	function getLine(x1, y1, x2, y2) {
		var m = getSlope(x1, y1, x2, y2);
		return slopeIntercept(x1, y1, m);
	}

	function slopeIntercept(x, y, m) {
		var b = -m * x + y;
		return {m, b};
	}

	function getSlope(x1, y1, x2, y2) {
		return (y1 - y2) / (x1 - x2);
	}

	function isInBetween(x, y, z) {
		return y < x && x < z || z < x && x < y;
	}

	UI.prototype.calculateEffectiveMouse = function() {
		var nearestPoint;
		var nearestDist;
		for(var pointID in this.model.points) {
			var point = this.model.points[pointID];
			// quick check
			if(this.mouseX > point.x - 12 && this.mouseX < point.x + 12 && this.mouseY > point.y - 12 && this.mouseY < point.y + 12) {
				var dist;
				if((dist = Math.sqrt(Math.pow(this.mouseX - point.x, 2) + Math.pow(this.mouseY - point.y, 2))) < 12) {
					if(!nearestPoint || dist < nearestDist) {
						nearestPoint = point;
						nearestDist = dist;
					}
				}
			}
		}

		if(nearestPoint) {
			this.effMouseX = nearestPoint.x;
			this.effMouseY = nearestPoint.y;
			this.nearestPoint = nearestPoint;
			this.nearestRoad = null;
			return;
		}

		var nearestLine;
		var nearestLineX, nearestLineY;
		var dist;
		for(var roadID in this.model.roads) {
			var road = this.model.roads[roadID];
			var l1p1 = this.model.points[road.p1];
			var l1p2 = this.model.points[road.p2];
			var x, y;

			if(this.state == STATES.DEFAULT) {
				var {m: m1, b: b1} = getLine(l1p1.x, l1p1.y, l1p2.x, l1p2.y);
				var {m: m2, b: b2} = slopeIntercept(this.mouseX, this.mouseY, -1/m1);
				var res = findIntersect(m1, b1, m2, b2);
				x = res.x, y = res.y;
			} else {
				var {m: m1, b: b1} = getLine(l1p1.x, l1p1.y, l1p2.x, l1p2.y);
				var {m: m2, b: b2} = getLine(this.p1.x, this.p1.y, this.mouseX, this.mouseY);
				var res = findIntersect(m1, b1, m2, b2);
				x = res.x, y = res.y;
			}

			if(!isInBetween(x, l1p1.x, l1p2.x) || !isInBetween(y, l1p1.y, l1p2.y)) {
				continue;
			}
			
			if(this.mouseX > x - 10 && this.mouseX < x + 10 && this.mouseY > y - 10 && this.mouseY < y + 10) {
				if((dist = Math.sqrt(Math.pow(this.mouseX - x, 2) + Math.pow(this.mouseY - y, 2))) < 10) {
					if(!nearestLine || dist < nearestDist) {
						nearestLine = road;
						nearestDist = dist;
						nearestLineX = x;
						nearestLineY = y;
					}
				}
			}
		}

		if(nearestLine) {
			this.nearestRoad = nearestLine;
			this.nearestPoint = null;
			this.effMouseX = nearestLineX;
			this.effMouseY = nearestLineY;
			return;
		}

		this.nearestPoint = null;
		this.nearestRoad = null;
		this.effMouseX = this.mouseX;
		this.effMouseY = this.mouseY;
	}

	UI.prototype.onKeyDown = function(e) {
		switch(e.key) {
			case '1': this.roadSize = 1; break;
			case '2': this.roadSize = 2; break;
			case '3': this.roadSize = 3; break;
			case 'ArrowUp': this.roadSpeed = Math.min(this.roadSpeed + 5, 80); break;
			case 'ArrowDown': this.roadSpeed = Math.max(this.roadSpeed - 5, 20); break;
		}
	}

	UI.prototype.onMouseDown = function(e) {

		switch(this.state) {
			case STATES.DEFAULT:
				if(e.button == 0) {
					this.state = STATES.ADDING_ROAD;
					if(this.nearestPoint) {
						this.p1 = this.nearestPoint;
					} else if(this.nearestRoad) {
						this.p1 = new Point(this.effMouseX, this.effMouseY);
						this.model.addPoint(this.p1);
						this.model.splitRoad(this.nearestRoad, this.p1);
					} else {
						this.p1 = new Point(this.mouseX, this.mouseY);
					}
				} else if (e.button == 2) {
					if(this.nearestRoad) {
						this.model.removeRoad(this.nearestRoad);
					}
				}
				break;
			case STATES.ADDING_ROAD:
				if(e.button == 0) {
					var p2;
					if(this.nearestPoint) {
						p2 = this.nearestPoint;
					} else if(this.nearestRoad) {
						p2 = new Point(this.effMouseX, this.effMouseY);
						this.model.addPoint(p2);
						this.model.splitRoad(this.nearestRoad, p2);
					} else {
						p2 = new Point(this.effMouseX, this.effMouseY);
					} 
					this.model.addPoint(this.p1);
					this.model.addPoint(p2);
					this.model.addRoad(new Road(this.p1, p2, this.roadSize, this.roadSpeed));
					this.p1 = p2;
				} else {
					this.state = STATES.DEFAULT;
					delete this.p1;
				}
				break;
		}
	}

	UI.prototype.onContext = function(e) {
		e.preventDefault();
	}

	window.UI = UI;
})();