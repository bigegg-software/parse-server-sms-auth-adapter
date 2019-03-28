"use strict";

let Parse = require('parse/node').Parse; // Returns a promise that fulfills iff this user id is valid.

let options = {};


async function validateAuthData(authData) {
    let mobile = authData.id;
    let mobilePrefix = authData.mobilePrefix;
    let smsCode = authData.smsCode;

    let allCodeInfo = await options.getFromStorage(mobile, mobilePrefix);
    let now = Date.now();
    for (let ci of allCodeInfo) {
        if (now < ci.expiresAt && ci.code == smsCode)
            return null;

    }
    return Promise.reject(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'bad code'));
}


async function validateAppId() {//useless in this context, but required by Parse server
  return null;
}


async function requireSmsCode(mobile, mobilePrefix) {
    //check if need cd
    let allSent = await options.getFromStorage(mobile, mobilePrefix)
    if (allSent.length > 0) {
        let lastSend = allSent[0];
        let { waitUntil } = lastSend;
        let needMoreWait =  waitUntil  - Date.now();
        if (needMoreWait > 0) {
            return {
                ok: false,
                inCooldown: true,
                waitFor: needMoreWait
            }
        }
    }

    let code = await options.genCodeAndSend(mobile, mobilePrefix);
    let now = Date.now();
    let waitUntil = now + options.cooldownMs;
    let expiresAt = now + options.smsExpireMs;
    options.putToStorage(mobile, mobilePrefix, {
        code,
        waitUntil,
        expiresAt
    });

    return {
        ok: true,
        waitFor: options.cooldownMs
    }
}

module.exports = _option => {
    options = Object.freeze(_option);
    return {
      validateAppId,
      validateAuthData,
      requireSmsCode
    }
};
