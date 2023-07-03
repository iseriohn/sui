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
		// const url = 'http://127.0.0.1:49262';
		const url = 'http://185.209.177.123:46019';
		Http.open("POST", url);
		Http.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
		Http.send(msg);

		Http.onreadystatechange = (e) => {
			if(Http.readyState == 4 && Http.status == 200) {
				var registration = {
					"address": currentAccount["address"], 
					"pk": pk,
					"sk": ephemeralKey["secretKey"],
					"sig": sig["signature"]
				};
				setListRegistration(listRegistration => [...listRegistration, registration]);
				alert(Http.responseText);
			}
		}
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
