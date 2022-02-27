let specialServers = [
  "CSEC" ,
  "avmnite-02h",
  "I.I.I.I",
  "run4theh111z",
  "The-Cave",
  "w0r1d_d43m0n"
]



/** @param {NS} ns **/
export async function main(ns) {
  var workDone = false;
  let doneServers = [];
  await ns.sleep(100);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    var paths = ns.read("/data/backdoorPath.txt").split("ƒ");
    ns.print(paths.length);
    if (paths.length == 0 || paths[0].length < 5) {
      if (workDone) {
        ns.tprint("Backdoors installed!");
        ns.connect("home");
      }
      return;
    }
    ns.print("Checking for special servers...");
    for(var j = 0; j < paths.length; j++) {
      var spli = paths[j].split("/");
      if (specialServers.includes(spli[spli.length - 1])) {
        move(paths, j, 0);
      }
      await ns.sleep(1);
    }
    ns.print("Starting path loop");
    for (var i = 0; i < paths.length; i++) {
      var path = paths[i];
      if (doneServers.includes(path)) {
        ns.print("Server already done: " + path);
        paths.shift();
        await ns.write("/data/backdoorPath.txt", paths.join("ƒ"), "w");
        i--;
        await ns.sleep(1);
        continue;
      }
      ns.print("Working on " + path);
      doneServers.push(path);
      ns.print(path);
      if (!path.includes("/")) {
        //ns.tprint("Backdoors installed!")
        //ns.connect("home");
        await ns.sleep(10000);
        break;
      }
      paths.shift();
      i--;
      await ns.write("/data/backdoorPath.txt", paths.join("ƒ"), "w");
      var splits = path.split("/");

      //var command = "";

      for (var k = 1; k < splits.length; k++) {
        ns.connect(splits[k]);
        //command += "connect " + splits[i] + "; ";
      }
      ns.print("Connecting done");
      /*command += "backdoor";
      var doc = eval("document");
      const terminalInput = doc.getElementById("terminal-input");
      terminalInput.value = command;
      const handler = Object.keys(terminalInput)[1];
      terminalInput[handler].onChange({ target: terminalInput });
      terminalInput[handler].onKeyDown({ keyCode: 13, preventDefault: () => null });
      return;*/
      ns.tprint("Installing Backdoor on " + splits[splits.length - 1] + "; Remaining: " + paths.length);
      await ns.installBackdoor();
      workDone = true;
      ns.print("Backdoor installed");
      break;
    }
    await ns.sleep(1);
  }
}


  
function move(input, from, to) {
  let numberOfDeletedElm = 1;

  const elm = input.splice(from, numberOfDeletedElm)[0];

  numberOfDeletedElm = 0;

  input.splice(to, numberOfDeletedElm, elm);
}