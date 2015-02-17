'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Profiler(options) {
  EventEmitter.call(this);
  this.options = options || {};

  var db = this.db = options.db;

  if (options.profile) {
    this._enableProfiling(options.profile);
  }
  var collection = db.collection("system.profile");
  this.cursor = collection.find({ ts: { $gte: new Date() } }, null, {
    tailable: true,
    batchSize: 10,
    tailableRetryInterval: 200,
    await_data: true,
    numberOfRetries: -1
  });

  this._open = true;
  this._more();
}

util.inherits(Profiler, EventEmitter);

Profiler.prototype._more = function() {
  if (!this._open) return;
  var self = this;

  this.cursor.nextObject(function(err, profile) {
    if (!self._open) return;

    if (err) {
      if (err.message === 'Connection Closed By Application') return;

      self.emit("error", err);
    } else {
      if (!profile) {
        setTimeout(self._more.bind(self), 20);
        return;
      }
      self._handleProfileItem(profile);
    }

    setTimeout(self._more.bind(self), 1);
  });
};

Profiler.prototype._handleProfileItem = function(profile) {
  if (!profile) return; // Ignore nulls? Why are they here?
  var ns = profile.ns;

  if (!ns || ns.match(/\.system\.profile$/)) return;
  if (ns.indexOf(this.db.databaseName + ".") !== 0) return; // Ignore other databases

  var collection = ns.substring((this.db.databaseName + ".").length);
  profile.collection = collection;
  this.emit("profile", profile);
};

Profiler.prototype._enableProfiling = function(profilingOptions) {
  var self = this;

  function cb(err, oldValues) {
    if (err) return self.emit("error", err);
    self._oldProfilingValues = { originalProfile: oldValues.was, originalSlowMs: oldValues.slowms };
  }

  if (profilingOptions.all) {
    self._changeProfiling(2, undefined, cb);
  } else if (profilingOptions.slow) {
    self._changeProfiling(1, profilingOptions.slow, cb);
  }

};

Profiler.prototype._revertProfiling = function(callback) {
  var old = this._oldProfilingValues;
  var newValue = this.options.disableProfilerOnStop ? 0 : old && old.originalProfile;
  var slowMs = old && old.originalSlowMs;

  if (!newValue) {
    if (callback) callback();
    return;
  }

  var self = this;

  this._changeProfiling(newValue, slowMs, function(err) {
    if (callback) return callback(err);
    if (err) return self.emit("error", err);
  });
};


Profiler.prototype._changeProfiling = function(profilingLevel, slowMs, callback) {
  var cmd = { profile: profilingLevel };
  if (typeof slowMs === 'number') {
    cmd.slowms = slowMs;
  }

  var self = this;
  this.db.command(cmd, function(err, oldValues) {
    if (err) return callback(err);

    self.emit("profiling.change", {
      now: {
        profile: profilingLevel,
        slowms: slowMs
      },
      was: {
        profile: oldValues.was,
        slowms: oldValues.slowms
      }
    });

    callback(null, oldValues);
  });

};

Profiler.prototype.explainProfile = function (profile, callback) {
  if (profile.op !== 'query') return callback();
  if (!profile.collection || profile.collection === 'system.indexes') return callback();
  if (profile.query && profile.query.$explain) return callback(); // Don't profile explain plan queries

  var query = profile.query;
  var sort;

  if(query.$explain) return callback();
  if(query.$query) {
    sort = query.orderby;
    query = query.$query;
  }

  var cursor = this.db.collection(profile.collection).find(query);
  if (sort) {
    cursor = cursor.sort(sort);
  }

  cursor.explain(function(err, result) {
    cursor.close();
    callback(err, result);
  });
};

Profiler.prototype.stop = function(callback) {
  this._open = false;
  this._revertProfiling(callback);
};

function profiler(options) {
  return new Profiler(options);
}

module.exports = profiler;
