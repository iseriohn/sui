import * as snarkjs from 'snarkjs';
import * as ffjavascript from 'ffjavascript';
import { fromB64, toB64 } from '@mysten/sui.js';
import { joinQueueMsg, contributeMsg, fetchCall, generateSignature } from './utils';
import { numChunk, refreshTime } from './config';
import { Buffer } from 'buffer';

async function submitInChunks(currentAccount, signMessage, response, new_params, hashes, setUserState, setListContribution) {
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
            response.params.push(toB64New(new_params[index].subarray(start, end)));
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
    setUserState(preState => new Map(preState.set(currentAccount.address, null)));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function uint6ToB64(nUint6: number) {
    return nUint6 < 26
        ? nUint6 + 65
        : nUint6 < 52
            ? nUint6 + 71
            : nUint6 < 62
                ? nUint6 - 4
                : nUint6 === 62
                    ? 43
                    : nUint6 === 63
                        ? 47
                        : 65;
}

function toB64New(aBytes: Uint8Array): string {
    var nMod3 = 2,
        sB64Enc = [''];
    for (var nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
        nMod3 = nIdx % 3;
        if (nIdx % 10000000 == 0) {
            console.log(aBytes.length, nIdx);
        }
        nUint24 |= aBytes[nIdx] << ((16 >>> nMod3) & 24);
        if (nMod3 === 2 || aBytes.length - nIdx === 1) {
            sB64Enc.push(String.fromCodePoint(
                uint6ToB64((nUint24 >>> 18) & 63),
                uint6ToB64((nUint24 >>> 12) & 63),
                uint6ToB64((nUint24 >>> 6) & 63),
                uint6ToB64(nUint24 & 63),
            ));
            nUint24 = 0;
        }
    }

    sB64Enc[sB64Enc.length - 1] = sB64Enc[sB64Enc.length - 1].slice(0, 2 + nMod3) + (nMod3 === 2 ? '' : nMod3 === 1 ? '=' : '==');
    return sB64Enc.join("");
}

async function runSNARKJS(params, entropy) {
    const oldParams = { type: "mem", data: params };
    const newParams = { type: "mem" };
    const curve = await ffjavascript.buildBn128();
    const contributionHash = await snarkjs.zKey.bellmanContribute(curve, oldParams, newParams, entropy);

    await curve.terminate();
    return [newParams.data, contributionHash];
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

    var http, res, new_params, hashes;
    const contributionParams = { address: currentAccount.address };
    while (true) {
        if (queuePositionRef.current.get(currentAccount.address) == null || queueStateRef.current.head + 1 >= queuePositionRef.current.get(currentAccount.address)) {
            [http, res] = await fetchCall(joinQueueQuery);
            if (http) {
                if (res.hasOwnProperty("error")) {
                    alert(currentAccount.address + ": " + JSON.stringify(res));
                    setUserState(preState => new Map(preState.set(currentAccount.address, null)));
                    break;
                }

                if (queuePositionRef.current.get(currentAccount.address) == null) {
                    alert(currentAccount.address + ": " + "Added in queue #" + res.result.queue_position.toString() + "; wait for " + (res.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
                    setQueuePosition(preState => new Map(preState.set(currentAccount.address, res.result.queue_position)));
                } else if (res.result.queue_position != queuePositionRef.current.get(currentAccount.address)) {
                    alert(currentAccount.address + ": " + "Missed slot #" + queuePositionRef.current.get(currentAccount.address).toString() + "; assigned new slot #" + res.result.queue_position.toString() + "; wait for " + (res.result.queue_position - queueStateRef.current.head - 1).toString() + " contributors to finish");
                    setQueuePosition(preState => new Map(preState.set(currentAccount.address, res.result.queue_position)));
                }

                if (res.result.params.length > 0) {
                    new_params = [];
                    hashes = [];

                    for (var index = 0; index < res.result.params.length; ++index) {
                        alert("Starting contribution to circuit #" + (index + 1).toString());
                        const startingTime = (new Date()).getTime();
                        const [new_param, hash] = await runSNARKJS(fromB64(res.result.params[index]), "Circuit#" + (index + 1).toString() + ": " + entropy)
                        const endingTime = (new Date()).getTime();
                        alert("The time it takes to contribute for circuit #" + (index + 1).toString() + " is " + ((endingTime - startingTime) / 1000.).toString() + "s");
                        new_params.push(new_param);
                        hashes.push(Buffer.from(hash).toString('hex'));
                    }

                    res = null;
                    await submitInChunks(currentAccount, signMessage, contributionParams, new_params, hashes, setUserState, setListContribution);
                    break;
                }
            } else {
                alert("Error occurred, please try again");
                setUserState(preState => new Map(preState.set(currentAccount.address, null)));
                break;
            }
        }
        await sleep(refreshTime);
    }
}
