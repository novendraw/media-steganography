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
    };
  }

  encrypt(plainText, key) {
    //ENCRYPTION ALGORITHM
  }

  decrypt(cipherText, key) {
    //DECRYPTION ALGORITHM
  }

  handleSubmit = (event) => {
    event.preventDefault();
    let sourceImg = event.target.inputSourceImg;
    let keyImg = event.target.inputKeyImg;

    if (sourceImg.files.length > 0 && keyImg.files.length > 0) {
      const { sourceImg, keyImg } = this.state;
      let methodOption = event.target.methodOption.value;
      let useEncryption = event.target.useEncryption.checked;
      let hidingOption = event.target.hidingOption.value;
      let readResult = readTwoFiles(sourceImg, keyImg);
      readResult.then(([sourceArray, keyArray]) => {
        let sourceBuffer = new Uint8Array(sourceArray);
        let keyBuffer = new Uint8Array(keyArray);
        if (this.action === "encrypt") {
          //CALL ENCRYPTION WITH NECESSARY PARAMS
          this.encrypt(sourceBuffer, keyBuffer);
        } else {
          //CALL DECRYPTIOn WITH NECESSARY PARAMS
          this.decrypt(sourceBuffer, keyBuffer);
        }
      });
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
        } else if (type === "key") {
          this.setState({keyImg: fileData, keyImgURL: url});
        } else {
          this.setState({resultImgURL: url});
        }
      });
    } else {
      if (type === "source") {
        this.setState({sourceImg: null, sourceImgURL: null});
      } else if (type === "key") {
        this.setState({keyImg: null, keyImgURL: null});
      } else {
        this.setState({resultImg: null, resultImgURL: null});
      }
    }
  }

  render() {
    const { sourceImgURL, keyImgURL, resultImg, resultImgURL } = this.state;
    return (
      <React.Fragment>
        <Form onSubmit={this.handleSubmit} className="margin-bottom-md">
          <Row>
            <Col xs={4} className="content-start">
              <div className="content-center subheadline bold margin-bottom-sm">
                Source Media
              </div>
              <div className="content-center full-width image-container margin-bottom-xs">
                <img src={sourceImgURL} className="full-height"/>
              </div>
              <Form.Group>
                <Form.File id="inputSourceImg" label="Upload source image" onChange={(e) => this.renderImg(e.target.files, "source")}/>
              </Form.Group>
            </Col>

            <Col xs={4}>
              <div className="content-center subheadline bold margin-bottom-sm">
                Key Media
              </div>
              <div className="content-center full-width image-container margin-bottom-xs">
                <img src={keyImgURL} className="full-height"/>
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
                <img src={resultImgURL} className="full-height"/>
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
                onClick={() => (this.action = "encrypt")}
              >
                {" "}
                Encrypt
              </Button>

              <Button
                variant="info"
                type="submit"
                className="full-width"
                onClick={() => (this.action = "decrypt")}
              >
                {" "}
                Decrypt
              </Button>
            </Col>
          </Row>
        </Form>
      </React.Fragment>
    );
  }
}
