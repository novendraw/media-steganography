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
      if (sourceLength >= (bufferLength*8*8 + 256*8*8)) {
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
            if (i < 2016) { //256*8-32
              color = color.substr(0, color.length-1) + binaryFileName[i];
            } else if (i < 2048) {
              color = color.substr(0, color.length-1) + fileSize[i-2016];
            } else {
              if (i < 2048 + bufferLength * 8) {
                color = color.substr(0, color.length-1) + bufferString[i-2048];
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

  getLSB(sourceImgURL, encryptionKey, hidingOption) {
    let sourceImgData = this.getImageData(sourceImgURL);
    let sourceLength = sourceImgData.data.length;
    let temp = "";

    for (let i = 0; i < 2048 && i < sourceLength; i++) {
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
      let color = sourceImgData.data[2048+i].toString(2);
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
          this.getLSB(sourceImgURL, encryptionKey, hidingOption);
        } else {
          alert("Source Media to Extract Must Exist!");
        }
      }
    } else {
      //BCPS
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
