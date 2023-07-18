import { bcs } from "@mysten/sui.js";
import { saveAs } from 'file-saver';

export const refreshTime = 5 * 1000; // Refresh every 5 seconds;

export function registrationMsg(addr) {
    return "I register to contribute to Phase2 Ceremony with address " + addr;
}

export function joinQueueMsg(addr, pk) {
    return "I join the contribution queue with address " + addr + " and attestation pk " + pk;
}

export function contributeMsg(addr, params) {
    var msg = "I contribute with address " + addr;
    for (const [index, param] of params.entries()) {
        msg = msg + ' #' + (index+1).toString() +' contribution hash: "' + Buffer.from(param).toString('hex') + '"';
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

export async function httpCall(msg) {
    console.log("to send query params:", msg);
    const Http = new XMLHttpRequest();
    // const url = 'http://localhost:37681';
    const url = 'https://record.sui-phase2-ceremony.iseriohn.com';
    Http.open("POST", url);
    Http.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    Http.setRequestHeader("Access-Control-Allow-Origin", "*.sui-phase2-ceremony.iseriohn.com");
    Http.setRequestHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    Http.setRequestHeader("Access-Control-Allow-Headers", "CONTENT_TYPE, ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS");
    Http.send(msg);

    return Http;
}

export async function generateSignature(signMessage, msg) {
    let bytes = new TextEncoder().encode(msg);
    const serialized_msg = bcs.ser(['vector', 'u8'], bytes).toBytes();
    console.log(serialized_msg);
    let sig = await signMessage({ message: serialized_msg });
    return sig;
}
