const Peer = require( 'simple-peer' );
const ds = require( './ds' );

window.createConnection = function( isInitiator ) {
	var p = new Peer({ initiator: isInitiator, trickle: false });
	var localId = '_' + Math.random();

	p.on('error', function (err) { console.log('error', err) })

	p.on('signal', function (data) {
		ds.client.event.emit( 'rtc-signal', {
			sender: localId,
			data: data
		});
	});

	ds.client.event.subscribe( 'rtc-signal', msg => {
		if( msg.sender !== localId ) {
			p.signal( msg.data );
		}
	});

	p.on('connect', function () {
	  console.log('CONNECT')
	  p.send('whatever' + Math.random())
	})

	p.on('data', function (data) {
	  console.log('data: ' + data)
	})
}


