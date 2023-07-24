import { bcs } from "@mysten/sui.js";
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
            "Content-Type": "application/json; charset=UTF-8",
            "Access-Control-Allow-Origin": "*.sui-phase2-ceremony.iseriohn.com",
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
    let bytes = new TextEncoder().encode(msg);
    const serialized_msg = bcs.ser(['vector', 'u8'], bytes).toBytes();
    // const serialized_msg = new TextEncoder().encode(msg);
    console.log(serialized_msg);
    let sig = await signMessage({ message: serialized_msg });
    return sig;
}
