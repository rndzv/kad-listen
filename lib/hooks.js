/**
 * @module kad-listen/hooks
 */

'use strict';

var kad = require('kad');

function listenProtocol(params, callback) {
  callback(null,params);
}

function listenStore(listener) {
  return function(message,err) {
    listen.store(message.params.item)
  }
}

module.exports.receive = kad.hooks.protocol({
  LISTEN:listenProtocol
})

module.exports.store = listenStore
