export const registrationMsg = "I register to contribute to Phase2 Ceremony with address ";

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
