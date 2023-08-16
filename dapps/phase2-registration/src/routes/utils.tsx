import { saveAs } from 'file-saver';
import { URL } from './config';
import { Keypair } from '@mysten/sui.js';
import { fromExportedKeypair } from '@mysten/sui.js';

export function getContributorMsg(pk) {
    return "Fetch status of contributor with activation key " + pk;
}

export function updateWalletMsg(pk, addr) {
    return "Link contribution by activation pk " + pk + " to sui address " + addr;
}

export function joinQueueMsg(pk) {
    return "Join the contribution queue with activation pk " + pk;
}

export function contributeMsg(pk, params, method) {
    var msg = "Contribute in " + method + " with activation pk " + pk;
    for (const [index, param] of params.entries()) {
        msg = msg + ' #' + (index + 1).toString() + ' contribution hash: "' + param + '"';
    }
    return msg;
}

export async function downloadScript(fileName, text) {
    var blob = new Blob([text], {
        type: "text/Dockerfile;charset=utf-8;",
    });
    await saveAs(blob, fileName);
}

export async function fetchCall(data) {
    const http = await fetch(URL, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "CONTENT_TYPE, ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS",
        },
        redirect: "follow",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: data,
    });

    if (http.ok) {
        const response = await http.json();
        return [true, response];
    } else {
        return [false, null];
    }
}

export async function generateSignature(signMessage, msg) {
    const serialized_msg = new TextEncoder().encode(msg);
    let sig = await signMessage({ message: serialized_msg });
    console.log(sig);
    return sig;
}

export async function getActivationPk(sk) {
    const exportedKeyPair = {
        "privateKey": sk,
        "schema": "ED25519"
    }
    const keyPair = fromExportedKeypair(exportedKeyPair);
    return keyPair.getPublicKey().toBase64();
}

export async function signByActivationCode(sk, msg) {
    const serialized_msg = new TextEncoder().encode(msg);
    const exportedKeyPair = {
        "privateKey": sk,
        "schema": "ED25519"
    }
    const keyPair = fromExportedKeypair(exportedKeyPair);
    let sig = await keyPair.signPersonalMessage(serialized_msg);
    return sig.signature;
}

export function sleep(ms) {
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

export function toB64(aBytes: Uint8Array): string {
    var nMod3 = 2,
        sB64Enc = [''];
    for (var nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
        nMod3 = nIdx % 3;
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

