'use strict';
const path = require('path');
const fs = require('fs');
const mimer = require('mimer');
const getDimensions = require('image-size');
const uri = require('./template/uri');
const css = require('./template/css');
const Stream = require('stream');

class Api extends Stream {
  constructor() {
    super();

    this.readable = true;
  }

  format(fileName, fileContent) {
    const fileBuffer = (fileContent instanceof Buffer) ? fileContent : new Buffer(fileContent);

    this.base64 = fileBuffer.toString('base64');
    this.createMetadata(fileName);

    return this;
  }

  createMetadata(fileName) {
    this.fileName = fileName;
    this.mimetype = mimer(fileName);
    this.content = uri(this);

    return this;
  }

  runCallback(handler, err) {
    if (err) {
      return handler(err);
    }

    return handler.call(this, null, this.content, this);
  }

  encode(fileName, handler) {
    return this.async(fileName, err => handler && this.runCallback(handler, err));
  }

  async(fileName, handler) {
    const base64Chunks = [];
    const propagateStream = chunk => this.emit('data', chunk);

    propagateStream(this.createMetadata(fileName).content);
    fs.createReadStream(fileName, { 'encoding': 'base64' })
      .on('data', propagateStream)
      .on('data', chunk => base64Chunks.push(chunk))
      .on('error', err => {
        handler(err);
        this.emit('error', err);
      })
      .on('end', () => {
        this.base64 = base64Chunks.join('');
        this.emit('end');
        handler.call(this.createMetadata(fileName));
        this.emit('encoded', this.content, this);
      });
  }

  encodeSync(fileName) {
    if (!fileName || !fileName.trim || fileName.trim() === '') {
      throw new Error('Insert a File path as string argument');
    }

    if (fs.existsSync(fileName)) {
      const fileContent = fs.readFileSync(fileName);

      return this.format(fileName, fileContent).content;
    }

    throw new Error(`The file ${fileName} was not found!`);
  }

  getCSS(config) {
    config = config || {};
    if (!this.content) {
      throw new Error('Create a data-uri config using the method encodeSync');
    }

    config.class = config.class || path.basename(this.fileName, path.extname(this.fileName));
    config.background = this.content;

    if (config.width || config.height || config['background-size']) {
      config.dimensions = getDimensions(this.fileName);
    }

    return css(config);
  }
}

module.exports = Api;
