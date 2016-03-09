var Base = require('mocha').reporters.Base,
  fs = require('fs'),
  cursor = Base.cursor,
  color = Base.color,
  path = require('path'),
  filename = process.env.MOCHA_FILE || 'mocha.json';

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
var testsRail = []
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

function BambooTestrailReporter(runner, options) {
  var self = this;
  Base.call(this, runner);

  var tests = []
    , failures = []
    , passes = []
    , skipped = [];

  if (options && options.reporterOptions && options.reporterOptions.output) {
    filename = options.reporterOptions.output;
  }

  runner.on('start', function() {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename); // if we die at some point, we don't want bamboo to have a stale results file lying around...      
    }
  });

  runner.on('test end', function(test){
    tests.push(test);
  });

  runner.on('pending', function(test) {
    skipped.push(test);
  });

  runner.on('pass', function(test){
    info = test.ctx.mochaOptions
    browser = test.ctx.browser

    if(test.ctx.case_id && test.ctx.case_id>0){
      var data = {}
      data.case_id = test.ctx.case_id
      data.name = test.title
      data.state = test.state
      data.duration = test.duration
      testsRail.push(data)
    }
    passes.push(test);
    console.log(test.state + " " + test.title)
  })

  runner.on('fail', function(test, err){
    browser = test.ctx.browser
    info = test.ctx.mochaOptions
    if(test.ctx.case_id && test.ctx.case_id>0){
      var data = {}
      data.case_id = test.ctx.case_id
      data.name = test.title
      data.state = test.state
      data.duration = test.duration
      data.err = err
      testsRail.push(data)
    }
    failures.push(test);
    console.log(test.state + " " + test.title)
  })

  runner.on('end', function(){
    // TestRail
    fs.writeFileSync(path.join(process.cwd(), 'reports')+"/"+new Date().toString().slice(0,15) + " " + Date.now() + ".json", JSON.stringify({info: info, browser: browser, tests:testsRail}, null, 4))
    console.log("File written to " + new Date().toString().slice(0,15) + " " + Date.now() + ".json")
    testsRail = []

    // Bamboo
    var obj = {
        stats: self.stats
      , failures: failures.map(clean)
      , passes: passes.map(clean)
      , skipped: skipped.map(clean)
    };

    fs.writeFileSync(filename, JSON.stringify(obj, null, 2), 'utf-8');
  })
}
