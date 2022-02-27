let allServers = [];
let checkedServers = [];

/** @param {import(".").NS } ns **/
export async function main(ns) {
	await ns.sleep(1000);
	ns.atExit(() => {
		eval("window.comexec.rm('/data/stats/homehacky.txt');")
	});

	var finishedServers = [];
	if (ns.fileExists("/data/finishedServers.txt")) {
		finishedServers = await ns.read("/data/finishedServers.txt").split("ƒ");
	}

	// eslint-disable-next-line no-constant-condition
	while (true) {
		allServers = [];
		checkedServers = []
		await ScanMore(ns, "home");
		allServers.sort(compareServers);

		var didwork = false;
		var target;
		for (const server of allServers) {
			target = server.hostname;
			if (target == "home") {
				continue;
			}
			if (target.endsWith("_H")) {
				continue;
			}
			if (finishedServers.includes(server.hostname)) {
				continue;
			}

			ns.print("# starting on " + target);
			didwork = true;
			await ns.write("/data/stats/homehacky.txt", "homehackyƒ5ƒ" + target + "ƒ" + ns.nFormat(server.moneyMax, "0.000a"), "w");
			await DoHack(ns, target, false);
			finishedServers.push(target);
			await ns.write("/data/stats/homehacky.txt", "homehackyƒ5ƒƒ", "w");
			await ns.write("/data/finishedServers.txt", finishedServers.join("ƒ"), "w");
		}
		if (!didwork) {
			target = allServers[allServers.length - 1].hostname;
			await DoHack(ns, target, true);
		}
		await ns.sleep(1000);
	}

}

/** @param {import(".").NS } ns **/
async function DoHack(ns, target, allowHack) {
	await ns.write("/data/homeMoneyThresh.txt", ns.getServerMaxMoney(target) * 0.75, "w");
	await ns.write("/data/homeSecurityThresh.txt", ns.getServerMinSecurityLevel(target) + 5, "w");
	await ns.write("/data/homeGrowth.txt", ns.getServer(target).serverGrowth, "w");
	if (allowHack) {
		await ns.run("/utility/homehackyhack.js", 1, target, "allowHack");
	}
	else {
		await ns.run("/utility/homehackyhack.js", 1, target);
	}
	while (ns.isRunning("/utility/homehackyhack.js", "home", target)) {
		await ns.sleep(5000);
	}
}

/** @param {import(".").NS } ns **/
async function ScanMore(ns, target) {
	var server = ns.getServer(target);
	if (checkedServers.includes(server.hostname)) {
		return;
	}
	checkedServers.push(server.hostname);
	ns.print("checking " + target + " - server: " + server.hostname);
	if (server.serverGrowth > 1 && server.hasAdminRights && server.moneyMax > 0) {
		allServers.push(server);
	}
	var servers = ns.scan(target);
	for (const child of servers) {
		//ns.print("##### Checking child server " + child);
		await ScanMore(ns, child);
	}
}


function compareServers(a, b) {
	if (a.moneyMax < b.moneyMax)
		return -1;
	if (a.moneyMax > b.moneyMax)
		return 1;
	return 0;
}