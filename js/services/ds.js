const deepstream = require( 'deepstream.io-client-js' );
const client = deepstream( 'wss://154.deepstreamhub.com?apiKey=a6c10d51-b4ad-4a7f-9713-273978835ce5' ).login();
const roomId =  document.location.search ? document.location.search.substr( 1 ) : client.getUid();
const record = client.record.getRecord( 'p2p-roomId/' + roomId );

exports.client = client;
exports.roomId = roomId;
exports.record = record;