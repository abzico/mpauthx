const mpauthx = require('../index.js')(
	'<your app-id here>', // app-id
	'<your app-secret here>', // app-secret
	'./test-db', 	// sqlite3 db path
	null, // redis pass (if any), if none pass null
	259200 // TTL for token
);

// call following functions whenever you need in your project
// mpauthx.authorize(code, encryptedData, iv)
// mpauthx.isTokenValid(token)