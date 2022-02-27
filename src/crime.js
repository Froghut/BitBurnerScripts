// uses port 4
let pause = false;
let haveHighChanceCrime = false;
let mode = "money";
let lastFaction = "";
let joinGangFaction = "";

/** @param {import("..").NS } ns **/
export async function main(ns) {

	ns.atExit(() => {
		eval("window.comexec.rm('/data/stats/crime.txt');")
	});

	ns.disableLog("sleep");
	var crimes = ["shoplift", "rob store", "mug", "larceny", "drugs", "bond forge", "traffick arms", "homicide", "grand auto", "kidnap", "assassinate", "heist"];

	if (ns.fileExists("/data/crimepause.txt")){
		pause = true;
	}

	// eslint-disable-next-line no-constant-condition
	while (true) {
		var possibleCrimes = [];
		var highestChance = 0;
		var highestChanceCrime = "";
		haveHighChanceCrime = false;
		for (var crime of crimes) {
			var crimeChance = ns.getCrimeChance(crime);
			var crimeStats = ns.getCrimeStats(crime);
			if (crimeChance > highestChance) {
				highestChance = crimeChance;
				highestChanceCrime = crimeStats;
			}
			if (crimeChance > 0) {
				possibleCrimes.push({ stats: crimeStats, chance: crimeChance });
			}
			if (crimeChance > 0.5) {
				haveHighChanceCrime = true;
			}
			//possibleCrimes.push({ stats: crimeStats, chance: crimeChance });

		}
		if (possibleCrimes.length == 0) {
			possibleCrimes.push({ stats: highestChanceCrime, chance: highestChance });
		}

		//possibleCrimes.sort((a, b) => ((b.stats.money / b.stats.time) * b.chance) - ((a.stats.money / a.stats.time) * a.chance));
		possibleCrimes.sort((a, b) => {
			var ret = calcFactor(ns, b) - calcFactor(ns, a);
			if (ret != 0) {
				return ret;
			}
			ret = a.stats.time - b.stats.time;
			return ret;
		});

		//ns.toast("Crime selected: " + possibleCrimes[0].stats.name + "; money: " + possibleCrimes[0].stats.money + "; time: " + possibleCrimes[0].stats.time + "; chance: " + possibleCrimes[0].chance, "info", 5000);
		for (var i = 0; i < possibleCrimes.length; i++) {
			ns.print("Crime " + i + ": " + possibleCrimes[i].stats.name + "; money: " + possibleCrimes[i].stats.money + "; int: " + possibleCrimes[i].stats.intelligence_exp + "; karma: " + possibleCrimes[i].stats.karma + "; time: " + possibleCrimes[i].stats.time + "; chance: " + (Math.round(possibleCrimes[i].chance * 100) / 100) + "; factor: " + (Math.round(((possibleCrimes[i].stats.money / possibleCrimes[i].stats.time) * possibleCrimes[i].chance) * 100) / 100) + "; time-adjusted factor: " + (Math.round(calcFactor(ns, possibleCrimes[i], false) * 100) / 100));
		}
		if (!pause) {
			ns.commitCrime(possibleCrimes[0].stats.name);
		}
		await updateStatus(ns, possibleCrimes[0]);
		await ns.sleep(100);
		while (ns.isBusy()) {
			await checkPause(ns);
			await updateStatus(ns, possibleCrimes[0]);
			await ns.sleep(100);
			injectFactions(ns);
		}
		injectFactions(ns);
		tryJoinGang(ns);
		while (pause) {
			await ns.sleep(100);
			injectFactions(ns);
			tryJoinGang(ns);
			await checkPause(ns);
			await updateStatus(ns, possibleCrimes[0]);
		}
	}
}

/** @param {import("..").NS } ns **/
async function checkPause(ns) {
	var res = await ns.readPort(4);
	if (res == "resume") {
		pause = false;
		ns.rm("/data/crimepause.txt");
		return true;
	}
	if (res == "pause") {
		pause = true;
		await ns.write("/data/crimepause.txt", "1", "w");
		return true;
	}
	if (res == "money") {
		mode = "money";
		return true;
	}
	if (res == "karma") {
		mode = "karma";
		return true;
	}
	if (res == "int") {
		mode = "int";
		return true;
	}
	var splits = res.split("|");
	if (splits.length == 2 && splits[0] == "gang") {
		joinGangFaction = splits[1];
		return true;
	}
}

/** @param {import("..").NS } ns **/
function calcFactor(ns, crimeHolder, debug = false) {
	var originalFactor;
	if (mode == "money") {
		originalFactor = (crimeHolder.stats.money / crimeHolder.stats.time) * crimeHolder.chance;
	}
	else if (mode == "karma") {
		originalFactor = (crimeHolder.stats.karma / crimeHolder.stats.time) * crimeHolder.chance * 10000;
	}
	else if (mode == "int") {
		originalFactor = (crimeHolder.stats.intelligence_exp / crimeHolder.stats.time) * crimeHolder.chance * 100000;
	}
	//var inverseChance = 1 - crimeHolder.chance;
	var durationFactor = 1 - ((crimeHolder.stats.time / 600000) * 0.5);
	if (debug) {
		ns.print(crimeHolder.stats.name + "; originalFactor: " + originalFactor + "; chance: " + crimeHolder.chance + "; durationFactor: " + durationFactor + "; combined: " + crimeHolder.chance.map(1, 0, 1, durationFactor));
	}
	var ret = originalFactor * crimeHolder.chance.map(1, 0, 1, durationFactor);
	if (haveHighChanceCrime && crimeHolder.chance < 0.3) {
		ret *= 0.1;
	}
	return ret;
}

