// uses port 8
let finished = false;
let bdServers = 0;
let checkedServers = [];
let purchasedServerCount = 0;
let enableBuy = true;
let endServer = "w0r1d_d43m0n";
let reqHacking = [99999,99999,99999,99999,99999,99999];
let hnetHacking = true;
let allDone = false;
let maxServerMoney = 0;
let maxServerName = "";

/** @param {import("..").NS } ns **/
export async function main(ns) {

	let purchaseServersForTargets = [];
	//let alternativeTarget = "omega-net";
	let alternativeTarget = { name: "harakiri-sushi", maxMoney: 0};
	let buyRamInfo = { max: 1024, purchase: 1024 };
	let serverPaths = {};
	let serversNeedUpgrade = [];
	let startUpgradeServers = false;
	var allowWorldDomination = false;
	let forceUpgrade = false;

	allDone = false;

	ns.disableLog("scan");
	ns.disableLog("scp");
	ns.disableLog("sleep");
	ns.disableLog("brutessh");
	ns.disableLog("ftpcrack");
	ns.disableLog("relaysmtp");
	ns.disableLog("httpworm");
	ns.disableLog("sqlinject");
	ns.disableLog("getHackingLevel");

	ns.atExit(() => {
		eval("window.comexec.rm('/data/stats/infectbd.txt');")
	});

	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (ns.fileExists("/data/backdoorPath.txt")) { await ns.rm("/data/backdoorPath.txt"); }
		bdServers = 0;
		finished = true;
		checkedServers = [];
		//ns.disableLog("ALL");

		if (serversNeedUpgrade.length > 0) {
			finished = false;
			if (startUpgradeServers) {
				if (ns.getServerMoneyAvailable("home") >= ns.getPurchasedServerCost(ns.getPurchasedServerMaxRam())) {
					var s = serversNeedUpgrade.pop();
					ns.killall(s);
					ns.deleteServer(s);
				}
			}
			if (forceUpgrade) {
				while(serversNeedUpgrade.length > 0) {
					var s = serversNeedUpgrade.pop();
					ns.killall(s);
					ns.deleteServer(s);
				}
				forceUpgrade = false;
			}

		}

		var writeMaxMoneyServer = maxServerMoney == 0;

		await ScanMore(ns, "home", "", serverPaths, serversNeedUpgrade, alternativeTarget, purchaseServersForTargets, allowWorldDomination);

		if (writeMaxMoneyServer) {
			await ns.write("/data/maxServer.txt", maxServerName, "w");
		}

		if (ns.args[0] == "1") {
			break;
		}

		ns.print("Server buy left: " + purchaseServersForTargets.length + "; Servers need upgrade: " + serversNeedUpgrade.length + "; max price: " + ns.nFormat(ns.getPurchasedServerCost(ns.getPurchasedServerMaxRam()), "0.000a"));

		var limit = ns.getPurchasedServerLimit();
		purchaseServersForTargets.sort((a,b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));

		if (purchaseServersForTargets.length > 0 && purchasedServerCount < limit) {
			await TryPurchaseHackServer(ns, purchaseServersForTargets[0], undefined, buyRamInfo, purchaseServersForTargets, serversNeedUpgrade, alternativeTarget, serverPaths);
		}

		if (ns.getServerMoneyAvailable("home") >= ns.getPurchasedServerCost(ns.getPurchasedServerMaxRam())) {
			startUpgradeServers = true;
		}

		if ((purchaseServersForTargets.length == 0 || purchasedServerCount == limit) && serversNeedUpgrade.length > 0) {
			buyRamInfo.max = ns.getPurchasedServerMaxRam();
		}
		
		if ((purchaseServersForTargets.length == 0 || purchasedServerCount == limit)  && finished) {
			
			if (purchasedServerCount >= limit) {
				//ns.tprint("Infected everything!")
				//return;
				allDone = true;
			}
			else {
				var serverName = alternativeTarget.name + "_" + makeid(3);
				await TryPurchaseHackServer(ns, alternativeTarget.name, serverName, buyRamInfo, purchaseServersForTargets, serversNeedUpgrade, alternativeTarget, serverPaths);
			}
		}

		await tryBuyPrograms(ns);

		for (var k = 0; k < 100; k++) {
			await ns.sleep(100);
			var read = ns.readPort(8);
			if (read == "enablebuy") {
				enableBuy = true;
			}
			if (read == "disablebuy") {
				enableBuy = false;
			}
			if (read == "worlddomination") {
				allowWorldDomination = true;
			}
			if (read == "forceUpgrade") {
				forceUpgrade = true;
			}
			if (read == "enablehnet") {
				hnetHacking = true;
			}
			if (read == "disablehnet") {
				hnetHacking = false;
			}
			await updateStatus(ns, buyRamInfo, purchaseServersForTargets.length, finished ? limit - purchasedServerCount : 0, serversNeedUpgrade.length, allowWorldDomination, forceUpgrade);
		}
		//ns.tprint(purchaseServersForTargets.length + "; " + finished + "; " + limit + "; " + purchasedServerCount);

		//await ns.sleep(1000 * 10);
	}
}

