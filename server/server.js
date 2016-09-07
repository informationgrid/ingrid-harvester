var findPort = require( 'find-port' );

// create a server which finds a random free port
// scan a range
findPort('127.0.0.1', 80, 83, function(ports) {
    console.log(ports);
});

// notify chosen port to java process via config file or similar

// listen for incoming messages, which can be "import" with parameter <type>