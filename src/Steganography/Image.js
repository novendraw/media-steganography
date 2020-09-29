import React from 'react';

import {
  Button,
  Col,
  Form,
  Row,
} from 'react-bootstrap';

import {
  readFileAsArrayBuffer,
  readTwoFiles,
  readFileURL,
  downloadFile,
  mod,
} from './helper';

export default class Image extends React.PureComponent {
  constructor(props) {
    super(props);
    this.action = null;
    this.state = {
      sourceImg: null,
      sourceImgURL: null,
      keyImg: null,
      keyImgURL: null,
      resultImg: null,
      useEncryption: true,
    };
  }

  toggleEncryption = (event) => {
    this.setState({useEncryption: !event.target.checked});
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
    // let result = {};
    // result.red = [];
    // result.green = [];
    // result.blue = [];
    // result.alpha = [];

    // for (let i = 0; i < imageData.data.length; i+=4) {
    //   result.red.push(imageData.data[i].toString(2));
    //   result.green.push(imageData.data[i+1].toString(2));
    //   result.blue.push(imageData.data[i+2].toString(2));
    //   result.alpha.push(imageData.data[i+3].toString(2));
    // }

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

  lsb(sourceImgURL, keyImgURL, encryptionKey, hidingOption) {
    let sourceImgData = this.getImageData(sourceImgURL);
    let keyImgData = this.getImageData(keyImgURL);
    let sourceLength = sourceImgData.data.length;
    let keyLength = keyImgData.data.length;
    if (sourceLength / 8 >= keyLength) {
      let keyString = this.getRGBAString(keyImgData, encryptionKey);
      let result = [];
      for (let i = 0; i < sourceImgData.data.length; i++) {
        let color = sourceImgData.data[i].toString(2);
        if (hidingOption === "sequence") {
          if (i < keyLength) {
            color = color.substr(0, color.length-1) + keyString[i];
          }
        } else {
          //hidingOption === "random"
        }
        
        result.push(color);
      }
      return result;
    } else {
      alert("LSB not possible with key image size");
    }
  }

  convertToDecimalArray(binaryArray) {
    let result = [];
    for (let i = 0; i < binaryArray.length; i++) {
      result.push(parseInt(binaryArray[i], 2));
    }
    return result;
  }

  handleSubmit = (event) => {
    event.preventDefault();
    let sourceImg = event.target.inputSourceImg;
    let keyImg = event.target.inputKeyImg;

    if (sourceImg.files.length > 0 && keyImg.files.length > 0) {
      const { sourceImg, sourceImgURL, keyImg, keyImgURL } = this.state;
      let methodOption = event.target.methodOption.value;
      let encryptionKey = event.target.encryptKey.value;
      let hidingOption = event.target.hidingOption.value;
      if (methodOption === "lsb") {
        if (this.action === "hide") {
          let resultArray = this.lsb(sourceImgURL, keyImgURL, encryptionKey, hidingOption);
          resultArray = this.convertToDecimalArray(resultArray);
          let resultImg = this.renderResultImg(sourceImgURL, resultArray);
        } else {
          //Extract
        }
      } else {
        //BCPS
      }
      
      // let readResult = readTwoFiles(sourceImg, keyImg);
      // readResult.then(([sourceArray, keyArray]) => {
      //   let sourceBuffer = new Uint8Array(sourceArray);
      //   let keyBuffer = new Uint8Array(keyArray);
      //   if (this.action === "encrypt") {
      //     //CALL ENCRYPTION WITH NECESSARY PARAMS
      //     this.encrypt(sourceBuffer, keyBuffer);
      //   } else {
      //     //CALL DECRYPTIOn WITH NECESSARY PARAMS
      //     this.decrypt(sourceBuffer, keyBuffer);
      //   }
      // });
    } else {
      alert("Source Media and Key Media must Exist!");
    }
  }

  renderImg = (file, type) => {
    if (file.length > 0) {
      let fileData = file[0];
      let fileURL = readFileURL(fileData);
      fileURL.then(url => {
        if (type === "source") {
          this.setState({sourceImg: fileData, sourceImgURL: url});
        } else {
          this.setState({keyImg: fileData, keyImgURL: url});
        }
      });
    } else {
      if (type === "source") {
        this.setState({sourceImg: null, sourceImgURL: null});
      } else {
        this.setState({keyImg: null, keyImgURL: null});
      }
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
    console.log(steganoArray);
    console.log(steganoClampedArray);
    let steganoImgData = new ImageData(steganoClampedArray, image.width, image.height);

    context.putImageData(steganoImgData, 0, 0);
    let resultImg = new Image();
    resultImg.src = canvas.toDataURL();
    this.setState({resultImgURL: resultImg.src});
  }

  render() {
    const { sourceImgURL, keyImgURL, resultImg, resultImgURL, useEncryption } = this.state;
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
                <Form.File id="inputSourceImg" label="Upload source image" onChange={(e) => this.renderImg(e.target.files, "source")} accept="image/x-png,image/bmp"/>
              </Form.Group>
            </Col>

            <Col xs={4}>
              <div className="content-center subheadline bold margin-bottom-sm">
                Media to Hide
              </div>
              <div className="content-center full-width image-container margin-bottom-xs">
                <img id="keyImg" src={keyImgURL} className="full-height"/>
              </div>
              <Form.Group>
                <Form.File id="inputKeyImg" label="Upload key image" onChange={(e) => this.renderImg(e.target.files, "key")}/>
              </Form.Group>
            </Col>

            <Col xs={4}>
              <div className="content-center subheadline bold margin-bottom-sm">
                Result Media
              </div>
              <div className="content-center full-width image-container margin-bottom-xs">
                <img id="resultImg" src={resultImgURL} className="full-height"/>
              </div>
              <Button
                variant="success"
                type="button"
                className="margin-bottom-xs"
                onClick={() => downloadFile("result", resultImg)}
              >
                {" "}
                Download Result
              </Button>
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
