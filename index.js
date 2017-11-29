const constants = require('./core/constants.js');
const util = require('./util/util.js');
const valproxy = require('./core/valproxy.js');

const redis = require('redis');
let redisClient = null;

const SQLITE3 = require('sqlite3').verbose();
let db = null;

let cypto = require('crypto');
let WXBizDataCrypt = require('./vendor/WXBizDataCrypt.js');
let request = require('./net/request.js');
let userTokenPartSeparator = '|';

/**
 * Ad-hoc checking whether token is valid or not.
 *
 * It will check against redis db whether such token exists or not.
 * 
 * @param  {string} token Token to be checked for validity
 * @return {object}       Promise object. Success and failure contains nothing. Use them as indicator for result only.
 */
function isTokenValid(token) {
	return new Promise(function(resolve, reject) {

		if (token == null) return reject();

		// check against redis db
		redisClient.hgetall(token, function(err, reply) {
			console.log(err);
			console.log(reply);
			if (err || reply == null) return reject();
			else return resolve();
		});
	});
}

/**
 * Generate token for user's identitify part.
 * @param  {string} openId Open id of WeChat user
 * @return {string}        Generated user identitfy part.
 */
function generateUserIdenPart(openId) {
	return openId;
}

/**
 * Generate token for session identity part.
 * @param  {number} timestamp Timestamp, unix timestamp.
 * @return {string}           Generated session identity part.
 */
function generateSessionIdenPart(timestamp) {
	var part = timestamp + util.generateRandomString(6);
	return crypto.createHash('sha256').update(part).digest('hex');
}

/**
 * Extract openId from specified token.
 * 
 * @param  {string} userToken Token string to extract openId from
 * @return {string}           Extracted openId string
 */
function extractOpenId(userToken) {
	return userToken.substring(0, userToken.indexOf(userTokenPartSeparator));
}

/**
 * Get current timestamp.
 * @return {number} Return the number of milliseconds since 1970/01/01
 */
function getTimestamp() {
	return Date.now();
}

/**
 * Authorize WeChat user from specified credential, then returning back status result.
 *
 * It will check whether user has existing active session (token) in redis or not, if not then it will also check against user db on sqlite3 whether it needs to add such user in db, before trying to add a new token generated for this session.
 * 
 * @param  {String} code          WeChat user's code credential
 * @param  {String} encryptedData WeChat user's encryptedData credential
 * @param  {String} iv            WeChat user's iv credential
 * @return {Object}               Promise object. Success contains nothing, failure contains Error object with code property for reason of why it fails.
 */
