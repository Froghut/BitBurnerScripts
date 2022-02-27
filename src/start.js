/** @param {import("..").NS } ns **/
export async function main(ns) {
	var files = ns.ls("home", "/data/stats/");
	for (var file of files) {
		ns.rm(file);
	}
	if (ns.getPlayer().playtimeSinceLastBitnode < 60000) {
		ns.rm("/data/stocksEnabled.txt");
		ns.rm("/data/gangEnabled.txt");
	}

	ns.rm("/data/finishedServers.txt");
	ns.rm("/data/stockProfit.txt");

	ns.run("stanek.js");
	ns.run("logcollector.js");
	ns.run("infect.js");
	ns.run("/utility/statsUpdater.js");
	ns.run("crime.js");
	
	await ns.sleep(10000);
	ns.run("homehacky.js");
	ns.run("hnetbuy.js");
	ns.run("sleeves.js");
	ns.run("utility/buyQueue.js");
	if (ns.fileExists("/data/stocksEnabled.txt")) {
		ns.run("stocks.js");
	}
	if (ns.fileExists("/data/gangEnabled.txt")) {
		ns.run("gang.js");
	}
}