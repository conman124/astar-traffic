((global) => {
	function Simulation(model) {
		this.model = model || new Model();

		var template = document.getElementById("template").innerText;

		document.getElementById("attach").innerHTML = template;

		this.canvas = document.getElementById("canvas");
		this.uicanvas = document.getElementById("ui")
		this.canvas.width = this.uicanvas.width = window.innerWidth;
		this.canvas.height = this.uicanvas.height = window.innerHeight;

		this.renderer = new Renderer(this.canvas, this.model);
		this.renderer.start();
		this.ui = new UI(this.uicanvas, this.model);
		this.ui.start();

		this.processMessage = this.processMessage.bind(this);
		this.start = this.start.bind(this);
		this.onResize = this.onResize.bind(this);
		this.load = this.load.bind(this);
		this.save = this.save.bind(this);
		this.onAgentFinished = this.onAgentFinished.bind(this);

		window.addEventListener("resize", this.onResize);
		document.getElementById("start").addEventListener("click", this.start);
		document.getElementById("load").addEventListener("change", this.load);
		document.getElementById("save").addEventListener("click", this.save);
		this.model.onAgentFinished = this.onAgentFinished
	}

	Simulation.prototype.onResize = function() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;

		if(this.uicanvas) {
			this.uicanvas.width = window.innerWidth;
			this.uicanvas.height = window.innerHeight;
		}
	}

	Simulation.prototype.start = function() {
		this.ui.stop();
		this.uicanvas.remove();
		delete this.uicanvas;

		this.renderer.startSimulating();

		var workerCount = parseInt(document.getElementById("workerCount").value, 10);
		this.workerCount = workerCount;
		var agentCount = parseInt(document.getElementById("agentCount").value, 10);
		this.agentCount = agentCount;
		this.useLoadEstimator = document.getElementById("useLoadEstimator").checked;

		document.getElementById("toolbox").remove();
	
		this.workers = [];
		this.workerPorts = [];
		this.backlogs = [];

		for(var i = 0; i < workerCount; i++ ) {
			var worker = new Worker("./pathfinder.js");
			const channel = new MessageChannel();
			worker.postMessage({type: "start", model: this.model.serialize(), agentCount, workerCount, workerNumber: i, loadEstimator: channel.port1}, [channel.port1]);
			worker.addEventListener("message", this.processMessage);
			this.workers.push(worker);
			this.workerPorts.push(channel.port2);
			this.backlogs[i] = Math.floor(agentCount / workerCount) + ((agentCount % workerCount >= i + 1 ) ? 1 : 0);
		}

		if(this.useLoadEstimator) {
			var worker = new Worker("./loadEstimator.js");
			worker.postMessage({type: "START", payload: {model: this.model.serialize(), workerPorts: this.workerPorts}}, this.workerPorts);
			this.workers.push(worker);
		}
	}

	Simulation.prototype.processMessage = function({data}) {
		if(data.type === "agent") {
			this.backlogs[data.workerID % this.workerCount]--;
			document.getElementById("backlog").innerText = `Backlog: ${this.backlogs.reduce((acc,i)=>acc+i,0)}`;
			this.model.addAgent(new Agent(data.startPoint, data.roads.map(r=>this.model.roads[r]), Agent.types.CAR, .90 + Math.random()/5, 0, data.workerID))
		}
	}

	Simulation.prototype.save = function() {
		var ser = JSON.stringify(this.model.serialize());
		var blob = new Blob([ser], {type : 'application/octet-stream'});
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url;
		a.download = "map.json";
		document.body.appendChild(a);
		a.click();
		a.remove();
	}

	Simulation.prototype.load = function(e) {
		var file = e.target.files[0];
		var reader = new FileReader();
		reader.onload = (e) => {
			this.kill();
			window.simulation = new Simulation(Model.deserialize(JSON.parse(e.target.result)));
		}

		reader.readAsText(file);
	}

	Simulation.prototype.kill = function() {
		if(this.workers) {
			this.workers.forEach(w=>{
				w.terminate()
				w.removeEventListener("message", this.processMessage)
			});
		}

		if(this.ui) {
			this.ui.stop()
		}
		this.renderer.stop();
		
		window.simulation = null;
		window.removeEventListener("resize", this.onResize);
		if(document.getElementById("toolbox")) {
			document.getElementById("start").removeEventListener("click", this.start);
			document.getElementById("load").removeEventListener("load", this.load);
			document.getElementById("save").removeEventListener("save", this.save);
		}
	}

	Simulation.prototype.onAgentFinished = function(agent) {
		// determine which worker to send it to:
		var id = agent.workerID;
		var worker = id % this.workerCount;
		this.workers[worker].postMessage({type: "recalculate", agent: id});
		this.backlogs[worker]++;

		document.getElementById("backlog").innerText = `Backlog: ${this.backlogs.reduce((acc,i)=>acc+i,0)}`;
		if(this.useLoadEstimator) {
			this.workers[this.workers.length-1].postMessage({type: "REMOVE_AGENT", payload: agent})
		}
	}

	global.Simulation = Simulation;
})(this);
