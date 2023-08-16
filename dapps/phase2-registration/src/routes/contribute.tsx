// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ConnectWallet } from '@/components/connect';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { useWalletKit } from '@mysten/wallet-kit';
import { Terminal } from 'lucide-react';
import { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { refreshTime } from './config';
import { contributeInBrowser } from './browser';
import { contributeViaDocker } from './docker';
import { getQueue } from './queue';
import { UpdateWallet, addActivationCode, addEntropy } from './activation';

function Contribution({ contribution }) {
    console.log(contribution);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Contribution #{contribution.index}</CardTitle>
                <CardDescription>Wallet address: {contribution.address}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5">
                        <div className="font-bold">Ephemeral public key</div>
                        <div className="bg-muted rounded text-sm font-mono p-2 break-all">{contribution.pk}</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="font-bold">Contribution hash</div>
                        <div className="bg-muted rounded text-sm font-mono p-2 break-all">{contribution.hash}</div>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <div className="font-bold">Signature</div>
                    <div className="bg-muted rounded text-sm font-mono p-2 break-all">{contribution.sig}</div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Contribute() {
    const { currentAccount, signMessage } = useWalletKit();
    const [activationCode, setActivationCode] = useState(null);
    const [textEntropy, setTextEntropy] = useState(null);
    const [queueState, setQueueState] = useState(null);
    const [queuePosition, setQueuePosition] = useState(new Map());
    const [maxPosition, setMaxPosition] = useState(0);
    const [userState, setUserState] = useState(new Map());
    const [listContribution, setListContribution] = useState(new Map());

    const activationCodeRef = useRef();
    activationCodeRef.current = activationCode;

    const queueStateRef = useRef();
    queueStateRef.current = queueState;

    const queuePositionRef = useRef();
    queuePositionRef.current = queuePosition;

    const maxPositionRef = useRef();
    maxPositionRef.current = maxPosition;
 
    if (queueState === null) {
        getQueue(setQueueState, activationCodeRef, setListContribution);
        setInterval(getQueue, refreshTime, setQueueState, activationCodeRef, setListContribution);
    }
    
    return (
        <div className="flex flex-col gap-4">
            <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                Get in line to contribute
            </h2>

            {queueState != null && (
            <h3 className="scroll-m-20 text-4xl tracking-tight lg:text-5xl">
                There are currently {Math.max(queueState.tail, maxPosition) - queueState.head} contributors in the queue.
            </h3>
            )}

            {currentAccount && userState.get(currentAccount.address) === 1 && queueState != null && queuePosition.get(currentAccount.address) != null && (
            <h3 className="scroll-m-20 text-4xl tracking-tight lg:text-5xl">
                You are now in queue! There are {Math.max(0, queuePosition.get(currentAccount.address) - queueState.head - 1)} contributors in front of you.
            </h3>
            )}

            {/* {!currentAccount && (
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
            </Tabs> */}
            
            {activationCode == null && (
                <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Activation code</AlertTitle>
                    <AlertDescription>
                        Please enter your activation code first.
                    </AlertDescription>
                </Alert>
            )}

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={activationCode != null && userState.get(activationCode) === 1} onClick={async () => await addActivationCode(setActivationCode)} >
                            Add activation code
                        </Button>
                    </div>
                </div>
            </Tabs>

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={activationCode == null} onClick={async () => await UpdateWallet(activationCode)} >
                            Update Sui Wallet
                        </Button>
                    </div>
                </div>
            </Tabs>

            {textEntropy == null && (
                <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Entropy Required</AlertTitle>
                    <AlertDescription>
                        Contributing requires you to enter entropy.
                    </AlertDescription>
                </Alert>
            )}

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={textEntropy != null} onClick={async () => await addEntropy(setTextEntropy)} >
                            Add entropy
                        </Button>
                    </div>
                </div>
            </Tabs>

            <h3 className="scroll-m-20 text-4xl tracking-tight lg:text-5xl">
                Contribute by one of the following options (Please use WiFi):
            </h3>

            {activationCode && userState.get(activationCode) === 1 && (
                <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Contribution warning</AlertTitle>
                    <AlertDescription>
                        Please don't refresh the webpage or switch wallet once you choose to contribute in browser.
                    </AlertDescription>
                    <AlertDescription>
                        To choose a different contribution method, refresh this page and connect your wallet.
                    </AlertDescription>
                </Alert>
            )}

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={!activationCode || userState.get(activationCode) === 1 || textEntropy == null} onClick={ async () => await contributeInBrowser(activationCode, textEntropy, queueStateRef, queuePositionRef, setQueuePosition, setMaxPosition, setUserState) } >
                            Contribute in browser with snarkjs
                        </Button>
                    </div>
                </div>
            </Tabs>

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={!activationCode || userState.get(activationCode) === 1 || textEntropy == null} onClick={ async () => await contributeViaDocker("kobi", activationCode, textEntropy, setUserState) } >
                            Contribute in docker with Kobi's phase2-bn254
                        </Button>
                    </div>
                </div>
            </Tabs>

            <Tabs className="w-full">
                {<div className="flex flex-col gap-6 mt-6">
                    {Array.from(listContribution.values()).map((contribution) => (
                        <Contribution contribution={contribution} />
                    ))}
                </div>}
            </Tabs>
        </div>
    );
}