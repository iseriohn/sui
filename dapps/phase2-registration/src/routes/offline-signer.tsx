// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ConnectWallet } from '@/components/connect';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { TransactionBlock } from '@mysten/sui.js';
import { useWalletKit } from '@mysten/wallet-kit';
import { Terminal } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import nacl from 'tweetnacl';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const message = "I register to contribute to Phase2 Ceremony with address ";

async function generateKey(setEphemeralKey) {
	var ephemeralKey = nacl.sign.keyPair();
	console.log(ephemeralKey);
	setEphemeralKey(ephemeralKey);
}

async function generateSig(currentAccount, signMessage, ephemeralKey, setListRegistration) {
		var pk = btoa(String.fromCharCode.apply(null, ephemeralKey["publicKey"]));
		var toSign = message + currentAccount["address"] + " with ephemeral pk " + pk;
		console.log(toSign);
		var sig = await signMessage({message: new TextEncoder().encode(toSign)});
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

		const Http = new XMLHttpRequest();
		// const url = 'http://localhost:37681';
		const url = 'https://record.sui-phase2-ceremony.iseriohn.com';
		Http.open("POST", url);
		Http.setRequestHeader("Content-Type", "application/json; charset=UTF-8"); 
		Http.setRequestHeader("Access-Control-Allow-Origin", "record.sui-phase2-ceremony.iseriohn.com"); 
		Http.setRequestHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		Http.setRequestHeader("Access-Control-Allow-Headers", "CONTENT_TYPE, ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS");
		Http.send(msg);

		Http.onreadystatechange = (e) => {
			if(Http.readyState === 4 && Http.status === 200) {
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

async function contributeSNARKJS() {
	var msg = JSON.stringify({
		jsonrpc: '2.0',
		method: 'contribute',
		id: 1
	});

	const Http = new XMLHttpRequest();
	// const url = 'http://localhost:37681';
	const pre_params = "https://record.sui-phase2-ceremony.iseriohn.com/phase2_FE_initial.params";
	const new_params = "/new.params"
	console.log(snarkjs);
	const curve = await snarkjs.zKey.getCurveFromName('bn128');
	await snarkjs.zKey.bellmanContribute(curve, pre_params, new_params);
}

function Registration({registration, index}) {
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

export default function OfflineSigner() {
	const { currentAccount, signMessage } = useWalletKit();
	const [ephemeralKey, setEphemeralKey] = useState(null);
	const [listRegistration, setListRegistration] = useState([]);
	
	return (
		<div className="flex flex-col gap-4">
			<h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
				Offline Signer
			</h2>
            <p> To register, sign on the message "{message}0x... with ephemeral pk ..." </p>

			{!currentAccount && (
				<Alert>
					<Terminal className="h-4 w-4" />
					<AlertTitle>Wallet Required</AlertTitle>
					<AlertDescription>
						Signing a transaction requires you to first connect to a wallet.
					</AlertDescription>
				</Alert>
			)}

			<Tabs className="w-full">
					<div className="flex flex-col items-start gap-4">
						<div className="flex gap-4">
							<ConnectWallet />
                            <Button onClick={async () => await generateKey(setEphemeralKey)} >
								Generate Ephemeral Key Pair
							</Button>
                            <Button disabled={!currentAccount || ephemeralKey == null} onClick={async () => await generateSig(currentAccount, signMessage, ephemeralKey, setListRegistration)} >
								Sign Registration Message
							</Button>
							<Button onClick={async () => await contributeSNARKJS()} >
								Contribute with snarkjs
							</Button>
						</div>
					</div>

					{<div className="flex flex-col gap-6 mt-6">
						{listRegistration.map((registration, index) => (
							<Registration registration={registration} index={index}/>
						))}
					</div>}
			</Tabs>
		</div>
	);
}