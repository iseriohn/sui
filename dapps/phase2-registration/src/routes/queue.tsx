import { fetchCall, generateSignature, getActivationPk, getContributorMsg, signByActivationCode } from './utils';

export async function getQueue(setQueueState, activationCodeRef, setListContribution) {
    var msg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'get_queue',
        id: 1
    });
    const [http, res] = await fetchCall(msg);
    if (http && res.hasOwnProperty("result")) {
        setQueueState(res.result);
        console.log(res.result);
    }

    if (!activationCodeRef.current) return;

    const pk = await getActivationPk(activationCodeRef.current);
    const toSign = getContributorMsg(pk);
    const sig = await signByActivationCode(activationCodeRef.current, toSign);
    var msg_contributor = JSON.stringify({
        jsonrpc: '2.0',
        method: 'get_contributor',
        params: [{
            "pk": pk,
            "sig": sig,
        }],
        id: 1
    });
    const [httpContributor, resContributor] = await fetchCall(msg_contributor);
    if (httpContributor && resContributor.hasOwnProperty("result")) {
        if (resContributor.result.contribution_hash) {
            const contribution = {
                "index": resContributor.result.contribution_index,
                "address": resContributor.result.sui_address,
                "pk": pk,
                "hash": resContributor.result.contribution_hash,
                "sig": resContributor.result.contribution_signature,
            };
    
            setListContribution(preState => new Map(preState.set(activationCodeRef.current, contribution)));    
        }
       console.log(resContributor.result);
    }
}
