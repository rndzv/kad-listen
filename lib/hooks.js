/**
 * @module kad-listen/hooks
 */

'use strict';

var kad = require('kad');

function listenProtocol(listener) {
  return function(params, callback) {
    listener.listen(params.key,params.contact)
    callback(null,params);
  }
}

function listenStore(listener) {
  return function(message,err) {
    listener.check(message.params.item)
  }
}

module.exports.receive = function(listener) {
  return kad.hooks.protocol({
    LISTEN:listenProtocol(listener)
  })
}

module.exports.store = listenStore
