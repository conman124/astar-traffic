((global) => {
	importScripts("./diqueue.js");
	importScripts("./model.js");

	const START = "start";
	const RECALCULATE = "recalculate";
	const UPDATE_LOAD = "update_load"

	function PathFinder(model, agents, loadEstimator) {
		this.model = model;
		this.agents = agents;
		this.neighborCache = {};

		this.comparator = this.comparator.bind(this);
		this.h = this.h.bind(this);
		this.findPaths = this.findPaths.bind(this);
		this.findPathForAgent = this.findPathForAgent.bind(this);
		this.loadEstimator = loadEstimator;
		this.roadLoad = {};
	};

	PathFinder.prototype.comparator = function(a, b) {
		return ((a.g + a.h) > (b.g + b.h)) ? a : b;
	}

	PathFinder.prototype.h = function(curPoint, endPoint) {
		// TODO improve heuristic, possibly taking road load into account
		var p1 = this.model.points[curPoint], p2 = this.model.points[endPoint];
		return Math.sqrt(Math.pow(p1.x - p2.x, 2), + Math.pow(p1.y - p1.y, 2)) / 80 ;
	}

	PathFinder.prototype.findPaths = function() {
		delete this.findPathsTimeout;

		for( var i = 0; i < Math.min(10, this.agents.length); i++) {
			this.findPathForAgent(this.agents.pop());
		}

		if(this.agents.length) {
			global.setTimeout(this.findPaths, 50);
		}
	}

	PathFinder.prototype.getNeighbors = function(p) {
		if(!this.neighborCache[p]) {
			var roads = Object.keys(this.model.roadsConnectedToPoint[p]);
			var ans = [];
			for(var i = 0; i < roads.length; i++) {
				var road = this.model.roads[roads[i]];
				var other = road.p1;
				if(road.p1 === p) {
					other = road.p2;
				}
				ans.push({road: roads[i], point: other});
			}
			this.neighborCache[p] = ans;
		}

		return this.neighborCache[p];
	}

	PathFinder.prototype.findPathForAgent = function(agent) {
		var pq = new PriorityQueue([], this.comparator, 'p');
		var points = Object.keys(this.model.points);
		var start = points[Math.floor(Math.random() * points.length)];
		var end;
		do {
			end = points[Math.floor(Math.random() * points.length)];
		} while (end === start)

		pq.push({ps: [start], g: 0, h: this.h(start, end), p: start});
		var found = false;
		var dequeued;
		var g = {};
		var closedSet = {};
		while(dequeued = pq.pop()) {
			if(dequeued.p === end) {
				found = dequeued.ps;
				break;
			}

			closedSet[dequeued.p] = true;

			var potentialNextPoints = this.getNeighbors(dequeued.p);
			for(var i = 0; i < potentialNextPoints.length; i++) {
				var neighbor = potentialNextPoints[i];
				if(closedSet[neighbor.point]) { continue; }

				var time = this.model.roads[neighbor.road].length / this.model.roads[neighbor.road].speed / (typeof this.roadLoad[neighbor.road] != "undefined" ? this.roadLoad[neighbor.road] : 1);

				var tentativeG = dequeued.g + time;
				if(typeof g[neighbor.point] !== "undefined" && g[neighbor.point] <= tentativeG) {
					continue;
				}

				pq.update(neighbor.point, {ps: dequeued.ps.concat([neighbor.point]), g: tentativeG, h: this.h(neighbor.point, end), p: neighbor.point});
			}
		}

		if(found) {
			var startPoint = found[0];
			var roads = [];
			for(var i = 1; i < found.length; i++) {
				var nextPoints = this.getNeighbors(found[i-1]);
				var nextRoad;
				for(var j = 0; j < nextPoints.length; j++) {
					if(nextPoints[j].point === found[i]) {
						nextRoad = nextPoints[j].road;
						break;
					}
				}

				roads.push(nextRoad);
			}
			
			global.postMessage({type: "agent", startPoint, roads, workerID: agent});
			this.loadEstimator.postMessage({type: "ADD_AGENT", payload: {startPoint, roads}});
		} else {
			this.recalculateAgent(agent);
		}
	}

	PathFinder.prototype.recalculateAgent = function(agent) {
		this.agents.push(agent);
		this.scheduleFindPaths();
	}

	PathFinder.prototype.scheduleFindPaths = function() {
		if(typeof this.findPathsTimeout === "undefined") {
			this.findPathsTimeout = setTimeout(this.findPaths, 0);
		}
	}

	function start(model, agentCount, workerCount, workerNumber, loadEstimator) {
		var agents = [];
		for(var i = workerNumber; i < agentCount; i += workerCount) {
			agents.push(i);
		}

		global.pathfinder = new PathFinder(model, agents, loadEstimator);
		global.pathfinder.findPaths();
	}

	function recalculate(agent) {
		global.pathfinder.recalculateAgent(agent);
	}

	function updateLoad(roadLoad) {
		global.pathfinder.roadLoad = roadLoad;
	}

	global.onmessage = ({data}) => {
		if(data.type === START) {
			start(Model.deserialize(data.model), data.agentCount, data.workerCount, data.workerNumber, data.loadEstimator);
			data.loadEstimator.onmessage = global.onmessage;
		} else if(data.type === RECALCULATE) {
			recalculate(data.agent);
		} else if(data.type === UPDATE_LOAD) {
			updateLoad(data.roadLoad);
		} else {
			throw new Error("Unrecognized event");
		}
	}

	console.log("Pathfinder loaded");
})(this);