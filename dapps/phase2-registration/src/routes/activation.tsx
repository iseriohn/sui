import { fetchCall, getActivationPk, signByActivationCode, updateWalletMsg } from "./utils";

export async function addActivationCode(setActivationCode) {
    let activationCode = prompt("Please enter your activation code", "");
    setActivationCode(activationCode);
}

export async function addEntropy(setTextEntropy) {
    let entropy = prompt("Please enter random text to add entropy in contribution", "");
    setTextEntropy(entropy);
}

export async function UpdateWallet(activationCode) {
    let addr = prompt("Please enter random text to add entropy in contribution", "");
    
    const pk = await getActivationPk(activationCode);
    const toSign = updateWalletMsg(pk, addr);
    const sig = await signByActivationCode(activationCode, toSign);
    var msg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'update_wallet',
        params: [{
            "pk": pk,
            "address": addr,
            "sig": sig,
        }],
        id: 1
    });
    const [http, res] = await fetchCall(msg);
    console.log(res);
    if (http && res.hasOwnProperty("result")) {
       console.log(res.result);
    }
}