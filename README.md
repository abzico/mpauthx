# mpauthx

Token giver for Users logged in to WeChat Mini-program. Based on top of redis for fast token checking/access, and sqlite3 for flexible user db storage.

# How-To

Install `mpauthx` by executing the following

```
npm install --save mpauthx
```

Then in code, you do this

```javascript
const mpauthx = require('mpauthx')(
	'<your app-id here>', // app-id
	'<your app-secret here>', // app-secret
	'./test-db.db', 	// sqlite3 db path
	null, // redis pass (if any), if none pass null
	259200 // TTL for token, in seconds
);
```

> See _Sqlite3 User Table Schema_ to have a proper sqlite3 table to work with this module.

Call `mpauthx.authorize(code, encryptedData, iv);` whenever your end-point needs to authorize WeChat user logged in from mini-program; treat that `code`, `encryptedData`, and `iv` are information you need to supply. You can get them from [wx.getUserInfo](https://mp.weixin.qq.com/debug/wxadoc/dev/api/open.html#wxgetuserinfoobject).

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

Primarily focus on `openId` as a requirement to have.

# Test

There're test-cases inside `tests/` directory. You can take a look.

It has a testing sqlite3 dabased namedly `test-db.db`, you can even take a peek of its structure inside.

Start testing by executing `npm test`.

# License

[Apache License 2.0](https://github.com/abzico/mpauthx/blob/master/LICENSE), [abzi.co](https://abzi.co)  