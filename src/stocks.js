//Requires access to the TIX API and the 4S Mkt Data API
// uses port 2

let fracH = 0.5;
let commission = 100000; //Buy or sell commission

/** @param {import("..").NS } ns **/
export async function main(ns) {

    ns.atExit(() => {
        eval("window.comexec.rm('/data/stats/stocks.txt');")
	});

    let lastTrades = [];
    let totalProfit = 0;
    let myStocks = [];

    ns.disableLog("ALL");
    var player = ns.getPlayer();
    let stocks = [];
    let corpus = 0;

    //Initialise
    while (!player.hasWseAccount || !player.hasTixApiAccess || !player.has4SDataTixApi) {
        await ns.sleep(10000);
        player = ns.getPlayer();
    }

    await ns.write("/data/stocksEnabled.txt", "", "w");

    for (let i = 0; i < ns.stock.getSymbols().length; i++)
        stocks.push({ sym: ns.stock.getSymbols()[i], invested: 0 });

    if (ns.fileExists("/data/stockProfit.txt")) {
        totalProfit = Number.parseFloat(await ns.read("/data/stockProfit.txt"));
        ns.rm("/data/stockProfit.txt");
    }

    var sellall = false;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        corpus = refresh(ns, stocks, myStocks);

        //Sell underperforming shares
        for (let i = 0; i < myStocks.length; i++) {
            var saleProfit = ns.stock.getSaleGain(myStocks[i].sym, myStocks[i].shares, "Long");
            var buyCost = myStocks[i].buyPrice * myStocks[i].shares;
            //ns.print(myStocks[i].sym + ": " + (saleProfit / buyCost));
            var ratio = saleProfit / buyCost;
            if (sellall || myStocks[i].prob <= 0.2) {
                var prof = await sell(ns, myStocks[i], myStocks[i].shares, lastTrades);
                totalProfit += prof;
                await ns.write("/data/stockProfit.txt", totalProfit, "w");
                await writeStatus(ns, lastTrades, totalProfit, myStocks);
                corpus -= commission;
            }
        }

        if (sellall) {
            corpus = refresh(ns, stocks, myStocks);
            await writeStatus(ns, lastTrades, totalProfit, myStocks);
            sellall = false;
            await ns.sleep(30 * 1000);
            continue;
        }

        for (var i = 0; i < stocks.length; i++) {
            //Buy shares with cash remaining in hand
            let cashToSpend = ns.getServerMoneyAvailable("home") - (fracH * corpus);
            let numShares = Math.floor((cashToSpend - commission) / stocks[i].price);
            if (numShares > ns.stock.getMaxShares(stocks[i].sym) - stocks[i].shares) {
                numShares = ns.stock.getMaxShares(stocks[i].sym) - stocks[i].shares;
            }
            if ((numShares * stocks[i].expRet * stocks[i].price) > commission)
                buy(ns, stocks[i], numShares);

            corpus = refresh(ns, stocks, myStocks);
            cashToSpend = ns.getServerMoneyAvailable("home") - (fracH * corpus);
            if (cashToSpend <= 0 || stocks[i].prob < 0.5) {
                break;
            }
        }
        await writeStatus(ns, lastTrades, totalProfit, myStocks);

        for (var j = 0; j < 60; j++) {
            await ns.sleep(100);
            sellall = ns.readPort(2) == "sellall";
            if (sellall) {
                break;
            }
        }

    }
}

/** @param {import(".").NS } ns **/
function refresh(ns, stocks, myStocks) {
    let corpus = ns.getServerMoneyAvailable("home");
    myStocks.length = 0;
    for (let i = 0; i < stocks.length; i++) {
        let sym = stocks[i].sym;
        stocks[i].price = ns.stock.getPrice(sym);
        stocks[i].shares = ns.stock.getPosition(sym)[0];
        stocks[i].buyPrice = ns.stock.getPosition(sym)[1];
        stocks[i].vol = ns.stock.getVolatility(sym);
        stocks[i].prob = 2 * (ns.stock.getForecast(sym) - 0.5);
        stocks[i].expRet = stocks[i].vol * stocks[i].prob / 2;
        corpus += stocks[i].price * stocks[i].shares;
        if (stocks[i].shares > 0) myStocks.push(stocks[i]);
    }
    stocks.sort(function (a, b) { return b.expRet - a.expRet });
    return corpus;
}

/** @param {import(".").NS } ns **/
function buy(ns, stock, numShares) {
    var price = ns.stock.buy(stock.sym, numShares);
    stock.invested += numShares * price - commission;
    //ns.print(`Bought ${stock.sym} for ${format(ns, numShares * stock.price)}`);
}

/** @param {import(".").NS } ns **/
async function sell(ns, stock, numShares, lastTrades) {
    var price = ns.stock.sell(stock.sym, numShares);
    let profit = (numShares * price) - stock.invested - commission;
    ns.print(`Sold ${stock.sym} for profit of ${format(ns, profit)}`);
    stock.invested = 0;
    lastTrades.push({ a: stock.sym, b: format(ns, profit) });
    return profit;
}

/** @param {import(".").NS } ns **/
async function writeStatus(ns, lastTrades, totalProfit, myStocks) {
    if (lastTrades.length > 3) {
        lastTrades.shift();
    }
    var toWrite = "stocksƒ10";
    for (var trade of lastTrades) {
        toWrite += "ƒ" + trade.a + "ƒ" + trade.b;
    }
    toWrite += "ƒProfitƒ" + ns.nFormat(totalProfit, "0.000a");
    var totalValue = 0;
    for (let i = 0; i < myStocks.length; i++) {
        var saleProfit = ns.stock.getSaleGain(myStocks[i].sym, myStocks[i].shares, "Long");
        totalValue += saleProfit;
    }
    var inStocksText = `<a onClick="(function() { window.comexec.writePort(2, 'sellall'); })();" style="cursor: pointer; padding: 3px; border: 1px solid #4CAF50; border-radius: 4px;">`+ns.nFormat(totalValue, "0.000a")+`</a>`;
    toWrite += "ƒIn Stocks:ƒ" + inStocksText;
    await ns.write("/data/stats/stocks.txt", toWrite, "w");
}

/** @param {import(".").NS } ns **/
function format(ns, num) {
    return ns.nFormat(num, "0.000a");
}