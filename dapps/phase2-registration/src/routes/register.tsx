// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ConnectWallet } from '@/components/connect';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { useWalletKit } from '@mysten/wallet-kit';
import { Terminal } from 'lucide-react';
import { registrationMsg, httpCall, generateSignature } from './utils';

async function register(currentAccount, signMessage) {
    var addr = currentAccount.address;
	var toSign = registrationMsg(addr);
    var sig = await generateSignature(signMessage, toSign);
	console.log(sig);

	var registration = {
		"address": addr, 
		"sig": sig.signature,
	};

    var msg = JSON.stringify({
		jsonrpc: '2.0',
		method: 'register',
		"params": [registration],
		id: 1
	});
	console.log(msg);

	var Http = await httpCall(msg);
	Http.onreadystatechange = (e) => {
		if(Http.readyState === 4 && Http.status === 200) {
			alert(Http.responseText);
		}
	}
}

export default function Register() {
	const { currentAccount, signMessage } = useWalletKit();
	
	return (
		<div className="flex flex-col gap-4">
			<h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
				Register to participate
			</h2>
            <p> To register, sign on the message "{registrationMsg}0x..." </p>

			{!currentAccount && (
				<Alert>
					<Terminal className="h-4 w-4" />
					<AlertTitle>Wallet Required</AlertTitle>
					<AlertDescription>
						Registration requires you to first connect to a wallet.
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

			<Tabs className="w-full">
				<div className="flex flex-col items-start gap-4">
					<div className="flex gap-4">
						<Button disabled={!currentAccount} onClick={async () => await register(currentAccount, signMessage)} >
							Register
						</Button>
					</div>
				</div>
			</Tabs>
		</div>
	);
}