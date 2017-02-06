/**
 * @class kad-listen/listener
 */

'use strict';

var kad = require('kad');

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
  this._interval=options.interval || 5000;

  this._table={};
}

/**
 * Listen to a specific key
 * #on
 * @param {String} key
 * @param {Function} callback
 */
Listener.prototype.on = function(key, callback) {
  this._table[key]={
    callback:callback,
    timer:setInterval(this.sendListenMessage,this._interval,key)
  }
};

/**
 * Stop listening to a specific key
 * #off
 * @param {String} key
 */
Listener.prototype.off = function(key) {
  if (this._table.hasOwnProperty(key)) {
    if (this._table.key.timer) {
      this._table.key.timer.clearInterval()
    }
    delete this._table[key]
  }
};

/**
 * Sends a single message to listen
 * #sendListenMessage
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

module.exports = Listener;
