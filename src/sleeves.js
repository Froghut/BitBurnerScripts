let lastFaction = "";
let sleeveCount = 5;
let minimized = false;
// uses port 9 for mode
/** @param {import("..").NS } ns **/
export async function main(ns) {
    
    let pause = false;
    ns.disableLog("sleep");
    ns.atExit(() => {
        eval("window.comexec.rm('/data/stats/sleeves.txt');")
    });
    var sleeveWorkInfos = {};
    var augBuyCosts = [];
    var crimeNames = ["Shoplift", "Rob Store", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassination", "Heist"];

    if (ns.fileExists("/data/sleeveWork.txt")) {
        sleeveWorkInfos = JSON.parse(await ns.read("/data/sleeveWork.txt"));
    }
    else {
        //for (var x = 0; x < ns.sleeve.getNumSleeves(); x++) {
        for (var x = 0; x < sleeveCount; x++) {
            augBuyCosts[x] = 0;
            sleeveWorkInfos[x] = {
                mode: "crime", 
                crimeType: "skills", 
                factionName: "",
                factionWorkType: "",
            };
        }
    }
    for (var x = 0; x < sleeveCount; x++) {
        if (sleeveWorkInfos[x] == undefined) {
            augBuyCosts[x] = 0;
            sleeveWorkInfos[x] = {
                mode: "crime", 
                crimeType: "skills", 
                factionName: "",
                factionWorkType: "",
           };
        }
    }
    
    while (true) {
    
        injectFactions(ns);

        var res = await ns.readPort(9);
        if (res == "pause") {
            pause = true;
        }
        if (res == "resume") {
            pause = false;
        }
        if (res == "minimize") {
            minimized = !minimized;
        }
        var splits = res.split("|");
        if (splits.length >= 2) {
            //ns.print("new mode " + mode);
            sleeveWorkInfos[splits[0]].mode = splits[1];
            switch (splits[1]) {
                case "crime":
                    sleeveWorkInfos[splits[0]].crimeType = splits[2];
                    break;
                case "faction":
                    sleeveWorkInfos[splits[0]].factionName = splits[2];
                    sleeveWorkInfos[splits[0]].factionWorkType = splits[3];
                    break;
            }
            await writeSleeveWork(ns, sleeveWorkInfos);
        }

        await updateStatus(ns, sleeveWorkInfos, pause, augBuyCosts);

        if (pause) {
            await ns.sleep(100);
            continue;
        }

        //for (var x = 0; x < ns.sleeve.getNumSleeves(); x++) {
        for (var x = 0; x < sleeveCount; x++) {
            
            var sleeveStats = ns.sleeve.getSleeveStats(x);

            // getTask().task types:
            // Synchro, Recovery, Crime, Idle, ...
            if (sleeveWorkInfos[x].mode == "init") {
                if (sleeveStats.sync < 100) {
                    if (ns.sleeve.getTask(x).task != "Synchro") {
                        ns.sleeve.setToSynchronize(x);
                    }
                    await ns.sleep(100);
                    continue;
                }
                else if (sleeveStats.shock > 0) {
                    if (ns.sleeve.getTask(x).task != "Recovery") {
                        ns.sleeve.setToShockRecovery(x);
                    }
                    await ns.sleep(100);
                    continue;
                }
                else {
                    sleeveWorkInfos[x].mode = "crime";
                    sleeveWorkInfos[x].crimeType = "money";
                    await writeSleeveWork(ns, sleeveWorkInfos);
                }
            }
            if (sleeveWorkInfos[x].mode == "crime" && sleeveWorkInfos[x].crimeType == "karma" && ns.gang.inGang()) {
                sleeveWorkInfos[x].crimeType = "money";
                await writeSleeveWork(ns, sleeveWorkInfos);
            }

            if (sleeveWorkInfos[x].mode == "crime") {

                sleeveStats["crime_success_mult"] = ns.sleeve.getInformation(x).mult.crimeSuccess;
                var crimes = [];
                for (var crimeName of crimeNames) {
                    var crimeStats = ns.getCrimeStats(crimeName);
                    var crimeSuccess = successRate(crimeStats, sleeveStats);
                    crimeStats["success"] = crimeSuccess;
                    crimeStats["factorMoney"] = (crimeStats.money / crimeStats.time) * crimeStats.success;
                    crimeStats["factorSkills"] = ((crimeStats.agility_exp + crimeStats.charisma_exp + crimeStats.defense_exp + crimeStats.dexterity_exp + crimeStats.hacking_exp + crimeStats.strength_exp) / crimeStats.time) + ((crimeStats.agility_exp + crimeStats.charisma_exp + crimeStats.defense_exp + crimeStats.dexterity_exp + crimeStats.hacking_exp + crimeStats.strength_exp) / crimeStats.time) * crimeStats.success;
                    if (crimeStats.hacking_exp == 0) crimeStats["factorSkills"] *= 0.9;
                    if (crimeStats.charisma_exp == 0) crimeStats["factorSkills"] *= 0.9;
                    if (crimeStats.agility_exp == 0) crimeStats["factorSkills"] *= 0.9;
                    if (crimeStats.strength_exp == 0) crimeStats["factorSkills"] *= 0.9;
                    if (crimeStats.dexterity_exp == 0) crimeStats["factorSkills"] *= 0.9;
                    if (crimeStats.defense_exp == 0) crimeStats["factorSkills"] *= 0.9;
                    crimeStats["factorKarma"] = (crimeStats.karma / crimeStats.time) * crimeStats.success;
                    crimeStats["factorInt"] = (crimeStats.intelligence_exp / crimeStats.time) * crimeStats.success;
                    crimes.push(crimeStats);
                }
                if (sleeveWorkInfos[x].crimeType == "skills") {
                    crimes.sort((a, b) => b.factorSkills - a.factorSkills);
                    //ns.print(crimes[0].name + " - " + crimes[0].factorSkills);
                    //ns.print(crimes[1].name + " - " + crimes[1].factorSkills);
                }
                else if (sleeveWorkInfos[x].crimeType == "money") {
                    crimes.sort((a, b) => b.factorMoney - a.factorMoney);
                    //ns.tprint(crimes[0].name + " - " + crimes[0].factorMoney);
                    //ns.tprint(crimes[1].name + " - " + crimes[1].factorMoney);
                }
                else if (sleeveWorkInfos[x].crimeType == "karma") {
                    crimes.sort((a, b) => b.factorKarma - a.factorKarma);
                }
                else if (sleeveWorkInfos[x].crimeType == "int") {
                    crimes.sort((a, b) => b.factorInt - a.factorInt);
                }
                /*crimes.sort((a,b) => b.factorMoney - a.factorMoney);
                ns.tprint(crimes[0].name + " - " + crimes[0].factorMoney);
                ns.tprint(crimes[1].name + " - " + crimes[1].factorMoney);
                crimes.sort((a,b) => b.factorSkills - a.factorSkills);
                ns.tprint(crimes[0].name + " - " + crimes[0].factorSkills);
                ns.tprint(crimes[1].name + " - " + crimes[1].factorSkills);*/
                if (ns.sleeve.getTask(x).crime != crimes[0].name) {
                    ns.sleeve.setToCommitCrime(x, crimes[0].name);
                }
            }

            if (sleeveWorkInfos[x].mode == "faction") {
                try {
                    ns.print(`Faction Work Sleeve ${x}: ${sleeveWorkInfos[x].factionName}; ${sleeveWorkInfos[x].factionWorkType}`)
                    ns.sleeve.setToFactionWork(x, sleeveWorkInfos[x].factionName, sleeveWorkInfos[x].factionWorkType);
                }
                catch (ex) {
                    ns.print("error " + ex);
                }
                sleeveWorkInfos[x].mode = "";
                await writeSleeveWork(ns, sleeveWorkInfos);
            }

            if (ns.sleeve.getTask(x).task == "Idle") {
                if (sleeveStats.shock > 0 || sleeveStats.sync < 100) {
                    sleeveWorkInfos[x].mode = "init";
                    await writeSleeveWork(ns, sleeveWorkInfos);
                }
                else {
                    sleeveWorkInfos[x].mode = "crime";
                    sleeveWorkInfos[x].crimeType = "money";
                    await writeSleeveWork(ns, sleeveWorkInfos);
                }
            }

            checkBuyAugs(ns, augBuyCosts);

            await ns.sleep(100);
        }
    }
}

/** @param {import("..").NS } ns **/
function checkBuyAugs(ns, augBuyCosts) {
    var numbers = Array.from(Array(sleeveCount).keys())
    shuffle(numbers);
    for (var x = 0; x < numbers.length; x++) {
        var index = numbers[x];
        var augs = ns.sleeve.getSleevePurchasableAugs(index);
        augs.sort((a,b) => a.cost - b.cost);
        for (var k = 0; k < augs.length; k++) {
            var aug = augs[k];
            aug["stats"] = ns.getAugmentationStats(aug.name);
            if (isNaN(aug.stats.crime_money_mult) 
                && isNaN(aug.stats.crime_success_mult)
                && isNaN(aug.stats.agility_exp_mult)
                && isNaN(aug.stats.agility_mult)
                && isNaN(aug.stats.defense_mult)
                && isNaN(aug.stats.defense_exp_mult)
                && isNaN(aug.stats.dexterity_mult)
                && isNaN(aug.stats.dexterity_exp_mult)
                && isNaN(aug.stats.strength_mult)
                && isNaN(aug.stats.strength_exp_mult)
                && isNaN(aug.stats.charisma_mult)
                && isNaN(aug.stats.charisma_exp_mult)
                && isNaN(aug.stats.hacking_mult)
                && isNaN(aug.stats.hacking_exp_mult)
                ) {
                    augs.splice(k,1);
                    k--;
                }
        }
        var canBuy = true;
        var money = ns.getServerMoneyAvailable("home");
        var cost = 0;
        for (var j = 0; j < Math.min(augs.length, 5); j++) {
            cost += augs[j].cost;
            if (cost > money)
            {
                canBuy = false;
            }
        }

        augBuyCosts[index] = cost;
        //ns.print("Aug buy cost: " + ns.nFormat(cost, "0.000a") + "; canBuy: " + canBuy);

        if (canBuy) {
            for (var j = 0; j < Math.min(augs.length, 5); j++) {
                ns.sleeve.purchaseSleeveAug(index, augs[j].name);
            }
        }
    }
}


function successRate(crimeStats, sleeveStats) {
    let chance =
        crimeStats.hacking_success_weight * sleeveStats.hacking +
        crimeStats.strength_success_weight * sleeveStats.strength +
        crimeStats.defense_success_weight * sleeveStats.defense +
        crimeStats.dexterity_success_weight * sleeveStats.dexterity +
        crimeStats.agility_success_weight * sleeveStats.agility +
        crimeStats.charisma_success_weight * sleeveStats.charisma
    chance /= 975;
    chance /= crimeStats.difficulty;
    chance *= sleeveStats.crime_success_mult;

    return Math.min(chance, 1);
}

/** @param {import("..").NS } ns **/
async function updateStatus(ns, sleeveWorkInfos, pause, augBuyCosts) {
    var toWrite = "sleevesƒ200ƒSleeves";
    toWrite += ` <a onClick="(function() { window.comexec.writePort(9, 'minimize'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">`+(minimized ? "🗖" : "🗕")+`</a>`
    toWrite += "ƒ";
    toWrite += `<a onClick="(function() { window.comexec.writePort(9, '`+(pause ? "resume" : "pause")+`'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px; ` + (pause ? "color: red;" : "") + `">`+(pause ? "Resume" : "Pause")+`</a> `;
    if (!minimized) {
        var colorWhite = "#5555FF";
        var colorGreen = "#4CAF50"
        //for (var x = 0; x < ns.sleeve.getNumSleeves(); x++) {
        for (var x = 0; x < sleeveCount; x++) {
            var task = ns.sleeve.getTask(x);
            var sleeveStats = ns.sleeve.getSleeveStats(x);
            toWrite += "ƒS" + x + " (" + ns.nFormat(augBuyCosts[x], "0.00a") + ")ƒ";
            if (sleeveStats.sync < 100 || sleeveStats.shock > 0){
                toWrite += `<a onClick="(function() { window.comexec.writePort(9, '`+x+`|init'); })();" style="margin-right: 2px; cursor: pointer; padding: 3px 0px 3px 0px; border: 1px solid `+(sleeveWorkInfos[x].mode == "init" ? colorWhite : colorGreen)+`; border-radius: 4px;" title="Synchro, Shock">☕</a>`;
            }
            toWrite += `<a onClick="(function() { window.comexec.writePort(9, '`+x+`|crime|money'); })();" style="margin-right: 2px; cursor: pointer; padding: 3px 0px 3px 0px; border: 1px solid `+(sleeveWorkInfos[x].mode == "crime" && sleeveWorkInfos[x].crimeType == "money" ? colorWhite : colorGreen)+`; border-radius: 4px;" title="Money">💰</a>`;
            toWrite += `<a onClick="(function() { window.comexec.writePort(9, '`+x+`|crime|skills'); })();" style="margin-right: 2px; cursor: pointer; padding: 3px 0px 3px 0px; border: 1px solid `+(sleeveWorkInfos[x].mode == "crime" && sleeveWorkInfos[x].crimeType == "skills" ? colorWhite : colorGreen)+`; border-radius: 4px;" title="Skills">🏅</a>`;
            if (!ns.gang.inGang()) {
                toWrite += `<a onClick="(function() { window.comexec.writePort(9, '`+x+`|crime|karma'); })();" style="margin-right: 2px;cursor: pointer; padding: 3px 0px 3px 0px; border: 1px solid `+(sleeveWorkInfos[x].mode == "crime" && sleeveWorkInfos[x].crimeType == "karma" ? colorWhite : colorGreen)+`; border-radius: 4px;" title="Karma">💀</a>`;
            }
            toWrite += `<a onClick="(function() { window.comexec.writePort(9, '`+x+`|crime|int'); })();" style="cursor: pointer; padding: 3px 0px 3px 0px; border: 1px solid `+(sleeveWorkInfos[x].mode == "crime" && sleeveWorkInfos[x].crimeType == "int" ? colorWhite : colorGreen)+`; border-radius: 4px;" title="Intelligence">💡</a>`;
            toWrite += "ƒ  " + task.task + "ƒ";
            switch (task.task) {
                case "Crime":
                    toWrite += task.crime;
                    break;
                case "Synchro":
                    toWrite += (Math.round(ns.sleeve.getSleeveStats(x).sync * 1000) / 1000);
                    break;
                case "Faction":
                    toWrite += task.factionWorkType + " - " + (Math.round(ns.sleeve.getInformation(x).workRepGain * 5000) / 1000);
                    break;
                case "Recovery":
                    toWrite += (Math.round(ns.sleeve.getSleeveStats(x).shock * 1000) / 1000);
                    break;
                default:
                    toWrite += " ";
                    break;
            }
        }
    }
    await ns.write("/data/stats/sleeves.txt", toWrite, "w");
}

/** @param {import("..").NS } ns **/
function injectFactions(ns) {
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
    var buttons = doc.querySelectorAll("#root > div > div.MuiBox-root.css-1ik4laa > div.jss3.MuiBox-root.css-0 > div > div > button");
    for (var button of buttons) {
        if (button.innerText == "Purchase Augmentations" || button.innerText == "Manage Gang" || button.innerText == "Purchase & Upgrade Duplicate Sleeves") {
            continue;
        }
        var workType = button.innerText;

        //for (var x = ns.sleeve.getNumSleeves() - 1; x >= 0; x--) {
        for (var x = sleeveCount - 1; x >= 0; x--) {
            var onClick = `onClick="(function() { window.comexec.writePort(9, '`+x+`|faction|`+faction+`|`+workType+`'); })();"`;
            var newButton = doc.createRange().createContextualFragment(`<button style="margin: 0px 16px 0px 0px;" class="MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButtonBase-root css-13ak5e0" tabindex="0" type="button" `+onClick+`>Sleeve `+x+`<span class="MuiTouchRipple-root css-w0pj6f"></span></button>`);
            button.parentNode.prepend(newButton)
        }
    }
}

/** @param {import("..").NS } ns **/
async function writeSleeveWork(ns, sleeveWorkInfos) {
    await ns.write("/data/sleeveWork.txt", JSON.stringify(sleeveWorkInfos), "w");
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }