let cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];

/** @param {import("..").NS } ns **/
export async function main(ns) {
    
    ns.disableLog("sleep");

    var b = ns.bladeburner;
    var allActions = [];
    var skillsDone = [];
    for (var name of b.getContractNames()) {
        allActions.push({type: "Contracts", name: name});
    }
    for (name of b.getOperationNames()) {
        allActions.push({type: "Operations", name: name});
    }
    //allActions = allActions.concat(b.getBlackOpNames());
    var sleepTime = 0;
    var trainingRound = 0;
    while (true) {
        
        if (b.getBonusTime() > 2) {
            sleepTime /= 5;
        }
        //ns.print("Sleeptime: " + sleepTime + "; Bonus time: " + b.getBonusTime());
        await ns.sleep(sleepTime + 500);
        b.stopBladeburnerAction();

        trainingRound++;

        // if (b.getCurrentAction().type != "Idle") {
        //     continue;
        // }

        //skills
        var skillPoints = b.getSkillPoints();
        var skillNames = b.getSkillNames();
        var allSkills = [];
        for (var s of skillNames) {
            if (skillsDone.includes(s)) {
                continue;
            }
            allSkills.push({name: s, cost: b.getSkillUpgradeCost(s)});
        }
        allSkills.sort((a,b) => a.cost - b.cost);

        if (skillPoints > allSkills[0].cost) {
            var bought = b.upgradeSkill(allSkills[0].name);
            if (!bought) {
                skillsDone.push(allSkills[0].name);
            }
        }
        
        var currentCity = b.getCity();
        var citiesWithCommunities = [];
        for (var city of cities) {
            if (b.getCityCommunities(city) > 0) {
                citiesWithCommunities.push(city);
            }
        }
        if (citiesWithCommunities.length == 0) {
            for (var city of cities) {
                if (city == currentCity){
                    continue;
                }
                citiesWithCommunities.push(city);
            }
        }

        var synthPop = 0;
        var targetCity = "";
        for (var city of citiesWithCommunities) {
            var synthsCity = b.getCityEstimatedPopulation(city);
            if (synthsCity > synthPop) {
                synthPop = synthsCity;
                targetCity = city;
            }
        }
        if (targetCity != "" && targetCity != currentCity) {
            b.switchCity(targetCity);
        }

        
        /*var currentCity = b.getCity();
        if (b.getCityCommunities(currentCity) == 0) {
            var communities = 0;
            var targetCity = "";
            for (var city of cities) {
                if (city == currentCity){
                    continue;
                }
                var c = b.getCityCommunities(city);
                if (c > communities) {
                    communities = 0;
                    targetCity = city;
                }
            }
            if (targetCity != "") {
                b.switchCity(targetCity);
            }
        }*/

        //work
        if (trainingRound >= 10) {
            trainingRound = 0;
            b.startAction("General", "Training");
            sleepTime = b.getActionTime("General", "Training");
            continue;
        }
        if (ns.getPlayer().hp <= ns.getPlayer().max_hp * 0.75) {
            b.startAction("General", "Hyperbolic Regeneration Chamber");
            sleepTime = b.getActionTime("General", "Hyperbolic Regeneration Chamber");
            continue;
        }
        var stamina = b.getStamina();
        if (stamina[0] < stamina[1] / 2) {
            b.startAction("General", "Training");
            sleepTime = b.getActionTime("General", "Training");
            continue;
        }
        if (b.getCityChaos(b.getCity()) > 5) {
            b.startAction("General", "Diplomacy");
            sleepTime = b.getActionTime("General", "Diplomacy");
            continue;
        }

        var successMaxDifference = 0;
        var maxSuccess = 0;
        for (var action of allActions) {
            var maxLevel = b.getActionMaxLevel(action.type, action.name);
            b.setActionAutolevel(action.type, action.name, false);
            var level = maxLevel;
            action.success = 0;
            while (action.success < 0.95 && level >= 1) {
                b.setActionLevel(action.type, action.name, level--);
                var s = b.getActionEstimatedSuccessChance(action.type, action.name);
                action.success = (s[0] + s[1]) / 2;
                var successDiff = s[1] - s[0];
                if (successDiff > successMaxDifference) {
                    successMaxDifference = successDiff;
                }
            }
            action.count = b.getActionCountRemaining(action.type, action.name);
            if (action.success > maxSuccess && action.count > 0) {
                maxSuccess = action.success;
            }
            action.time = b.getActionTime(action.type, action.name);
            action.rep = b.getActionRepGain(action.type, action.name);
        }
        if (successMaxDifference > 0.1) {
            b.startAction("General", "Field Analysis");
            sleepTime = b.getActionTime("General", "Field Analysis");
            continue;
        }
        if (maxSuccess < 0.8) {
            b.startAction("General", "Training");
            sleepTime = b.getActionTime("General", "Training");
            continue;
        }

        var blackopsNames = b.getBlackOpNames();
        var doingBO = false;
        for (var boname of blackopsNames) {
            if (b.getActionCountRemaining("BlackOps", boname) == 1) {
                if (b.getBlackOpRank(boname) <= b.getRank() && b.getActionEstimatedSuccessChance("BlackOps", boname)[0] >= 0.95 && boname != "Operation Daedalus") {
                    b.startAction("BlackOps", boname);
                    sleepTime = b.getActionTime("BlackOps", boname);
                    doingBO = true;
                }
                break;
            }
        }
        if (doingBO) {
            continue;
        }

        allActions.sort((a,b) => {
            if (a.count == 0 && b.count == 0){
                return 0;
            }
            if (a.count == 0) {
                return 1;
            }
            if (b.count == 0) {
                return -1;
            }
            if (a.success < 0.5) {
                a.success = 0;
            }
            if (b.success < 0.5) {
                b.success = 0;
            }
            return ((b.rep / b.time) * Math.pow(b.success, 3)) - ((a.rep / a.time) * Math.pow(a.success, 3));
        });
        b.startAction(allActions[0].type, allActions[0].name);
        sleepTime = allActions[0].time;
    }
    

}