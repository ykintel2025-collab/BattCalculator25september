const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    const API_ENDPOINT = 'https://api.frankenergie.nl/v1/prices';

    try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }
        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
