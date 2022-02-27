// uses port 7
let taskTrainCombat = "Train Combat";
let taskTrainHacking = "Train Hacking";
let taskTrainCharisma = "Train Charisma";
let taskVigilante = "Vigilante Justice";
let taskVigilanteHacking = "Ethical Hacking"
let taskTerritoryWarfare = "Territory Warfare";
let territoryWorkPercent = 0.5;
//let territoryWorkPercent = 0;
let ascTarget = 1.15;
let settings = {
	buyEnabled: true
}

/** @param {import("..").NS } ns **/
export async function main(ns) {

	ns.disableLog("ALL");
	ns.clearLog();

	var forceTrainingQueueCombat = {};
	var forceTrainingQueueCharisma = {};
	var forceTrainingQueueHacking = {};

	while (!ns.gang.inGang()) {
		await ns.sleep(1000 * 10);
	}

	ns.atExit(() => {
		eval("window.comexec.rm('/data/stats/gang.txt');")
	});

	if (ns.fileExists("/data/gangSettings.txt")) {
		settings = JSON.parse(await ns.read("/data/gangSettings.txt"));
	}

	await ns.write("/data/gangEnabled.txt", "", "w");

	var gangInfo = ns.gang.getGangInformation();

	if (gangInfo.isHacking) {
		taskVigilante = taskVigilanteHacking;
		territoryWorkPercent = 0;
	}

	// eslint-disable-next-line no-constant-condition
	while (true) {
		//var hasFormulas = ns.fileExists("Formulas.exe");

		var memberNames = ns.gang.getMemberNames();
		var memberCount = memberNames.length;

		gangInfo = ns.gang.getGangInformation();

				if (ns.gang.canRecruitMember()) {
			var number = 0;
			for (var name of memberNames) {
				number = Math.max(number, parseInt(name.substr(4)));
			}
			number++
			if (ns.gang.recruitMember("Hans" + number)) {
				await ns.sleep(1000);
				continue;
			}
		}

		var allEquipment = ns.gang.getEquipmentNames();

		var eqCombat = [];
		var eqRootkits = [];
		var eqAugments = [];

		for (var eqName of allEquipment) {
			var type = ns.gang.getEquipmentType(eqName);
			var cost = ns.gang.getEquipmentCost(eqName);
			var stats = ns.gang.getEquipmentStats(eqName);
			//ns.print(eqName+ "; " + type + "; " + cost);
			if (type == "Weapon" || type == "Armor" || type == "Vehicle") {
				eqCombat.push({ name: eqName, cost: cost });
			}
			if (type == "Rootkit") {
				eqRootkits.push({ name: eqName, cost: cost });
			}
			if (type == "Augmentation") {
				eqAugments.push({ name: eqName, cost: cost, stats: stats });
			}
		}

		eqCombat.sort((a, b) => a.cost - b.cost);
		eqRootkits.sort((a, b) => a.cost - b.cost);
		if (gangInfo.isHacking) {
			eqAugments.sort((a, b) => {
				if (a.cost != b.cost) {
					return a.cost - b.cost;
				}
				else {
					return b.hack - a.hack;
				}
			});
		}
		else {
			eqAugments.sort((a, b) => a.cost - b.cost);
		}

		var allTasks = ns.gang.getTaskNames();

		var tasks = [];
		for (var taskName of allTasks) {
			var taskStats = ns.gang.getTaskStats(taskName);
			tasks.push(taskStats);
		}

		var members = [];
		var totalVigilante = 0;
		var trainMembers = 0;
		for (var memberName of memberNames) {
			var minfo = ns.gang.getMemberInformation(memberName);
			//ns.tprint(minfo.name + " - " + minfo.str_exp + " - " + calculateAscensionMult(minfo.str_exp));
			var member = {
				info: minfo,
				possibleTasks: []
			};
			members.push(member);

			var isTraining = false;
			if (member.info.str < 50 || member.info.def < 50 || member.info.agi < 50 || member.info.dex < 50 || member.info.cha < 40
				|| member.info.name in forceTrainingQueueCombat || member.info.name in forceTrainingQueueCharisma || member.info.name in forceTrainingQueueHacking) {
				trainMembers++;
				isTraining = true;
			}

			for (var t of tasks) {
				var memberTask = {
					name: t.name,
					wanted: calculateWantedLevelGain(ns, gangInfo.territory, member.info, t),
					money: calculateMoneyGain(gangInfo.territory, member.info, t, gangInfo.respect, gangInfo.wantedLevel)
				};
				/*if (hasFormulas) {
					var formulaWanted = ns.formulas.gang.wantedLevelGain(gangInfo,member.info, t);
					ns.print("XXX " + memberTask.wanted + " <-> " + formulaWanted);
					memberTask.wanted = formulaWanted;
					var formulaMoney = ns.formulas.gang.moneyGain(gangInfo, member.info, t);
					ns.print("XXX " + memberTask.money + " <-> " + formulaMoney);
					memberTask.money = formulaMoney;
				}*/
				if (memberTask.money > 0 && memberTask.wanted > 0) {
					memberTask.moneyFactor = memberTask.money / memberTask.wanted;
				}
				else {
					memberTask.moneyFactor = 0;
				}
				//if (memberTask.wanted > 10) {
				//	ns.tprint("!!! task " + t.name + " has wanted of " + memberTask.wanted);
				//}
				
				if (t.name == taskVigilante) {
					ns.print(memberName + " vigilante wanted: " + (memberTask.wanted * 5) + "; training: " + isTraining);
					member.vigilanteValue = -1 * memberTask.wanted;
					if (!isTraining) {
						totalVigilante += memberTask.wanted;
					}
				}
				if (memberTask.moneyFactor > 0) {
					member.possibleTasks.push(memberTask);
				}
				member.possibleTasks.sort((a, b) => b.money - a.money);
			}
			
		
			//ns.print(member.info.name + "; " + member.possibleTasks[0].name + " " + (member.possibleTasks[0].wanted * 5));
			//await ns.sleep(10*1000);
			//break;
		}
		//continue;

		shuffleArray(members);

		//ns.print(totalVigilante);
		totalVigilante = -1 * totalVigilante;

		ns.print("Total Possibly Vigilante: " + totalVigilante);
		ns.print("Wanted Penalty: " + gangInfo.wantedPenalty)

		var currentWanted = 0;
		var count = 0;

		var workingMembers = [];

		let totalUpgradeCostAug = 0;
		let totalUpgradeCostTemp = 0;
		let membersWithUpgrades = 0;

		for (var member of members) {
			let memberWithUpgrade = false;
			count++;
			ns.print("Checking " + member.info.name);

			if (shouldAscend(ns, member.info)) {
				ns.gang.ascendMember(member.info.name);
				if (gangInfo.isHacking) {
					ns.gang.setMemberTask(member.info.name, taskTrainHacking);
				}
				else {
					ns.gang.setMemberTask(member.info.name, taskTrainCombat);
				}

				forceTrainingQueueCombat[member.info.name] = 0;
				forceTrainingQueueHacking[member.info.name] = 0;
				forceTrainingQueueCharisma[member.info.name] = 0;
				continue;
			}

			var onlyCheck = false;
			// **** TRAIN ****	
			if (member.info.name in forceTrainingQueueCombat || member.info.str < 50 || member.info.def < 50 || member.info.agi < 50 || member.info.dex < 50) {
				ns.print("Train Combat");
				ns.gang.setMemberTask(member.info.name, taskTrainCombat);
				if (!(member.info.name in forceTrainingQueueCombat)) {
					forceTrainingQueueCombat[member.info.name] = 0;
				}
				else {
					forceTrainingQueueCombat[member.info.name]++;
				}
				if (forceTrainingQueueCombat[member.info.name] >= 12) {
					delete forceTrainingQueueCombat[member.info.name];
				}
				onlyCheck = true;
			}
			else if (member.info.name in forceTrainingQueueHacking || member.info.hack < 50) {
				ns.print("Train Hacking");
				ns.gang.setMemberTask(member.info.name, taskTrainHacking);
				if (!(member.info.name in forceTrainingQueueHacking)) {
					forceTrainingQueueHacking[member.info.name] = 0;
				}
				else {
					forceTrainingQueueHacking[member.info.name]++;
				}
				if (forceTrainingQueueHacking[member.info.name] >= 12) {
					delete forceTrainingQueueHacking[member.info.name];
				}
				onlyCheck = true;
			}
			else if (member.info.name in forceTrainingQueueCharisma || member.info.cha < 40) {
				ns.print("Train Charisma " + forceTrainingQueueCharisma[member.info.name]);
				ns.gang.setMemberTask(member.info.name, taskTrainCharisma);
				if (!(member.info.name in forceTrainingQueueCharisma)) {
					forceTrainingQueueCharisma[member.info.name] = 0;
				}
				else {
					forceTrainingQueueCharisma[member.info.name]++;
				}
				if (forceTrainingQueueCharisma[member.info.name] >= 12) {
					delete forceTrainingQueueCharisma[member.info.name];
				}
				onlyCheck = true;
			}

			var availableMoney = ns.getServerMoneyAvailable("home") / 2;
			for (var aug of eqAugments) {
				//ns.print("Check aug " + aug.name + "; " + (aug.cost < availableMoney));
				if (member.info.augmentations.includes(aug.name)) {
					continue;
				}
				if (aug.cost > availableMoney || onlyCheck) {
					totalUpgradeCostAug += aug.cost;
					continue;
				}
				if (!settings.buyEnabled) {
					continue;
				}
				ns.gang.purchaseEquipment(member.info.name, aug.name);
				availableMoney = ns.getServerMoneyAvailable("home") / 2;
				
			}

			if (gangInfo.isHacking) {
				// **** BUY HACK EQUIPMENT ****
				for (var eq of eqRootkits) {
					//ns.print("Check eq " + eq.name + "; " + (eq.cost < availableMoney));
					if (member.info.upgrades.includes(eq.name)) {
						continue;
					}
					if (eq.cost > availableMoney || onlyCheck) {
						totalUpgradeCostTemp += eq.cost;
						if (!memberWithUpgrade) {
							memberWithUpgrade = true;
							membersWithUpgrades++;
						}
						continue;
					}
					if (!settings.buyEnabled) {
						continue;
					}
					ns.gang.purchaseEquipment(member.info.name, eq.name);
					availableMoney = ns.getServerMoneyAvailable("home") / 2;
				}
			}
			else {
				// **** BUY COMBAT EQUIPMENT ****
				for (var eq of eqCombat) {
					//ns.print("Check eq " + eq.name + "; " + (eq.cost < availableMoney));
					if (member.info.upgrades.includes(eq.name)) {
						continue;
					}
					if (eq.cost > availableMoney || onlyCheck) {
						totalUpgradeCostTemp += eq.cost;
						if (!memberWithUpgrade) {
							memberWithUpgrade = true;
							membersWithUpgrades++;
						}
						continue;
					}
					if (!settings.buyEnabled) {
						continue;
					}
					ns.gang.purchaseEquipment(member.info.name, eq.name);
					availableMoney = ns.getServerMoneyAvailable("home") / 2;
				}
			}

			if (onlyCheck) {
				continue;
			}


			// **** WORK ****	

			if (!gangInfo.isHacking && count <= memberCount * territoryWorkPercent) {
				ns.print("Territory job");
				ns.gang.setMemberTask(member.info.name, taskTerritoryWarfare);
				continue;
			}

			ns.print("Current Wanted: " + currentWanted);
			if (currentWanted > 0.2 || (gangInfo.wantedLevel > 2 && gangInfo.wantedPenalty < 0.7) || (currentWanted > 0 && (gangInfo.wantedLevel > 10 || (gangInfo.wantedLevel > 2 && gangInfo.wantedPenalty < 0.95)))) {
				currentWanted -= member.vigilanteValue;
				ns.gang.setMemberTask(member.info.name, taskVigilante);
				ns.print("Doing Vigilante, current wanted: " + currentWanted);
				continue;
			}
			if (count == members.length - 1) {
				// last member, dont increasy wanted level!
				ns.print("Last member, Train!");
				if (gangInfo.isHacking) {
					ns.gang.setMemberTask(member.info.name, taskTrainHacking);
				}
				else {
					ns.gang.setMemberTask(member.info.name, taskTrainCombat);
				}
			}
			ns.print("Total " + totalVigilante + " - " + member.vigilanteValue);
			totalVigilante -= member.vigilanteValue;
			if (totalVigilante < 0) {
				ns.print("XXXX OH NO!");
				totalVigilante = 0;
			}
			for (var t of member.possibleTasks) {
				ns.print("Checking " + t.name + "; " + t.wanted + "; " + t.money);
				if ((t.wanted + currentWanted) > totalVigilante + 0.2) {
					ns.print("Skipping crime " + t.name + "; " + t.wanted + " + " + currentWanted + " > " + totalVigilante);
					continue;
				}
				currentWanted += t.wanted;
				ns.gang.setMemberTask(member.info.name, t.name);
				member.workingWanted = t.wanted;
				workingMembers.push(member);
				ns.print("Doing Crime: " + t.name + "; current wanted: " + currentWanted + "; (" + t.wanted + ")");
				break;
			}
			if (!workingMembers.includes(member)) {
				currentWanted -= member.vigilanteValue;
				ns.gang.setMemberTask(member.info.name, taskVigilante);
			}
		}
		ns.print("XXXX 1 - " + currentWanted + "; working members: " + workingMembers.length);
		//while(currentWanted > 0 && workingMembers.length > 0) {
		if (currentWanted > 0 && workingMembers.length >= 1 && (gangInfo.wantedLevel > 50 || (gangInfo.wantedLevel > 2 && gangInfo.wantedPenalty < 0.95))) {
			var member = workingMembers.pop();
			currentWanted -= member.vigilanteValue;
			currentWanted -= member.workingWanted;
			ns.gang.setMemberTask(member.info.name, taskVigilante);
		}
		ns.print("XXXX 2 - " + currentWanted);

		// Territory warfare
		if (!gangInfo.isHacking && gangInfo.territory < 0.99) {
			var otherInfo = ns.gang.getOtherGangInformation();
			var myPower = gangInfo.power;
			var engage = true;
			var needTerritoryWork = false;
			for (var x in otherInfo) {
				//ns.print(otherInfo[x].power + " > " + (myPower * 0.6) + " - " + (otherInfo[x].power > myPower * 0.6))
				if (x == gangInfo.faction) {
					continue;
				}
				if (otherInfo[x].power > myPower * 0.6) {
					engage = false;
				}
				if (otherInfo[x].power * 3 > myPower) {
					needTerritoryWork = true
				}
			}
			if (needTerritoryWork) {
				territoryWorkPercent = 0.3;
			}
			else {
				territoryWorkPercent = 0;
			}
			ns.gang.setTerritoryWarfare(engage);
		}
		else {
			ns.gang.setTerritoryWarfare(false);
			territoryWorkPercent = 0;
		}

		for (var k = 0; k < 100; k++) {
			await ns.sleep(100);
			var read = ns.readPort(7);
			if (read == "enablebuy") {
				settings.buyEnabled = true;
				await ns.write("/data/gangSettings.txt", JSON.stringify(settings), "w");
			}
			if (read == "disablebuy") {
				settings.buyEnabled = false;
				await ns.write("/data/gangSettings.txt", JSON.stringify(settings), "w");
			}
			await updateStatus(ns, totalUpgradeCostTemp, totalUpgradeCostAug, membersWithUpgrades, trainMembers);
		}
	}
}

