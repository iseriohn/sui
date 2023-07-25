import * as snarkjs from 'snarkjs';
import * as ffjavascript from 'ffjavascript';
import { toB64, fromB64 } from '@mysten/sui.js';
import { joinQueueMsg, contributeMsg, fetchCall, generateSignature } from './utils';
import { refreshTime } from './config';

async function runSNARKJS(params, entropy) {
    const oldParams = { type: "mem", data: params };
    const newParams = { type: "mem" };
    const curve = await ffjavascript.buildBn128();
    const contributionHash = await snarkjs.zKey.bellmanContribute(curve, oldParams, newParams, entropy);

    return [newParams.data, contributionHash];
}

async function startContribution(currentAccount, signMessage, entropy, old_params, setUserState, setListContribution) {
    var response = {
        "address": currentAccount.address,
        "params": [],
    }

    var hashes: string[] = [];
    console.log(old_params);
    for (var index = 1; index <= old_params.length; ++index) {
        alert("Starting contribution to circuit #" + index.toString());
        const startingTime = (new Date()).getTime();
        //const [new_param, hash] = await runSNARKJS(fromB64(old_params[index - 1]), "Circuit#" + index.toString() + ": " + entropy)
        new_param = toB64(fromB64(old_params[index-1]));
        const endingTime = (new Date()).getTime();
        alert("The time it takes to contribute for circuit #" + index + " is " + ((endingTime - startingTime)/1000.).toString() + "s");
        old_params[index - 1] = "";
        response.params.push(toB64(new_param));
        console.log("hi");
        hashes.push(Buffer.from(hash).toString('hex'));
    }

    console.log("finish hash");
    var toSignRep = contributeMsg(currentAccount.address, hashes);
    console.log("toSign", toSignRep);
    var sigRep = await generateSignature(signMessage, toSignRep);
    
    response.msg = toSignRep;
    response.sig = sigRep.signature;
    
    const msgContribute = JSON.stringify({
        jsonrpc: '2.0',
        method: 'contribute',
        "params": [response],
        id: 1
    });

    alert("Now submitting contributions and waiting for verification...");
    const [http, res] = await fetchCall(msgContribute);
    if (http) {
        if (res.hasOwnProperty("error")) {
            alert(currentAccount.address + ": " + JSON.stringify(res));
        } else {
            const contribution = {
                "index": res.result.index,
                "address": currentAccount.address,
                "pk": toB64(currentAccount.publicKey),
                "hash": hashes,
                "sig": sigRep.signature,
            }
            setListContribution((listContribution: any) => [...listContribution, contribution]);
            alert(currentAccount.address + ": " + "Successfully recorded #" + contribution.index + " contribution");
        }
        setUserState(preState => new Map(preState.set(currentAccount.address, null)));
    } else {
        alert("Error occurred, please try again");
        setUserState(preState => new Map(preState.set(currentAccount.address, null)));
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

    const [http, res] = await fetchCall(joinQueueQuery);
    if (http) {
        if (res.hasOwnProperty("error")) {
            alert(currentAccount.address + ": " + JSON.stringify(res));
            setUserState(preState => new Map(preState.set(currentAccount.address, null)));
            return;
        }
        setQueuePosition(preState => new Map(preState.set(currentAccount.address, res.result.queue_position)));
        alert(currentAccount.address + ": " + "Added in queue #" + res.result.queue_position.toString() + "; wait for " + (res.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
        if (res.result.params.length == 0) {
            var setIntervalID = setInterval(async function () {
                if (queueStateRef.current.head + 1 >= queuePositionRef.current.get(currentAccount.address)) {
                    const [joinQueueHttp, joinQueueRes] = await fetchCall(joinQueueQuery);
                    if (joinQueueHttp) {
                        if (joinQueueRes.hasOwnProperty("error")) {
                            clearInterval(setIntervalID);
                            alert(currentAccount.address + ": " + JSON.stringify(joinQueueRes));
                            setUserState(preState => new Map(preState.set(currentAccount.address, null)));
                            return;
                        }

                        if (joinQueueRes.result.queue_position != queuePositionRef.current.get(currentAccount.address)) {
                            alert(currentAccount.address + ": " + "Missed slot #" + queuePositionRef.current.get(currentAccount.address).toString() + "; assigned new slot #" + joinQueueRes.result.queue_position.toString() + "; wait for " + (joinQueueRes.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
                            setQueuePosition(preState => new Map(preState.set(currentAccount.address, joinQueueRes.result.queue_position)));
                        }

                        if (queueStateRef.current.head + 1 == queuePositionRef.current.get(currentAccount.address)) {
                            clearInterval(setIntervalID);
                            await startContribution(currentAccount, signMessage, entropy, joinQueueRes.result.params, setUserState, setListContribution);
                        }
                    }
                }
            }, refreshTime);
        } else {
            await startContribution(currentAccount, signMessage, entropy, res.result.params, setUserState, setListContribution);
        }
    } else {
        alert("Error occurred, please try again");
        setUserState(preState => new Map(preState.set(currentAccount.address, null)));
    }
}
