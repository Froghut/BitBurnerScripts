let maxRam;
let thisServer;

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("sleep");
	var target = ns.args[0];
	thisServer = ns.args[1];
	maxRam = ns.args[2];
	var moneyThresh = ns.read("moneyThresh.txt");
	var securityThresh = ns.read("securityThresh.txt");
	var growth = ns.read("growth.txt");
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
		if (security > securityThresh) {
			await ns.weaken(target);
		} else if (money < moneyThresh) {
			await ns.grow(target);
		} else {
			await ns.hack(target);
		}
	}
}