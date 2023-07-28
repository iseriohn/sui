import { fetchCall } from './utils';

export async function getQueue(setQueueState) {
    var msg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'get_queue',
        id: 1
    });

    const [http, res] = await fetchCall(msg);
    if (http && res.hasOwnProperty("result")) {
        setQueueState(res.result);
    }
}
