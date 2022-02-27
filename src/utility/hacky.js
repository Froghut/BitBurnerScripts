/** @param {import("../..").NS } ns **/
export async function main(ns) {
	
	ns.disableLog("sleep");
	var target = ns.args[0];
	var thisServer = ns.args[1];
	var maxRam = ns.args[2];
	var lastMoney = -1;
	var lastSecurity = -1;
	while (true) {
		var moneyThresh = ns.read("moneyThresh.txt");
		var securityThresh = ns.read("securityThresh.txt");
		var growth = ns.read("growth.txt");
		var money = ns.getServerMoneyAvailable(target);
		var security = ns.getServerSecurityLevel(target);
		ns.print(ns.sprintf("%s (%s); %s (%s)", ns.nFormat(money, "0.000a"), ns.nFormat(moneyThresh, "0.00a"), Math.round(security * 10) / 10, Math.round(securityThresh * 10) / 10));
		var logToSend = ns.sprintf("%s (%s)|%s->%s (%s); %s->%s (%s)", target, growth, ns.nFormat(lastMoney, "0.000a"), ns.nFormat(money, "0.000a"), ns.nFormat(moneyThresh, "0.00a"), Math.round(lastSecurity * 10) / 10, Math.round(security * 10) / 10, Math.round(securityThresh * 10) / 10)
		await ns.writePort(1, logToSend);
		lastMoney = money;
		lastSecurity = security;
		if (security > securityThresh) {
			await runWait(ns, "/utility/weaken.js", target, thisServer, maxRam)
		} else if (money < moneyThresh) {
			await runWait(ns, "/utility/grow.js", target, thisServer, maxRam)
		} else {
			await runWait(ns, "/utility/hack.js", target, thisServer, maxRam)
		}
		ns.run("prepareHacky.js", 1, target);
		await ns.sleep(100);
	}
}

/** @param {NS} ns **/
async function runWait(ns, script, target, thisServer, maxRam) {
	var threads = Math.floor(maxRam / ns.getScriptRam(script));
	ns.print("Script " + script + " uses " + ns.getScriptRam(script) + " RAM, total ram: " + maxRam + "; threaks: " + threads);
	ns.run(script, threads, target);
	while (ns.scriptRunning(script, thisServer)) {
		await ns.sleep(1000);
	}
	await ns.sleep(100);
}