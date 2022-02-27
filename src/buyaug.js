/** @param {import("..").NS } ns **/
export async function main(ns) {
    var faction = ns.args[0];
    var augName = ns.args.slice(1).join(" ");
    while (true) {
        ns.print("trying to purchase " + augName);
        if (ns.purchaseAugmentation(faction, augName)) {
            ns.tprint("Purchased Aug '" + augName + "'!");
            return;
        }

        await ns.sleep(500);
    }

}