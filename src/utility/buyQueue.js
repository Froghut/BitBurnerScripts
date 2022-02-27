// uses port 5 for buy aug
// uses port 6 to clear buy augs
/* eslint-disable no-unused-vars */
let doc;
let toDo = [];
let onFactionAugmentsPage = false;
let onAugmentsPage = false;
let lastToDoCount = 0;
let minimized = false;

/** @param {import("../..").NS } ns **/
export async function main(ns) {
	//ns.disableLog("purchaseAugmentation");
	ns.disableLog("asleep");
	ns.disableLog("sleep");
	doc = eval("document");
	var win = eval("window");

	ns.atExit(() => {
        eval("window.comexec.rm('/data/stats/toDo.txt');")
    });

	if (ns.fileExists("/data/buyQueue.txt")) {
		toDo = JSON.parse(await ns.read("/data/buyQueue.txt"));
	}

	// eslint-disable-next-line no-constant-condition
	while (true) {
        injectFactionAugButtons(ns);
        injectAugButtons(ns);
        await checkToDo(ns);
        await ns.sleep(100);
	}
}

/** @param {import("../..").NS } ns **/
async function checkToDo(ns) {
	var res = ns.readPort(5);
	if (res != undefined && res != "" && res != "NULL PORT DATA") {
		ns.print(res);
	}
	var texts = res.split("|");
	if (texts[0] == "aug") {
		var faction = texts[1];
		var augName = texts[2].replace("▐", "'");
		toDo.push({ type: "aug", faction: faction, aug: augName });
		ns.print("Add Aug To Buy: " + augName + " from " + faction);
		await writeToDo(ns);
	}
	if (texts[0] == "install") {
		toDo.push({type: "install"});
		ns.print("Add Install Augmentations");
		await writeToDo(ns);
	}
	if (texts[0] == "homeram") {
		toDo.push({type: "homeram"});
		ns.print("Add Home Ram");
		await writeToDo(ns);
	}
	if (texts[0] == "hnetbuy") {
		toDo.push({type: "hnetbuy", enable: (texts[1] == "enable")});
		await writeToDo(ns);
	}

	if (toDo.length > 0) {
		var step = toDo[0];
		if (step.type == "aug") {
			if (ns.purchaseAugmentation(step.faction, step.aug)) {
				ns.tprint("Purchased Aug '" + step.aug + "'!");
				toDo.shift();
				await writeToDo(ns);
			}
		}
		if (step.type == "install") {
			ns.installAugmentations("start.js");
			toDo.shift();
			await writeToDo(ns);
		}
		if (step.type == "homeram") {
			if (ns.upgradeHomeRam()) {
				ns.tprint("Upgraded Home RAM!");
				toDo.shift();
				await writeToDo(ns);
			}
		}
		if (step.type == "hnetbuy") {
			await ns.writePort(3, step.enable ? "resume" : "pause");
			toDo.shift();
			await writeToDo(ns);
			await ns.sleep(100);
		}
	}
	res = ns.readPort(6);
	if (res == "clear") {
		toDo = [];
		await writeToDo(ns);
	}
	if (!isNaN(res)) {
		toDo.splice(res,1);
		await writeToDo(ns);
	}
	if (res == "minimize") {
		minimized = !minimized;
	}

	if (toDo.length > 0) {
		var toWrite = "toDoƒ200ƒTo Do (" + toDo.length + ")";
		if (minimized && toDo[0].type == "aug") {
			toWrite += " " + ns.nFormat(ns.getAugmentationPrice(step.aug), "0.00a");
		}
		toWrite += ` <a onClick="(function() { window.comexec.writePort(6, 'minimize'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">`+(minimized ? "🗖" : "🗕")+`</a>`
		toWrite += "ƒ";
		toWrite += `<a onClick="(function() { window.comexec.writePort(6, 'clear'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">Clear</a>`
		if (!minimized) {
			for (var x = 0; x < toDo.length; x++) {
				step = toDo[x];
				if (step.type == "aug") {
					toWrite += "ƒ" + step.aug + "ƒ" + ns.nFormat(getFutureAugPrice(step.aug, ns.getAugmentationPrice(step.aug), x), "0.00a") + ` <a onClick="(function() { window.comexec.writePort(6, '`+x+`'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px; color: orange;">X</a>`;
				}
				if (step.type == "install") {
					toWrite += "ƒInstall Augsƒ " + `<a onClick="(function() { window.comexec.writePort(6, '`+x+`'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px; color: orange;">X</a>`;
				}
				if (step.type == "homeram") {
					toWrite += "ƒUpgrade Home RAMƒ" + ns.nFormat(ns.getUpgradeHomeRamCost(), "0.00a") + ` <a onClick="(function() { window.comexec.writePort(6, '`+x+`'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px; color: orange;">X</a>`;
				}
				if (step.type == "hnetbuy") {
					toWrite += `ƒEnable HnetBuyƒ <a onClick="(function() { window.comexec.writePort(6, '`+x+`'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px; color: orange;">X</a>`;
				}
			}
		}
		await ns.write("/data/stats/toDo.txt", toWrite, "w");
	}
	else {
		if (ns.fileExists("/data/stats/toDo.txt"))
			ns.rm("/data/stats/toDo.txt");
	}
}

