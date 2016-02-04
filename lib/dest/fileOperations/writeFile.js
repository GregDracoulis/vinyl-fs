'use strict';

var fs = require('graceful-fs');
var isBuffer = require('is-buffer');

/*
  Custom writeFile implementation because we need access to the
  file descriptor after the write is complete.
  Most of the implementation taken from node core.
 */
function writeFile(path, data, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (!isBuffer(data)) {
    callback(new TypeError('Data must be a Buffer'));
    return;
  }

  if (!options) {
    options = {};
  }

  // Default the same as node
  var mode = options.mode || parseInt('0666', 8);
  var flag = options.flag || 'w';
  var position = /a/.test(flag) ? null : 0;

  fs.open(path, flag, mode, onOpen);

  function onOpen(err, fd) {
    if (err) {
      return onComplete(err);
    }

    fs.write(fd, data, 0, data.length, position, onComplete);

    function onComplete(err) {
      callback(err, fd);
    }
  }
}

module.exports = writeFile;
