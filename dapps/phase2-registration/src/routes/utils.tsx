import { saveAs } from 'file-saver';
import { URL } from './config';

export function registrationMsg(addr) {
    return "I register to contribute to Phase2 Ceremony with address " + addr;
}

export function joinQueueMsg(addr, pk) {
    return "I join the contribution queue with address " + addr + " and attestation pk " + pk;
}

export function contributeMsg(addr, params) {
    var msg = "I contribute with address " + addr;
    for (const [index, param] of params.entries()) {
        msg = msg + ' #' + (index + 1).toString() + ' contribution hash: "' + param + '"';
    }
    return msg;
}

export function addEphemeralKeyMsg(addr, pk) {
    return "I'll contribute via Docker with address " + addr + " and attestation pk " + pk;
}

export function downloadScript(fileName, text) {
    var blob = new Blob([text], {
        type: "text/Dockerfile;charset=utf-8;",
    });
    saveAs(blob, fileName);
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
    return sig;
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

