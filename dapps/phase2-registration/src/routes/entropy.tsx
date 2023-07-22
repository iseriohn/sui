export async function addEntropy(setTextEntropy) {
    let entropy = prompt("Please enter random text to add entropy in contribution", "");
    setTextEntropy(entropy);
}