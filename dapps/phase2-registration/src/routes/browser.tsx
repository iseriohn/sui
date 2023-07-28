import * as snarkjs from 'snarkjs';
import * as ffjavascript from 'ffjavascript';
import { fromB64 } from '@mysten/sui.js';
import { joinQueueMsg, contributeMsg, fetchCall, generateSignature, sleep, toB64 } from './utils';
import { numChunk, refreshTime } from './config';
import { Buffer } from 'buffer';

async function submitInChunks(currentAccount, signMessage, response, new_params, hashes, setListContribution) {
    var toSignRep = contributeMsg(currentAccount.address, hashes);
    console.log("toSign", toSignRep);
    var sigRep = await generateSignature(signMessage, toSignRep);

    response.msg = toSignRep;
    response.sig = sigRep.signature;

    alert("Now submitting contributions and waiting for verification...");

    for (var chunk_num = 0; chunk_num < numChunk; ++chunk_num) {
        response.params = [];
        for (var index = 0; index < new_params.length; ++index) {
            const chunk_size = Math.ceil(new_params[index].length / numChunk) + 1;
            const start = chunk_num * chunk_size;
            const end = Math.min(new_params[index].length, start + chunk_size);
            response.params.push(toB64(new_params[index].subarray(start, end)));
        }
        response.index = chunk_num + 1;
        console.log(response);

        const msgContribute = JSON.stringify({
            jsonrpc: '2.0',
            method: 'contribute',
            params: [response],
            id: 1
        });

        const [httpContribute, resContribute] = await fetchCall(msgContribute);
        if (httpContribute) {
            if (resContribute.hasOwnProperty("error")) {
                alert(currentAccount.address + ": " + JSON.stringify(resContribute));
                break;
            }
        } else {
            alert("Error occurred, please refresh the page and try again");
            break;
        }
        if (chunk_num == numChunk - 1) {
            const contribution = {
                "index": resContribute.result.index,
                "address": currentAccount.address,
                "pk": toB64(currentAccount.publicKey),
                "hash": hashes,
                "sig": sigRep.signature,
            }

            setListContribution((listContribution: any) => [...listContribution, contribution]);
            alert(currentAccount.address + ": " + "Successfully recorded #" + contribution.index + " contribution");
        }
    }
}

async function runSNARKJS(params, entropy) {
    const oldParams = { type: "mem", data: params };
    const newParams = { type: "mem" };
    const curve = await ffjavascript.buildBn128();
    const contributionHash = await snarkjs.zKey.bellmanContribute(curve, oldParams, newParams, entropy);

    await curve.terminate();
    return [newParams.data, contributionHash];
}

export async function contributeInBrowser(currentAccount, signMessage, entropy, queueStateRef, queuePositionRef, setQueuePosition, setMaxPosition, setUserState, setListContribution) {
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

    const getParamsQuery = JSON.stringify({
        jsonrpc: '2.0',
        method: 'get_params',
        "params": [joinQueueParams],
        id: 1
    });

    var http, res, new_params, hashes;
    const contributionParams = { address: currentAccount.address };
    while (true) {
        if (queuePositionRef.current.get(currentAccount.address) == null || queueStateRef.current.head + 1 >= queuePositionRef.current.get(currentAccount.address)) {
            [http, res] = await fetchCall(joinQueueQuery);
            if (http) {
                if (res.hasOwnProperty("error")) {
                    alert(currentAccount.address + ": " + JSON.stringify(res));
                    break;
                }

                if (res.result.queue_position <= queueStateRef.current.head) {
                    console.log("Time out after downloading");
                    continue;
                }

                if (queuePositionRef.current.get(currentAccount.address) == null) {
                    console.log(currentAccount.address + ": " + "Added in queue #" + res.result.queue_position.toString() + "; wait for " + (res.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
                } else if (res.result.queue_position != queuePositionRef.current.get(currentAccount.address)) {
                    console.log(currentAccount.address + ": " + "Missed slot #" + queuePositionRef.current.get(currentAccount.address).toString() + "; assigned new slot #" + res.result.queue_position.toString() + "; wait for " + (res.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
                }
                setQueuePosition(preState => new Map(preState.set(currentAccount.address, res.result.queue_position)));
                setMaxPosition(preState => Math.max(preState, res.result.queue_position));

                if (res.result.queue_position == queueStateRef.current.head + 1) {
                    var [getParamsHttp, getParamsRes] = await fetchCall(getParamsQuery);
                    if (getParamsHttp) {
                        if (getParamsRes.hasOwnProperty("error")) {
                            alert(currentAccount.address + ": " + JSON.stringify(res));
                            break;
                        }
                               
                        if (getParamsRes.result.params.length == 0) {
                            console.log("Not in queue yet or timed out.");
                            continue;
                        } else {
                            new_params = [];
                            hashes = [];

                            for (var index = 0; index < getParamsRes.result.params.length; ++index) {
                                console.log("Starting contribution to circuit #" + (index + 1).toString());
                                const startingTime = (new Date()).getTime();
                                const [new_param, hash] = await runSNARKJS(fromB64(getParamsRes.result.params[index]), "Circuit#" + (index + 1).toString() + ": " + entropy)
                                const endingTime = (new Date()).getTime();
                                console.log("The time it takes to contribute for circuit #" + (index + 1).toString() + " is " + ((endingTime - startingTime) / 1000.).toString() + "s");
                                new_params.push(new_param);
                                hashes.push(Buffer.from(hash).toString('hex'));
                            }

                            res = null;
                            getParamsRes = null;
                            await submitInChunks(currentAccount, signMessage, contributionParams, new_params, hashes, setListContribution);
                            break;
                        }
                    } else {
                        alert("Error occurred, please try again");
                        break;
                    }
                }
            } else {
                alert("Error occurred, please try again");
                break;
            }
        }
        await sleep(refreshTime);
    }
    setUserState(preState => new Map(preState.set(currentAccount.address, null)));
}
