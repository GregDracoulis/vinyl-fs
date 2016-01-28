'use strict';

var fs = require('graceful-fs');

function writeFile(path, data, options, callback) {
  // Default the same as node
  var mode = options.mode || parseInt('0666', 8);
  var flag = options.flag || 'w';
  // TODO: test for 'a' flag
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
