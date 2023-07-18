import * as snarkjs from 'snarkjs';
import * as ffjavascript from 'ffjavascript';
import * as fastFile from "fastfile";
import { toB64 } from '@mysten/sui.js';
import { joinQueueRefreshTime, joinQueueMsg, contributeMsg, httpCall, generateSignature } from './utils';

async function runSNARKJS(params, index) {
    const oldParams = { type: "mem" };
    const fdTo = await fastFile.createOverride(oldParams);
    fdTo.write(Uint8Array.from(params));
    await fdTo.close();
    const newParams = { type: "mem" };
    const curve = await ffjavascript.buildBn128();
    const startingTime = (new Date()).getTime();
    console.log("starting");
    const contributionHash = await snarkjs.zKey.bellmanContribute(curve, oldParams, newParams);
    console.log("finishing");
    const endingTime = (new Date()).getTime();

    const elapsedTime = (endingTime - startingTime) / 1000.;
    const msg = "The time it takes to contribute for circuit #" + index + " is " + elapsedTime.toString() + "s";
    alert(msg);

    const fdFrom = await fastFile.readExisting(newParams);
    const response = await fdFrom.read(fdFrom.totalSize, 0);
    fdFrom.close();
    return { params: [].slice.call(response), hash: [].slice.call(contributionHash) };
}

export async function contributeInBrowser(currentAccount, signMessage, setUserState, setListContribution) {
    var addr = currentAccount.address;
    var pk = toB64(currentAccount.publicKey);
    var toSign = joinQueueMsg(addr, pk);
    console.log(toSign);
    var sig = await generateSignature(signMessage, toSign);

    const query = {
        "address": addr,
        "sig": sig.signature,
    };

    const msg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'join_queue',
        "params": [query],
        id: 1
    });

    setUserState(1);
    var getInQueueId = setInterval(async function join() {
        const http = await httpCall(msg);
        http.onreadystatechange = async (e) => {
            if (http.readyState === 4 && http.status === 200) {
                console.log(http.responseText);
                var responseText = JSON.parse(http.responseText);
                if (responseText.hasOwnProperty("error")) {
                    console.log(getInQueueId);
                    clearInterval(getInQueueId);
                    alert(http.responseText);
                    setUserState(null);
                    return;
                }
                if (responseText.result.queue_len == 0) {
                    clearInterval(getInQueueId);
                    var new_params = [];
                    var hashes = [];
                    var index = 0;
                    for (const params of responseText.result.params) {
                        index += 1;
                        var res = await runSNARKJS(params, index)
                        new_params.push(res.params);
                        hashes.push(Buffer.from(res.hash).toString('hex'));
                    }

                    var toSignRep = contributeMsg(addr, hashes);
                    console.log("toSign", toSignRep);
                    var sigRep = await generateSignature(signMessage, toSignRep);

                    const response = {
                        "address": addr,
                        "sig": sigRep.signature,
                        "params": new_params,
                    }
                    const msgContribute = JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'contribute',
                        "params": [response],
                        id: 1
                    });

                    const httpRep = await httpCall(msgContribute);
                    httpRep.onreadystatechange = async (e) => {
                        if (httpRep.readyState === 4 && httpRep.status === 200) {
                            if (JSON.parse(httpRep.responseText).hasOwnProperty("error")) {
                                alert(httpRep.responseText);
                            } else {
                                const contribution = {
                                    "index": JSON.parse(httpRep.responseText).result.index,
                                    "address": addr,
                                    "pk": pk,
                                    "hash": hashes,
                                    "sig": sigRep.signature,
                                }
                                setListContribution(listContribution => [...listContribution, contribution]);
                                alert("Successfully recorded #" + contribution.index + " contribution");
                            }
                        }
                    }
                    setUserState(null);
                    return;
                } else {
                    return;
                }
            }
        }
    }, joinQueueRefreshTime);
    console.log("getInQueueId:", getInQueueId);
}
