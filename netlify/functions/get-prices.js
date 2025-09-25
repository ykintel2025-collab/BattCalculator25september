// Deze server-code fungeert als onze 'boodschapper' of proxy.
// Het vereist 'node-fetch' versie 2. Installeer via: npm install node-fetch@2
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    const API_ENDPOINT = 'https://api.frankenergie.nl/v1/prices';

    try {
        const response = await fetch(API_ENDPOINT);
        const data = await response.json();

        // Stuur de data ongewijzigd terug naar onze app
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        // Stuur een foutmelding als het ophalen mislukt
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch energy prices' })
        };
    }
};
