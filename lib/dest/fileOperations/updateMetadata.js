'use strict';

var fs = require('graceful-fs');
var assign = require('object-assign');

var isOwner = require('./isOwner');
var getModeDiff = require('./getModeDiff');
var getTimesDiff = require('./getTimesDiff');

function updateMetadata(fd, file, callback) {

  fs.fstat(fd, onStat);

  function onStat(err, stat) {
    if (err) {
      return callback(err, fd);
    }

    // Check if mode needs to be updated
    var modeDiff = getModeDiff(stat.mode, file.stat.mode);

    // Check if atime/mtime need to be updated
    var timesDiff = getTimesDiff(stat, file.stat);

    // Set file.stat to the reflect current state on disk
    assign(file.stat, stat);

    // Nothing to do
    if (!modeDiff && !timesDiff) {
      return callback(null, fd);
    }

    // Check access, `futimes` and `fchmod` only work if we own the file,
    // or if we are effectively root.
    if (!isOwner(stat)) {
      return callback(null, fd);
    }

    if (modeDiff) {
      return mode();
    }
    times();

    function mode() {
      var mode = stat.mode ^ modeDiff;

      fs.fchmod(fd, mode, onFchmod);

      function onFchmod(fchmodErr) {
        if (!fchmodErr) {
          file.stat.mode = mode;
        }
        if (timesDiff) {
          return times(fchmodErr);
        }
        callback(fchmodErr, fd);
      }
    }

    function times(fchmodErr) {
      fs.futimes(fd, timesDiff.atime, timesDiff.mtime, onFutimes);

      function onFutimes(futimesErr) {
        if (!futimesErr) {
          file.stat.atime = timesDiff.atime;
          file.stat.mtime = timesDiff.mtime;
        }
        callback(fchmodErr || futimesErr, fd);
      }
    }
  }
}

module.exports = updateMetadata;
