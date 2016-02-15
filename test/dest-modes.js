'use strict';

var os = require('os');
var path = require('path');

var fs = require('graceful-fs');
var del = require('del');
var File = require('vinyl');
var expect = require('expect');
var through = require('through2');

var vfs = require('../');

function wipeOut() {
  this.timeout(20000);

  // Async del to get sort-of-fix for https://github.com/isaacs/rimraf/issues/72
  return del(path.join(__dirname, './fixtures/highwatermark'))
    .then(function() {
      return del(path.join(__dirname, './out-fixtures/'));
    });
}

var MASK_MODE = parseInt('777', 8);

function masked(mode) {
  return mode & MASK_MODE;
}

var isWindows = (os.platform() === 'win32');

describe('.dest() with custom modes', function() {
  beforeEach(wipeOut);
  afterEach(wipeOut);

  it('should set the mode of a written buffer file if set on the vinyl object', function(done) {
    if (isWindows) {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMode = parseInt('655', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: expectedMode,
      },
    });

    var onEnd = function() {
      expect(masked(fs.lstatSync(expectedPath).mode)).toEqual(expectedMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });

  it('should set the mode of a written stream file if set on the vinyl object', function(done) {
    if (isWindows) {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMode = parseInt('655', 8);

    var contentStream = through.obj();
    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: contentStream,
      stat: {
        mode: expectedMode,
      },
    });

    var onEnd = function() {
      expect(masked(fs.lstatSync(expectedPath).mode)).toEqual(expectedMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    setTimeout(function() {
      contentStream.write(expectedContents);
      contentStream.end();
    }, 100);
    stream.end();
  });

  // TODO: explodes on Windows
  it('should set the mode of a written directory if set on the vinyl object', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test');
    var expectedMode = parseInt('655', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: null,
      stat: {
        isDirectory: function() {
          return true;
        },
        mode: expectedMode,
      },
    });

    var onEnd = function() {
      expect(masked(fs.lstatSync(expectedPath).mode)).toEqual(expectedMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });
});
