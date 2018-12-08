importScripts('./model.js');

var model;

function receiveModel(ser) {
    model = Model.deserialize(ser);
}

function receiveAgent(agent) {
    model.addAgent(agent);
    recalculateRoadLoad(agent.roads);
}

function removeAgent(agent) {
    var agent = model.agents[agent];
    delete model.agents[agent];

    recalculateRoadLoad(agent.roads);
}

function recalculateRoadLoad(roads) {
    model.recalculateRoadLoad(roads);
    return roads.reduce((acc, roadID) => {
        acc[roadID] = model.roadLoad[roadID];
        return acc;
    }, {});
}

onmessage = function({data: {type, payload}}) {
    switch(type) {
        case "SET_MODEL": receiveModel(payload); break;
        case "ADD_AGENT": receiveAgent(payload); break;
        case "REMOVE_AGENT": removeAgent(payload); break;
    }
}