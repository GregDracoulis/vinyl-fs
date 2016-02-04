'use strict';

var expect = require('expect');

var fs = require('graceful-fs');
var del = require('del');
var path = require('path');

var closeFd = require('../lib/dest/fileOperations/closeFd');
var isOwner = require('../lib/dest/fileOperations/isOwner');
var writeFile = require('../lib/dest/fileOperations/writeFile');
var getModeDiff = require('../lib/dest/fileOperations/getModeDiff');
var getTimesDiff = require('../lib/dest/fileOperations/getTimesDiff');

var MASK_MODE = parseInt('777', 8);

function masked(mode) {
  return mode & MASK_MODE;
}

function noop() {}

describe('isOwner', function() {

  var ownerStat = {
    uid: 9001,
  };

  var nonOwnerStat = {
    uid: 9002,
  };

  var getuidSpy;
  var geteuidSpy;

  beforeEach(function(done) {
    if (typeof process.geteuid !== 'function') {
      process.geteuid = noop;
    }

    getuidSpy = expect.spyOn(process, 'getuid').andReturn(ownerStat.uid);
    geteuidSpy = expect.spyOn(process, 'geteuid').andReturn(ownerStat.uid);

    done();
  });

  afterEach(function(done) {
    expect.restoreSpies();

    if (process.geteuid === noop) {
      delete process.geteuid;
    }

    done();
  });

  it('uses process.geteuid() when available', function(done) {

    isOwner(ownerStat);

    expect(getuidSpy.calls.length).toEqual(0);
    expect(geteuidSpy.calls.length).toEqual(1);

    done();
  });

  it('uses process.getuid() when geteuid() is not available', function(done) {
    delete process.geteuid;

    isOwner(ownerStat);

    expect(getuidSpy.calls.length).toEqual(1);

    done();
  });

  it('returns false when non-root and non-owner', function(done) {
    var result = isOwner(nonOwnerStat);

    expect(result).toEqual(false);

    done();
  });

  it('returns true when owner and non-root', function(done) {
    var result = isOwner(ownerStat);

    expect(result).toEqual(true);

    done();
  });

  it('returns true when non-owner but root', function(done) {
    expect.spyOn(process, 'geteuid').andReturn(0); // 0 is root uid

    var result = isOwner(nonOwnerStat);

    expect(result).toEqual(true);

    done();
  });
});

describe('getModeDiff', function() {

  it('returns 0 if both modes are the same', function(done) {
    var fsMode = parseInt('777', 8);
    var vfsMode = parseInt('777', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result).toEqual(0);

    done();
  });

  it('returns a value greater than 0 if modes are different', function(done) {
    var fsMode = parseInt('777', 8);
    var vfsMode = parseInt('744', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result).toEqual(27);

    done();
  });

  it('does not matter the order of diffing', function(done) {
    var fsMode = parseInt('655', 8);
    var vfsMode = parseInt('777', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result).toEqual(82);

    done();
  });

  it('ignores the sticky/setuid/setgid bits', function(done) {
    var fsMode = parseInt('1777', 8);
    var vfsMode = parseInt('4777', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result).toEqual(0);

    done();
  });
});

