//uses port 3

/* eslint-disable no-empty */

/** @param {import("..").NS } ns **/
function myMoney() {
	return globalNs.getServerMoneyAvailable('home');
}

Number.prototype.clamp = function (min, max) {
	return Math.min(Math.max(this, min), max);
};

let globalNs;
let hnet;
let pause = false;
let maxMoneyServer = "";
/** @param {import("..").NS } ns **/
export async function main(ns) {
	globalNs = ns;
	var nextUpgradeCost = 0;
	var hashMode = "money";

	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("sleep");
	ns.disableLog("getHackingLevel");

	hnet = eval("ns.hacknet");

	ns.atExit(() => {
		eval("window.comexec.rm('/data/stats/hnetbuy.txt');")
	});

	var targetCnt = hnet.numNodes();
	if (targetCnt == 0) { targetCnt = 1; }

	var cnt = targetCnt;
	var finished = false;

	if (ns.fileExists("/data/hnetpause.txt")) {
		pause = true;
	}

	maxMoneyServer = await ns.read("/data/maxServer.txt");

	await updateStatus(ns, pause, nextUpgradeCost);

	//while (!finished) {
	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (!pause) {
			//targetCnt = Math.round(ns.getHackingLevel() / 400 * 20).clamp(2, 32);
			if (myMoney() > hnet.getPurchaseNodeCost() * 2) {
				targetCnt = hnet.numNodes() + 1;
			}
			if (targetCnt > hnet.maxNumNodes()) {
				targetCnt = hnet.maxNumNodes();
			}

			ns.print("-------------------");
			//ns.print("Hacking Level: " + ns.getHackingLevel());
			ns.print("Target HackNet Node Count: " + targetCnt + ", current: " + hnet.numNodes() + " (max " + hnet.maxNumNodes());
			cnt = targetCnt;
			finished = true;
			if (hnet.numNodes() < cnt) {
				//ns.print("Have " + hnet.numNodes() + " nodes, want " + targetCnt);
				var res = hnet.purchaseNode();
				if (res == -1) {
					//ns.print("Not enough money to buy node!");
					finished = false;
				}
				else {
					ns.print("Purchased ns Node with index " + res);
				}
			}

			cnt = hnet.numNodes();
			if (cnt != targetCnt) {
				finished = false;
			}


			/*var targetLevel = Math.round(cnt / 40 * 200).clamp(20, 300);
			ns.print("Target Level: " + targetLevel);

			var i;
			var cost;
			for (i = 0; i < cnt; i++) {
				while (hnet.getNodeStats(i).level < targetLevel) {
					cost = hnet.getLevelUpgradeCost(i, 1);
					finished = false;
					if (myMoney() < cost) {
						//ns.print("Need $" + cost + " . Have $" + myMoney());
						//await ns.sleep(3000);
						break;
					}
					res = hnet.upgradeLevel(i, 1);
					ns.print("Purchased ns Node Level with index " + i);
				}
			}

			//ns.print("All nodes upgraded to level 80");

			for (i = 0; i < cnt; i++) {
				while (hnet.getNodeStats(i).ram < 8192) {
					cost = hnet.getRamUpgradeCost(i, 1);
					finished = false;
					if (myMoney() < cost) {
						//ns.print("Need $" + cost + " . Have $" + myMoney());
						//await ns.sleep(3000);
						break;
					}
					res = hnet.upgradeRam(i, 1);
					ns.print("Purchased ns Node RAM with index " + i);
					break;
				}
			}

			//ns.print("All nodes upgraded to 64GB RAM");

			var targetCores = Math.round(cnt / 20 * 20).clamp(3, 128);
			if (cnt == hnet.maxNumNodes()) {
				targetCores = 128;
			}

			var targetMoney = 10000000;
			var maxCores = 4;
			if (!ns.fileExists("relaySMTP.exe")) {
				targetMoney = 10000000;
				maxCores = 4;
			}
			else if (!ns.fileExists("HTTPWorm.exe")) {
				targetMoney = 35000000;
				maxCores = 4;
			}
			else if (!ns.fileExists("SQLInject.exe")) {
				targetMoney = 2600000000;
				maxCores = 4;
			}

			if (targetCores > maxCores && myMoney() < targetMoney) {
				targetCores = maxCores;
			}

			ns.print("Target Cores: " + targetCores);

			for (i = 0; i < cnt; i++) {
				while (hnet.getNodeStats(i).cores < targetCores) {
					cost = hnet.getCoreUpgradeCost(i, 1);
					finished = false;
					if (myMoney() < cost) {
						//ns.print("Need $" + cost + " . Have $" + myMoney());
						//await ns.sleep(3000);
						break;
					}
					res = hnet.upgradeCore(i, 1);
					ns.print("Purchased ns Node Core with index " + i);
				}
			}
			*/
			
			nextUpgradeCost = hnet.getPurchaseNodeCost() * 2;
			if (hnet.numNodes() == hnet.maxNumNodes()) {
				nextUpgradeCost = 0;
			}
			for (var i = 0; i < cnt; i++) {
				var stats = hnet.getNodeStats(i);
				var cheapestCost = Number.MAX_SAFE_INTEGER;
				var type = "";

				if (stats.level < 300) {
					cheapestCost = hnet.getLevelUpgradeCost(i, 1);
					type = "level";
				}

				var cost = 0;
				if (stats.ram < 8192) {
					cost = hnet.getRamUpgradeCost(i, 1);
					if (cost < cheapestCost)	{
						cheapestCost = cost;
						type = "mem";
					}
				}

				if (stats.cores < 128) {
					cost = hnet.getCoreUpgradeCost(i, 1);
					if (cost < cheapestCost)	{
						cheapestCost = cost;
						type = "core";
					}
				}

				if (cheapestCost * 2 < nextUpgradeCost) {
					nextUpgradeCost = cheapestCost * 2;
				}

				ns.print(`${i} - ${type} - ${ns.nFormat(cheapestCost*2, "0.000a")} - ${ns.nFormat(myMoney(), "0.000a")} - ${myMoney() >= cheapestCost * 2} - ${type != ""}`);

				if (myMoney() >= cheapestCost * 2 && type != "") {
					//ns.print("Do Upgrade!");
					switch (type) {
						case "level":
							hnet.upgradeLevel(i, 1);
							ns.print("Purchased ns Node Level with index " + i);
							break;
						case "mem":
							hnet.upgradeRam(i, 1);
							ns.print("Purchased ns Node RAM with index " + i);
							break;
						case "core":
							hnet.upgradeCore(i, 1);
							ns.print("Purchased ns Node Core with index " + i);
							break;
					}
				}
			}

		}

		/*if (cnt == hnet.maxNumNodes() && finished) {
			break;
		}*/
		for (i = 0; i < 20; i++) {
			await updateStatus(ns, pause, nextUpgradeCost, hashMode);
			var hashType = "";
			var hashTarget = null;
			let server1 = "Reduce Minimum Security";
			let server2 = "Increase Maximum Money";
			switch (hashMode) {
				case "money":
					hashType = "Sell for Money";
					break;
				case "university":
					hashType = "Improve Studying";
					break;
				case "maxServer":
					if (ns.hacknet.hashCost(server1) <= ns.hacknet.hashCost(server2)) {
						hashType = server1;
					}
					else {
						hashType = server2;
					}
					hashTarget = maxMoneyServer;
					break;
			}
			if (ns.hacknet.hashCost(hashType) >= ns.hacknet.hashCapacity()) {
				hashType = "money";
			}
			while (ns.hacknet.numHashes() > ns.hacknet.hashCost(hashType)) {
				ns.hacknet.spendHashes(hashType, hashTarget);
			}
			await ns.sleep(100);
			var readport = ns.readPort(3);
			if (readport == "pause") {
				pause = true;
				await ns.write("/data/hnetpause.txt", "", "w");
				await updateStatus(ns, pause, nextUpgradeCost, hashMode);
			}
			if (readport == "resume") {
				pause = false;
				ns.rm("/data/hnetpause.txt");
				await updateStatus(ns, pause, nextUpgradeCost, hashMode);
			}
			if (readport == "money") {
				hashMode = "money";
				await updateStatus(ns, pause, nextUpgradeCost, hashMode);
			}
			if (readport == "university") {
				hashMode = "university";
				await updateStatus(ns, pause, nextUpgradeCost, hashMode);
			}
			if (readport == "maxServer") {
				hashMode = "maxServer";
				await updateStatus(ns, pause, nextUpgradeCost, hashMode);
			}
			if (pause) {
				i = 0;
			}
		}
	}
	ns.print("All nodes upgraded");

}

