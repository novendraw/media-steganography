import React from 'react';

import {
  Button,
  Col,
  Form,
  Row,
} from 'react-bootstrap';

import {
  convertArrayBufferToString,
  convertStringToArrayBuffer,
  convertArrayBufferToBinaryString,
  convertBinaryStringToArrayBuffer,
  convertStringToBinaryString,
  convertBinaryStringToString,
  convertBinaryArrayToArrayBuffer,
  convertArrayBufferToBitplanesArray,
  convertBitplanesArrayToArrayBuffer,
  convertIntegerToBitplane,
  convertBitplaneToInteger,
  readFileAsArrayBuffer,
  readFileURL,
  encodeFile,
  decodeFile,
  downloadBinaryFile,
} from './helper';

import shuffleSeed, { shuffle } from 'shuffle-seed';

export default class Image extends React.PureComponent {
  constructor(props) {
    super(props);
    this.action = null;
    this.state = {
      fileName: "hidden.png",
      resultFileName: "result.png",
      chessboard: ["0","1","0","1","0","1","0","1",
                   "1","0","1","0","1","0","1","0",
                   "0","1","0","1","0","1","0","1",
                   "1","0","1","0","1","0","1","0",
                   "0","1","0","1","0","1","0","1",
                   "1","0","1","0","1","0","1","0",
                   "0","1","0","1","0","1","0","1",
                   "1","0","1","0","1","0","1","0"],
      sourceImgURL: null,
      resultCanvas: null,
      resultImgURL: null,
      useEncryption: false,
    };
  }

  toggleEncryption = (event) => {
    this.setState({useEncryption: event.target.checked});
  }

  saveFileName = (event) => {
    this.setState({resultFileName: event.target.value});
  }

