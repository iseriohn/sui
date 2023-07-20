import { httpCall } from './utils';

export async function getQueue(setQueueState) {
    var msg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'get_queue',
        id: 1
    });

    var Http = httpCall(msg);
    Http.onreadystatechange = (e) => {
        if (Http.readyState === 4 && Http.status === 200) {
            console.log(JSON.parse(Http.responseText).result);
            setQueueState(JSON.parse(Http.responseText).result);
        }
    }
}