function injectAugButtons(ns) {
	var doc = eval("document");
	var node = doc.querySelector("#root > div > div.MuiBox-root.css-1ik4laa > div.jss3.MuiBox-root.css-0 > h4:nth-child(3)")
	if (node != null && node.innerText == "Purchased Augmentations") {
		if (onAugmentsPage) {
			return;
		}
		onAugmentsPage = true;
	}
	else {
		onAugmentsPage = false;
		return;
	}

	var div = node.nextElementSibling;

	var disableOnClick = `document.getElementById('installbutton').style.color='red'; document.getElementById('installbutton').onClick='';`;
	var onClick = `onClick="(function() { window.comexec.writePort(5, 'install'); `+disableOnClick+` })();"`;
	if (toDo.some(b => b.type == "install")) {
		onClick = 'style="color: red;"';
	}
	var frag = doc.createRange().createContextualFragment('<button style="margin: 0px 8px 0px 0px;" id="installbutton" class="MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButtonBase-root css-13ak5e0" tabindex="0" type="button" ' + onClick + '>Queue Install<span class="MuiTouchRipple-root css-w0pj6f"></span></button> ');
	div.prepend(frag);
	
	
	onClick = `onClick="(function() { window.comexec.writePort(5, 'homeram'); })();"`;
	frag = doc.createRange().createContextualFragment('<button style="margin: 0px 8px 0px 0px;" id="homerambutton" class="MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButtonBase-root css-13ak5e0" tabindex="0" type="button" ' + onClick + '>Queue Home Ram<span class="MuiTouchRipple-root css-w0pj6f"></span></button> ');
	div.prepend(frag);

}

/** @param {import("../..").NS } ns **/
function injectFactionAugButtons(ns) {
	var doc = eval("document");
	var node = doc.querySelector("#root > div > div.MuiBox-root.css-1ik4laa > div.jss3.MuiBox-root.css-0 > h4");
	var addButtons = true;
	if (node != null && node.innerText == "Faction Augmentations") {
		if (onFactionAugmentsPage) {
			addButtons = false;
		}
		onFactionAugmentsPage = true;
	}
	else {
		onFactionAugmentsPage = false;
		lastToDoCount = 0;
		return;
	}
	var needPriceUpdate = toDo.length != lastToDoCount;
	lastToDoCount = toDo.length;

	var queuedAugsCount = toDo.filter(t => t.type == "aug").length;

	var augText = doc.querySelector("#root > div > div.MuiBox-root.css-1ik4laa > div.jss3.MuiBox-root.css-0 > p");
	var matches = augText.innerText.match(/from (.*?)\./);
	var faction = matches[1];

	var buttonTDs = doc.querySelectorAll("#root > div > div.MuiBox-root.css-1ik4laa > div.jss3.MuiBox-root.css-0 > table:nth-child(10) > tbody > tr > td:nth-child(1)");
	var i = 0;
	for (var td of buttonTDs) {
		var moneyNode = td.parentNode.querySelector("td:nth-child(3) > p > span");
		var augName = td.nextElementSibling.querySelector("div > p").innerText;


		var disableOnClick = `document.getElementById('augbutton` + i + `').style.color='red'; document.getElementById('augbutton` + i + `').onClick='';`;
		if (augName.startsWith("NeuroFlux Governor")) {
			augName = "NeuroFlux Governor";
			disableOnClick = "";
		}

		if (needPriceUpdate && moneyNode.previousSibling == null) {
			var text = ns.nFormat(ns.getAugmentationPrice(augName), "0.000a");
			if (toDo.length > 0) {
				text += " (" + ns.nFormat(getFutureAugPrice(augName, ns.getAugmentationPrice(augName), queuedAugsCount), "0.000a") + ")";
			}
			moneyNode.innerText = text;
		}

		if (!addButtons)
			continue;
		var onClick = `onClick="(function() { window.comexec.writePort(5, 'aug|` + faction + `|` + augName.replace("'","▐") + `'); `+disableOnClick+` })();"`;
		//ns.print(toDo.some(b => b.aug == augName) + " - " + (disableOnClick != ""));
		var addStyle = "";
		if (toDo.some(b => b.aug == augName) && disableOnClick != "") {
			onClick = '';
			addStyle = "color: red;"
		}

		var frag = doc.createRange().createContextualFragment('<button style="margin: 0px 8px 0px 0px; '+addStyle+'" id="augbutton' + i + '" class="MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButtonBase-root css-13ak5e0" tabindex="0" type="button" ' + onClick + '>BuyNext<span class="MuiTouchRipple-root css-w0pj6f"></span></button>');
		td.prepend(frag);
		i++;
	}
}

function getFutureAugPrice(augName, currentAugPrice, additionalLevel) {
	if (additionalLevel == 0) {
		return currentAugPrice;
	}
	var price = currentAugPrice;
	if (augName == "NeuroFlux Governor") {
		price *= 1.14;
	}
	for (var x = 1; x <= additionalLevel; x++) {
		price *= 1.9;
	}
	return price;
}

/** @param {import("../..").NS } ns **/
async function writeToDo(ns) {
	await ns.write("/data/buyQueue.txt", JSON.stringify(toDo), "w");
}