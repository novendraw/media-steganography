function getKeys(text) {
  let result = [];

  for (let i = 0; i < text.length; i++) {
    let charNum = text.charCodeAt(i);
    result.push(charNum);
  }

  return result;
}

/* Vigenere Encoding */
function encodeFile(plainText, key) {
  let cipherText = new Uint8Array(plainText.length)

  let keyCodes = getKeys(key);
  for (let i = 0; i < plainText.length; i++) {
    let charNum = plainText[i];
    let currentKey = keyCodes[i % keyCodes.length];

    charNum = (((charNum + currentKey) % 256) + 256) % 256;
    cipherText[i] = charNum;
  }

  return cipherText;
}

/* Vigenere Decoding */
function decodeFile(cipherText, key) {
  let plainText = new Uint8Array(cipherText.length);

  let keyCodes = getKeys(key);

  for (let i = 0; i < cipherText.length; i++) {
    let charNum = cipherText[i];
    let currentKey = keyCodes[i % keyCodes.length];

    charNum = (((charNum - currentKey) % 256) + 256) % 256;
    plainText[i] = charNum;
  }

  return plainText;
}

/* Converter */

// String <=> Array Buffer
function convertArrayBufferToString(array) {
  let text = "";
  for (let i = 0; i < array.length; i++) {
    text += String.fromCharCode(array[i]);
  }
  return text;
}

function convertStringToArrayBuffer(string) {
  let result = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    result[i] =  string.charCodeAt(i);
  }
  return result;
}

// Binary String <=> Array Buffer

function convertArrayBufferToBinaryString(array) {
  let text = "";
  for (let i = 0; i < array.length; i++) {
    let data = array[i].toString(2);
    data = "00000000".substr(data.length) + data;
    text += data;
  }
  return text;
}

function convertBinaryStringToArrayBuffer(binaryString) {
  let string = removeLeadingZeroes(binaryString);
  let result = new Uint8Array(string.length / 8);
  let i = 0;
  while (string.length > 0) {
    let substr = string.substr(0, 8);
    result[i] = parseInt(substr, 2);
    string = string.substring(8);
    i++;
  }
  return result;
}

// String <=> Binary String

function convertStringToBinaryString(string) {
  let result = "";
  for (let i = 0; i < string.length; i++) {
    let binary = string.charCodeAt(i).toString(2);
    binary = "00000000".substr(binary.length) + binary;
    result += binary;
  }
  return result;
}

function convertBinaryStringToString(binaryString) {
  let string = removeLeadingZeroes(binaryString);
  let result = "";
  while (string.length > 0) {
    let substr = string.substr(0, 8);
    result += String.fromCharCode(parseInt(substr, 2));
    string = string.substring(8);
  }

  return result;
}

// Binary Array <=> Array Buffer

function convertBinaryArrayToArrayBuffer(binaryArray) {
  let result = new Uint8Array(binaryArray.length);
  for (let i = 0; i < binaryArray.length; i++) {
    result[i] = parseInt(binaryArray[i], 2);
  }
  return result;
}

// Binary Methods
function removeLeadingZeroes(binaryString) {
  let string = binaryString.replace(/^0+/, '');
  let modRemainder = string.length % 8;
  if (modRemainder !== 0) {
    let header = "0";
    header = header.repeat(8 - modRemainder);
    string = header + string;
  }

  return string;
}

/* File Reader */

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = function(e) {
      resolve(e.target.result);
    }
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsString(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = function(e) {
      resolve(e.target.result);
    }
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readTwoFiles(file1, file2) {
  return Promise.all([readFileAsArrayBuffer(file1), readFileAsArrayBuffer(file2)]);
}

function readFileURL(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = function(e) {
      resolve(e.target.result);
    }
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* File Download */

function downloadFile(filename, data) {
  if (data) {
    let blob = new Blob([data], {type: 'text/plain'});
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      let elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;        
      document.body.appendChild(elem);
      elem.click();        
      document.body.removeChild(elem);
    }
  } else {
    alert("No result yet!");
  }
}

function downloadBinaryFile(filename, buffer) {
  if (buffer) {
    let blob = new Blob([buffer], {type: 'application/octet-stream'});
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      let elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();        
      document.body.removeChild(elem);
    }
  } else {
    alert("No result yet!");
  }
}

export {
  getKeys,
  encodeFile,
  decodeFile,
  convertArrayBufferToString,
  convertStringToArrayBuffer,
  convertArrayBufferToBinaryString,
  convertBinaryStringToArrayBuffer,
  convertStringToBinaryString,
  convertBinaryStringToString,
  convertBinaryArrayToArrayBuffer,
  readFileAsArrayBuffer,
  readFileAsString,
  readTwoFiles,
  readFileURL,
  downloadFile,
  downloadBinaryFile,
};