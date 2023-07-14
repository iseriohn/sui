// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ConnectWallet } from '@/components/connect';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { verifyMessage, toB64, toParsedSignaturePubkeyPair } from '@mysten/sui.js';
import { useWalletKit } from '@mysten/wallet-kit';
import { Terminal } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import nacl from 'tweetnacl';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import * as snarkjs from 'snarkjs';
import * as ffjavascript from 'ffjavascript';
import * as fastFile from "fastfile";
import { refreshTime, joinQueueMsg, httpCall, generateSignature } from './utils';

async function runSNARKJS(params, index) {
    const oldParams = { type: "mem" };
    const fdTo = await fastFile.createOverride(oldParams);
    fdTo.write(Uint8Array.from(params));
    await fdTo.close();
    const newParams = { type: "mem" };
    const curve = await ffjavascript.buildBn128();
    const startingTime = (new Date()).getTime();
    console.log("starting");
    await snarkjs.zKey.bellmanContribute(curve, oldParams, newParams);
    console.log("finishing");
    const endingTime = (new Date()).getTime();

    const elapsedTime = (endingTime - startingTime) / 1000.;
    const msg = "The time it takes to contribute for circuit #" + index + " is " + elapsedTime.toString() + "s";
    alert(msg);

    const fdFrom = await fastFile.readExisting(newParams);
    const response = await fdFrom.read(fdFrom.totalSize, 0);
    fdFrom.close();
    return [].slice.call(response);
}

async function contributeInBrowser(currentAccount, signMessage, setUserState) {
    var addr = currentAccount.address;
    var pk = toB64(currentAccount.publicKey);
    var toSign = joinQueueMsg(addr, pk);
    console.log(toSign);
    var sig = await generateSignature(signMessage, toSign);

    const query = {
        "address": addr,
        "sig": sig.signature,
    };

    const msg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'join_queue',
        "params": [query],
        id: 1
    });

    setUserState(1);
    var getInQueueId = setInterval( async function() { 
        const http = await httpCall(msg);
        http.onreadystatechange = async (e) => {
            if (http.readyState === 4 && http.status === 200) {
                console.log(http.responseText);
                var responseText = JSON.parse(http.responseText);
                if (responseText.hasOwnProperty("error")) {
                    console.log(getInQueueId);
                    clearInterval(getInQueueId);
                    alert(http.responseText);
                    setUserState(null);
                    return;
                }
                if (responseText.result.hasOwnProperty("params")) {
                    clearInterval(getInQueueId);
                    var new_params = [];
                    var index = 0;
                    for (const params of responseText.result.params) {
                        index += 1;
                        new_params.push(await runSNARKJS(params, index));
                    }
        
                    const response = {
                        "address": addr,
                        "sig": sig.signature,
                        "params": new_params,
                    }
                    const msgContribute = JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'contribute',
                        "params": [response],
                        id: 1
                    });
                    const httpRep = await httpCall(msgContribute);
                    httpRep.onreadystatechange = async (e) => {
                        if (httpRep.readyState === 4 && httpRep.status === 200) {
                            alert(httpRep.responseText);
                        }
                    } 
                    setUserState(null);
                    return;
                }
                if (responseText.result.startsWith("In queue, ")) {
                    alert(http.responseText);
                    return;
                }
           }
        }    
    }, refreshTime );
    console.log("getInQueueId:", getInQueueId);
}

async function generateSig(currentAccount, signMessage, ephemeralKey, setListRegistration) {
    var pk = btoa(String.fromCharCode.apply(null, ephemeralKey["publicKey"]));
    var toSign = message + currentAccount["address"] + " with ephemeral pk " + pk;
    console.log(toSign);
    var sig = await signMessage({ message: new TextEncoder().encode(toSign) });
    console.log(sig);


    var registration = {
        "address": currentAccount["address"],
        "attestation_pk": pk,
        "sig": sig["signature"]
    };
    console.log(registration);
    var msg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'register',
        "params": registration,
        id: 1
    });
    console.log(msg);

    var Http = await httpCall(msg);
    Http.onreadystatechange = (e) => {
        if (Http.readyState === 4 && Http.status === 200) {
            alert(Http.responseText);
            if (JSON.parse(Http.responseText)["result"].startsWith("Registered successfully")) {
                var registration = {
                    "address": currentAccount["address"],
                    "pk": pk,
                    "sk": ephemeralKey["secretKey"],
                    "sig": sig["signature"]
                };
                setListRegistration(listRegistration => [...listRegistration, registration]);
            }
        }
    }
}

