'use strict';

var fs = require('graceful-fs');
var assign = require('object-assign');
var isValidDate = require('vali-date');

// TODO shared module
// TODO include sticky/setuid/setgid, i.e. 7777?
var MASK_MODE = parseInt('0777', 8);

function stat(fd, file, callback) {

  fs.fstat(fd, onStat);

  function onStat(err, stat) {
    if (err) {
      return callback(err, fd);
    }

    // Check if mode needs to be updated
    var modeDiff = 0;
    if (typeof file.stat.mode === 'number') {
      modeDiff = (file.stat.mode ^ stat.mode) & MASK_MODE;
    }

    // Check if atime/mtime need to be updated
    var timesDiff = null;
    if (isValidDate(file.stat.mtime)) {
      timesDiff = {
        mtime: file.stat.mtime,
        atime: isValidDate(file.stat.atime) ? file.stat.atime : stat.atime,
      };
    }

    // Set file.stat to the reflect current state on disk
    assign(file.stat, stat);

    // Nothing to do
    if (!modeDiff && !timesDiff) {
      return callback(null, fd);
    }

    // Check access, `futimes` and `fchmod` only work if we own the file,
    // or if we are effectively root.
    var uid = process.geteuid ? process.geteuid() : process.getuid();
    if (stat.uid !== uid && uid !== 0) {
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
      fs.futimes(fd, timesDiff.atime, timesDiff.mtime, function(err2) {
        if (!err2) {
          file.stat.atime = timesDiff.atime;
          file.stat.mtime = timesDiff.mtime;
          file.stat.ctime.setTime(Date.now());
        }
        callback(err1 || err2, fd);
      });
    }
  }
}

module.exports = stat;
