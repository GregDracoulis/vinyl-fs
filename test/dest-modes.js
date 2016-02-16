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

  expect.restoreSpies();

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

  it('should write new files with the mode specified in options', function(done) {
    if (isWindows) {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMode = parseInt('744', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
    });

    var onEnd = function() {
      expect(masked(fs.lstatSync(expectedPath).mode)).toEqual(expectedMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname, mode: expectedMode });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });

  it('should update file mode to match the vinyl mode', function(done) {
    if (isWindows) {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var startMode = parseInt('0655', 8);
    var expectedMode = parseInt('0722', 8);

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

    fs.mkdirSync(expectedBase);
    fs.closeSync(fs.openSync(expectedPath, 'w'));
    fs.chmodSync(expectedPath, startMode);

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });

  // TODO: explodes on Windows
  it('should update directory mode to match the vinyl mode', function(done) {
    var inputBase = path.join(__dirname, './fixtures/');
    var inputPath = path.join(__dirname, './fixtures/wow');
    var expectedPath = path.join(__dirname, './out-fixtures/wow');
    var expectedBase = path.join(__dirname, './out-fixtures');

    var firstFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: expectedPath,
      stat: fs.statSync(inputPath),
    });
    var startMode = firstFile.stat.mode;
    var expectedMode = parseInt('727', 8);

    var expectedFile = new File(firstFile);
    expectedFile.stat.mode = (startMode & ~parseInt('7777', 8)) | expectedMode;

    var onEnd = function() {
      expect(masked(fs.lstatSync(expectedPath).mode)).toEqual(expectedMode);
      done();
    };

    fs.mkdirSync(expectedBase);

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(firstFile);
    stream.write(expectedFile);
    stream.end();
  });

  it('should use different modes for files and directories', function(done) {
    if (isWindows) {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var inputBase = path.join(__dirname, './fixtures');
    var inputPath = path.join(__dirname, './fixtures/wow/suchempty');
    var expectedBase = path.join(__dirname, './out-fixtures/wow');
    var expectedPath = path.join(__dirname, './out-fixtures/wow/suchempty');
    var expectedDirMode = parseInt('755', 8);
    var expectedFileMode = parseInt('655', 8);

    var firstFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: fs.readFileSync(inputPath),
      stat: fs.statSync(inputPath),
    });

    var onEnd = function() {
      expect(masked(fs.lstatSync(expectedBase).mode)).toEqual(expectedDirMode);
      expect(masked(fs.lstatSync(expectedPath).mode)).toEqual(expectedFileMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', {
      cwd: __dirname,
      mode: expectedFileMode,
      dirMode: expectedDirMode,
    });
    stream.on('end', onEnd);
    stream.write(firstFile);
    stream.end();
  });

  it('should not fchmod a matching file', function(done) {
    if (isWindows) {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var fchmodSpy = expect.spyOn(fs, 'fchmod').andCallThrough();

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMode = parseInt('711', 8);

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
      expect(fchmodSpy.calls.length).toEqual(0);
      expect(masked(fs.lstatSync(expectedPath).mode)).toEqual(expectedMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });
});
