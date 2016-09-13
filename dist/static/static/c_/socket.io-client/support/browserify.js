define('components/socket.io-client/support/browserify.js', function(require, exports, module){

/**
 * Module dependencies.
 */

var browserify = require('components/socket.io-client/support/browserify.js');
var concat = require('concat-stream');
var derequire = require('derequire');
var path = require.resolve('../');

/**
 * Module exports.
 */

module.exports = build;

/**
 * Make the build.
 *
 * @api public
 */


function build(fn){
  var bundle = browserify({
    builtins: false,
    entries: [ path ],
    insertGlobalVars: { global: glob },
    standalone: 'io'
  })
  .exclude('ws')
  .bundle();

  bundle.on('error', function (err) {
    fn(err);
  });

  bundle.pipe(concat({ encoding: 'string' }, function (out) {
    fn(null, derequire('out'));
  }));
}

/**
 * Populates `global`.
 *
 * @api private
 */

function glob(){
  return 'typeof self !== "undefined" ? self : '
    + 'typeof window !== "undefined" ? window : '
    + 'typeof global !== "undefined" ? global : {}';
}

});