function calculateWantedLevelGain(ns, territory, member, task) {
	if (task.baseWanted === 0) return 0;
	let statWeight =
		(task.hackWeight / 100) * member.hack +
		(task.strWeight / 100) * member.str +
		(task.defWeight / 100) * member.def +
		(task.dexWeight / 100) * member.dex +
		(task.agiWeight / 100) * member.agi +
		(task.chaWeight / 100) * member.cha;
	statWeight -= 3.5 * task.difficulty;
	if (statWeight <= 0) return 0;
	const territoryMult = Math.max(0.005, Math.pow(territory * 100, task.territory.wanted) / 100);
	if (isNaN(territoryMult) || territoryMult <= 0) return 0;
	if (task.baseWanted < 0) {
		return 0.4 * task.baseWanted * statWeight * territoryMult;
	}
	const calc = (7 * task.baseWanted) / Math.pow(3 * statWeight * territoryMult, 0.8);

	// Put an arbitrary cap on this to prevent wanted level from rising too fast if the
	// denominator is very small. Might want to rethink formula later
	return Math.min(100, calc);
}

function calculateMoneyGain(territory, member, task, gangRepect, gangWantedLevel) {
	if (task.baseMoney === 0) return 0;
	let statWeight =
		(task.hackWeight / 100) * member.hack +
		(task.strWeight / 100) * member.str +
		(task.defWeight / 100) * member.def +
		(task.dexWeight / 100) * member.dex +
		(task.agiWeight / 100) * member.agi +
		(task.chaWeight / 100) * member.cha;

	statWeight -= 3.2 * task.difficulty;
	if (statWeight <= 0) return 0;
	const territoryMult = Math.max(0.005, Math.pow(territory * 100, task.territory.money) / 100);
	if (isNaN(territoryMult) || territoryMult <= 0) return 0;
	const respectMult = calculateWantedPenalty(gangRepect, gangWantedLevel);
	const territoryPenalty = (0.2 * territory + 0.8) * 1;
	return Math.pow(5 * task.baseMoney * statWeight * territoryMult * respectMult, territoryPenalty);
}

