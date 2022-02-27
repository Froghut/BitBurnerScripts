/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("sleep");
	var target = ns.args[0];
	var allowHack = ns.args.length > 1;
	ns.print("Allow Hack: " + allowHack);
	var moneyThresh = ns.read("/data/homeMoneyThresh.txt");
	var securityThresh = ns.read("/data/homeSecurityThresh.txt");
	var growth = ns.read("/data/homeGrowth.txt");
	var lastMoney = -1;
	var lastSecurity = -1;
	while (true) {
		var money = ns.getServerMoneyAvailable(target);
		var security = ns.getServerSecurityLevel(target);
		ns.print(ns.sprintf("%s (%s); %s (%s)", ns.nFormat(money, "0.000a"), ns.nFormat(moneyThresh, "0.00a"), Math.round(security * 10) / 10, Math.round(securityThresh * 10) / 10));
		var logToSend = ns.sprintf("%s (%s)|%s->%s (%s); %s->%s (%s)", target, growth, ns.nFormat(lastMoney, "0.000a"), ns.nFormat(money, "0.000a"), ns.nFormat(moneyThresh, "0.00a"), Math.round(lastSecurity * 10) / 10, Math.round(security * 10) / 10, Math.round(securityThresh * 10) / 10)
		await ns.writePort(1, logToSend);
		lastMoney = money;
		lastSecurity = security;
		ns.print("Security: " + security + " / " + securityThresh + "; money: " + money + " / " + moneyThresh);
		if (!allowHack && (money >= moneyThresh || money < lastMoney)) {
			return;
		}
		if (security > securityThresh) {
			await runWait(ns, "/utility/weaken.js", target);
		} else if (money < moneyThresh) {
			await runWait(ns, "/utility/grow.js", target);
		} else if (allowHack) {
			await runWait(ns, "/utility/hack.js", target);
			return;
		}
		money = ns.getServerMoneyAvailable(target);
		security = ns.getServerSecurityLevel(target);
		await runWait(ns, "utility/joinFactions.js", "home", 1);
		await runWait(ns, "contractsolver.js", "home", 1);
		if (!ns.scriptRunning("backdoor.js", "home")) {
			ns.run("backdoor.js");
		}
		if (!allowHack && (money >= moneyThresh || money < lastMoney)) {
			return;
		}
	}
}

/** @param {NS} ns **/
async function runWait(ns, script, target, forceThreads = undefined) {
	var maxRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
	var reserved = 6;
	if (ns.getServerMaxRam("home") > 512) {
		reserved = 34;
	}
	if (maxRam < reserved && forceThreads == undefined) {
		await ns.sleep(10 * 1000);
	}
	else {
		var threads = (maxRam - reserved) / ns.getScriptRam(script);
		if (forceThreads != undefined) {
			threads = forceThreads;
		}
		ns.run(script, threads, target);
		while (ns.scriptRunning(script, "home")) {
			await ns.sleep(1000);
		}
	}
}