  getImageData(imageURL) {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    let image = document.createElement('img');
    image.src = imageURL;
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);
    let imageData = context.getImageData(0, 0, image.width, image.height);
    return imageData;
  }

  LSBEmbed(sourceImgURL, fileToHide, encryptionKey, hidingOption) {
    let sourceImgData = this.getImageData(sourceImgURL);
    let sourceLength = sourceImgData.data.length;
    let fileData = readFileAsArrayBuffer(fileToHide);
    fileData.then(fileArray => {
      let buffer = new Uint8Array(fileArray);

      const { useEncryption } = this.state;
      if (useEncryption) {
        buffer = encodeFile(buffer, encryptionKey);
      }

      let bufferLength = buffer.length;
      
      //total bits for file needed = filesize(byte) * 8 (bit/byte) * 8 (1 bit at every source byte)
      //total bits for header needed = 256 bytes * 8 (bit/byte) * 8 (1 bit at every source byte)
      //256 bytes header = 252 bytes filename + 4 bytes filesize
      if (sourceLength >= (1 + bufferLength*8*8 + 256*8*8)) {
        //Convert fileName to bits
        const { fileName } = this.state;

        let binaryFileName = null;
        if (useEncryption) {
          binaryFileName = convertStringToArrayBuffer(fileName); //get array buffer
          binaryFileName = encodeFile(binaryFileName, encryptionKey); //encrypt
          binaryFileName = convertArrayBufferToBinaryString(binaryFileName); //get binary string
        } else {
          binaryFileName = convertStringToBinaryString(fileName);
        }

        let remainderLength = 2016-binaryFileName.length;
        let header = "0";
        header = header.repeat(remainderLength);
        binaryFileName = header + binaryFileName;
        
        //Convert file size to bits
        let fileSize = bufferLength.toString(2);
        fileSize = "00000000000000000000000000000000".substr(fileSize.length) + fileSize;

        let bufferArray = Array.from(buffer);
        if (useEncryption && hidingOption === "random") {
          bufferArray = shuffleSeed.shuffle(bufferArray, encryptionKey);
        }
        let bufferString = convertArrayBufferToBinaryString(bufferArray);

        this.setState({buffer: bufferString});
        let result = [];
        for (let i = 0; i < sourceLength; i++) {
          let color = sourceImgData.data[i].toString(2);
          if (i < 1) {
            if (useEncryption && hidingOption === "random") {
              color = color.substr(0, color.length-1) + "0";
            } else {
              color = color.substr(0, color.length-1) + "1";
            }
          } else if (i < 2017) { //1+256*8-32
            color = color.substr(0, color.length-1) + binaryFileName[i-1];
          } else if (i < 2049) {
            color = color.substr(0, color.length-1) + fileSize[i-2017];
          } else {
            if (i < 2049 + bufferLength * 8) {
              color = color.substr(0, color.length-1) + bufferString[i-2049];
            }
          }
          result.push(color);
        }

        result = convertBinaryArrayToArrayBuffer(result);
        this.renderResultImg(sourceImgURL, result);
      } else {
        alert("Source capacity is not enough");
      }
    });
  }

  getLSB(sourceImgURL, encryptionKey) {
    let sourceImgData = this.getImageData(sourceImgURL);
    let sourceLength = sourceImgData.data.length;
    let temp = "";

    let hidingOptionColor = sourceImgData.data[0].toString(2);
    let hidingOption = null;
    if (hidingOptionColor[hidingOptionColor.length-1] === "1") {
      hidingOption = "sequence";
    } else {
      hidingOption = "random";
    }

    for (let i = 1; i < 2049 && i < sourceLength; i++) {
      let color = sourceImgData.data[i].toString(2);
      let lsb = color[color.length-1];
      temp += lsb;
    }
    
    let fileName = temp.substr(0, 2016);
    const { useEncryption } = this.state;
    if (useEncryption) {
      fileName = convertBinaryStringToArrayBuffer(fileName); 
      fileName = decodeFile(fileName, encryptionKey);
      fileName = convertArrayBufferToString(fileName);
    } else {
      fileName = convertBinaryStringToString(fileName);
    }

    let fileSize = temp.substr(2016, 2048);
    fileSize = parseInt(fileSize, 2);

    let result = [];
    temp = "";
    // let fileCorrect = true;
    for (let i = 0; i < fileSize * 8; i++) {
      // if (!sourceImgData.data.length[2049+i]) {
      //   fileCorrect = false;
      //   alert("Input file bit format different. Enter embedded file made by this program.");
      //   break;
      // }
      let color = sourceImgData.data[2049+i].toString(2);
      let lsb = color[color.length-1];
      if (temp.length < 8) {
        if (i === fileSize*8-1) {
          temp = "00000000".substr(temp.length) + temp;
          result.push(temp);
        } else {
          temp += lsb;
        }
      } else {
        result.push(temp);
        temp = lsb;
      }
    }

    // if (fileCorrect) {
      let resultArray = convertBinaryArrayToArrayBuffer(result);
  
      if (useEncryption && hidingOption === "random") {
        let shuffledArray = Array.from(resultArray);
        resultArray = shuffleSeed.unshuffle(shuffledArray, encryptionKey);
      }

      if (useEncryption) {
        resultArray = decodeFile(resultArray, encryptionKey);
      }
  
      downloadBinaryFile(fileName, resultArray);
    // }
  }

  calculateComplexity(bitplane) {
    const length = bitplane.length;
    let counter = 0;
    const max = 112;
    for (let i = 0; i < length; i++) {
      if (bitplane[i] === "1") {
        //Check left
        if (i-1 > 0 && (i-1)%8 !== 7) {
          if (bitplane[i-1] !== bitplane[i]) counter++;
        }

        //Check right
        if (i+1 < length && (i+1)%8 !== 0) {
          if (bitplane[i+1] !== bitplane[i]) counter++;
        }

        //Check above
        if (i-8 > 0) {
          if (bitplane[i-8] !== bitplane[i]) counter++;
        }

        //Check below
        if (i+8 < length) {
          if (bitplane[i+8] !== bitplane[i]) counter++;
        } 
      }
    }
    return counter/max;
  }

  xor(string1, string2) {
    if (string1 === string2) {
      return "0"; //white
    } else {
      return "1"; //black
    }
  }

  convertPBC_CGC(bitplanesArray, type) {
    let result = [];
    let modRemainder = bitplanesArray.length % 8;
    for (let i = 0; i < bitplanesArray.length; i++) {
      if (i < bitplanesArray.length-modRemainder) {
        if (i % 8 === 0) {
          result.push(bitplanesArray[i]);
        } else {
          let bitplane = [];
          for (let j = 0; j < 64; j++) {
            let xorResult = this.xor(bitplanesArray[i-1][j], bitplanesArray[i][j]);
            bitplane.push(xorResult);;
          }
          if (type === "reverse") {
            bitplanesArray[i] = bitplane;
          }
          result.push(bitplane);
        }
      } else {
        result.push(bitplanesArray[i]);
      }
    }

    return result;
  }

  conjugate(bitplane) {
    const { chessboard } = this.state;
    let result = [];
    for (let i = 0; i < bitplane.length; i++) {
      result.push(this.xor(bitplane[i], chessboard[i]));
    }
    return result;
  }

  BPCSEmbed(sourceImgURL, fileToHide, encryptionKey, hidingOption) {
    let sourceImgData = this.getImageData(sourceImgURL);
    let fileData = readFileAsArrayBuffer(fileToHide);
    fileData.then(fileArray => {
      let dataBuffer = new Uint8Array(fileArray);
      
      const { fileName } = this.state;
      let fileNameArray = convertStringToArrayBuffer(fileName);

      let hidingBitplane = null;
      if (hidingOption === "sequence") {
        hidingBitplane = convertIntegerToBitplane(1);
      } else {
        hidingBitplane = convertIntegerToBitplane(0);
      }

      fileNameArray = convertArrayBufferToBitplanesArray(fileNameArray);
      let fileNameArraySizeBitplane = convertIntegerToBitplane(fileNameArray.length)

      const { useEncryption } = this.state;
      if (useEncryption) {
        dataBuffer = encodeFile(dataBuffer, encryptionKey);
        if (hidingOption === "random") {
          let unshuffledArray = Array.from(dataBuffer);
          dataBuffer = shuffleSeed.shuffle(unshuffledArray, encryptionKey);
        }
      }
      
      let dataBitplanes = convertArrayBufferToBitplanesArray(dataBuffer);
      let bufferSizeBitplane = convertIntegerToBitplane(dataBitplanes.length);
      let sourceBitplanes = convertArrayBufferToBitplanesArray(sourceImgData.data);
      sourceBitplanes = this.convertPBC_CGC(sourceBitplanes, "normal");

      let hidingOptionInserted = false;
      let fileNameSizeInserted = false;
      let bufferSizeInserted = false;
      let fileNameCounter = 0;
      let fileNameConjugationMap = [];

      const alpha = 0.3;
      let dataCounter = 0;
      let conjugationMap = [];
      let noiseRegion = [];
      let dataBitplanesToBeInserted = [];
      for(let i = 0; i < sourceBitplanes.length; i++) {
        let sourceComplexity = this.calculateComplexity(sourceBitplanes[i]);
        if (sourceComplexity > alpha) {
          noiseRegion.push(i);
          if (!hidingOptionInserted) {
            if (this.calculateComplexity(hidingBitplane) <= alpha) {
              hidingBitplane = this.conjugate(hidingBitplane);
            }
            dataBitplanesToBeInserted.push(hidingBitplane);
            hidingOptionInserted = true;
          } else if (!fileNameSizeInserted) {
            if (this.calculateComplexity(fileNameArraySizeBitplane) <= alpha) {
              fileNameArraySizeBitplane = this.conjugate(fileNameArraySizeBitplane);
            }
            dataBitplanesToBeInserted.push(fileNameArraySizeBitplane);
            fileNameSizeInserted = true;
          } else if (fileNameCounter < fileNameArray.length) {
            if (this.calculateComplexity(fileNameArray[fileNameCounter]) <= alpha) {
              fileNameConjugationMap.push(fileNameCounter);
              fileNameArray[fileNameCounter] = this.conjugate(fileNameArray[fileNameCounter]);
            }
            dataBitplanesToBeInserted.push(fileNameArray[fileNameCounter]);
            fileNameCounter++;
          } else if (!bufferSizeInserted) {
            if (this.calculateComplexity(bufferSizeBitplane) <= alpha) {
              bufferSizeBitplane = this.conjugate(bufferSizeBitplane);
            }
            dataBitplanesToBeInserted.push(bufferSizeBitplane);
            bufferSizeInserted = true;
          } else if (dataCounter < dataBitplanes.length) {
            let complexity = this.calculateComplexity(dataBitplanes[dataCounter]);
            if (complexity > alpha) {
              dataBitplanesToBeInserted.push(dataBitplanes[dataCounter]);
            } else {
              conjugationMap.push(dataCounter);
              let conjugation = this.conjugate(dataBitplanes[dataCounter]);
              dataBitplanesToBeInserted.push(conjugation);
            }
            dataCounter++;
          }
        }
      }

      for (let i = 0; i < noiseRegion.length; i++) {
        if (i === 0) {
          let fileNameConjugationSizeBitplane = convertIntegerToBitplane(fileNameConjugationMap.length);
          if (this.calculateComplexity(fileNameConjugationSizeBitplane) <= alpha) {
            fileNameConjugationSizeBitplane = this.conjugate(fileNameConjugationSizeBitplane);
          }
          sourceBitplanes[noiseRegion[i]] = fileNameConjugationSizeBitplane;
        } else if (i < fileNameConjugationMap.length + 1) {
          let fileNameMapBitplane = convertIntegerToBitplane(fileNameConjugationMap[i-1]);
          if (this.calculateComplexity(fileNameMapBitplane) <= alpha) {
            fileNameMapBitplane = this.conjugate(fileNameMapBitplane);
          }
          sourceBitplanes[noiseRegion[i]] = fileNameMapBitplane;
        } else if (i < fileNameConjugationMap.length + 2) {
          let sizeBitplane = convertIntegerToBitplane(conjugationMap.length);
          if (this.calculateComplexity(sizeBitplane) <= alpha) {
            sizeBitplane = this.conjugate(sizeBitplane)
          }
          sourceBitplanes[noiseRegion[i]] = sizeBitplane;
        } else if (i < fileNameConjugationMap.length + 2 + conjugationMap.length) {
          let excessIndex = fileNameConjugationMap.length + 2;
          let mapBitplane = convertIntegerToBitplane(conjugationMap[i-excessIndex]);
          if (this.calculateComplexity(mapBitplane) <= alpha)  {
            mapBitplane = this.conjugate(mapBitplane);
          }
          sourceBitplanes[noiseRegion[i]] = mapBitplane;
        } else if (i < fileNameConjugationMap.length + 2 + conjugationMap.length + dataBitplanesToBeInserted.length) {
          let excessIndex = fileNameConjugationMap.length + 2 + conjugationMap.length;
          sourceBitplanes[noiseRegion[i]] = dataBitplanesToBeInserted[i-excessIndex];
        } else {
          break;
        }
      }
      
      sourceBitplanes = this.convertPBC_CGC(sourceBitplanes, "reverse");
      let resultArrayBuffer = convertBitplanesArrayToArrayBuffer(sourceBitplanes);
      this.renderResultImg(sourceImgURL, resultArrayBuffer);

      ////////////////EXTRACT///////////////////

      sourceBitplanes = convertArrayBufferToBitplanesArray(resultArrayBuffer);
      sourceBitplanes = this.convertPBC_CGC(sourceBitplanes, "normal");
      let result = [];
      for(let i = 0; i < sourceBitplanes.length; i++) {
        if (this.calculateComplexity(sourceBitplanes[i]) > alpha) {
          result.push(sourceBitplanes[i]);
        }
      }

      let fileNameConjugationMapSize = convertBitplaneToInteger(this.conjugate(result[0]));
      let fileNameConjugationMaps = [];
      for (let i = 0; i < fileNameConjugationMapSize; i++) {
        fileNameConjugationMaps.push(convertBitplaneToInteger(this.conjugate(result[i+1])));
      }

      let conjugationMapSize = convertBitplaneToInteger(this.conjugate(result[1+fileNameConjugationMaps.length]));
      let plusIndex = 2+fileNameConjugationMaps.length;
      let conjugationMaps = [];
      for (let i = 0; i < conjugationMapSize; i++) {
        conjugationMaps.push(convertBitplaneToInteger(this.conjugate(result[i+plusIndex])));
      }

      plusIndex += conjugationMaps.length;
      
      let hidingCode = convertBitplaneToInteger(this.conjugate(result[plusIndex]));
      if (hidingCode === 1) {
        hidingCode = "sequence";
      } else {
        hidingCode = "random";
      }

      plusIndex++;

      let fileNameSize = convertBitplaneToInteger(this.conjugate(result[plusIndex]));
      
      plusIndex++;

      let fileNameBitplanes = [];
      for (let i = 0; i < fileNameSize; i++) { 
        fileNameBitplanes.push(result[i+plusIndex]);
      }
      
      plusIndex += fileNameBitplanes.length;

      let fileNameString = "";
      for (let i = 0; i < fileNameBitplanes.length; i++) {
        let bitplane = fileNameBitplanes[i];
        if (fileNameConjugationMaps.includes(i)) {
          bitplane = this.conjugate(bitplane);
        }

        let binaryString = "";
        for (let j = 0; j < 64; j++) {
          binaryString += bitplane[j];
        }
        fileNameString += convertBinaryStringToString(binaryString);
      }

      let dataSize = convertBitplaneToInteger(this.conjugate(result[plusIndex]));
      plusIndex++;

      let resultBitplanes = [];
      for (let i = 0; i < dataSize; i++) {
        if (conjugationMaps.includes(i)) {
          resultBitplanes.push(this.conjugate(result[i+plusIndex]));
        } else {
          resultBitplanes.push(result[i+plusIndex]);
        }
      }
      
      let resultArray = convertBitplanesArrayToArrayBuffer(resultBitplanes);
      let firstFound = false;
      let leadingZeroes = 0;
      for (let i = 0; i < resultArray.length && !firstFound; i++) {
        if (resultArray[i] !== 0) {
          firstFound = true;
        } else {
          leadingZeroes++;
        }
      }
      
      let finalArray = new Uint8Array(resultArray.length-leadingZeroes);
      for (let i = leadingZeroes; i < resultArray.length; i++) {
        finalArray[i-leadingZeroes] = resultArray[i];
      }
      
      if (useEncryption) {
        if (hidingOption === "random") {
          let shuffledArray = Array.from(finalArray);
          finalArray = shuffleSeed.unshuffle(shuffledArray, encryptionKey);
        }

        finalArray = decodeFile(finalArray, encryptionKey);
      }
      
      downloadBinaryFile(fileNameString, finalArray);
    });
  }

  getBPCS(sourceImgURL, encryptionKey) {
    let sourceImgData = this.getImageData(sourceImgURL);
    let sourceBitplanes = convertArrayBufferToBitplanesArray(sourceImgData.data);
    sourceBitplanes = this.convertPBC_CGC(sourceBitplanes, "normal");

    const alpha = 0.3;
    let result = [];
    for(let i = 0; i < sourceBitplanes.length; i++) {
      if (this.calculateComplexity(sourceBitplanes[i]) > alpha) {
        result.push(sourceBitplanes[i]);
      }
    }

    let fileNameConjugationMapSize = convertBitplaneToInteger(this.conjugate(result[0]));
    let fileNameConjugationMap = [];
    for (let i = 0; i < fileNameConjugationMapSize; i++) {
      fileNameConjugationMap.push(convertBitplaneToInteger(this.conjugate(result[i+1])));
    }

    let conjugationMapSize = convertBitplaneToInteger(this.conjugate(result[1+fileNameConjugationMap.length]));
    let plusIndex = 2+fileNameConjugationMap.length;
    let conjugationMap = [];
    for (let i = 0; i < conjugationMapSize; i++) {
      conjugationMap.push(convertBitplaneToInteger(this.conjugate(result[i+plusIndex])));
    }

    plusIndex += conjugationMap.length;
    
    let hidingOption = convertBitplaneToInteger(this.conjugate(result[plusIndex]));
    if (hidingOption === 1) {
      hidingOption = "sequence";
    } else {
      hidingOption = "random";
    }

    plusIndex++;

    let fileNameSize = convertBitplaneToInteger(this.conjugate(result[plusIndex]));
    
    plusIndex++;

    let fileNameBitplanes = [];
    for (let i = 0; i < fileNameSize; i++) { 
      fileNameBitplanes.push(result[i+plusIndex]);
    }
    
    plusIndex += fileNameBitplanes.length;

    let fileName = "";
    for (let i = 0; i < fileNameBitplanes.length; i++) {
      let bitplane = fileNameBitplanes[i];
      if (fileNameConjugationMap.includes(i)) {
        bitplane = this.conjugate(bitplane);
      }

      let binaryString = "";
      for (let j = 0; j < 64; j++) {
        binaryString += bitplane[j];
      }
      fileName += convertBinaryStringToString(binaryString);
    }

    let dataSize = convertBitplaneToInteger(this.conjugate(result[plusIndex]));
    plusIndex++;

    let resultBitplanes = [];
    for (let i = 0; i < dataSize; i++) {
      if (conjugationMap.includes(i)) {
        resultBitplanes.push(this.conjugate(result[i+plusIndex]));
      } else {
        resultBitplanes.push(result[i+plusIndex]);
      }
    }
    
    let resultArray = convertBitplanesArrayToArrayBuffer(resultBitplanes);
    let firstFound = false;
    let leadingZeroes = 0;
    for (let i = 0; i < resultArray.length && !firstFound; i++) {
      if (resultArray[i] !== 0) {
        firstFound = true;
      } else {
        leadingZeroes++;
      }
    }
    
    let finalArray = new Uint8Array(resultArray.length-leadingZeroes);
    for (let i = leadingZeroes; i < resultArray.length; i++) {
      finalArray[i-leadingZeroes] = resultArray[i];
    }

    const { useEncryption } = this.state;

    if (useEncryption) {
      if (hidingOption === "random") {
        let shuffledArray = Array.from(finalArray);
        finalArray = shuffleSeed.unshuffle(shuffledArray, encryptionKey);
      }

      finalArray = decodeFile(finalArray, encryptionKey);
    }
    
    downloadBinaryFile(fileName, finalArray);
  }

  renderImg = (file) => {
    if (file.length > 0) {
      let fileData = file[0];
      let fileURL = readFileURL(fileData);
      fileURL.then(url => {
        this.setState({sourceImgURL: url});
      });
    } else {
      this.setState({sourceImgURL: null});
    }
  }

  renderResultImg(sourceImgURL, steganoArray) {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    let image = document.createElement('img');
    image.src = sourceImgURL;
    canvas.width = image.width;
    canvas.height = image.height;
    let steganoClampedArray = new Uint8ClampedArray(steganoArray);
    let steganoImgData = new ImageData(steganoClampedArray, image.width, image.height);

    context.putImageData(steganoImgData, 0, 0);
    let resultImg = new Image();
    resultImg.src = canvas.toDataURL();
    this.setState({resultImgURL: resultImg.src, resultCanvas: canvas});
  }

  downloadFromCanvas(fileName, canvas) {
    let link = document.createElement('a');
    link.download = fileName;
    canvas.toBlob(function(blob) {
      link.href = URL.createObjectURL(blob);
      link.click();
    }, 'application/octet-stream');
  }

  handleSubmit = (event) => {
    event.preventDefault();
    const { sourceImgURL } = this.state;
    let sourceImg = event.target.inputSourceImg;
    let fileToHide = event.target.inputFile;
    let methodOption = event.target.methodOption.value;
    let encryptionKey = event.target.encryptKey.value;
    let hidingOption = event.target.hidingOption.value;

    if (methodOption === "lsb") {
      if (this.action === "hide") {
        if (sourceImg.files.length > 0 && fileToHide.files.length > 0) {
          this.setState({fileName: fileToHide.files[0].name});
          this.LSBEmbed(sourceImgURL, fileToHide.files[0], encryptionKey, hidingOption);
        } else {
          alert("Source Media and File to Hide Must Exist!");
        }
      } else { //this.action === "extract"
        if (sourceImg.files.length > 0) {
          this.getLSB(sourceImgURL, encryptionKey);
        } else {
          alert("Source Media to Extract Must Exist!");
        }
      }
    } else { //BPCS
      if (this.action === "hide") {
        if (sourceImg.files.length > 0 && fileToHide.files.length > 0) {
          this.setState({fileName: fileToHide.files[0].name});
          this.BPCSEmbed(sourceImgURL, fileToHide.files[0], encryptionKey, hidingOption);
        } else {
          alert("Source Media and File to Hide Must Exist!");
        }
      } else { //this.action === "extract"
        if (sourceImg.files.length > 0) {
          this.getBPCS(sourceImgURL, encryptionKey);
        } else {
          this.getLSB(sourceImgURL, encryptionKey);
        }
      }
    }
  }

  render() {
    const { sourceImgURL, resultCanvas, resultImgURL, useEncryption } = this.state;
    return (
      <React.Fragment>
        <Form onSubmit={this.handleSubmit} className="margin-bottom-md">
          <Row>
            <Col xs={4} className="content-start">
              <div className="content-center subheadline bold margin-bottom-sm">
                Source Media
              </div>
              <div className="content-center full-width image-container margin-bottom-xs">
                <img id="sourceImg" src={sourceImgURL} className="full-height"/>
              </div>
              <Form.Group>
                <Form.File id="inputSourceImg" label="Upload source image" onChange={(e) => this.renderImg(e.target.files)} accept="image/x-png,image/bmp"/>
              </Form.Group>
            </Col>

            <Col xs={4}>
              <div className="content-center subheadline bold margin-bottom-xxl">
                File to Hide
              </div>
              <div className="body-text bold margin-bottom-sm">
                Choose file to hide within source image
              </div>
              <Form.Group>
                <Form.File id="inputFile"/>
              </Form.Group>
            </Col>

            <Col xs={4}>
              <div className="content-center subheadline bold margin-bottom-sm">
                Result Media
              </div>
              <div className="content-center full-width image-container margin-bottom-xs">
                <img id="resultImg" src={resultImgURL} className="full-height"/>
              </div>
              <Row>
                <div>Enter filename with extension</div>
              </Row>
              <Row>
                <Col className="no-indent">
                  <Form.Group controlId="filenameField">
                    <Form.Control
                      type="text"
                      onChange={(event) => {this.saveFileName(event)}}
                    />
                  </Form.Group>
                </Col>
                <Col className="no-indent">
                  <Button
                    variant="success"
                    type="button"
                    className="margin-bottom-xs"
                    onClick={() => this.downloadFromCanvas(this.state.resultFileName, resultCanvas)}
                  >
                    {" "}
                    Download Result
                  </Button>
                </Col>
              </Row>
            </Col>

          </Row>

          <Row>
            <Col>
              <Form.Group controlId="methodOption">
                <Form.Label>Method</Form.Label>
                <Form.Control as="select">
                  <option value="lsb">LSB</option>
                  <option value="bpcs">BPCS</option>
                </Form.Control>
              </Form.Group>
              <Form.Group controlId="useEncryption">
                <Form.Check
                  type="checkbox"
                  label="Use Encryption"
                  onChange={this.toggleEncryption}
                />
              </Form.Group>
              <Form.Group controlId="encryptKey">
                <Form.Label>Encryption Key</Form.Label>
                <Form.Control
                  type="text"
                  readOnly={!useEncryption}
                  ref={(ref) => {
                    this.encryptKey = ref;
                  }}
                />
              </Form.Group>
              <Form.Group controlId="hidingOption">
                <Form.Label>Hiding Option</Form.Label>
                <Form.Control as="select">
                  <option value="sequence">Sequential</option>
                  <option value="random">Random</option>
                </Form.Control>
              </Form.Group>
              <Button
                variant="primary"
                type="submit"
                className="full-width margin-bottom-xs"
                onClick={() => (this.action = "hide")}
              >
                {" "}
                Hide
              </Button>

              <Button
                variant="info"
                type="submit"
                className="full-width"
                onClick={() => (this.action = "extract")}
              >
                {" "}
                Extract
              </Button>
            </Col>
          </Row>
        </Form>
      </React.Fragment>
    );
  }
}
