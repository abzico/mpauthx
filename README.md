# mpauthx

Token giver for Users logged in to WeChat Mini-program. Based on top of redis for fast token checking/access, and sqlite3 for flexible user db storage.

# How-To

## Environment Variables

Set up the following environment variables to get it working

* `MPAUTHX_REDISPASS`	- (optional) if you set password for redis db
* `MPAUTHX_APPID` - app id for your Mini-program
* `MPAUTHX_APPSECRET` - app secret for your Mini-program

## Sqlite3 User Schema

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

## Test

There're test-cases inside `tests/` directory. You can take a look.

It has a testing sqlite3 dabased namedly `test-db`, you can even take a peek of its structure inside.

Start testing by executing `npm test`.

# License

[Apache License 2.0](https://github.com/abzico/mpauthx/blob/master/LICENSE), [abzi.co](https://abzi.co)  