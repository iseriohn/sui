import * as snarkjs from 'snarkjs';
import * as ffjavascript from 'ffjavascript';
import { fromB64 } from '@mysten/sui.js';
import { joinQueueMsg, contributeMsg, fetchCall, generateSignature, sleep, toB64, getActivationPk, signByActivationCode } from './utils';
import { numChunk, refreshTime } from './config';
import { Buffer } from 'buffer';

async function submitInChunks(activationCode, response, new_params, hashes) {
    const pk = await getActivationPk(activationCode);
    const toSign = contributeMsg(pk, hashes, "browser");
    console.log(toSign);
    const sig = await signByActivationCode(activationCode, toSign);

    response.msg = toSign;
    response.sig = sig;

    console.log("Now submitting contributions and waiting for verification...");

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
                alert(pk + ": " + JSON.stringify(resContribute));
                break;
            }
        } else {
            alert("Error occurred, please refresh the page and try again");
            break;
        }
        if (chunk_num == numChunk - 1) {
            alert(pk + ": " + "Successfully recorded #" + resContribute.result.index + " contribution");
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

export async function contributeInBrowser(activationCode, entropy, queueStateRef, queuePositionRef, setQueuePosition, setMaxPosition, setUserState) {
    setUserState(preState => new Map(preState.set(activationCode, 1)));
    const pk = await getActivationPk(activationCode);
    const toSign = joinQueueMsg(pk);
    const sig = await signByActivationCode(activationCode, toSign);

    const joinQueueParams = {
        "pk": pk,
        "sig": sig,
    };
    console.log(joinQueueParams);

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
    const contributionParams = { pk: pk, method: "browser" };
    while (true) {
        if (queuePositionRef.current.get(activationCode) == null || queueStateRef.current.head + 1 >= queuePositionRef.current.get(activationCode)) {
            [http, res] = await fetchCall(joinQueueQuery);
            if (http) {
                if (res.hasOwnProperty("error")) {
                    alert(pk + ": " + JSON.stringify(res));
                    break;
                }
                console.log(res);

                if (res.result.queue_position <= queueStateRef.current.head) {
                    console.log(pk + ": " + "Time out after downloading");
                    await sleep(refreshTime / 2);
                    continue;
                }

                if (queuePositionRef.current.get(activationCode) == null) {
                    console.log(pk + ": " + "Added in queue #" + res.result.queue_position.toString() + "; wait for " + (res.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
                } else if (res.result.queue_position != queuePositionRef.current.get(activationCode)) {
                    console.log(pk + ": " + "Missed slot #" + queuePositionRef.current.get(activationCode).toString() + "; assigned new slot #" + res.result.queue_position.toString() + "; wait for " + (res.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
                }
                setQueuePosition(preState => new Map(preState.set(activationCode, res.result.queue_position)));
                setMaxPosition(preState => Math.max(preState, res.result.queue_position));

                if (res.result.queue_position == queueStateRef.current.head + 1) {
                    var [getParamsHttp, getParamsRes] = await fetchCall(getParamsQuery);
                    if (getParamsHttp) {
                        if (getParamsRes.hasOwnProperty("error")) {
                            alert(pk + ": " + JSON.stringify(res));
                            break;
                        }
                               
                        if (getParamsRes.result.params.length == 0) {
                            console.log("Not in queue yet or timed out. Will retry...");
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
                            await submitInChunks(activationCode, contributionParams, new_params, hashes);
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
    setUserState(preState => new Map(preState.set(activationCode, null)));
}