/** @param {import("..").NS } ns **/
async function updateStatus(ns, crimeHolder) {
	var clicky =  `<a onClick="(function() { window.comexec.writePort(4, 'resume'); })();" style="cursor: pointer; color: red; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">⏵︎</a>`;
	if (!pause) {
		clicky = `<a onClick="(function() { window.comexec.writePort(4, 'pause'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">⏸</a>`;
	}
	var crimeName = `<span style="display: inline" title="${ns.nFormat(crimeHolder.stats.money, "0.000a")} - Factor: ${(Math.round(calcFactor(ns, crimeHolder) * 100) / 100)}">${crimeHolder.stats.name}</span>`;
	var nextMode = "";
	switch(mode) {
		case "money":
			nextMode = "karma";
			break;
		case "karma":
			nextMode = "int";
			break;
		case "int":
			nextMode = "money";
			break;
	}
	var modeStr = `<a onClick="(function() { window.comexec.writePort(4, '` + nextMode + `'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">` + mode + `</a>`;
	var toWrite = "crimeƒ50ƒCrime mode:ƒ" + modeStr + clicky + "ƒCurrent Crime:ƒ" + crimeName + "ƒTime:ƒ" + ns.nFormat(crimeHolder.stats.time / 1000, "00:00:00") + "ƒChance:ƒ" + (Math.round(crimeHolder.chance * 10000) / 100) + "%";
	if (!ns.gang.inGang()) {
		if (ns.heart.break() > -54000) {
			var karmaFactor = crimeHolder.stats.karma / (crimeHolder.stats.time / 1000) * crimeHolder.chance;
			//ns.tprint(crimeHolder.stats.karma / (crimeHolder.stats.time / 1000) * crimeHolder.chance);
			var remainingKarma = ((54000 + ns.heart.break()) / karmaFactor);
			var remainingText = ns.nFormat(remainingKarma, "00:00:00");
			//ns.tprint(karmaFactor + " - "  + remainingKarma);
			if (!isFinite(remainingKarma))
				remainingText = "∞";
			toWrite += "ƒForm Gang:ƒ<span style:'display: inline;' title='" + Math.round(ns.heart.break()) + "'>" + remainingText + "</span>";
		}
		else {
			toWrite += "ƒ<span style='display: inline; color: red;'>Gang can be formed!</span>ƒ ";
		}
		if (joinGangFaction != "") {
			toWrite += "ƒ ƒ" + joinGangFaction;
		}
	}
	await ns.write("/data/stats/crime.txt", toWrite, "w");
}

/** @param {import("..").NS } ns **/
function injectFactions(ns) {
	if (ns.gang.inGang()) {
		return;
	}
    var doc = eval("document");
    var lineNode = doc.querySelector("#root > div > div.MuiBox-root.css-1ik4laa > div.jss3.MuiBox-root.css-0 > p:nth-child(4)")
    var ctestNode = doc.querySelector("#root > div > div.MuiBox-root.css-1ik4laa > div.jss3.MuiBox-root.css-0 > div:nth-child(5) > p");
    var isCompany = ctestNode == null || ctestNode.innerText.includes("Company");
    if (lineNode == undefined || lineNode.innerText != "-------------------------" || isCompany) {
        lastFaction = "";
        return;
    }

    var factionNode = doc.querySelector("#root > div > div.MuiBox-root.css-1ik4laa > div.jss3.MuiBox-root.css-0 > h4");
    var faction = factionNode.innerText;
    if (faction == lastFaction) {
        return;
    }
    lastFaction = faction;

    if (faction == "Slum Snakes"
        || faction == "Tetrads"
        || faction == "The Syndicate"
        || faction == "The Dark Army"
        || faction == "Speakers for the Dead"
        || faction == "NiteSec"
        || faction == "The Black Hand") {
            var onClick = `onClick="(function() { window.comexec.writePort(4, 'gang|`+faction+`'); })();"`;
            var newButton = doc.createRange().createContextualFragment(`<button style="margin: 16px 16px 0px 0px;" class="MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButtonBase-root css-13ak5e0" tabindex="0" type="button" `+onClick+`>Queue Create Gang<span class="MuiTouchRipple-root css-w0pj6f"></span></button>`);
			var node = doc.querySelector("#root > div > div.MuiBox-root.css-1ik4laa > div.jss3.MuiBox-root.css-0 > p:nth-child(8)");
            node.append(newButton);
        }
}

/** @param {import("..").NS } ns **/
function tryJoinGang(ns) {
	if (!ns.gang.inGang() && ns.heart.break() < -54000 && joinGangFaction != "") {
		if (ns.gang.createGang(joinGangFaction)) {
			joinGangFaction = "";
			ns.run("/utility/runWhenPossible.js",1,"gang.js");
		}
	}
}

Number.prototype.map = function (in_min, in_max, out_min, out_max) {
	return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}