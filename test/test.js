'use strict';

var mongodb     = require('mongodb');
var MongoClient = mongodb.MongoClient;
var Server      = mongodb.Server;
var assert      = require('assert');

var mongoProfiler = require('..');

describe("mongodb-profiler", function() {
  var mongoClient;
  var profiler;
  var db;


  before(function(done) {
    mongoClient = new MongoClient(new Server("localhost", 27017));
    mongoClient.open(done);
    db = mongoClient.db("test");
  });

  after(function(done) {
    mongoClient.close(done);
  });

  describe('profile-all', function() {
    beforeEach(function() {
      profiler = mongoProfiler({ db: db, profile: { all: true } });
    });

    afterEach(function() {
      profiler.stop();
    });

    it('should profile updates', function(done) {
      profiler.on("profile", function(profile) {
        if(profile.ns === 'test.profiler_test' && profile.op === 'update') done();
      });

      db.collection('profiler_test').update({ a:1 }, { b:1 }, { upsert:true }, function(err) {
        if (err) return done(err);
      });

    });

    it('should profile queries', function(done) {
      profiler.on("profile", function(profile) {
        if(profile.ns === 'test.profiler_test' && profile.op === 'query') done();
      });

      db.collection('profiler_test').find({ a:1 }).toArray(function(err) {
        if (err) return done(err);
      });

    });

  });

  describe('profile-slow', function() {
    beforeEach(function() {
      profiler = mongoProfiler({ db: db, profile: { slow: 100 } });
    });

    afterEach(function() {
      profiler.stop();
    });


    it('should profile really slow queries', function(done) {
      profiler.on("profile", function(profile) {
        if(profile.ns === 'test.profiler_test' && profile.op === 'query') done();
      });

      db.collection('profiler_test').update({ a:1 }, { b:1 }, { upsert:true }, function(err) {
        if (err) return done(err);

        /* This is a shocker of a query! */
        db.collection('profiler_test').find({ $where: "sleep(10);" }).limit(3).toArray(function(err) {
          if (err) return done(err);
        });

      });

    });


  });

  describe('profile-passive', function() {
    beforeEach(function() {
      profiler = mongoProfiler({ db: db });
    });

    afterEach(function() {
      profiler.stop();
    });

    it('should profile really slow queries', function(done) {
      profiler.on("profile", function(profile) {
        if(profile.ns === 'test.profiler_test' && profile.op === 'query') done();
      });

      db.collection('profiler_test').update({ a:1 }, { b:1 }, { upsert:true }, function(err) {
        if (err) return done(err);

        /* This is a shocker of a query! */
        db.collection('profiler_test').find({ $where: "sleep(10);" }).limit(3).toArray(function(err) {
          if (err) return done(err);
        });

      });

    });

  });



});
