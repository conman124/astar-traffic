(function() {
    let pointID = 0;
    let roadID = 0;
    let agentID = 0;

    function Point(x, y) {
        this.x = x;
        this.y = y;
        this.id = pointID++;
    }

    function Road(p1, p2, size, speed) {
        this.p1 = p1.id;
        this.p2 = p2.id;

        var vx = p1.x - p2.x;
        var vy = p1.y - p2.y;
        var norm = Math.sqrt(Math.pow(vx, 2) + Math.pow(vy, 2));
        vx /= norm;
        vy /= norm;

        this.length = norm;

        this.rhsX = vy;
        this.rhsY = -vx;

        this.size = size;
        this.speed = speed;
        this.id = roadID++;
    }

    function Agent(startPoint, roads, type, speedFactor, baseSpeed) {
        this.roads = roads.map(road=>road.id);
        this.currentRoad = this.roads[0];
        this.type = type;
        this.speedFactor = speedFactor;
        this.baseSpeed = baseSpeed;
        if(roads[0].p1 === startPoint.id) {
            this.currentPosition = 0;
            this.currentDirection = 1;
        } else {
            this.currentPosition = 1;
            this.currentDirection = -1;
        }
        this.id = agentID++;
    }

    const types = {
        CAR: 0,
        PEDESTRIAN: 1
    };

    var proxyHandler = {
        get: function(obj, name){
            if(!obj.hasOwnProperty(name)) { throw new Error("Unknown type"); }
            return obj[name];
        }
    }
    
    Agent.types = new Proxy(types, proxyHandler);

    function Model() {
        this.points = {};
        this.roads = {};
        this.agents = {};
        this.roadsConnectedToPoint = {};
        this.realtimeRoadLoadFactors = {};
    }

    Model.prototype.addPoint = function(p) {
        this.points[p.id] = p;
    }

    Model.prototype.getPoint = function(id) {
        return this.points[id];
    }

    Model.prototype.addRoad = function(r) {
        this.roads[r.id] = r;

        if(!this.roadsConnectedToPoint[r.p1]) {
            this.roadsConnectedToPoint[r.p1] = {};
        }
        this.roadsConnectedToPoint[r.p1][r.id] = r.id;

        if(!this.roadsConnectedToPoint[r.p2]) {
            this.roadsConnectedToPoint[r.p2] = {};
        }
        this.roadsConnectedToPoint[r.p2][r.id] = r.id; 
    }

    Model.prototype.getRoad = function(id) {
        return this.roads[id];
    }

    Model.prototype.addAgent = function(r) {
        this.agents[r.id] = r;
    }

    Model.prototype.getAgent = function(id) {
        return this.agents[id];
    }

    Model.prototype.getRoadsConnectedToPoint = function(p) {
        return this.roadsConnectedToPoint[p.id];
    }

    Model.prototype.calculateRealtimeRoadLoadFactors = function() {
        var carsUsingRoads = Object.keys(this.agents).reduce((acc, agentID) => {
            var agent = this.agents[agentID];
            if(agent.type === Agent.types.CAR) {
                if(!acc[agent.currentRoad]) { acc[agent.currentRoad] = [];}
                acc[agent.currentRoad].push(agentID);
            }
            return acc;
        }, {});

        Object.keys(this.roads).forEach(roadID => {
            var road = this.roads[roadID];
            var maxFreeFlowCars = road.length / 25 * road.size;
            var minQuarterFlowCars = maxFreeFlowCars * 3;

            var cars = carsUsingRoads[roadID] ? carsUsingRoads[roadID].length : 0;
            if(cars <= maxFreeFlowCars) {
                this.realtimeRoadLoadFactors[roadID] = 1;
            } else if( cars >= minQuarterFlowCars) {
                this.realtimeRoadLoadFactors[roadID] = .25;
            } else {
                cars -= maxFreeFlowCars;
                cars /= minQuarterFlowCars - maxFreeFlowCars;
                this.realtimeRoadLoadFactors[roadID] = .75 * cars + .25;
            }
        });
    }

    Model.prototype.serialize = function() {
        return {
            points: this.points,
            roads: this.roads
        };
    }

    Model.prototype.advance = function() {
        const MILE_PX = 25;
        this.calculateRealtimeRoadLoadFactors();

        for(var agentID in this.agents) {
            var agent = this.agents[agentID];
            var mpm = agent.speedFactor * this.realtimeRoadLoadFactors[agent.currentRoad] * this.roads[agent.currentRoad].speed + agent.baseSpeed;
            var mpf = mpm / 60 / 60;
            var ppf = mpf * MILE_PX;
            var amt = ppf / this.roads[agent.currentRoad].length;
            agent.currentPosition += amt * agent.currentDirection;

            if(agent.currentPosition < 0 || agent.currentPosition > 1) {
                var i = agent.roads.indexOf(agent.currentRoad);
                var current = this.roads[agent.currentRoad];
                var next = this.roads[agent.roads[i+1]];
                if(!next) {
                    if(agent.reversed) { delete this.agents[agentID]; continue; } // TODO add to pathfind queue!
                    agent.reversed = true;
                    agent.roads = agent.roads.reverse();
                    agent.currentPosition = agent.currentPosition > 1 ? 1 : 0;
                    agent.currentDirection *= -1;
                } else {
                    agent.currentRoad = next.id;
                    if(agent.currentPosition < 0 && current.p1 === next.p1 || agent.currentPosition > 1 && current.p2 === next.p1) {
                        agent.currentPosition = 0;
                        agent.currentDirection = 1;
                    } else {
                        agent.currentPosition = 1;
                        agent.currentDirection = -1;
                    }
                }
            }
        }
    }

    Model.deserialize = function(ser) {
        var model = new Model();

        model.points = ser.points;
        for(var roadID in ser.roads) {
            model.addRoad(ser.roads[roadID]);
        }

        return model;
    }

    window.Point = Point;
    window.Road = Road;
    window.Agent = Agent;
    window.Model = Model;
})();