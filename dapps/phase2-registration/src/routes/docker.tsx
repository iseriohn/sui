import { addEphemeralKeyMsg, generateSignature, httpCall, downloadScript } from "./utils";
import nacl from 'tweetnacl';

const dockerFile =
"git clone https://github.com/MystenLabs/ts-coordinator.git \ncd ts-coordinator \ncargo build --release \nCOMMAND=\"cargo run --release -p client $ADDR $ATTESTATION_KEY $OPTION\"for i in ${!ENTROPY[@]}; do \n    COMMAND+=\" ${ENTROPY[$i]}\" \ndone \n$COMMAND";

export async function contributeViaDocker(repo, currentAccount, signMessage, setUserState) {
    var addr = currentAccount.address;
    var ephemeralKey = nacl.sign.keyPair();
    console.log(ephemeralKey);
    var pk = btoa(String.fromCharCode.apply(null, ephemeralKey.publicKey));
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
            var text = "ADDR=" + addr;
            text = text + "\nATTESTATION_KEY=" + btoa(String.fromCharCode.apply(null, ephemeralKey.secretKey));
            text = text + "\nOPTION=" + repo;
            text = text + "\nENTROPY=(";
            var responseText = JSON.parse(http.responseText);
            for (var i = 1; i <= responseText.result.num_circuits; ++i) {
                let entropy = prompt("Please enter any text to add entropy in contribution to circuit #" + i.toString(), "");
                text = text + '"' + entropy + '" ';
            }
            text = text + ")\n" + dockerFile;
            downloadScript("Dockerfile", text);
            setUserState(null);
        }
    }
}
