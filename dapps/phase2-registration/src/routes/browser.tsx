import * as snarkjs from 'snarkjs';
import * as ffjavascript from 'ffjavascript';
import * as fastFile from "fastfile";
import { toB64 } from '@mysten/sui.js';
import { refreshTime, joinQueueMsg, contributeMsg, httpCall, generateSignature } from './utils';

async function runSNARKJS(params, index, entropy) {
    const oldParams = { type: "mem" };
    const fdTo = await fastFile.createOverride(oldParams);
    fdTo.write(Uint8Array.from(params));
    await fdTo.close();
    const newParams = { type: "mem" };
    const curve = await ffjavascript.buildBn128();
    const startingTime = (new Date()).getTime();
    const contributionHash = await snarkjs.zKey.bellmanContribute(curve, oldParams, newParams, entropy);
    const endingTime = (new Date()).getTime();

    const elapsedTime = (endingTime - startingTime) / 1000.;
    const msg = "The time it takes to contribute for circuit #" + index + " is " + elapsedTime.toString() + "s";
    alert(msg);

    const fdFrom = await fastFile.readExisting(newParams);
    const response = await fdFrom.read(fdFrom.totalSize, 0);
    fdFrom.close();
    return { params: [].slice.call(response), hash: [].slice.call(contributionHash) };
}

async function startContribution(currentAccount, signMessage, entropy, params, setUserState, setListContribution) {
    var new_params = [];
    var hashes: string[] = [];
    var index = 0;
    for (const param of params) {
        index += 1;
        var res = await runSNARKJS(param, index, "Circuit#" + index.toString() + ": " + entropy)
        new_params.push(res.params);
        hashes.push(Buffer.from(res.hash).toString('hex'));
    }

    var toSignRep = contributeMsg(currentAccount.address, hashes);
    console.log("toSign", toSignRep);
    var sigRep = await generateSignature(signMessage, toSignRep);

    const response = {
        "address": currentAccount.address,
        "msg": toSignRep,
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
                alert(currentAccount.address + ": " + httpRep.responseText);
            } else {
                const contribution = {
                    "index": JSON.parse(httpRep.responseText).result.index,
                    "address": currentAccount.address,
                    "pk": toB64(currentAccount.publicKey),
                    "hash": hashes,
                    "sig": sigRep.signature,
                }
                setListContribution((listContribution: any) => [...listContribution, contribution]);
                alert(currentAccount.address + ": " + "Successfully recorded #" + contribution.index + " contribution");
            }
            setUserState(preState => new Map(preState.set(currentAccount.address, null)));
        } else if (httpRep.status !== 200) {
            setUserState(preState => new Map(preState.set(currentAccount.address, null)));
        }
    }
}

export async function contributeInBrowser(currentAccount, signMessage, entropy, queueStateRef, queuePositionRef, setQueuePosition, setUserState, setListContribution) {
    setUserState(preState => new Map(preState.set(currentAccount.address, 1)));
    var addr = currentAccount.address;
    var pk = toB64(currentAccount.publicKey);
    var toSign = joinQueueMsg(addr, pk);
    console.log(toSign);
    var sig = await generateSignature(signMessage, toSign);

    const joinQueueParams = {
        "address": addr,
        "sig": sig.signature,
    };

    const joinQueueQuery = JSON.stringify({
        jsonrpc: '2.0',
        method: 'join_queue',
        "params": [joinQueueParams],
        id: 1
    });

    const http = await httpCall(joinQueueQuery);
    http.onreadystatechange = async (e) => {
        if (http.readyState === 4 && http.status === 200) {
            var responseText = JSON.parse(http.responseText);
            if (responseText.hasOwnProperty("error")) {
                alert(currentAccount.address + ": " + http.responseText);
                setUserState(preState => new Map(preState.set(currentAccount.address, null)));
                return;
            }

            setQueuePosition(preState => new Map(preState.set(currentAccount.address, responseText.result.queue_position)));
            alert(currentAccount.address + ": " + "Added in queue #" + responseText.result.queue_position.toString() + "; wait for " + (responseText.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
            if (responseText.result.params.length == 0) {
                var setIntervalID = setInterval(async function () {
                    if (queueStateRef.current.head + 1 >= queuePositionRef.current.get(currentAccount.address)) {
                        const joinQueueHttp = await httpCall(joinQueueQuery);
                        joinQueueHttp.onreadystatechange = async (e) => {
                            if (joinQueueHttp.readyState === 4 && joinQueueHttp.status === 200) {
                                var responseText = JSON.parse(joinQueueHttp.responseText);
                                if (responseText.hasOwnProperty("error")) {
                                    clearInterval(setIntervalID);
                                    alert(currentAccount.address + ": " + joinQueueHttp.responseText);
                                    setUserState(preState => new Map(preState.set(currentAccount.address, null)));
                                    return;
                                }
    
                                if (responseText.result.queue_position != queuePositionRef.current.get(currentAccount.address)) {
                                    alert(currentAccount.address + ": " + "Missed slot #" + queuePositionRef.current.get(currentAccount.address).toString() + "; assigned new slot #" + responseText.result.queue_position.toString() + "; wait for " + (responseText.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
                                    setQueuePosition(preState => new Map(preState.set(currentAccount.address, responseText.result.queue_position)));
                                }

                                if (queueStateRef.current.head + 1 == queuePositionRef.current.get(currentAccount.address)) {
                                    clearInterval(setIntervalID);
                                    await startContribution(currentAccount, signMessage, entropy, responseText.result.params, setUserState, setListContribution);
                                }
                            }
                        }
                    }
              }, refreshTime);
            } else {
                await startContribution(currentAccount, signMessage, entropy, responseText.result.params, setUserState, setListContribution);
            }
        } else if (http.status !== 200) {
            setUserState(preState => new Map(preState.set(currentAccount.address, null)));
        }
    }
}