/** @param {import(".").NS } ns **/
async function ScanMore(ns, target, parentPath, serverPaths, serversNeedUpgrade, alternativeTarget, purchaseServersForTargets, allowWorldDomination) {
	//ns.print("ScanMore: " + target);
	if (checkedServers.includes(target)) {
		return;
	}
	serverPaths[target] = parentPath;
	checkedServers.push(target);
	await Infect(ns, target, undefined, serversNeedUpgrade, alternativeTarget, serverPaths, purchaseServersForTargets, allowWorldDomination);
	if (!ns.hasRootAccess(target)) {
		//ns.print("Not Admin: " + target)
		finished = false;
	}

	var servers = ns.scan(target);
	if (target == "home") {
		purchasedServerCount = 0;
		for (const child of servers) {
			if (child.endsWith("_H")) {
				purchasedServerCount++;
			}
		}
	}
	for (const child of servers) {
		//ns.print("##### Checking child server " + child);
		await ScanMore(ns, child, parentPath + "/" + target, serverPaths, serversNeedUpgrade, alternativeTarget, purchaseServersForTargets, allowWorldDomination);
	}
}

/** @param {import("..").NS } ns **/
async function Infect(ns, target, overrideHackTarget, serversNeedUpgrade, alternativeTarget, serverPaths, purchaseServersForTargets, allowWorldDomination) {
	
	if (target.includes("hacknet-node")) {
		await HandleHacknetServer(ns, target);
		return;
	}

	if (target == endServer && allowWorldDomination != true) {
		return;
	}

	var server = ns.getServer(target);

	if (server.moneyMax > maxServerMoney) {
		maxServerName = target;
		maxServerMoney = server.moneyMax;
		//ns.print("Setting alternative target to: " + alternativeTarget.name + " (" + ns.nFormat(alternativeTarget.maxMoney, "0.000a") + ")")
	}


	if (server.requiredHackingSkill < reqHacking[server.numOpenPortsRequired] && !server.hasAdminRights && server.requiredHackingSkill > 1) {
		reqHacking[server.numOpenPortsRequired] = server.requiredHackingSkill;
	}

	//ns.print("Infect " + target + "; override: " + overrideHackTarget);
	if (target.endsWith("_H") && server.maxRam != ns.getPurchasedServerMaxRam() && !serversNeedUpgrade.includes(target)) {
		ns.print("Found bought server that eventually needs upgrade: " + target + "; Ram: " + server.maxRam + "/" + ns.getPurchasedServerMaxRam());
		serversNeedUpgrade.push(target);
	}

	//if (target == "home" || (target.endsWith("_H") && overrideHackTarget == null)) {
	if (target == "home") {
		ns.print("home or no alternative target set");
		return;
	}

	if (!server.hasAdminRights) {
		var ports = 0;
		if (ns.fileExists("BruteSSH.exe", "home")) {
			ns.brutessh(target);
			ports++;
		}
		if (ns.fileExists("FTPCrack.exe", "home")) {
			ns.ftpcrack(target);
			ports++;
		}
		if (ns.fileExists("relaySMTP.exe", "home")) {
			ns.relaysmtp(target);
			ports++;
		}
		if (ns.fileExists("HTTPWorm.exe", "home")) {
			ns.httpworm(target);
			ports++;
		}
		if (ns.fileExists("SQLInject.exe", "home")) {
			ns.sqlinject(target);
			ports++;
		}
		if (server.numOpenPortsRequired > ports || ns.getHackingLevel() < server.requiredHackingSkill) {
			//ns.print("##### Can't hack this yet " + target);
			return;
		}
		await ns.nuke(target);
	}

	if (server.serverGrowth > 0 && server.moneyMax > alternativeTarget.maxMoney) {
		alternativeTarget.name = target;
		alternativeTarget.maxMoney = server.moneyMax;
		ns.print("Setting alternative target to: " + alternativeTarget.name + " (" + ns.nFormat(alternativeTarget.maxMoney, "0.000a") + ")")
	}

	var refresh = ns.args[0] == "1";
	var hackTarget = target;
	if (overrideHackTarget == null) {
		if (server.moneyAvailable == 0 && server.serverGrowth == 0) {
			//ns.print("using alternative target");
			hackTarget = alternativeTarget.name;
			// probably a faction server
		}
		if (!server.backdoorInstalled && ns.getHackingLevel() >= server.requiredHackingSkill && !server.purchasedByPlayer) {
			// once file is available se backdoor function
			//ns.exec("notify.ns", "home", 1, target + " backdoor can be installed!");
			//ns.toast(target + " backdoor can be installed!", "info");
			//ns.print(serverPaths[target] + "/" + target + " backdoor can be installed!");
			await ns.write("/data/backdoorPath.txt", serverPaths[target] + "/" + target + "ƒ", "a");
			bdServers++;
		}
	}
	else {
		hackTarget = overrideHackTarget;
	}

	if (target.endsWith("_H")) {
		hackTarget = target.split("_")[0];
	}

	if (server.maxRam < 4) {
		//ns.tprintf("Low RAM server: %s; Growth: %s; MoneyMax: %s; Bought: %s; Added: %s", target, server.serverGrowth, server.moneyMax, ns.serverExists(target + "_H"), purchaseServersForTargets.includes(target));
		if (server.serverGrowth > 1 && server.moneyMax > 0 && !ns.serverExists(target + "_H") && !purchaseServersForTargets.includes(target)) {
			ns.print(ns.sprintf("Found server that needs extra hacking server: %s", target));
			purchaseServersForTargets.push(target);
		}
		return;
	}


	if (!ns.hasRootAccess(hackTarget)) {
		ns.print("Can't hack " + hackTarget + ", no root!");
		return;
	}

	var needNewTarget = false;
	if (ns.fileExists("target.txt", target)) {
		await ns.scp("target.txt",target, "home");
		var readTarget = await ns.read("target.txt");
		ns.rm("target.txt");
		if (readTarget != hackTarget) {
			needNewTarget = true;
		}
	}
	else {
		needNewTarget = true;
	}

	if (needNewTarget) {
		ns.killall(target);
		ns.rm("target.txt", target);
		ns.print(`Refresh hacktarget on '${target}' from '${readTarget}' to '${hackTarget}'`);
	}

	if (refresh) {
		if (ns.scriptRunning("hacky.js", target)) {
			ns.killall(target);
		}
	}
	else {
		if (ns.scriptRunning("/utility/hacky.js", target) || ns.scriptRunning("/utility/singlehacky.js", target)) {
			return;
		}
	}
	ns.print(target + " RAM: " + server.maxRam);
	await ns.scp("/utility/hacky.js", "home", target);
	await ns.scp("/utility/hack.js", "home", target);
	await ns.scp("/utility/weaken.js", "home", target);
	await ns.scp("/utility/grow.js", "home", target);
	if (target == "n00dles") {
		await ns.scp("/utility/singlehacky.js", "home", target);
	}
	await ns.scp("prepareHacky.js", "home", target);
	ns.exec("prepareHacky.js", target, 1, hackTarget);
	await ns.sleep(500);
	var usedRam = ns.getScriptRam("/utility/hacky.js", target);
	if (target == "n00dles") {
		ns.exec("/utility/singlehacky.js", target, 1, hackTarget, target, server.maxRam - usedRam);
	}
	else {
		var maxRam = server.maxRam;
		if (target.includes("hacknet-node") && server.maxRam >= 16) {
			maxRam /= 2;
		}
		ns.print(target + " useable RAM: " + (maxRam - usedRam));
		ns.exec("/utility/hacky.js", target, 1, hackTarget, target, maxRam - usedRam);
	}
	ns.print("Hacked " + target);
	ns.toast("Hacked " + target, "success");
}

