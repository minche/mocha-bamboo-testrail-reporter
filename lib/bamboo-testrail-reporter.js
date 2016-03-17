var Base = require('mocha').reporters.Base,
  fs = require('fs'),
  cursor = Base.cursor,
  color = Base.color,
  path = require('path'),
  filename = process.env.MOCHA_FILE || 'mocha.json'
  filenameTR = process.env.MOCHA_TR_FILE || 'mocha-testrail.json';

/**
 * Expose `BambooTestrailReporter`.
 */

exports = module.exports = BambooTestrailReporter

/**
 * Initialize a new `BambooTestrailReporter` reporter.
 *
 * @param {Runner} runner
 * @param {Object} options
 * @api public
 */

var info = {}
var browser = {}

function clean(test) {
  var o = {
      title: test.title
    , fullTitle: test.fullTitle()
    , duration: test.duration
  }
  if (test.hasOwnProperty("err")) {
    o.error = test.err.stack.toString();
  }
  return o;
}

function cleanTR(suiteTests, test) {
  if (/TR-([0-9]*)/.exec(test.title) && !test.pending) {
    var status_id = 3;
    if (test.state === "passed") {
      status_id = 1;
    } else if (test.state === "failed") {
      status_id = 5;
    } else {
      status_id = 2;
    }
    var case_id = parseInt(/TR-([0-9]*)/.exec(test.title)[1]);

    var o = {
        custom_comment: test.title
      , case_id: case_id
      , status_id: status_id
      , suite_id: test.suite_id
    }

    if (test.duration) {
      var duration = Math.ceil(test.duration/1000);
      if (duration === 0) {
        o.elapsed = "1s";
      } else {
        o.elapsed = duration + "s";
      }
    }
    if (test.hasOwnProperty("err")) {
      o.comment = test.err.message.toString();
    }
    suiteTests.push(o);
  }
  
  return suiteTests;
}

function BambooTestrailReporter(runner, options) {
  var self = this;
  var indents = 0;
  var n = 0;

  function indent() {
    return Array(indents).join('  ');
  }
  Base.call(this, runner);

  var tests = []
    , failures = []
    , passes = []
    , skipped = []
    , blocked = []
    , suiteTests = [];

  if (options && options.reporterOptions && options.reporterOptions.output) {
    filename = options.reporterOptions.output;
  }
  runner.on('start', function() {
    console.log();
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);     
    }

    if (fs.existsSync(filenameTR)) {
      fs.unlinkSync(filenameTR);   
    }
    info = runner.suite.ctx.mochaOptions;
    browser = runner.suite.ctx.browser;
    var suiteID;

    function recursiveIteration(object, callback) {
      if (object.hasOwnProperty('suites')) {
        if (/TR-SID-([0-9]*)/.exec(object.title)) {
          suiteID = parseInt(/TR-SID-([0-9]*)/.exec(object.title)[1]);
        }
        if (object['suites'].length > 0){
          object.suites.forEach(function(suite) {
            recursiveIteration(suite, callback);
          })
          callback(object, 'suites', suiteID);
        } else {
          callback(object, 'suites', suiteID);
        }
      }
    }

    function test_cb(suite, property, suiteID){
      if (suiteID) {
        suiteTests = suiteTests.concat(suite.tests.map(function(test) {
          test.suite_id = suiteID;
          return test;
        }));
      }
    }

    recursiveIteration(runner.suite, test_cb);
    console.log('got tests', suiteTests.length);
  });

  runner.on('suite', function(suite) {
    ++indents;
    console.log(color('suite', '%s%s'), indent(), suite.title);  
  })

  runner.on('suite end', function() {
    --indents;
    if (indents === 1) {
      console.log();
    }
  });

  runner.on('test end', function(test){
    tests.push(test);
  });

  runner.on('pending', function(test) {
    var fmt = indent() + color('pending', '  - %s');
    console.log(fmt, test.title);
    skipped.push(test);
  });

  runner.on('pass', function(test) {
    var fmt;
    if (test.speed === 'fast') {
      fmt = indent()
        + color('checkmark', '  ' + Base.symbols.ok)
        + color('pass', ' %s');
      cursor.CR();
      console.log(fmt, test.title);
    } else {
      fmt = indent()
        + color('checkmark', '  ' + Base.symbols.ok)
        + color('pass', ' %s')
        + color(test.speed, ' (%dms)');
      cursor.CR();
      console.log(fmt, test.title, test.duration);
    }
    passes.push(test);
  });

  runner.on('fail', function(test) {
    cursor.CR();
    console.log(indent() + color('fail', '  %d) %s'), ++n, test.title);
    failures.push(test);
  });

  runner.on('end', function(){
    var obj = {
        stats: self.stats
      , failures: failures.map(clean)
      , passes: passes.map(clean)
      , skipped: skipped.map(clean)
    };

    var TRtests = suiteTests.reduce(cleanTR, []);

    fs.writeFileSync(filenameTR, JSON.stringify({stats: obj.stats, info: info, browser: browser, tests:TRtests}, null, 4))
    fs.writeFileSync(filename, JSON.stringify(obj, null, 2), 'utf-8');
  })
}
