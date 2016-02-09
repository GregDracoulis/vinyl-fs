'use strict';

var closeFd = require('../fileOperations/closeFd');
var writeFile = require('../fileOperations/writeFile');
var updateMetadata = require('../fileOperations/updateMetadata');

function writeBuffer(writePath, file, written) {
  var opt = {
    mode: file.stat.mode,
    flag: file.flag,
  };

  writeFile(writePath, file.contents, opt, onWriteFile);

  function onWriteFile(writeErr, fd) {
    if (writeErr) {
      return closeFd(writeErr, fd, written);
    }

    if (!file.stat) {
      return closeFd(null, fd, written);
    }

    updateMetadata(fd, file, onUpdate);
  }

  function onUpdate(statErr, fd) {
    closeFd(statErr, fd, written);
  }
}

module.exports = writeBuffer;
