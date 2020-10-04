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
  downloadBinaryFile,
  mod,
  convertArrayBufferToString,
  encodeFile,
  decodeFile,
} from './helper';

import { 
  RIFFFile
} from 'riff-file';

import shuffleSeed from 'shuffle-seed';

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
      resultVidFilename: null,
      resultVidType: null,
    };
  }

  encrypt(plainText, message, frameOption, hidingOption, useEncryption, key, seed) {
    //ENCRYPTION ALGORITHM
    // Read AVI File
    let riff = new RIFFFile();
    riff.setSignature(plainText)
    
    // Find subChunks with format 'movi' indicating video data
    let iData = 0
    console.log(riff.signature)
    for (let i = 0; i < riff.signature.subChunks.length; i++) {
      if (riff.signature.subChunks[i].chunkId === 'LIST' && riff.signature.subChunks[i].format === 'movi') {
        iData = i
        break;
      }
    }
    let subChunksLength = riff.signature.subChunks[iData].subChunks.length
    let frames = []

    // Extract video data from AVI file, and divide it into frames
    for (let i = 0; i < subChunksLength; i++) {
      if (riff.signature.subChunks[iData].subChunks[i].chunkId[2] === 'd') {
        frames.push(riff.signature.subChunks[iData].subChunks[i])
      }
    }

    // Encrypt message if key !== -1
    let cipherText = plainText
    let messageLength = message.length
    if (useEncryption) {
      message = encodeFile(message, key)
    }

    // randomize frame sequence if frameOption === 'random'
    if (frameOption === 'random') {
      frames = shuffleSeed.shuffle(frames, seed)
    }
    console.log(frames)

    // convert Uint8Array to binary string
    let binaryMessage = ''
    for (let i = 0; i < messageLength; i++) {
      binaryMessage += ("000000000" + message[i].toString(2)).substr(-8)
    }
    console.log()
    // construct stream of frames used
    let bytesSize = 0
    let iFrame = 0
    let plainTextBytes = []
    while (bytesSize < binaryMessage.length) {
      let arrayBytes = []
      for (let i = frames[iFrame].chunkData.start; i < frames[iFrame].chunkData.end; i++) {
        arrayBytes.push(i)
      }
      if (hidingOption === 'random') {
        arrayBytes = shuffleSeed.shuffle(arrayBytes, seed)
      }
      plainTextBytes = plainTextBytes.concat(arrayBytes)
      bytesSize += frames[iFrame].chunkSize
      iFrame += 1
    }

    // LSB algorithm
    for (let i = 0; i < binaryMessage.length; i++) {
      let binaryPlainText = ("000000000" + plainText[plainTextBytes[i]].toString(2)).substr(-8)
      // console.log(binaryPlainText)
      // console.log(plainText[plainTextBytes[i]])
      binaryPlainText = binaryPlainText.substring(0, 7) + binaryMessage[i]
      let bytesPlainText = parseInt(binaryPlainText, 2)

      cipherText[plainTextBytes[i]] = bytesPlainText
    }

    this.setState({ resultVidFilename: "result" })
    this.setState({ resultVidType: "avi" })
    this.setState({ resultVid: cipherText })

  }

  decrypt(cipherText, message, frameOption, hidingOption, useEncryption, key, seed) {
    //DECRYPTION ALGORITHM
    // Read AVI File
    let riff = new RIFFFile();
    riff.setSignature(cipherText)

    // Find subChunks with format 'movi' indicating video data
    let iData = 0
    console.log(riff.signature)
    for (let i = 0; i < riff.signature.subChunks.length; i++) {
      if (riff.signature.subChunks[i].chunkId === 'LIST' && riff.signature.subChunks[i].format === 'movi') {
        iData = i
        break;
      }
    }
    let subChunksLength = riff.signature.subChunks[iData].subChunks.length
    let frames = []

    // Extract video data from AVI file, and divide it into frames
    for (let i = 0; i < subChunksLength; i++) {
      if (riff.signature.subChunks[iData].subChunks[i].chunkId[2] === 'd') {
        frames.push(riff.signature.subChunks[iData].subChunks[i])
      }
    }

    // Encrypt message if key !== -1
    let plainText = cipherText
    let messageLength = message.length
    

    // randomize frame sequence if frameOption === 'random'
    if (frameOption === 'random') {
      frames = shuffleSeed.shuffle(frames, seed)
    }
    console.log(frames)

    // convert Uint8Array to binary string
    let binaryMessage = ''
    for (let i = 0; i < messageLength; i++) {
      binaryMessage += ("000000000" + message[i].toString(2)).substr(-8)
    }
    
    // construct stream of frames used
    let bytesSize = 0
    let iFrame = 0
    let cipherTextBytes = []
    while (bytesSize < binaryMessage.length) {
      let arrayBytes = []
      for (let i = frames[iFrame].chunkData.start; i < frames[iFrame].chunkData.end; i++) {
        arrayBytes.push(i)
      }
      if (hidingOption === 'random') {
        arrayBytes = shuffleSeed.shuffle(arrayBytes, seed)
      }
      cipherTextBytes = cipherTextBytes.concat(arrayBytes)
      bytesSize += frames[iFrame].chunkSize
      iFrame += 1
    }

    // LSB algorithm
    let binaryOutputMessage = ''
    for (let i = 0; i < binaryMessage.length; i++) {
      let binaryCipherText = ("000000000" + cipherText[cipherTextBytes[i]].toString(2)).substr(-8)
      // console.log(binaryPlainText)
      // console.log(plainText[plainTextBytes[i]])
      binaryOutputMessage += binaryCipherText[7]
    }

    // divide outputMessage by 8
    binaryOutputMessage = binaryOutputMessage.match(/.{1,8}/g);

    // convert array of binary to array of int
    let outputMessage = new Uint8Array(binaryOutputMessage.length)
    for (let i = 0; i < binaryOutputMessage.length; i++) {
      outputMessage[i] = parseInt(binaryOutputMessage[i], 2)
    }

    // decode message if previously encoded
    if (useEncryption) {
      outputMessage = decodeFile(outputMessage, key)
    }

    this.setState({ resultVid: outputMessage })
  }

  getSeedFromKey(key) {
    let seed = 0
    for (let i = 0; i < key.length; i++) {
      seed += key.charCodeAt(i)
    }

    return seed
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
      let key = "-1";
      readResult.then(([sourceArray, messageArray]) => {
        let sourceBuffer = new Uint8Array(sourceArray);
        let messageBuffer = new Uint8Array(messageArray);
        if (this.action === "encrypt") {
          //CALL ENCRYPTION WITH NECESSARY PARAMS
          if (useEncryption) {
            key = prompt("Enter your key for Encryption:");
            if (key === null || key === "") {
              alert("Encryption cancelled");
              return;
            }
          }
          else {
            if (hidingOption === 'random' || frameOption === 'random') {
              key = prompt("Enter your encryption key for random seed:");
              if (key === null || key === "") {
                alert("Encryption cancelled");
                return;
              }
            }
          }
          seed = this.getSeedFromKey(key)
          this.setState({ seed: seed})
          this.encrypt(sourceBuffer, messageBuffer, frameOption, hidingOption, useEncryption, key, seed);
        } else {
          //CALL DECRYPTIOn WITH NECESSARY PARAMS
          if (useEncryption) {
            key = prompt("Enter your key for Decryption:");
            if (key === null || key === "") {
              alert("Decryption cancelled");
              return;
            }
          }
          else {
            if (hidingOption === 'random' || frameOption === 'random') {
              key = prompt("Enter your decryption key for random seed:");
              if (key === null || key === "") {
                alert("Decryption cancelled");
                return;
              }
            }
          }
          seed = this.getSeedFromKey(key)
          this.setState({ seed: seed })
          this.decrypt(sourceBuffer, messageBuffer, frameOption, hidingOption, useEncryption, key, seed);
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
    const { sourceVidURL, messageURL, resultVid, resultVidURL, resultVidFilename, resultVidType} = this.state;
    return (
      <React.Fragment>
        <Form onSubmit={this.handleSubmit} className="margin-bottom-md">
          <Row>
            <Col xs={4} className="content-start">
              <div className="content-center subheadline bold margin-bottom-sm">
                Source Media
              </div>
              <div className="content-center full-width margin-bottom-xs">
                {/* <ResponsiveEmbed aspectRatio="16by9">
                  <video src={sourceVidURL} className="full-height" controls/>
                </ResponsiveEmbed> */}
              </div>
              <Form.Group>
                <Form.File id="inputSourceVid" label="Upload source video" onChange={(e) => this.renderVid(e.target.files, "source")} accept="video/avi"/>
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
              <div className="full-width margin-bottom-xs">
                {/* <ResponsiveEmbed aspectRatio="16by9">
                  <video src={resultVidURL} className="full-height" controls/>
                </ResponsiveEmbed> */}
                Download Result Media
              </div>
              <Button
                variant="success"
                type="button"
                className="margin-bottom-xs"
                onClick={() => downloadBinaryFile(resultVidFilename, resultVidType, resultVid)}
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