/** @param {import("..").NS } ns **/
async function HandleHacknetServer(ns, target) {

	var server = ns.getServer(target);

	if (server.maxRam < 16) {
		return;
	}

	if (!hnetHacking) {
		ns.killall(target);
		return;
	}

	if (server.ramUsed < server.maxRam * 0.4) {
		ns.killall(target);
	}

	if (!ns.scriptRunning("/utility/stanekCharge.js", target)) {
		await ns.scp("/utility/stanekCharge.js", "home", target);
		var stanekThreads = server.maxRam / 2 / ns.getScriptRam("/utility/stanekCharge.js", target);
		ns.exec("/utility/stanekCharge.js", target, Math.max(1, stanekThreads));
	}
}

/** @param {import(".").NS } ns **/
async function TryPurchaseHackServer(ns, target, overrideTargetName, buyRamInfo, purchaseServersForTargets, serversNeedUpgrade, alternativeTarget, serverPaths) {
	if (!enableBuy) {
		return;
	}
	var limit = ns.getPurchasedServerLimit();
	var cost = ns.getPurchasedServerCost(buyRamInfo.purchase);
	var moneyAvailable = ns.getServerMoneyAvailable("home");
	var pow = 10;
	while (cost < moneyAvailable) {
		cost = ns.getPurchasedServerCost(Math.pow(2, ++pow));
		if (Math.pow(2, pow) == ns.getPurchasedServerMaxRam()) {
			pow++;
			break;
		}
		//ns.tprint(pow + " - " + Math.pow(2, ++pow) + " - " + cost);
		await ns.sleep(1);
	}
	pow--;
	var actualRam = Math.max(Math.pow(2, pow), buyRamInfo.max);
	// set maxram to maximum ram we were ever able to buy
	buyRamInfo.max = actualRam;
	cost = ns.getPurchasedServerCost(actualRam);
	var available = limit - purchasedServerCount;
	var canBuy = cost < moneyAvailable;
	ns.print(ns.sprintf("Want to get Server to hack %s; Cost: %s (RAM: %s; max: %s); Servers available: %s; canBuy: %s; moneyAvailable: %s", target, ns.nFormat(cost, "0.000a"), actualRam, ns.getPurchasedServerMaxRam(), available, canBuy, ns.nFormat(moneyAvailable, "0.000a")));
	if (canBuy && available > 0) {
		var serverName = target + "_H";
		//ns.tprint(serverName + " - " + overrideTargetName);
		if (overrideTargetName != undefined) {
			serverName = overrideTargetName + "_H";
		}
		var actualServerName = ns.purchaseServer(serverName, actualRam);
		ns.print("Calling infect with params " + actualServerName + ", " + target);
		await Infect(ns, actualServerName, target, serversNeedUpgrade, alternativeTarget, serverPaths, purchaseServersForTargets, false);
		purchaseServersForTargets.shift();
	}
}

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

