(function() {
    function Renderer(canvas, model) {
        this.onScreenCanvas = canvas;
        this.onScreenCtx = canvas.getContext('2d');

        this.buffer = document.createElement("canvas");
        this.buffer.width = this.onScreenCanvas.width;
        this.buffer.height = this.onScreenCanvas.height;
        this.ctx = this.buffer.getContext('2d');

        this.model = model;


        this.render = this.render.bind(this);
    }

    Renderer.prototype.start = function() {
        requestAnimationFrame(this.render);
    };

    Renderer.prototype.render = function() {
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(0,0,this.buffer.width, this.buffer.height);

		this.renderRoads();
		this.renderPoints();
        this.renderAgents();

        this.onScreenCtx.drawImage(this.buffer, 0, 0);

		if(this.actuallySimulating) {
			this.model.advance();
		}

		if(!this.stopped) {
			requestAnimationFrame(this.render);
		}
    }

    Renderer.prototype.renderRoads = function() {
		if(this.savedRoads) { 
			this.ctx.drawImage(this.savedRoads, 0, 0);
			return;
		}

		const redr = 255, redg = redb = 0, greenr = 0, greeng = 255, greenb = 0
		var ctx = this.ctx;
		if(this.actuallySimulating) {
			this.savedRoads = document.createElement("canvas");
			this.savedRoads.width = this.onScreenCanvas.width;
			this.savedRoads.height = this.onScreenCanvas.height;
			ctx = this.savedRoads.getContext("2d");
		}

        var keys = Object.keys(this.model.roads);
        for(var i = 0; i < keys.length; i++) {
            var road = this.model.getRoad(keys[i]);

            ctx.beginPath();
            var p1 = this.model.getPoint(road.p1);
            var p2 = this.model.getPoint(road.p2);
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
			ctx.lineWidth = road.size * 2 - 1;
			var ratio = (road.speed - 20) / 60;
			ctx.strokeStyle = `rgb(${ratio * (greenr - redr) + redr},${ratio * (greeng - redg) + redg},${ratio * (greenb - redb) + redb})`;
            ctx.stroke();
		}
	}
	
	Renderer.prototype.renderPoints = function() {
		if(this.savedPoints) { 
			this.ctx.drawImage(this.savedPoints, 0, 0);
			return;
		}

		var ctx = this.ctx;
		if(this.actuallySimulating) {
			this.savedPoints = document.createElement("canvas");
			this.savedPoints.width = this.onScreenCanvas.width;
			this.savedPoints.height = this.onScreenCanvas.height;
			ctx = this.savedPoints.getContext("2d");
		}
		
		ctx.fillStyle = "#000";

		var keys = Object.keys(this.model.points);
        for(var i = 0; i < keys.length; i++) {
			var point = this.model.getPoint(keys[i]);
			var connected = this.model.getRoadsConnectedToPoint(point);
			
			if(Object.keys(connected).length < 2) {
				continue;
			}

			ctx.beginPath();
			ctx.ellipse(point.x, point.y, 4, 4, 0, 0, Math.PI * 2, false);
            ctx.fill();
        }
	}

    Renderer.prototype.renderAgents = function() {
		if(!this.actuallySimulating) { return; }


        var keys = Object.keys(this.model.agents);
        for(var i = 0; i < keys.length; i++) {
			this.ctx.fillStyle = "#00ff00";
			if(parseInt(this.model.agents[keys[i]].id.substring(1),10) % 50 === 0) {
				this.ctx.fillStyle = "#ff0000";
			}
            var agent = this.model.getAgent(keys[i]);
            var road = this.model.getRoad(agent.currentRoad);
            var p1 = this.model.getPoint(road.p1);
            var p2 = this.model.getPoint(road.p2);

            this.ctx.beginPath();
            var pos = agent.currentPosition;
            var x = (p2.x - p1.x) * pos + p1.x;
            var y = (p2.y - p1.y) * pos + p1.y;
            var radius;
            switch(agent.type) {
                case Agent.types.CAR: radius = 4; break;
                case Agent.types.PEDESTRIAN: radius = 2; break;
                default: throw new Error("unknown type");
            }

            if(agent.currentDirection == 1) {
                x += road.rhsX * (radius + road.size);
                y += road.rhsY * (radius + road.size);
            } else {
                x -= road.rhsX * (radius + road.size);
                y -= road.rhsY * (radius + road.size);
            }

            this.ctx.ellipse(x, y, radius, radius, 0, 0, 2*Math.PI, false);
            this.ctx.fill();
        }
	}
	
	Renderer.prototype.startSimulating = function() {
		this.actuallySimulating = true;
	}

	Renderer.prototype.stop = function() {
		this.stopped = true;
	}

    window.Renderer = Renderer;
})();