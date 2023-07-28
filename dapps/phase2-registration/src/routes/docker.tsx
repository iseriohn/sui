import { mode } from "./config";
import { addEphemeralKeyMsg, generateSignature, fetchCall, downloadScript } from "./utils";
import { Ed25519Keypair } from '@mysten/sui.js';
import { toB64 } from './utils';

const dockerFileFront =
    "FROM ubuntu AS base \nSHELL [\"/bin/bash\", \"-c\"] \nRUN apt-get update -y && apt-get install wget zip ca-certificates -y \nRUN wget http://185.209.177.123:8099/bin_contribute.zip && unzip bin_contribute.zip \nWORKDIR /bin_contribute"
const dockerFileBack =
    "\nENV COMMAND=\"./run.sh ${ADDR} ${ATTESTATION_KEY} ${OPTION} ${ENTROPY}\" \nRUN ${COMMAND}";

export async function contributeViaDocker(repo, currentAccount, entropy, signMessage, setUserState) {
    setUserState(preState => new Map(preState.set(currentAccount.address, 1)));
    var addr = currentAccount.address;
    var ephemeralKey = Ed25519Keypair.generate();
    console.log(ephemeralKey);
    var pk = toB64(ephemeralKey.keypair.publicKey);
    var toSign = addEphemeralKeyMsg(addr, pk);
    console.log(toSign);
    var sig = await generateSignature(signMessage, toSign);

    var addKeyQuery = {
        "address": addr,
        "attestation_pk": pk,
        "sig": sig.signature,
    };

    const msg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'add_key',
        "params": [addKeyQuery],
        id: 1
    });


    const [http, res] = await fetchCall(msg);
    if (http) {
        console.log(JSON.stringify(res));
        if (res.hasOwnProperty("result")) {
            var text = dockerFileFront + "\nENV ADDR=" + addr;
            text = text + "\nENV ATTESTATION_KEY=" + toB64(ephemeralKey.keypair.secretKey);
            text = text + "\nENV OPTION=" + repo;
            text = text + "\nENV ENTROPY=" + toB64(new TextEncoder().encode(entropy));
            text = text + dockerFileBack;
            downloadScript("Dockerfile", text);
            alert('Please run "sudo docker build --no-cache --progress=plain ." in the same folder Dockerfile is downloaded.');
            console.log('cargo run --release -p client --features ' + mode + ' ' + addr + ' ' + toB64(ephemeralKey.keypair.secretKey) + ' ' + repo + ' ' + toB64(new TextEncoder().encode(entropy)))
        } else {
            alert(JSON.stringify(res));
        }
    } else {
        alert("Error occurred, please try again");
    }
    setUserState(preState => new Map(preState.set(currentAccount.address, null)));
}
