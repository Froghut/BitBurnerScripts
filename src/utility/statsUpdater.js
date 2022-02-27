// uses port 5 for buy aug
// uses port 6 to clear buy augs
/* eslint-disable no-unused-vars */
let doc;
let hook0;
let hook1;
let lastState0 = [];
let lastState1 = [];
let lastIds = "";

/** @param {import("../..").NS } ns **/
export async function main(ns) {
	ns.run;
	ns.writePort;
	ns.rm;
	//ns.disableLog("purchaseAugmentation");
	ns.disableLog("asleep");
	doc = eval("document");
	hook0 = doc.getElementById('overview-extra-hook-0').parentNode;
	hook1 = doc.getElementById('overview-extra-hook-1').parentNode;
	hook0.innerHTML = '<div class="jss17 MuiTypography-root MuiTypography-body1 css-cxl1tz" id="overview-extra-hook-0"></div>';
	hook0 = doc.getElementById('overview-extra-hook-0')
	hook1.innerHTML = '<div class="jss17 MuiTypography-root MuiTypography-body1 css-cxl1tz" id="overview-extra-hook-1"></div>';
	hook1 = doc.getElementById('overview-extra-hook-1')
	var win = eval("window");
	var comExec = new comexec(ns);
	win.comexec = comExec;
	let data = {};


	// eslint-disable-next-line no-constant-condition
	while (true) {

		data = {};
		var files = ns.ls("home", "/data/stats/");
		for (var file of files) {
			//ns.print("reading " + file);
			var val = await ns.read(file).split("ƒ");
			var statID = val[0];
			if (val[2] == "") {
				delete data[statID];
			}
			else {
				var pos = parseInt(val[1]);
				data[statID] = { id: statID,  position: pos, displayData: [] };
				for (var i = 0; i < ((val.length - 2) / 2); i++) {
					// if (i == 0) {
					// 	var spanStart = '<span style="border-top: 1px solid #FFF; width: 100%; display: inline-block; padding-top: 2px; margin-top: 2px;">';
					// 	var spanEnd = '</span>';
					// 	data[statID].vals.push({ header: spanStart + val[2 + 2 * i] + " " + spanEnd, value: spanStart + val[3 + 2 * i] + spanEnd });
					// }
					// else {
					// 	data[statID].vals.push({ header: val[2 + 2 * i] + " ", value: val[3 + 2 * i] });
					// }
					data[statID].displayData.push({ header: val[2 + 2 * i] + " ", value: val[3 + 2 * i] });
				}
			}
		}
		//ns.print(Object.keys(data).length);
		var vals = Object.keys(data).map(function (key) {
			return data[key];
		});
		vals.sort((a, b) => a.position - b.position);
		updateStats(vals);


		for (var j = 0; j < 10; j++) {
			if (comExec.needUpdate) {
				comExec.needUpdate = false;
				j = 8;
			}
			await ns.asleep(100);
		}
	}
}


function updateStats(objs) {
	var ids = "";
	for (var obj of objs) {
		ids += obj.id;
	}
	if (ids != lastIds) {
		// rebuild
		hook0.innerHTML = "";
		hook1.innerHTML = "";
		lastState0 = [];
		lastState1 = [];
		var html0 = "";
		var html1 = "";
		for (var obj of objs) {
			html0 += '<div id="id_' + obj.id + '_0" style="border-top: 1px solid #FFF; padding-top: 2px; margin-top: 2px;"></div>';
			html1 += '<div id="id_' + obj.id + '_1" style="border-top: 1px solid #FFF; padding-top: 2px; margin-top: 2px;"></div>';
		}
		hook0.innerHTML = html0;
		hook1.innerHTML = html1;
	}
	lastIds = ids;
	for (var obj of objs) {
		var headers = []
		var values = [];
		for (var val of obj.displayData) {
			headers.push(val.header);
			values.push(val.value);
		}
		const new0 = headers.join("<br/>");
		const new1 = values.join("<br/>");
		if (new0 != lastState0[obj.id] || new1 != lastState1[obj.id]) {
			doc.getElementById("id_" + obj.id + "_0").innerHTML = new0;
			doc.getElementById("id_" + obj.id + "_1").innerHTML = new1;
		}
		lastState0[obj.id] = new0;
		lastState1[obj.id] = new1;
	}
}

class comexec {

	constructor(ns) {
		this.ns = ns;
		this.needUpdate = false;
	}
	async run(script, ...args) {
		try {
			const ns = this.ns;
			var result;
			if (args.length == 0) {
				result = await eval("ns.run('" + script + "')");
			}
			else {
				result = await eval("ns.run('" + script + "', 1, '" + args.join("', '") + "')");
			}
			console.log(result);
			this.needUpdate = true;
		}
		catch (error) {
			console.error(error);
		}
	}
	async writePort(port, text) {
		try {
			const ns = this.ns;
			const result = await eval("ns.writePort(" + port + ", '" + text + "')");
			console.log(port + " " + text + " -> " + result);
			this.needUpdate = true;
		}
		catch (error) {
			console.error(error);
		}
	}
	async write(file, text, mode) {
		try {
			const ns = this.ns;
			const result = await eval("ns.write('" + file + "', '" + text + "', '" + mode + "')");
			console.log(result);
			this.needUpdate = true;
		}
		catch (error) {
			console.error(error);
		}
	}

	async rm(file) {
		try {
			const ns = this.ns;
			const result = await eval("ns.rm('" + file + "')");
			console.log(result);
			this.needUpdate = true;
		}
		catch (error) {
			console.error(error);
		}
	}
}