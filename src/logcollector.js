/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("sleep");
	var port = ns.getPortHandle(1);
	var dict = new Object();
	while (true) {
		var update = false;
		while (!port.empty()) {
			var line = port.read();
			var data = line.split("|");
			dict[data[0]] = data[1];
			update = true;
		}
		if (update) {
			var finishedServers = [];
			if (ns.fileExists("/data/finishedServers.txt")) {
				finishedServers = await ns.read("/data/finishedServers.txt").split("ƒ");
			}
			ns.clearLog();
			for (var key in dict) {
				var fin = "";
				if (finishedServers.some(s => s != "" && key.startsWith(s))) {
					fin = "X ";
				}
				ns.print((fin + key + ": ").padEnd(24, " ") + dict[key]);
			}
		}
		await ns.sleep(500);
	}
}