function Registration({ registration, index }) {
    console.log(registration);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Registration #{index}</CardTitle>
                <CardDescription>Wallet address: {registration["address"]}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5">
                        <div className="font-bold">Ephemeral public key</div>
                        <div className="bg-muted rounded text-sm font-mono p-2 break-all">{registration["pk"]}</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="font-bold">Ephemeral secret key</div>
                        <div className="bg-muted rounded text-sm font-mono p-2 break-all">{registration["sk"]}</div>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <div className="font-bold">Signature</div>
                    <div className="bg-muted rounded text-sm font-mono p-2 break-all">{registration["sig"]}</div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Contribute() {
    const { currentAccount, signMessage } = useWalletKit();
    const [lengthOfQueue, setLengthOfQueue] = useState(0);
    const [userState, setUserState] = useState(null);
    const [ephemeralKey, setEphemeralKey] = useState(null);
    const [listRegistration, setListRegistration] = useState([]);

    async function fetchQueueLength() {
        var msg = JSON.stringify({
            jsonrpc: '2.0',
            method: 'get_queue',
            id: 1
        });

        var Http = await httpCall(msg);
        Http.onreadystatechange = (e) => {
            if (Http.readyState === 4 && Http.status === 200) {
                console.log(Http.responseText);
                setLengthOfQueue(JSON.parse(Http.responseText).result.length);
            }
        }
    }

    setInterval(fetchQueueLength, refreshTime);

    return (
        <div className="flex flex-col gap-4">
            <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                Get in line to contribute
            </h2>

            <h3 className="scroll-m-20 text-4xl tracking-tight lg:text-5xl">
                There are currently {lengthOfQueue} contributors in the queue.
            </h3>

            {!currentAccount && (
                <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Wallet Required</AlertTitle>
                    <AlertDescription>
                        Contributing requires you to first connect to a wallet.
                    </AlertDescription>
                </Alert>
            )}

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <ConnectWallet />
                    </div>
                </div>
            </Tabs>

            <h3 className="scroll-m-20 text-4xl tracking-tight lg:text-5xl">
                Contribute by one of the following options:
            </h3>

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={!currentAccount || userState != null} onClick={async () => await contributeInBrowser(currentAccount, signMessage, setUserState)} >
                            Contribute in browser with snarkjs
                        </Button>
                    </div>
                </div>
            </Tabs>

            {/* <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={!currentAccount || userState != null} onClick={async () => await generateKey(setEphemeralKey)} >
                            Contribute in docker with snarkjs
                        </Button>
                    </div>
                </div>
            </Tabs>

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={!currentAccount || userState != null} onClick={async () => await generateKey(setEphemeralKey)} >
                            Contribute in docker with Kobi's phase2-bn254
                        </Button>
                    </div>
                </div>
            </Tabs> */}

            {userState != null && (
                <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Contribution warning</AlertTitle>
                    <AlertDescription>
                        Please don't refresh the webpage once you choose to contribute in browser.
                    </AlertDescription>
                    <AlertDescription>
                        To choose a different contribution method, refresh this page and connect your wallet.
                    </AlertDescription>
                </Alert>
            )}

            {/* <Tabs className="w-full">
                {<div className="flex flex-col gap-6 mt-6">
                    {listRegistration.map((registration, index) => (
                        <Registration registration={registration} index={index} />
                    ))}
                </div>}
            </Tabs> */}
            
        </div>
    );
}