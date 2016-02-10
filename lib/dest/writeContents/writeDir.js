'use strict';

var fs = require('graceful-fs');
var mkdirp = require('mkdirp');

var closeFd = require('../fileOperations/closeFd');
var updateMetadata = require('../fileOperations/updateMetadata');

function writeDir(writePath, file, written) {
  mkdirp(writePath, file.stat.mode, onMkdirp);

  function onMkdirp(mkdirpErr) {
    if (mkdirpErr) {
      return written(mkdirpErr);
    }

    fs.open(writePath, 'r', onOpen);
  }

  function onOpen(openErr, fd) {
    // If we don't have access, just move along
    if (isInaccessible(openErr)) {
      return closeFd(null, fd, written);
    }

    if (openErr) {
      return closeFd(openErr, fd, written);
    }

    updateMetadata(fd, file, onUpdate);
  }

  function onUpdate(statErr, fd) {
    closeFd(statErr, fd, written);
  }
}

function isInaccessible(err) {
    if (!err) {
      return false;
    }

    if (err.code === 'EACCES') {
      return true;
    }

    return false;
  }

module.exports = writeDir;
