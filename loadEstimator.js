((global) => {
	importScripts('./model.js');

	var recalculationsSinceUpdate = 0;
	var model;
	var ports;

	var agentsUsingRoads = {};
	var roadLoad = {};

	function start(payload) {
		model = Model.deserialize(payload.model);
		ports = payload.workerPorts;

		for(var i = 0; i < ports.length; i++) {
			ports[i].onmessage = onMessage;
		}
	}

	function receiveAgent(agent) {
		for(var i = 0; i < agent.roads.length; i++ ) {
			if(!agentsUsingRoads[agent.roads[i]]) {
				agentsUsingRoads[agent.roads[i]] = [];
			}
			agentsUsingRoads[agent.roads[i]].push(agent);
		}

		recalculateRoadLoadFactors(agent.roads);
	}

	function removeAgent(agent) {
		for(var i = 0; i < agent.roads.length; i++ ) {
			for(var j = 0; j < agentsUsingRoads[agent.roads[i]].length; j++) {
				if(agentsUsingRoads[agent.roads[i]][j].id === agent.id) {
					agentsUsingRoads[agent.roads[i]] = agentsUsingRoads[agent.roads[i]].splice(j, 1);
				}
			}
		}

		recalculateRoadLoadFactors(agent.roads);
	}

	function calculateTotalRouteTime(roads) {
		var time = 0;
		for( var i = 0; i < roads.length; i++ ) {
			time += calculateRoadTime(roads[i]);
		}
		return time;
	}

	function calculateRoadTime(road) {
		return model.roads[road].speed / model.roads[road].length * (typeof roadLoad[road] != "undefined" ? roadLoad[road] : 1) ;
	}

	function recalculateRoadLoadFactors(roads) {
		recalculationsSinceUpdate++;

		for(var i = 0; i < roads.length; i++) {
			var cumulativeRouteTime = 0;
			var cumulativeTimeOnRoad = 0;
			for(var j = 0; j < agentsUsingRoads[roads[i]].length; j++) {
				cumulativeRouteTime += calculateTotalRouteTime(agentsUsingRoads[roads[i]][j].roads);
				cumulativeTimeOnRoad += calculateRoadTime(roads[i]);
			}

			var ratio = cumulativeTimeOnRoad / cumulativeRouteTime;

			var maxFreeFlowCars = Math.max(1, model.roads[roads[i]].length / 5 * model.roads[roads[i]].size);
			var minQuarterFlowCars = maxFreeFlowCars * 6;
			
			var cars = agentsUsingRoads[roads[i]] ? agentsUsingRoads[roads[i]].length : 0;
			cars *= ratio;
            if(cars <= maxFreeFlowCars) {
                roadLoad[roads[i]] = 1;
            } else if( cars >= minQuarterFlowCars) {
                roadLoad[roads[i]] = .25;
            } else {
                cars -= maxFreeFlowCars;
                cars /= minQuarterFlowCars - maxFreeFlowCars;
                roadLoad[roads[i]] = .75 * cars + .25;
            }
		}

		if(recalculationsSinceUpdate >= 30) {
			recalculationsSinceUpdate = 0;
			sendData();
		}
	}

	function sendData() {
		for(var i = 0; i < ports.length; i++) {
			ports[i].postMessage({type: "update_load", roadLoad});
		}
	}

	function onMessage({data: {type, payload}}) {
		switch(type) {
			case "START": start(payload); break;
			case "ADD_AGENT": receiveAgent(payload); break;
			case "REMOVE_AGENT": removeAgent(payload); break;
		}
	}

	global.onmessage = onMessage
})(this);