/** @param {import("..").NS } ns **/
async function updateStatus(ns, buyRamInfo, serverBuyCount, additionalServerCount, upgradesNeededCount, allowWorldDomination, forceUpgrade) {
	var toWrite = "infectƒ6";
	if (!allDone) {
		toWrite += `ƒBuy Servers:ƒ<a onClick="(function() { window.comexec.writePort(8, '` + (enableBuy ? "disablebuy" : "enablebuy") + `'); })();" style="` + (!enableBuy ? "color: red;" : "") + ` cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">` + (enableBuy ? "⏸" : "⏵︎") + `</a>`;
		toWrite += `<a onClick="(function() { window.comexec.writePort(8, 'forceUpgrade'); })();" style="` + (forceUpgrade ? "color: red;" : "") + ` cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">Force Up</a>`
	}
	toWrite += `ƒHNET Hacking:ƒ<a onClick="(function() { window.comexec.writePort(8, '` + (hnetHacking ? "disablehnet" : "enablehnet") + `'); })();" style="` + (!hnetHacking ? "color: red;" : "") + ` cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">` + (hnetHacking ? "⏸" : "⏵︎") + `</a>`;
	if (bdServers > 0) {
		var text = "ƒBackdoors:ƒ" + bdServers;
		if (!ns.scriptRunning("backdoor.js", "home")) {
			text = `ƒBackdoors:ƒ<a onClick="(function() { window.comexec.run('backdoor.js'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">`+bdServers+`</a>`;
		}
		toWrite += text;
	}
	if (!allDone) {
	var serverCost = ns.getPurchasedServerCost(buyRamInfo.max);
		toWrite += "ƒServer Cost:ƒ" + ns.nFormat(serverCost, "0.00a"); 
		toWrite += "ƒServers to buy:ƒ" + (serverBuyCount + additionalServerCount) + " - " + upgradesNeededCount;
	}
	var ends = ns.getServer(endServer);
	if (ns.getHackingLevel() >= ends.requiredHackingSkill && !allowWorldDomination) {
		toWrite += `ƒEnd Bitnodeƒ<a onClick="(function() { window.comexec.writePort(8, 'worlddomination'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px; color: orange;">End it!</a>`;
	}
	
	await ns.write("/data/stats/infectbd.txt", toWrite, "w");
}


/** @param {import("..").NS } ns **/
async function tryBuyPrograms(ns) {
	var player = ns.getPlayer();
	if (!player.tor) {
		ns.purchaseTor();
	}
	ns.print(reqHacking);
	if (!ns.fileExists("BruteSSH.exe", "home") && player.hacking >= reqHacking[1] && !purchaseProg(ns, "BruteSSH.exe")) {
	}
	if (!ns.fileExists("FTPCrack.exe", "home") && player.hacking >= reqHacking[2] && !purchaseProg(ns, "FTPCrack.exe")) {
	}
	if (!ns.fileExists("relaySMTP.exe", "home") && player.hacking >= reqHacking[3] && !purchaseProg(ns, "relaySMTP.exe")) {
	}
	if (!ns.fileExists("HTTPWorm.exe", "home") && player.hacking >= reqHacking[4] && !purchaseProg(ns, "HTTPWorm.exe")) {
	}
	if (!ns.fileExists("SQLInject.exe", "home") && player.hacking >= reqHacking[5] && !purchaseProg(ns, "SQLInject.exe")) {
	}
	await ns.sleep(100);
}

/** @param {import(".").NS } ns **/
function purchaseProg(ns, prog) {
	return ns.purchaseProgram(prog);
}