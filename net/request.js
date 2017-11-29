var constants = require('../core/constants.js');

// private object holds private variables, and functions
var _priv = {};

// private function to check if 
_priv.isRelateToInternetConnectionIssue = function(errorMsg) {
	// as tested on Safari, Chrome, and Firefox we got 2 possible messages to check
	if (errorMsg.search("XHR error") > -1 || errorMsg.search("Failed to fetch") > -1) {
		return true;
	}
	else {
		return false;
	}
}

/**
 * Make a GET request
 * @param  {string} url target url to send request to
 * @return {object}     Promise object
 * @method  getJsonAsync
 */
var getJsonAsync = function(url) 
{
	return new Promise( (resolve, reject) => {
		// load proper library
		// load from reference if it's already loaded
		const lib = url.search('https') != -1 ? require('https') : require('http');

		// collect all data chunks into array
		var dataChunks = [];

		// make a GET request
		const request = lib.get(url, (response) => {
			// handle http errors
			if (response.statusCode != 200) {
				var e = new Error("Non 200 http status code received. Http error.");
				e.code = constants.statusCode.httpError;
				return reject(e);
			}

			// listen to event 'data' for each indivdiual chunk of data
			response.on('data', (chunk) => {
				dataChunks.push(chunk);
			});

			// listen to event 'end' when all chunks of data are transmitted
			response.on('end', () => {

				// combine all data chunks together
				let d = dataChunks.join('');

				// check if data is null
				if (d == null) {
					var e = new Error("Response data is null");
					e.code = constants.statusCode.responseIsNull;
					return reject(e);
				}

				// parse into json, and validate for error-free
				let json = null;
				try {
					// parse data resposne to json
					json = JSON.parse(d);
				}
				catch(e) {
					var error = new Error(e.message ? e.message : "JSON Parsed error");
					error.code = constants.statusCode.jsonParsedError;
					return reject(error);
				}

				// all ok
				return resolve(json);
			});

			// listen to event 'error'
			response.on('error', (e) => { 
				var error = new Error(e.message ? e.message : "HTTP Response 'error' event error.");
				error.code = constants.statusCode.httpResponseErrorEvent;
				return reject(error);
			});
		});

		request.on('error', (e) => {
			// if it relates to internet connection issue, then mark its code
			if (_priv.isRelateToInternetConnectionIssue(e.message)) {
				var error = new Error("Request error. " + e.message);
				error.code = constants.statusCode.internetConnectionError;
				return reject(error);
			}
			else {
				var error = new Error(e.message ? e.message : "Request error");
				error.code = constants.statusCode.httpRequestErrorEvent;
				return reject(error);
			}
		});
	});
}

/**
 * Make a POST request
 * @param {String} url url target to send request to
 * @param {Object} postDataKvp Post data as object key-value pair.
 * @return {object}     Promise object
 * @method  postJsonAsync
 */
var postJsonAsync = function(url, postDataKvp) 
{
	return new Promise( (resolve, reject) => {
		// load proper library
		// load from reference if it's already loaded
		var lib = null;
		var isHttps = true;
		if (url.search('https') != -1) {
			lib = require('https');
			isHttps = true;
		}
		else {
			lib = require('http');
			isHttps = false;
		}

		// form query string of post data
		var encodedDataParams = "";
		if (postDataKvp != null) {
			var keys = Object.keys(postDataKvp);
			var count = keys.length;

			for (var i=0; i<count; i++)
			{
				// get key and value
				var key = keys[i];
				var value = postDataKvp[keys[i]];

				// if both are not null then we add them into result string
				if (key != null && value != null) {

					// prefix "&" as it needs to check first if the current element has value or not
					if (i != 0) {
						encodedDataParams += "&";
					}

					encodedDataParams += encodeURIComponent(key) + "=" + encodeURIComponent(value);
				}
			}
		}

		// cut out prefixed protocal
		var noPrefixUrl = isHttps ? url.substring(8) : url.substring(7);
		// get base url, and the less
		const firstSlashPos = noPrefixUrl.indexOf("/");
		const baseUrl = noPrefixUrl.substring(0, firstSlashPos);
		const pathUrl = "/" + noPrefixUrl.substring(firstSlashPos+1);

		// form options for reqeust
		// we also need to calculate byte-lenth of post data to send too
		var postOptions = {
			hostname: baseUrl,	// cut out protocal string, and get only host name string
			path: pathUrl,
			port: isHttps ? 443 : 80,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(encodedDataParams)
			}
		};

		// data chunk array to collect each individual chunk
		var dataChunks = [];

		// make a POST request
		const request = lib.request(postOptions, (response) => {
			// handle http errors
			if (response.statusCode != 200) {
				var e = new Error("Non 200 http status code received. Http error.");
				e.code = constants.statusCode.httpError;
				return reject(e);
			}

			response.setEncoding('utf8');

			// liten to event 'data', each individual chunk will be sent
			response.on('data', (chunk) => {
				dataChunks.push(chunk);
			});

			// listen to event 'end' to combine all individual chunks together as data
			response.on('end', () => {

				// combine all data chunks together
				let d = dataChunks.join('');

				// check if data is null
				if (d == null) {
					var e = new Error("Response data is null");
					e.code = constants.statusCode.responseIsNull;
					return reject(e);
				}

				// parse into json, and validate for error-free
				let json = null;
				try {
					// parse data resposne to json
					json = JSON.parse(d);
				}
				catch(e) {
					var error = new Error(e.message ? e.message : "JSON Parsed error");
					error.code = constants.statusCode.jsonParsedError;
					return reject(error);
				}

				// all ok
				return resolve(json);
			});

			// listen to event 'error'
			response.on('error', (e) => { 
				var error = new Error(e.message ? e.message : "HTTP Response 'error' event error.");
				error.code = constants.statusCode.httpResponseErrorEvent;
				return reject(error); 
			});
		});

		request.on('error', (e) => {

			// if it relates to internet connection issue, then mark its code
			if (_priv.isRelateToInternetConnectionIssue(e.message)) {
				var error = new Error("Request error. " + e.message);
				error.code = constants.statusCode.internetConnectionError;
				return reject(error);
			}
			else {
				var error = new Error(e.message ? e.message : "Request error");
				error.code = constants.statusCode.httpRequestErrorEvent;
				return reject(error);
			}
		});

		// write post data
		request.write(encodedDataParams);
		request.end();
	});
}

// export module
module.exports = {
	getJsonAsync: getJsonAsync,
	postJsonAsync: postJsonAsync
}