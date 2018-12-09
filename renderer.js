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

        this.model.advance();

        requestAnimationFrame(this.render);
    }

    Renderer.prototype.renderRoads = function() {
        this.ctx.strokeStyle = "#ff0000";

        var keys = Object.keys(this.model.roads);
        for(var i = 0; i < keys.length; i++) {
            var road = this.model.getRoad(keys[i]);

            this.ctx.beginPath();
            var p1 = this.model.getPoint(road.p1);
            var p2 = this.model.getPoint(road.p2);
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.lineWidth = road.size * 2 - 1;
            this.ctx.stroke();

        }
	}
	
	Renderer.prototype.renderPoints = function() {
		this.ctx.fillStyle = "#000";

		var keys = Object.keys(this.model.points);
        for(var i = 0; i < keys.length; i++) {
			var point = this.model.getPoint(keys[i]);
			var connected = this.model.getRoadsConnectedToPoint(point);
			
			if(Object.keys(connected).length < 2) {
				continue;
			}

			this.ctx.beginPath();
			this.ctx.ellipse(point.x, point.y, 4, 4, 0, 0, Math.PI * 2, false);
            this.ctx.fill();

        }
	}

    Renderer.prototype.renderAgents = function() {
        this.ctx.fillStyle = "#00ff00";

        var keys = Object.keys(this.model.agents);
        for(var i = 0; i < keys.length; i++) {
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

    window.Renderer = Renderer;
})();