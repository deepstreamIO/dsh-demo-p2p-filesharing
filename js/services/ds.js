const deepstream = require( 'deepstream.io-client-js' );
const client = deepstream( 'wss://154.deepstreamhub.com?apiKey=a6c10d51-b4ad-4a7f-9713-273978835ce5' );
const isFirstInRoom = !document.location.hash;
const roomId =  isFirstInRoom ? client.getUid() : document.location.hash.substr( 1 );
const userId = 'user/' + client.getUid();;
const connectionData = { type: 'open', username: userId };
const record = client.record.getRecord( 'p2p-roomId/' + roomId );

client.login({ type: 'open' });

if( isFirstInRoom ) {
	document.location.hash = roomId;
	exports.initialUsername = 'anonymous-user-0';
	record.set({
		files: [],
		users: { [userId]: exports.initialUsername }
	});
} else {
	record.whenReady(() => {
		exports.initialUsername = 'anonymous-user-' + Object.keys( record.get( 'users' ) ).length;
		record.set( 'users.' + userId, exports.initialUsername );
	});
}

exports.client = client;
exports.roomId = roomId;
exports.record = record;
exports.userId = userId;

window.record = record;