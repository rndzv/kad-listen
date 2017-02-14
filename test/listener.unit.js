'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var utils = kad.utils;
var constants = kad.constants;
var KNode = kad.Node;
var AddressPortContact = kad.contacts.AddressPortContact;
var Bucket = kad.Bucket;
var EventEmitter = require('events').EventEmitter;
var Logger = kad.Logger;
var transports = kad.transports;
var Item = kad.item;

function FakeStorage() {
  this.data = {};
}

FakeStorage.prototype.get = function(key, cb) {
  if (!this.data[key]) {
    return cb(new Error('not found'));
  }
  cb(null, this.data[key]);
};

FakeStorage.prototype.put = function(key, val, cb) {
  this.data[key] = val;
  cb(null, this.data[key]);
};

FakeStorage.prototype.del = function(key, cb) {
  delete this.data[key];
  cb(null);
};

FakeStorage.prototype.createReadStream = function() {
  return new EventEmitter();
};
