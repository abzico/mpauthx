# mpauthx

Token giver for Users logged in to WeChat Mini-program. Based on top of redis for fast token checking/access, and sqlite3 for flexible user db storage.

# Features

* Generate and assign an access token to each user for attached project (`sku`) supporting multiple devices
* Provide functionality to initially and firstly register user via our user database (sqlite) via `authorize(code, encryptedData, iv)` function
* Provide functionality to refresh access token only if user knows its own user id (either openId or unionId) via `refreshToken()` function
* Each access token comes with configurabe TTL (time-to-live) thus when it's expired, such token will be deleted from redis db automatically.

# How-To

Install `mpauthx` by executing the following

```
npm install --save mpauthx
```

Then in code, you do this

```javascript
let sqlite3DBInstance = ...; // create sqlite3 db instance here

const mpauthx = require('mpauthx')(
	'<your app-id here>', // app-id
  '<your app-secret here>', // app-secret
  '<your sku here>', // sku
	sqlite3DBInstance, 	// your instance of sqlite3
	null, // redis pass (if any), if none pass null
	259200 // TTL for token, in seconds
);
```

> See _Sqlite3 User Table Schema_ to have a proper sqlite3 table to work with this module.

Call `mpauthx.authorize(code, encryptedData, iv)` whenever your end-point needs to authorize WeChat user and give user a token so user can save such token for subsequent API calls later in the future.

Call `mpauthx.refreshToken(userId)` whenever you want to refresh token. If previously assigned token to such user exists, then it will be invalidated before generating and assigning new one. Client side should persist such token value and make use of it first to see if it is still not expired.

as well

Call `mpauthx.isTokenValid(token)` whenever you need to check whether such specified token is valid (thus exist in redis db) or not.

## When You're Done

Call `mpauthx.close()` to properly close redis client connection when you're done with your code.

# Sqlite3 User Table Schema

Your sqlite3 database needs to have `user` table with following schema

```
CREATE TABLE user(
	openId text primary key not null, 
	city text, 
	country text, 
	gender integer, 
	language text, 
	nickName text, 
	province text
);
```

**Primarily** focus on `openId` as a requirement to have.

## OpenId & UnionId

Also `openId` is umbrella word to represent either openid or unionid. If your app has been setup to work with unionid, then mpauthx will automatically use that instead of openid. This will allow you to peek database for users related to all apps across your company's WeChat Official Account.

# API

## Functions

* `isTokenValid(token)` - check whether token is valid

	Return `Promise` object.  
	`token` is `string` for specified token to check whether such token is valid or not. This means it's valid when it still exists and has exact match.

* `authorize(code, encryptedData, iv)` - authorize WeChat user after logged in mini-program

	Return `Promise` object. Success will contain success object in the following structure  

	```javascript
	{
	    status_code: <number>,	// see core/constants.js or mpauthx.constants for all statuses
		status_message: <string>,
		response: <string>	// returned generated token for such user
	}
	```

	Otherwise failure will contains `Error` object with `code` as additional property. See `core/constants.js` or `mpauthx.constants` for all status code.

	`code` can be acquired via [wx.login API](https://mp.weixin.qq.com/debug/wxadoc/dev/api/api-login.html#wxloginobject).

	`encryptedData` and `iv` can be acquired via [wx.getUserInfo API](https://mp.weixin.qq.com/debug/wxadoc/dev/api/open.html#wxgetuserinfoobject).

* `refreshToken(userId)` - request to refresh token for input user id (which represents either openid or unionid)

    Return `Promise` object. Success will contain a new generated and assigned access token for such user.

    ```javascript
    {
        status_code: <number>,
        status_message: <sring>,
        response: <string> // your new access token
    }
    ```

    Otherwise failure will contains `Error` object.

    `userId` as input should be known from client side as they should persist such value and always try to use such access token in API request before automatically detected by API if it needs to be re-generated.

* `extractOpenId(token)` - extract openId part of specified token

	Return openId part of specified token.
    Note that openId is umbrella word to represent either openId or unionId. See OpenId & UnionId.

* `extractSku(token)` - extract sku part of specified token

  Return sku part of specified token.

* `close()` - close redis connection

## Properties

* `constants` - expose constants mainly used for status code returned from API especially `authorize`.

# Roadmap

* [ ] Create a middleware for flexibly plug-in of non-redis DB checking for user record. Currently it's fixed to be used with redis.

# License

[Apache License 2.0](https://github.com/abzico/mpauthx/blob/master/LICENSE), [abzi.co](https://abzi.co)  