/** @param {import("..").NS } ns **/
async function updateStatus(ns, pause, nextUpgradeCost, hashMode) {
	var colorWhite = "#5555FF";
    var colorGreen = "#4CAF50"
	var toWrite = "hnetbuyƒ1ƒhnetbuyƒ";
	toWrite += `<a onClick="(function() { window.comexec.writePort(3, '` + (pause ? "resume" : "pause") + `'); })();" style="` + (pause ? "color: red;" : "") + ` cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">` + (pause ? "Resume" : "Pause") + `</a>`;
	toWrite += `<a onClick="(function() { window.comexec.writePort(5, 'hnetbuy|enable'); })();" style="margin-right: 2px; cursor: pointer; padding: 3px 0px 3px 0px; border: 1px solid `+colorGreen+`; border-radius: 4px;">⌛</a>`
	toWrite += `ƒNext Upgrade atƒ${ns.nFormat(nextUpgradeCost, "0.000a")}`;
	toWrite += "ƒHash Modeƒ";
	toWrite += `<a onClick="(function() { window.comexec.writePort(3, 'money'); })();" style="margin-right: 2px; cursor: pointer; padding: 3px 0px 3px 0px; border: 1px solid `+(hashMode == "money" ? colorWhite : colorGreen)+`; border-radius: 4px;" title="Money">💰</a>`;
	toWrite += `<a onClick="(function() { window.comexec.writePort(3, 'university'); })();" style="margin-right: 2px; cursor: pointer; padding: 3px 0px 3px 0px; border: 1px solid `+(hashMode == "university" ? colorWhite : colorGreen)+`; border-radius: 4px;" title="University">🎓</a>`;
	toWrite += `<a onClick="(function() { window.comexec.writePort(3, 'maxServer'); })();" style="margin-right: 2px; cursor: pointer; padding: 3px 0px 3px 0px; border: 1px solid `+(hashMode == "maxServer" ? colorWhite : colorGreen)+`; border-radius: 4px;" title="Max Server Upgrades">⏫</a>`;
	await ns.write("/data/stats/hnetbuy.txt", toWrite, "w");
}