function calculateWantedPenalty(gangRepect, gangWantedLevel) {
	return gangRepect / (gangRepect + gangWantedLevel);
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

/** @param {NS} ns **/
function shouldAscend(ns, memberInfo) {
	var res = ns.gang.getAscensionResult(memberInfo.name);
	//ns.print(res.str);
	return res != undefined &&
		(res.agi > ascTarget
			|| res.cha > ascTarget
			|| res.def > ascTarget
			|| res.dex > ascTarget
			|| res.hack > ascTarget
			|| res.str > ascTarget);
}

/** @param {import("..").NS } ns **/
async function updateStatus(ns, totalUpgradeCostTemp, totalUpgradeCostAug, membersWithUpgrades, trainMembers) {
	if (totalUpgradeCostTemp > 0 || totalUpgradeCostAug > 0 || !settings.buyEnabled) {
		var toWrite = "gangƒ50";
		toWrite += `ƒGang Buy${trainMembers > 0 ? " (" + trainMembers + ")" : ""}ƒ<a onClick="(function() { window.comexec.writePort(7, '` + (settings.buyEnabled ? "disablebuy" : "enablebuy") + `'); })();" style="` + (!settings.buyEnabled ? "color: red;" : "") + ` cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">` + (settings.buyEnabled ? "Disable" : "Enable") + `</a>`;
		toWrite += "ƒUpgrades:ƒ" + ns.nFormat(totalUpgradeCostTemp, "0.00a") + " ("+membersWithUpgrades+") + " + ns.nFormat(totalUpgradeCostAug, "0.00a");
		await ns.write("/data/stats/gang.txt", toWrite, "w");
	}
	
}
