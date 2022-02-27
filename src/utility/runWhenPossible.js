/** @param {import("../..").NS } ns **/
export async function main(ns) {
    var prog = ns.args[0];
    while (ns.getScriptRam(prog) > (ns.getServerMaxRam("home") - ns.getServerUsedRam("home"))){
        await ns.sleep(10);
    }
    ns.run(prog);
    ns.tprint("Started " + prog);
}