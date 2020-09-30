import React from 'react';

import {
  Button,
  Col,
  Form,
  Row,
} from 'react-bootstrap';

import {
  convertArrayBufferToBinaryString,
  readFileAsArrayBuffer,
  readTwoFiles,
  readFileURL,
  downloadBinaryFile,
  mod,
} from './helper';

export default class Image extends React.PureComponent {
  constructor(props) {
    super(props);
    this.action = null;
    this.state = {
      fileName: "result.png",
      sourceImgURL: null,
      resultImgArray: null,
      resultImgURL: null,
      useEncryption: true,
    };
  }

  toggleEncryption = (event) => {
    this.setState({useEncryption: !event.target.checked});
  }

  saveFileName = (event) => {
    this.setState({fileName: event.target.value});
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

  convertFileNameToBinary(fileName) {
    let result = "";
    for (let i = 0; i < fileName.length; i++) {
      let binary = fileName.charCodeAt(i).toString(2);
      binary = "00000000".substr(binary.length) + binary;
      result += binary;
    }
    let remainderLength = 2016-result.length;
    let header = "0";
    header = header.repeat(remainderLength);
    result = header + result;
    return result;
  }
  

  LSBEmbed(sourceImgURL, fileToHide, encryptionKey, hidingOption) {
    let sourceImgData = this.getImageData(sourceImgURL);
    let sourceLength = sourceImgData.data.length;
    let fileData = readFileAsArrayBuffer(fileToHide);
    fileData.then(fileArray => {
      let buffer = new Uint8Array(fileArray);
      let bufferLength = buffer.length;
      
      if (sourceLength / 8 >= (bufferLength + 256*8)) { //64 bytes header for filesize and filename
        //Convert fileName to bits
        const { fileName } = this.state;
        let binaryFileName = this.convertFileNameToBinary(fileName);
        
        //Convert file size to bits
        let fileSize = bufferLength.toString(2);
        fileSize = "00000000000000000000000000000000".substr(fileSize.length) + fileSize;

        let bufferString = convertArrayBufferToBinaryString(buffer);
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
              }
            }
          } else {
            //hidingOption === "random"
          }
          result.push(color);
        }
        result = this.convertToDecimalArray(result);
        this.renderResultImg(sourceImgURL, result);
      } else {
        alert("Source capacity is not enough");
      }
    });
  }

  convertToDecimalArray(binaryArray) {
    let result = [];
    for (let i = 0; i < binaryArray.length; i++) {
      result.push(parseInt(binaryArray[i], 2));
    }
    return result;
  }

  convertToString(binaryString) {
    let string = binaryString.replace(/^0+/, '');
    let modRemainder = string.length % 8;
    if (modRemainder !== 0) {
      let header = "0";
      header = header.repeat(8 - modRemainder);
      string = header + string;
    }

    let result = "";
    while (string.length > 0) {
      let substr = string.substr(0, 8);
      result += String.fromCharCode(parseInt(substr, 2));
      string = string.substring(8);
    }

    return result;
  }

  getLSB(sourceImgURL, encryptionKey, hidingOption) {
    let sourceImgData = this.getImageData(sourceImgURL);
    let sourceLength = sourceImgData.data.length;
    let result = [];
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
    fileName = this.convertToString(fileName);

    let fileSize = temp.substr(2016, 2048);
    fileSize = parseInt(fileSize, 2);

    temp = "";
    for (let i = 0; i < fileSize * 8; i++) {
      let color = sourceImgData.data[2048+i].toString(2);
      let lsb = color[color.length-1];
      if (temp.length < 8) {
        if (i === fileSize-1) {
          result.push(temp);
        } else {
          temp += lsb;
        }
      } else {
        result.push(temp);
        temp = lsb;
      }
    }
    let resultArray = this.convertToDecimalArray(result); 
    downloadBinaryFile(fileName, resultArray);
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
          let resultArray = this.getLSB(sourceImgURL, encryptionKey, hidingOption);
        } else {
          alert("Source Media to Extract Must Exist!");
        }
      }
    } else {
      //BCPS
    }
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
    this.setState({resultImgURL: resultImg.src});
  }

  render() {
    const { sourceImgURL, resultImgArray, resultImgURL, useEncryption } = this.state;
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
                    onClick={() => downloadBinaryFile(this.state.fileName, resultImgArray)}
                  >
                    {" "}
                    Download Result
                  </Button>
                </Col>
              </Row>
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
                <Form.Label>Full Key</Form.Label>
                <Form.Control
                  type="text"
                  readOnly={useEncryption}
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
