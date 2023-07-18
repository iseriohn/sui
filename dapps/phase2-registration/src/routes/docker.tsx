import { addEphemeralKeyMsg, generateSignature, httpCall, downloadScript } from "./utils";
import { Ed25519Keypair, toB64 } from '@mysten/sui.js';

const dockerFileFront =
"# Use a base image with Rust slim \nFROM rust:slim AS base \n# Install system dependencies \nSHELL [\"/bin/bash\", \"-c\"] \nRUN apt-get update -y && apt-get upgrade -y && apt-get install -y sudo wget unzip curl git build-essential clang"
const dockerFileBack = 
"\nENV COMMAND=\"cargo run --release -p client ${ADDR} ${ATTESTATION_KEY} ${OPTION} ${ENTROPY}\" \n#RUN git clone https://github.com/MystenLabs/ts-coordinator.git \nRUN wget http://185.209.177.123:8099/ts-coordinator.zip \nRUN unzip ts-coordinator.zip \nWORKDIR /ts-coordinator \nRUN ${COMMAND}";

export async function contributeViaDocker(repo, currentAccount, signMessage, setUserState) {
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

    setUserState(1);
    var http = await httpCall(msg);
    http.onreadystatechange = (e) => {
        if (http.readyState === 4 && http.status === 200) {
            alert(http.responseText);
            var text = dockerFileFront + "\nENV ADDR=" + addr;
            text = text + "\nENV ATTESTATION_KEY=" + toB64(ephemeralKey.keypair.secretKey);
            text = text + "\nENV OPTION=" + repo;
            text = text + "\nENV ENTROPY=\"";
            var responseText = JSON.parse(http.responseText);
            for (var i = 1; i <= responseText.result.num_circuits; ++i) {
                let entropy = prompt("Please enter any text to add entropy in contribution to circuit #" + i.toString(), "");
                text = text + ' ' + toB64(new TextEncoder().encode(entropy));
            }
            text = text + "\"" + dockerFileBack;
            downloadScript("Dockerfile", text);
            alert('Please run "sudo docker build --no-cache --progress=plain  . 2> build.log" in the same folder Dockerfile is downloaded.');
            setUserState(null);
        }
    }
}
