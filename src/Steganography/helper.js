function getKeys(text) {
  let result = [];

  for (let i = 0; i < text.length; i++) {
    let charNum = text.charCodeAt(i);
    result.push(charNum);
  }

  return result;
}

function encodeFile(plainText, key) {
  let cipherText = []
  plainText = new Int8Array(plainText);

  let keyCodes = getKeys(key);
  console.log(plainText);
  for (let i = 0; i < plainText.length; i++) {
    let charNum = plainText[i];
    let currentKey = keyCodes[i % keyCodes.length];

    charNum = (((charNum + currentKey) % 256) + 256) % 256;
    cipherText.push(charNum);
  }

  let int8cipherText = new Int8Array(cipherText);

  console.log(int8cipherText)

  return int8cipherText;
}

/* Decoding */
function decodeFile(cipherText, key) {
  let plainText = [];
  cipherText = new Int8Array(cipherText);

  let keyCodes = getKeys(key);

  for (let i = 0; i < cipherText.length; i++) {
    let charNum = cipherText[i];
    let currentKey = keyCodes[i % keyCodes.length];

    charNum = (((charNum - currentKey) % 256) + 256) % 256;
    plainText.push(charNum);
  }

  let int8plainText = new Int8Array(plainText);

  return int8plainText;
}

function convertArrayBufferToString(array) {
  let text = "";
  for (let i = 0; i < array.length; i++) {
    text += String.fromCharCode(array[i]);
  }
  return text;
}

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

function downloadBinaryFile(filename, extension, buffer) {
  if (buffer) {
    let blob = new Blob([buffer], {type: 'application/octet-stream'});
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename + '.' + extension);
    } else {
      let elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename + '.' + extension;
      document.body.appendChild(elem);
      elem.click();        
      document.body.removeChild(elem);
    }
  } else {
    alert("No result yet!");
  }
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

function mod(n, m) {
  return ((n % m) + m) % m;
}

function modInverse(a, b) {
  a %= b;
  for (let x = 1; x < b; x++) {
    if ((a*x)%b === 1) {
      return x;
    }
  }
}

function gcd(a, b) {
  if (a === 0 || b === 0) return 0;
  if (a === b) return a;
  if (a > b) return gcd(a-b, b);
  return gcd(a, b-a);
}

function coprime(a, b) {
  return (gcd(a,b) === 1);
}

export {
  getKeys,
  encodeFile,
  decodeFile,
  convertArrayBufferToString,
  readFileAsArrayBuffer,
  readFileAsString,
  readTwoFiles,
  downloadFile,
  downloadBinaryFile,
  readFileURL,
  mod,
  modInverse,
  coprime,
};