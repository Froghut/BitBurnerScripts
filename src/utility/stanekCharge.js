export async function main(ns) {
    //var positions = [[0,0],[2,0],[6,0],[0,2],[3,1],[1,3],[3,4]];
    var positions = [[0,0],[2,0],[0,1],[3,1],[1,2],[1,4]];
    while (true) {
        for (var p of positions) {
            await ns.stanek.charge(p[0], p[1]);
        }
        await ns.sleep(100);
    }
}