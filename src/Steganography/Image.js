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
  readFileAsArrayBuffer,
  readFileURL,
  encodeFile,
  decodeFile,
  downloadBinaryFile,
} from './helper';

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

  getRGBAString(imageData, encryptionKey) {
    const { useEncryption } = this.state;

    let result = "";
    for (let i = 0; i < imageData.data.length; i++) {
      let data = imageData.data[i];
      if (useEncryption) {
        //ENCRYPT DATA
      }
      let color = data.toString(2);
      color = "00000000".substr(color.length) + color;
      result += color;
    }

    return result;
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

        let bufferString = convertArrayBufferToBinaryString(buffer);

        this.setState({buffer: bufferString});
        let result = [];
        for (let i = 0; i < sourceLength; i++) {
          let color = sourceImgData.data[i].toString(2);
          if (hidingOption === "sequence") {
            if (i < 1) {
              color = color.substr(0, color.length-1) + "1";
            } else if (i < 2017) { //1+256*8-32
              color = color.substr(0, color.length-1) + binaryFileName[i-1];
            } else if (i < 2049) {
              color = color.substr(0, color.length-1) + fileSize[i-2017];
            } else {
              if (i < 2049 + bufferLength * 8) {
                color = color.substr(0, color.length-1) + bufferString[i-2049];
              } else {
              }
            }
          } else {
            //hidingOption === "random"
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
      if (hidingOption === "sequence") {
        let color = sourceImgData.data[i].toString(2);
        let lsb = color[color.length-1];
        temp += lsb;
      } else {
      }
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
    for (let i = 0; i < fileSize * 8; i++) {
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

    let resultArray = convertBinaryArrayToArrayBuffer(result);
    
    if (useEncryption) {
      resultArray = decodeFile(resultArray, encryptionKey);
    }

    downloadBinaryFile(fileName, resultArray);
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

  convertPBC_CGC(bitplanesArray) {
    let result = [];
    let modRemainder = bitplanesArray.length % 8;
    for (let i = 0; i < bitplanesArray.length; i++) {
      if (i < bitplanesArray.length-modRemainder) {
        if (i % 8 === 0) {
          result.push(bitplanesArray[i]);
        } else {
          let bitplane = [];
          for (let j = 0; j < 64; j++) {
            bitplane.push(this.xor(bitplanesArray[i-1][j], bitplanesArray[i][j]));
          }
          result.push(bitplane);
        }
      } else {
        result.push(bitplanesArray[i]);
      }
    }

    return result;
  }

  convertPBC_CGC(bitplanesArray) {
    let result = [];
    let modRemainder = bitplanesArray.length % 8;
    for (let i = 0; i < bitplanesArray.length; i++) {
      if (i < bitplanesArray.length-modRemainder) {
        if (i % 8 === 0) {
          result.push(bitplanesArray[i]);
        } else {
          let bitplane = [];
          for (let j = 0; j < 64; j++) {
            bitplane.push(this.xor(bitplanesArray[i-1][j], bitplanesArray[i][j]));
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
      let buffer = new Uint8Array(dataBuffer.length + 247);
      
      const { fileName } = this.state;
      let fileNameArray = convertStringToArrayBuffer(fileName);

      let bufferSize = convertStringToArrayBuffer(dataBuffer.length.toString());

      if (hidingOption === "sequence") {
        buffer[0] = 1
      } else {
        buffer[0] = 0;
      }

      for (let i = 236; i > 0; i--) {
        let idx = Math.abs(i-236);
        if (idx < fileNameArray.length) {
          buffer[i] = fileNameArray[idx];
        } else {
          buffer[i] = 0;
        }
      }

      for (let i = 246; i > 236; i--) {
        let idx = Math.abs(i-246);
        if (idx < bufferSize.length) {
          buffer[i] = bufferSize[idx];
        } else {
          buffer[i] = 0;
        }
      }

      const { useEncryption } = this.state;
      if (useEncryption) {
        dataBuffer = encodeFile(dataBuffer, encryptionKey);
      }

      for (let i = 0; i < dataBuffer.length; i++) {
        buffer[i+247] = dataBuffer[i];
      }
      let dataBitplanes = convertArrayBufferToBitplanesArray(buffer);
      let sourceBitplanes = convertArrayBufferToBitplanesArray(sourceImgData.data);
      sourceBitplanes = this.convertPBC_CGC(sourceBitplanes);

      const alpha = 0.3;
      let dataCounter = 0;
      let conjugationMap = [];
      if (hidingOption === "sequence") {
        for(let i = 0; i < sourceBitplanes.length; i++) {
          if (this.calculateComplexity(sourceBitplanes[i]) < alpha) {
            if (dataCounter < dataBitplanes.length) {
              let complexity = this.calculateComplexity(dataBitplanes[dataCounter]);
              if (complexity > alpha) {
                sourceBitplanes[i] = dataBitplanes[dataCounter];
              } else {
                conjugationMap.push(i);
                let conjugation = this.conjugate(dataBitplanes[dataCounter]);
                sourceBitplanes[i] = conjugation;
              }
              dataCounter++;
            } else {
              //Insert conjugation map
              break;
            }
          }
        }
      } else {

      }

      sourceBitplanes = this.convertPBC_CGC(sourceBitplanes);
      let result = convertBitplanesArrayToArrayBuffer(sourceBitplanes);
      this.renderResultImg(sourceImgURL, result);
    });
  }

  getBPCS(sourceImgURL, encryptionKey) {
    let sourceImgData = this.getImageData(sourceImgURL);
    let sourceBitplanes = convertArrayBufferToBitplanesArray(sourceImgData.data);

    const alpha = 0.3;
    let result = [];
    for(let i = 0; i < sourceBitplanes.length; i++) {
      if (this.calculateComplexity(sourceBitplanes[i]) > alpha) {
        result.push(sourceBitplanes[i]);
      }
    }
    
    let resultArray = convertBitplanesArrayToArrayBuffer(result);

    let hidingOption = null;
    let fileName = "";
    let fileSize = "";
    
    if (resultArray[0] === 1) {
      hidingOption = "sequence";
    } else {
      hidingOption = "random";
    }

    if (hidingOption === "sequence") {
      for (let i = 1; i < 247; i++) {
        if (i < 237) {
          fileName += String.fromCharCode(resultArray[i]);
        } else {
          fileSize += String.fromCharCode(resultArray[i]);
        }
      }
    } else {

    }

    console.log(fileName);
    console.log(hidingOption);
    // downloadBinaryFile("result.png", resultArray);
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
