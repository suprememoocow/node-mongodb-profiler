# mongodb-profiler

Emits mongodb profiling events. Tails the system.profile table and can perform EXPLAIN PLANs against the profile entries.

```shell
npm install mongodb-profiler --save
```

```javascript
var mongodb       = require('mongodb');
var MongoClient   = mongodb.MongoClient;
var mongoProfiler = require('mongodb-profiler');

mongoClient = new MongoClient(new Server("localhost", 27017));
mongoClient.open(function(err) {
  if (err) ...

  var db = mongoClient.db("test");

  // Profile ALL events. Do not do this against a production database!
  var profiler = mongoProfiler({ db: db, profile: {
      all: true
    }});

  // ... or ...

  // Profile all events that take longer than 100ms
  // Good for production
  var profiler = mongoProfiler({ db: db, profile: {
      slow: 100
    }});

  // ... or ...

  // Passive profiling - does not change the profiling level of the Mongo server
  // Good for production
  var profiler = mongoProfiler({ db: db });

  // Do something with the profiling events
  profiler.on("profile", function(profile) {

    // Do something with the profiling information
    // If you want an EXPLAIN PLAN, do this
    profiler.explainProfile(profile, function(err, plan) {
      // For queries, you'll have a plan, otherwise null
    });

  });

  // Stop the profiler with `stop`. It will revert the profiler settings
  // to the original values
  setTimeout(function() {
    profiler.stop();
  }, 10000);

});

```


# Licence

License
The MIT License (MIT)

Copyright (c) 2014, Andrew Newdigate

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.



