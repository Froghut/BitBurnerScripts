let bladeburnerStarted = false;

/** @param {import("../..").NS } ns **/
export async function main(ns) {
    var invites = ns.checkFactionInvitations();
    for (var i of invites) {
        ns.joinFaction(i);
    }
    var player = ns.getPlayer();
    if (player.isWorking && player.currentWorkFactionName == "Daedalus") {
        ns.stopAction();
        ns.workForFaction("Daedalus", "Hacking Contracts", false);
    }
    if (ns.bladeburner.joinBladeburnerDivision() && !ns.scriptRunning("bldeburner.js", "home") && !bladeburnerStarted) {
        ns.run("bladeburner.js");
        bladeburnerStarted = true;
    }
    // if (!ns.getPlayer().isWorking && !ns.getOwnedAugmentations(true).includes("The Red Pill")) {
    //     ns.workForFaction("Daedalus", "Hacking Contracts", false);
    // }
}