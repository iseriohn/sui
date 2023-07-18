// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ConnectWallet } from '@/components/connect';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { useWalletKit } from '@mysten/wallet-kit';
import { Terminal } from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getQueueRefreshTime, httpCall } from './utils';
import { contributeInBrowser } from './browser';
import { contributeViaDocker } from './docker';

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
    const [lengthOfQueue, setLengthOfQueue] = useState(0);
    const [userState, setUserState] = useState(null);
    const [listContribution, setListContribution] = useState([]);

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

    setInterval(fetchQueueLength, getQueueRefreshTime);

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

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={!currentAccount || userState != null} onClick={async () => await contributeInBrowser(currentAccount, signMessage, setUserState, setListContribution)} >
                            Contribute in browser with snarkjs
                        </Button>
                    </div>
                </div>
            </Tabs>

            {/* <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={!currentAccount || userState != null} onClick={async () => await contributeViaDocker("snarkjs", currentAccount, signMessage, setUserState)} >
                            Contribute in docker with snarkjs
                        </Button>
                    </div>
                </div>
            </Tabs> */}

            <Tabs className="w-full">
                <div className="flex flex-col items-start gap-4">
                    <div className="flex gap-4">
                        <Button disabled={!currentAccount || userState != null} onClick={async () => await contributeViaDocker("kobi", currentAccount, signMessage, setUserState)} >
                            Contribute in docker with Kobi's phase2-bn254
                        </Button>
                    </div>
                </div>
            </Tabs>

            <Tabs className="w-full">
                {<div className="flex flex-col gap-6 mt-6">
                    {listContribution.map((contribution) => (
                        <Contribution contribution={contribution} />
                    ))}
                </div>}
            </Tabs>

        </div>
    );
}