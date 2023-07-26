import * as snarkjs from 'snarkjs';
import * as ffjavascript from 'ffjavascript';
import { fromB64 } from '@mysten/sui.js';
import { joinQueueMsg, contributeMsg, fetchCall, generateSignature } from './utils';
import { refreshTime } from './config';
import { Buffer } from 'buffer';

const response = {};
const account = {};
const hashes = [];
const signMsg = {};
const setList = {};
const setState = {};

const gcState = {
    httpResponse: false,
    oldParams: false,
}

const registry = new FinalizationRegistry(async (gcObject) => {
    alert("hello! " + gcObject);
    gcState[gcObject] = true;
    console.log(gcState);

    if (gcState.httpResponse && gcState.oldParams) {
        for (var index = 0; index < response.params.length; ++index) {
            response.params[index] = toB64(response.params[index].data);
        }

        console.log("finish hash");
        var toSignRep = contributeMsg(account.currentAccount.address, hashes);
        console.log("toSign", toSignRep);
        var sigRep = await generateSignature(signMsg.signMessage, toSignRep);

        response.msg = toSignRep;
        response.sig = sigRep.signature;

        const msgContribute = JSON.stringify({
            jsonrpc: '2.0',
            method: 'contribute',
            "params": [response],
            id: 1
        });

        alert("Now submitting contributions and waiting for verification...");
        const [httpContribute, resContribute] = await fetchCall(msgContribute);
        if (httpContribute) {
            if (resContribute.hasOwnProperty("error")) {
                alert(account.currentAccount.address + ": " + JSON.stringify(resContribute));
            } else {
                const contribution = {
                    "index": resContribute.result.index,
                    "address": account.currentAccount.address,
                    "pk": toB64(account.currentAccount.publicKey),
                    "hash": hashes,
                    "sig": sigRep.signature,
                }
                setList.setListContribution((listContribution: any) => [...listContribution, contribution]);
                alert(account.currentAccount.address + ": " + "Successfully recorded #" + contribution.index + " contribution");
            }
        } else {
            alert("Error occurred, please try again");
        }
        setState.setUserState(preState => new Map(preState.set(account.currentAccount.address, null)));
    }
});

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

function toB64(aBytes: Uint8Array): string {
    var nMod3 = 2,
        sB64Enc = [''];
    console.log("start");
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

    console.log(sB64Enc[sB64Enc.length - 1]);
    console.log("finish");
    sB64Enc[sB64Enc.length - 1] = sB64Enc[sB64Enc.length - 1].slice(0, 2 + nMod3) + (nMod3 === 2 ? '' : nMod3 === 1 ? '=' : '==');
    console.log(sB64Enc);
    return sB64Enc.join("");
}

async function runSNARKJS(params, entropy) {
    const oldParams = { type: "mem", data: params };
    registry.register(oldParams, 'oldParams');
    const newParams = { type: "mem" };
    const curve = await ffjavascript.buildBn128();
    registry.register(curve, 'curve');
    const contributionHash = await snarkjs.zKey.bellmanContribute(curve, oldParams, newParams, entropy);

    return [newParams, contributionHash];
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

    var http, res;
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
                    {
                        const old_param = res;
                        registry.register(old_param, 'httpResponse');
                    }

                    response.address = currentAccount.address;
                    response.params = [];

                    for (var index = 0; index < res.result.params.length; ++index) {
                        response.params.push("");
                    }

                    console.log(res.result.params);
                    for (var index = 1; index <= res.result.params.length; ++index) {
                        alert("Starting contribution to circuit #" + index.toString());
                        const startingTime = (new Date()).getTime();
                        const [new_param, hash] = await runSNARKJS(fromB64(res.result.params[index - 1]), "Circuit#" + index.toString() + ": " + entropy)
                        const endingTime = (new Date()).getTime();
                        alert("The time it takes to contribute for circuit #" + index + " is " + ((endingTime - startingTime) / 1000.).toString() + "s");
                        response.params[index - 1] = new_param;
                        console.log(hash);
                        hashes.push(Buffer.from(hash).toString('hex'));
                    }

                    account.currentAccount = currentAccount;
                    signMsg.signMessage = signMessage;
                    setList.setListContribution = setListContribution;
                    setState.setUserState = setUserState;
                    res = null;
                    break;
                }
            } else {
                alert("Error occurred, please try again");
                setUserState(preState => new Map(preState.set(currentAccount.address, null)));
                break;
            }
        }
        sleep(refreshTime);
    }
}
