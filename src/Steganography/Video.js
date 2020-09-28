import React from 'react';

import {
  Button,
  Col,
  Form,
  Row,
  ResponsiveEmbed
} from 'react-bootstrap';

import {
  readFileAsArrayBuffer,
  readTwoFiles,
  readFileURL,
  downloadFile,
  mod,
} from './helper';

export default class Video extends React.PureComponent {
  constructor(props) {
    super(props);
    this.action = null;
    this.state = {
      sourceVid: null,
      sourceVidURL: null,
      keyVid: null,
      keyVidURL: null,
      resultVid: null,
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
    let sourceVid = event.target.inputSourceVid;
    let keyVid = event.target.inputKeyVid;

    if (sourceVid.files.length > 0 && keyVid.files.length > 0) {
      const { sourceVid, keyVid } = this.state;
      let methodOption = event.target.methodOption.value;
      let useEncryption = event.target.useEncryption.checked;
      let hidingOption = event.target.hidingOption.value;
      let readResult = readTwoFiles(sourceVid, keyVid);
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

  renderVid = (file, type) => {
    if (file.length > 0) {
      let fileData = file[0];
      let fileURL = readFileURL(fileData);
      fileURL.then(url => {
        if (type === "source") {
          this.setState({sourceVid: fileData, sourceVidURL: url});
        } else if (type === "key") {
          this.setState({keyVid: fileData, keyVidURL: url});
        } else {
          this.setState({resultVidURL: url});
        }
      });
    } else {
      if (type === "source") {
        this.setState({sourceVid: null, sourceVidURL: null});
      } else if (type === "key") {
        this.setState({keyVid: null, keyVidURL: null});
      } else {
        this.setState({resultVid: null, resultVidURL: null});
      }
    }
  }

  render() {
    const { sourceVidURL, keyVidURL, resultVid, resultVidURL } = this.state;
    return (
      <React.Fragment>
        <Form onSubmit={this.handleSubmit} className="margin-bottom-md">
          <Row>
            <Col xs={4} className="content-start">
              <div className="content-center subheadline bold margin-bottom-sm">
                Source Media
              </div>
              <div className="content-center full-width margin-bottom-xs">
                <ResponsiveEmbed aspectRatio="16by9">
                  <video src={sourceVidURL} className="full-height" controls/>
                </ResponsiveEmbed>
              </div>
              <Form.Group>
                <Form.File id="inputSourceVid" label="Upload source video" onChange={(e) => this.renderVid(e.target.files, "source")}/>
              </Form.Group>
            </Col>

            <Col xs={4}>
              <div className="content-center subheadline bold margin-bottom-sm">
                Key Media
              </div>
              <Form.Group>
                <Form.File id="inputKeyVid" label="Upload key file" onChange={(e) => this.renderVid(e.target.files, "key")}/>
              </Form.Group>
            </Col>

            <Col xs={4}>
              <div className="content-center subheadline bold margin-bottom-sm">
                Result Media
              </div>
              <div className="content-center full-width margin-bottom-xs">
                <ResponsiveEmbed aspectRatio="16by9">
                  <video src={resultVidURL} className="full-height" controls/>
                </ResponsiveEmbed>
              </div>
              <Button
                variant="success"
                type="button"
                className="margin-bottom-xs"
                onClick={() => downloadFile("result", resultVid)}
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
