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
      fs.fchmod(fd, mode, function(err) {
        if (!err) {
          file.stat.mode = mode;
          file.stat.ctime.setTime(Date.now());
        }
        if (timesDiff) {
          return times(err);
        }
        callback(err, fd);
      });
    }

    function times(err1) {
      fs.futimes(fd, timesDiff.atime, timesDiff.mtime, function(utimesErr) {
        if (!utimesErr) {
          file.stat.atime = timesDiff.atime;
          file.stat.mtime = timesDiff.mtime;
          file.stat.ctime.setTime(Date.now());
        }
        callback(err1 || utimesErr, fd);
      });
    }
  }
}

module.exports = updateMetadata;
