'use strict';

var fs = require('graceful-fs');
var mkdirp = require('mkdirp');

var stat = require('../fileOperations/stat');
var closeFd = require('../fileOperations/closeFd');

function writeDir(writePath, file, written) {
  mkdirp(writePath, file.stat.mode, onMkdirp);

  function onMkdirp(mkdirpErr) {
    if (mkdirpErr) {
      return written(mkdirpErr);
    }

    fs.open(writePath, 'r', onOpen);
  }

  function onOpen(openErr, fd) {
    if (openErr) {
      return closeFd(openErr, fd, written);
    }

    if (!file.stat) {
      return closeFd(null, fd, written);
    }

    stat(fd, file, onStat);
  }

  function onStat(statErr, fd) {
    closeFd(statErr, fd, written);
  }
}

module.exports = writeDir;
