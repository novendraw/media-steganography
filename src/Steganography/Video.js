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
  convertArrayBufferToString,
} from './helper';

export default class Video extends React.PureComponent {
  constructor(props) {
    super(props);
    this.action = null;
    this.state = {
      sourceVid: null,
      sourceVidURL: null,
      message: null,
      messageURL: null,
      resultVid: null,
      seed: null,
    };
  }

  encrypt(plainText, message, frameOption, hidingOption, seed) {
    //ENCRYPTION ALGORITHM
    // console.log(plainText)
    // console.log(message)
    // console.log(frameOption)
    // console.log(hidingOption)
    // console.log(seed)

    let cipherText = plainText
    let pos = 10720
    let messageLength = message.length
    for (let i = 0; i < messageLength; i++) {
      cipherText[pos] = message[i]
      pos += 8
    }

    this.setState({ resultVid: cipherText })

  }

  decrypt(cipherText, message) {
    //DECRYPTION ALGORITHM
    let pos = 10720
    let messageLength = message.length
    let outputMessage = new Uint8Array(messageLength)
    for (let i = 0; i < messageLength; i++) {
      outputMessage[i] = cipherText[pos]
      pos += 8
    }

    outputMessage = outputMessage.buffer

    this.setState({ resultVid: outputMessage })
  }

  handleSubmit = (event) => {
    event.preventDefault();
    let sourceVid = event.target.inputSourceVid;
    let message = event.target.inputMessage;

    if (sourceVid.files.length > 0 && message.files.length > 0) {
      const { sourceVid, message } = this.state;
      let frameOption = event.target.frameOption.value;
      let useEncryption = event.target.useEncryption.checked;
      let hidingOption = event.target.hidingOption.value;
      let readResult = readTwoFiles(sourceVid, message);
      var seed;
      readResult.then(([sourceArray, messageArray]) => {
        let sourceBuffer = new Uint8Array(sourceArray);
        let messageBuffer = new Uint8Array(messageArray);
        if (this.action === "encrypt") {
          //CALL ENCRYPTION WITH NECESSARY PARAMS
          if (useEncryption) {
            seed = prompt("Enter your random seed for encryption:");
            if (seed == null || seed == "") {
              alert("Encryption cancelled");
            }
            else if (isNaN(parseInt(seed, 10))) {
              alert("Encryption cancelled. Seed should only be numbers")
            }
            else {
              this.setState({ seed: parseInt(seed, 10)})
              this.encrypt(sourceBuffer, messageBuffer, frameOption, hidingOption, parseInt(seed, 10));
            }
          }
          else {
            seed = "-1"
            this.setState({ seed: parseInt(seed, 10) })
            this.encrypt(sourceBuffer, messageBuffer, frameOption, hidingOption, parseInt(seed, 10));
          }
        } else {
          //CALL DECRYPTIOn WITH NECESSARY PARAMS
          this.decrypt(sourceBuffer, messageBuffer);
        }
      });
    } else {
      alert("Source Media and Message Media must Exist!");
    }
  }

  renderVid = (file, type) => {
    if (file.length > 0) {
      let fileData = file[0];
      let fileURL = readFileURL(fileData);
      fileURL.then(url => {
        if (type === "source") {
          this.setState({sourceVid: fileData, sourceVidURL: url});
        } else if (type === "message") {
          this.setState({message: fileData, messageURL: url});
        } else {
          this.setState({resultVidURL: url});
        }
      });
    } else {
      if (type === "source") {
        this.setState({sourceVid: null, sourceVidURL: null});
      } else if (type === "message") {
        this.setState({message: null, messageURL: null});
      } else {
        this.setState({resultVid: null, resultVidURL: null});
      }
    }
  }

  render() {
    const { sourceVidURL, messageURL, resultVid, resultVidURL } = this.state;
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
                Secret Message Media
              </div>
              <Form.Group>
                <Form.File id="inputMessage" label="Upload message file" onChange={(e) => this.renderVid(e.target.files, "message")}/>
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
              <Form.Group controlId="frameOption">
                <Form.Label>Frame Option</Form.Label>
                <Form.Control as="select">
                  <option value="sequence">Sequential</option>
                  <option value="random">Random</option>
                </Form.Control>
              </Form.Group>
              <Form.Group controlId="hidingOption">
                <Form.Label>Hiding Option</Form.Label>
                <Form.Control as="select">
                  <option value="sequence">Sequential</option>
                  <option value="random">Random</option>
                </Form.Control>
              </Form.Group>
              <Form.Group controlId="useEncryption">
                <Form.Check
                  type="checkbox"
                  label="Use Encryption"
                />
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
