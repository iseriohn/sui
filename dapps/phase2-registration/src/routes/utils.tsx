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
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "CONTENT_TYPE, ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS",
        },
        redirect: "follow",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: data,
    });

    console.log(http);
    if (http.ok) {
        const response = await http.json();
        return [true, response];
    } else {
        return [false, null];
    }
}


// export async function fetchCall(endpoint, data) {
//     console.log(URL + endpoint);
//     const http = await fetch(URL + endpoint, {
//         method: "POST",
//         mode: "cors",
//         credentials: "omit",
//         headers: {
//             "Content-Type": "application/octet-stream",
//             "Access-Control-Allow-Origin": "*",
//             "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//             "Access-Control-Allow-Headers": "ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS",
//         },
//         redirect: "follow",
//         referrerPolicy: "strict-origin-when-cross-origin",
//         body: data,
//     });

//     console.log(http);
//     if (http.ok) {
//         const response = new Uint8Array(await http.arrayBuffer());
//         return [true, response];
//     } else {
//         return [false, null];
//     }
// }

export async function generateSignature(signMessage, msg) {
    const serialized_msg = new TextEncoder().encode(msg);
    let sig = await signMessage({ message: serialized_msg });
    return sig;
}
