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

const message = "I register to contribute to Phase2 Ceremony with address ";

export default function OfflineSigner() {
	const { currentAccount, signMessage } = useWalletKit();

	return (
		<div className="flex flex-col gap-4">
			<h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
				Offline Signer
			</h2>
            <p> To register, sign on the message "{message}0x..." </p>

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
                            <Button disabled={!currentAccount} onClick={async () => {
                                var toSign = message + currentAccount["address"];
                                var sig = await signMessage({message: new TextEncoder().encode(toSign)});
                                console.log(sig);
                            }} >
								Sign Registration Message
							</Button>
						</div>
					</div>
			</Tabs>
		</div>
	);
}
