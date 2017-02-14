/**
 * @class kad-listen/listener
 */

'use strict';

var assert = require('assert');
var kad = require('kad');

const LISTEN_TIMEOUT=60000
const PRUNE_INTERVAL=3600000

/**
 * Creates a listener
 * @constructor
 * @param {Object} options
 */
function Listener(options) {
  if (!(this instanceof Listener)) {
    return new Listener(options);
  }

  this._transport=options.transport;
  this._logger=options.logger;
  this._router=options.router;
  this._contact=options.contact;
  this._interval=options.interval || LISTEN_TIMEOUT;

  this._localCallbacks={};
  this._localTimers={};
  this._remoteContacts={};

  this._pruneTimer=setInterval(this.prune, PRUNE_INTERVAL);
}

/**
 * Listen to a specific remote key--broadcasts regular LISTEN messages
 * #on
 * @param {String} key
 * @param {Function} callback
 */
Listener.prototype.on = function(key, callback) {
  assert(typeof key === 'string', 'Invalid key supplied');
  assert(typeof callback === 'function', 'Invalid callback supplied');
  if (!this._localCallbacks[key]) this._localCallbacks[key]=[]
  this._localCallbacks[key].push(callback)
  if (!this._localTimers[key]) {
    this.sendListenMessage(key)
    this._localTimers[key]=setInterval(this.sendListenMessage,this._interval,key)
  }
};

/**
 * Stop listening to a specific key (or all keys if no key provided)
 * #off
 * @param {String} key
 */
Listener.prototype.off = function(key) {
  if (key) {
    if (this._localCallbacks.hasOwnProperty(key)) {
      delete this._localCallbacks[key]
    }
    if (this._localTimers.hasOwnProperty(key)) {
      this._localTimers[key].clearInterval()
      delete this._localTimers[key]
    }
  } else {
    for (var key in this._localTimers) {
      if (this._localTimers.hasOwnProperty(key)) this.off(key)
    }
  }

};

/**
 * Add contact and key to listener registration table
 * #listen
 * @param {String} key
 * @param {Object} contact
 */
Listener.prototype.listen = function(key, contact) {
  assert(typeof key === 'string', 'Invalid key supplied');
  assert(typeof contact === 'object', 'Invalid contact supplied');

  if (!this._remoteContacts[key]) this._remoteContacts[key]={}
  this._remoteContacts[key][contact.nodeID]={
    contact:contact,
    expires:Date.now()+LISTEN_TIMEOUT*1.5
  }
};

/**
 * Check if an item's key is in the table and call callback or notify contact
 * #check
 * @param {Object} item
 */
Listener.prototype.check = function(item) {
  if (this._localCallbacks.hasOwnProperty(item.key)) {
    for (var cbi in this._localCallbacks[item.key]) {
      let cb=this._localCallbacks[item.key][cbi]
      if (typeof(cb)==='function') cb(item)
    }
  }

  if (this._remoteContacts.hasOwnProperty(item.key)) {
    for (var nodeID in this._remoteContacts[item.key]) {
      if (this._remoteContacts[item.key][nodeID].expires < Date.now()) {
        sendNotifyMessage(item, this._remoteContacts[item.key][nodeID].contact)
      } else {
        delete this._remoteContacts[item.key][nodeID];
      }
    }
  }

};

/**
 * Delete all expired listeners
 * #prune
 */
Listener.prototype.prune = function() {
  for (var key in this._remoteContacts) {
    if (this._remoteContacts.hasOwnProperty(key)) {
      for (var nodeID in this._remoteContacts[key]) {
        if (this._remoteContacts[key].hasOwnProperty(nodeID) &&
            (this._remoteContacts[key][nodeID].expires > Date.now())) {
          delete this._remoteContacts[key][nodeID];
        }
      }
      if (Object.keys(this._remoteContacts[key]).length === 0) {
        delete this._remoteContacts[key];
      }
    }

  }

};

/**
 * Sends a LISTEN message to a specific key
 * #sendListenMessage
 * @param {String} key
 */
Listener.prototype.sendListenMessage = function(key) {
  let that=this;
  this.router.findNode(key, function(err, contacts) {
    if (err) {
      that.logger.warn('failed to find nodes, reason: %s', err.message);
    }

    async.each(contacts, function(contact, done) {
      var message = new kad.Message({
        method: 'LISTEN',
        params: { key: key, contact: that._contact }
      });
      that.logger.info('sending LISTEN message to %j', contact);
      that.transport.send(contact, message, done);
    }, function(err) {
      if (err) {
        that.logger.error(
          'Failed to store value at one or more nodes, reason:',
          err.message
        );
      }
    });
  });
};

/**
 * Sends a STORE message to a specific contact
 * #sendNotifyMessage
 * @param {Object} item
 * @param {Object} contact
 */
Listener.prototype.sendNotifyMessage = function(item,contact) {
  var message = new kad.Message({
    method: 'STORE',
    params: { item: item, contact: this._contact }
  });
  this.logger.info('sending STORE message to %j', contact);
  this.transport.send(contact, message, done);
};

module.exports = Listener;
