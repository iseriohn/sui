export const registrationMsg = "I register to contribute to Phase2 Ceremony with address ";
export const refreshTime = 5 * 1000; // Refresh every 5 seconds;

export async function generateKey(setEphemeralKey) {
	var ephemeralKey = nacl.sign.keyPair();
	console.log(ephemeralKey);
	setEphemeralKey(ephemeralKey);
}

export async function httpCall(msg) {
	console.log("to send query params:", msg);
	const Http = new XMLHttpRequest();
	const url = 'http://localhost:37681';
	// const url = 'https://record.sui-phase2-ceremony.iseriohn.com';
	Http.open("POST", url);
	Http.setRequestHeader("Content-Type", "application/json; charset=UTF-8"); 
	Http.setRequestHeader("Access-Control-Allow-Origin", "record.sui-phase2-ceremony.iseriohn.com"); 
	Http.setRequestHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	Http.setRequestHeader("Access-Control-Allow-Headers", "CONTENT_TYPE, ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS");
	Http.send(msg);

	return Http;
}

export async function generateSignature(signMessage, msg) {
	let bytes = new TextEncoder().encode(msg);
	let serialized_msg = new Uint8Array(bytes.length + 1);
	serialized_msg.set([bytes.length], 0);
	serialized_msg.set(bytes, 1);
	let sig = await signMessage({message: serialized_msg});
    return sig;
}