describe('getTimesDiff', function() {

  it('returns undefined if vinyl mtime is not a valid date', function(done) {
    var fsStat = {
      mtime: new Date(),
    };
    var vfsStat = {
      mtime: new Date(undefined),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  it('returns undefined if vinyl mtime & atime are both equal to counterparts', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  // TODO: is this proper/expected?
  it('returns undefined if vinyl mtimes equals the counterpart and atimes are null', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: null,
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: null,
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  it('returns a diff object if mtimes do not match', function(done) {
    var now = Date.now();
    var then = now - 1000;
    var fsStat = {
      mtime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(then),
    };
    var expected = {
      mtime: new Date(then),
      atime: undefined,
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('returns a diff object if atimes do not match', function(done) {
    var now = Date.now();
    var then = now - 1000;
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(then),
    };
    var expected = {
      mtime: new Date(now),
      atime: new Date(then),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('returns the fs atime if the vinyl atime is invalid', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(undefined),
    };
    var expected = {
      mtime: new Date(now),
      atime: new Date(now),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  // TODO: is this proper/expected?
  it('makes atime diff undefined if fs and vinyl atime are invalid', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(undefined),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(undefined),
    };
    var expected = {
      mtime: new Date(now),
      atime: undefined,
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });
});

describe('closeFd', function() {

  it('calls the callback with propagated error if fd is not a number', function(done) {
    var propagatedError = new Error();

    closeFd(propagatedError, null, function(err) {
      expect(err).toEqual(propagatedError);

      done();
    });
  });

  it('calls the callback with close error if no error to propagate', function(done) {
    closeFd(null, 9001, function(err) {
      expect(err).toExist();

      done();
    });
  });

  it('calls the callback with propagated error if close errors', function(done) {
    var propagatedError = new Error();

    closeFd(propagatedError, 9001, function(err) {
      expect(err).toEqual(propagatedError);

      done();
    });
  });

  it('calls the callback with propagated error if close succeeds', function(done) {
    var propagatedError = new Error();

    var fd = fs.openSync(path.join(__dirname, './fixtures/test.coffee'), 'r');

    var spy = expect.spyOn(fs, 'close').andCallThrough();

    closeFd(propagatedError, fd, function(err) {
      spy.restore();

      expect(spy.calls.length).toEqual(1);
      expect(err).toEqual(propagatedError);

      done();
    });
  });

  it('calls the callback with no error if close succeeds & no propagated error', function(done) {
    var fd = fs.openSync(path.join(__dirname, './fixtures/test.coffee'), 'r');

    var spy = expect.spyOn(fs, 'close').andCallThrough();

    closeFd(null, fd, function(err) {
      spy.restore();

      expect(spy.calls.length).toEqual(1);
      expect(err).toEqual(undefined);

      done();
    });
  });
});

describe('writeFile', function() {

  var filepath;

  beforeEach(function(done) {
    filepath = path.join(__dirname, './fixtures/writeFile.txt');

    done();
  });

  afterEach(function(done) {
    del.sync(filepath);

    done();
  });

  it('writes a file to the filesystem, does not close and returns the fd', function(done) {
    var expected = 'test';
    var content = new Buffer(expected);

    writeFile(filepath, content, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, function() {
        var written = fs.readFileSync(filepath, 'utf-8');

        expect(written).toEqual(expected);

        done();
      });
    });
  });

  it('defaults to writing files with 0666 mode', function(done) {
    var expected = parseInt('0666', 8) & (~process.umask());
    var content = new Buffer('test');

    writeFile(filepath, content, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, function() {
        var stats = fs.lstatSync(filepath);

        expect(masked(stats.mode)).toEqual(expected);

        done();
      });
    });
  });

  it('accepts a different mode in options', function(done) {
    var expected = parseInt('0777', 8) & (~process.umask());
    var content = new Buffer('test');
    var options = {
      mode: parseInt('0777', 8),
    };

    writeFile(filepath, content, options, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, function() {
        var stats = fs.lstatSync(filepath);

        expect(masked(stats.mode)).toEqual(expected);

        done();
      });
    });
  });

  it('defaults to opening files with write flag', function(done) {
    var content = new Buffer('test');

    writeFile(filepath, content, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.read(fd, new Buffer(4), 0, 4, 0, function(readErr) {
        expect(readErr).toExist();

        fs.close(fd, done);
      });
    });
  });

  it('accepts a different flag in options', function(done) {
    var expected = 'test';
    var content = new Buffer(expected);
    var options = {
      flag: 'w+',
    };

    writeFile(filepath, content, options, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.read(fd, new Buffer(4), 0, 4, 0, function(readErr, _, written) {
        expect(readErr).toNotExist();

        expect(written.toString()).toEqual(expected);

        fs.close(fd, done);
      });
    });
  });

  it('appends to a file if append flag is given', function(done) {
    var initial = 'test';
    var toWrite = '-a-thing';

    fs.writeFileSync(filepath, initial, 'utf-8');

    var expected = initial + toWrite;

    var content = new Buffer(toWrite);
    var options = {
      flag: 'a',
    };

    writeFile(filepath, content, options, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, function() {
        var written = fs.readFileSync(filepath, 'utf-8');

        expect(written).toEqual(expected);

        done();
      });
    });
  });

  it('does not pass a file descriptor if open call errors', function(done) {
    filepath = path.join(__dirname, './not-exist-dir/writeFile.txt');
    var content = new Buffer('test');

    writeFile(filepath, content, function(err, fd) {
      expect(err).toExist();
      expect(typeof fd === 'number').toEqual(false);

      done();
    });
  });

  it('passes a file descriptor if write call errors', function(done) {
    var existsFilepath = path.join(__dirname, './fixtures/test.coffee'); // File must exist
    var content = new Buffer('test');
    var options = {
      flag: 'r',
    };

    writeFile(existsFilepath, content, options, function(err, fd) {
      expect(err).toExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, done);
    });
  });

  it('passes an error if called without buffer for data', function(done) {
    writeFile(filepath, 'test', function(err) {
      expect(err).toExist();

      done();
    });
  });

  it('does not error if options is falsey', function(done) {
    var content = new Buffer('test');
    writeFile(filepath, content, null, function(err, fd) {
      expect(err).toNotExist();
      expect(typeof fd === 'number').toEqual(true);

      fs.close(fd, done);
    });
  });
});
