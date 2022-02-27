/** @param {import("..").NS } ns **/
export async function main(ns) {
	var target = ns.args[0];
	var moneyThresh = ns.getServerMaxMoney(target) * 0.75;
	var securityThresh = ns.getServerMinSecurityLevel(target) + 5;
	await writeIfDifferent(ns, "moneyThresh.txt", moneyThresh);
	await writeIfDifferent(ns, "securityThresh.txt", securityThresh);
	await writeIfDifferent(ns, "growth.txt", ns.getServer(target).serverGrowth);
	if (!ns.fileExists("target.txt"))
		await ns.write("target.txt", target, "w");
}

/** @param {import("..").NS } ns **/
async function writeIfDifferent(ns, filename, value) {
	if (ns.fileExists(filename)) {
		var fileValue = await ns.read(filename);
		if (fileValue != value) {
			await ns.write(filename, value, "w");
		}
	}
	else {
		await ns.write(filename, value, "w");
	}
}