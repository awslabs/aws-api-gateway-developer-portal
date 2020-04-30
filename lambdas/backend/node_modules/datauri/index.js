'use strict';
const Api = require('./api');

const ENC_TYPE = configSize => configSize > 1 ? 'encode' : 'encodeSync';

class DataURI extends Api {
  constructor() {
    super();

    const configSize = arguments.length;

    if (configSize) {
      this[ENC_TYPE(configSize)].apply(this, arguments);
    }
  }

  static promise(fileName) {
    const datauri = new DataURI();

    return new Promise((resolve, reject) => {
      datauri.on('encoded', resolve)
        .on('error', reject)
        .encode(fileName);
    });
  }

  static sync(fileName) {
    const datauri = new DataURI(fileName);

    return datauri.content;
  }
}

module.exports = DataURI;