function authorize(code, encryptedData, iv) {
	return new Promise((resolve, reject) => {
		// check required params, missing or not
		if (code == null) {
			// reject with error object
			reject(util.createErrorObject(constants.statusCode.requiredParamsMissingError, 'Missing code parameter'));
			// return immediately
			return;
		}
		else if (encryptedData == null) {
			// reject with error object
			reject(util.createErrorObject(constants.statusCode.requiredParamsMissingError, 'Missing encryptedData parameter'));
			// return immediately
			return;
		}
		else if (iv == null) {
			// reject with error object
			reject(util.createErrorObject(constants.statusCode.requiredParamsMissingError, 'Missing iv parameter'));
			// return immediately
			return;
		}

		// 1. It make a request online using input from appId + appSecret + code to get sessionKey and openId for checking against later.
		// note: value of variable is processed inside `` here.
		request.getJsonAsync(`https://api.weixin.qq.com/sns/jscode2session?appid=${valproxy.appid}&secret=${valproxy.appsecret}&js_code=${code}&grant_type=authorization_code`)
			.then(function(jsonRes) {
				console.log(jsonRes);
				// get session key, and openid for checking later
				var online_sessionKey = jsonRes.session_key;
				var online_openId = jsonRes.openid;

				// 2. It will extract openId from those input offline using appId + sessionKey + encryptedData + iv.
				var pc = new WXBizDataCrypt(valproxy.appid, online_sessionKey);
				var data = pc.decryptData(encryptedData, iv);
				var offline_openId = data.openId;

				console.log(offline_openId);

				// 3. Check whether two openId matches, if not response with error. Otherwise continue.
				if (online_openId !== offline_openId) {
					console.log('OpenID not match');
					// reject with error object
					reject(util.createErrorObject(constants.statusCode.openIdNotMatch, 'OpenID not match'));
					return;
				}

				// otherwise continue
				// 4. Then it checks first whether such openId is already granted with access token in redis db.
				// [as first part of digested message can be used to identify user through openId, then we search through
				// all keys. Only 1 session will be allowed.]
				var userIdenPart = generateUserIdenPart(offline_openId);
				redisClient.keys(`${userIdenPart}*`, function(err, replies) {
					if (err) {
						console.log('DB error in searching for user\'s active session in redis');
						reject(util.createErrorObject(constants.statusCode.databaseRelatedError, `DB Error in searching for user's active sessions: ${err.message}`));
						return;
					}
					else if (replies != null && replies.length > 0) {
						// - If so, then it doesn't expire yet, it will immediately return that token back as response.
						// [detected more than 1 active session, choose first item to return as token]
						console.log('found active sessions, choose first one then return as response: ', replies[0]);
						resolve(util.createSuccessObject(constants.statusCode.success, 'OK', replies[0]));
						return;
					}
					else if (replies != null && replies.length == 0) {
						// - Otherwise, it checks against user table in sqlite3 db whether or not to register user as a new record.
						// [there's no active session, then create one]
						db.all(`SELECT * FROM user WHERE openId LIKE '${offline_openId}'`, function(e, rows) {
							if (e) {
								console.log(`error select redis: ${e.message}`);
								// resolve with success object
								resolve(util.createSuccessObject(constants.statusCode.databaseRelatedError, `Error: ${e.message}`));
								return;
							}
							else {
								// - Not exist, register such user in sqlite3 db + generate token in redis db. Finally return token back as response.
								// [if records are empty, then we need to register such user]
								if (rows == null || (rows != null && rows.length == 0)) {
									console.log('3');
									db.run(`INSERT INTO user (openId) values ('${online_openId}')`, function(e) {
										if (e) {
											console.log(`error insert ${e.message}`);
											reject(util.createErrorObject(constants.statusCode.databaseRelatedError, `Error: ${e.message}`));
											return;
										}
										else {
											console.log('generate token');
											// generate token
											var timestamp = Date.now();
											var token = generateToken(offline_openId, timestamp);
											redisClient.hmset(token, { ctime: timestamp }, function(e, reply) {
												if (e) {
													reject(util.createErrorObject(constants.statusCode.databaseRelatedError, `Error: ${e.message}`));
													return;
												}
												else {
													// set expire
													redisClient.expire(offline_openId, valproxy.tokenTTL);

													// respond back with generated token
													// we're done here
													console.log('done respond back with token: ', token);
													resolve(util.createSuccessObject(constants.statusCode.success, 'OK', token));
													return;
												}
											});
										}
									});
								}
								//    - Exists, then generate token and insert into redis db. Finally return token as reponse.
								// [if records are not empty and has exactly 1 record]
								else if (rows != null && rows.length == 1) {
									console.log('case 2');
									// generate token
									var timestamp = Date.now();
									var token = generateToken(offline_openId, timestamp);
									redisClient.hmset(token, { ctime: timestamp }, function(e, reply) {
										if (e) {
											reject(util.createErrorObject(constants.statusCode.databaseRelatedError, `Error: ${e.message}`));
											return;
										}
										else {
											// set expire
											redisClient.expire(offline_openId, valproxy.tokenTTL);

											// respond back with generated token
											// we're done here
											resolve(util.createSuccessObject(constants.statusCode.success, 'OK', token));
											return;
										}
									});
								}
								else {
									// this should not happen
									reject(util.createErrorObject(constants.statusCode.unknownError, 'Unknown error after finding user record from db'));
									return;
								}
							}
						});
					}
					else {
						// should not happen
						console.log('unknown error');
						reject(util.createErrorObject(constants.statusCode.unknownError, 'Unknown error after try to search for user\'s active sessions.'));
						return;
					}
				});
			})
			.catch(function(e) {
				// response back with error
				reject(util.createErrorObject(constants.statusCode.sessionKeyAndOpenIdRequestError, `Request to get session key and open id error: ${e.message}`));
				return;
			});
	});
}

/**
 * Initialize the module.
 * @param  {string} appid     App id of mini-program
 * @param  {string} appsecret App secret of mini-program
 * @param {string} dbpath SQLite3 DB's path
 * @param  {string} redispass (optional) Redis pass if you set password for your redis db
 * @param {number} tokenTTL Time-to-live in seconds. When time is up, token is not valid anymore.
 * @return {object}           mpauthx object that has functions ready to be called.
 */
function init(appid, appsecret, dbpath, redispass=null, tokenTTL=259200) {
	valproxy.appid = appid;
	valproxy.appsecret = appsecret;
	valproxy.dbpath = dbpath;
	valproxy.redispass = redispass;
	valproxy.tokenTTL = tokenTTL;

	// create a redis client
	if (valproxy.redispass != null) {
		redisClient = redis.createClient( { password: valproxy.redispass });
	}
	else {
		redisClient = redis.createClient();
	}

	return {
		isTokenValid: isTokenValid,
		authorize: authorize
	};

	// create db
	db = new SQLITE3.Database(dbpath);
}

module.exports = init;