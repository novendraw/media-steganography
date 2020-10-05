import React from 'react';

import {
  Button,
  Col,
  Form,
  Row,
  ResponsiveEmbed
} from 'react-bootstrap';

import {
  readTwoFiles,
  readFileURL,
  downloadBinaryFile,
  encodeFile,
  decodeFile,
  convertBinaryStringToString,
  convertStringToBinaryString,
  convertStringToArrayBuffer,
  convertArrayBufferToString,
  convertArrayBufferToBinaryString,
  convertBinaryStringToArrayBufferWithLeadingZeroes,
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
      resultVidURL: null,
      seed: null,
      resultFilename: "",
      useEncryption: false,
      psnrValue: null,
    };
  }

  LSBEmbed(plainText, message, messageFilename, frameOption, hidingOption, useEncryption, key, seed) {
    //ENCRYPTION ALGORITHM
    // Read AVI File
    let riff = new RIFFFile();
    riff.setSignature(plainText)
    console.log(riff.signature)
    // Find subChunks with format 'movi' indicating video data
    let iData = 0
    for (let i = 0; i < riff.signature.subChunks.length; i++) {
      if (riff.signature.subChunks[i].chunkId === 'LIST' && riff.signature.subChunks[i].format === 'movi') {
        iData = i
        break;
      }
    }
    let subChunksLength = riff.signature.subChunks[iData].subChunks.length
    let frames = []

    // Extract video data from AVI file, and divide it into frames
    // Also counts data size
    let dataSize = 0
    for (let i = 0; i < subChunksLength; i++) {
      if (riff.signature.subChunks[iData].subChunks[i].chunkId[2] === 'd') {
        frames.push(riff.signature.subChunks[iData].subChunks[i])
        dataSize += riff.signature.subChunks[iData].subChunks[i].chunkSize
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

    if (messageLength * 8 > dataSize) {
      alert("Source capacity is not enough");
      return
    }

    // convert Uint8Array to binary string
    let binaryMessage = ''
    for (let i = 0; i < messageLength; i++) {
      binaryMessage += ("000000000" + message[i].toString(2)).substr(-8)
    }

    // construct stream of frames used
    let bytesSize = 0
    let iFrame = 0
    let plainTextBytes = []
    let framesSize = []
    while (bytesSize < binaryMessage.length) {
      let arrayBytes = []
      for (let i = frames[iFrame].chunkData.start; i < frames[iFrame].chunkData.end; i++) {
        arrayBytes.push(i)
      }
      framesSize.push(frames[iFrame].chunkSize)
      if (hidingOption === 'random') {
        arrayBytes = shuffleSeed.shuffle(arrayBytes, seed)
      }
      plainTextBytes = plainTextBytes.concat(arrayBytes)
      bytesSize += frames[iFrame].chunkSize
      iFrame += 1
    }
    let diff = bytesSize - binaryMessage.length
    // framesSize[framesSize.length - 1] = framesSize[framesSize.length - 1] - diff

    // LSB algorithm
    let bytesDifference = []
    for (let i = 0; i < binaryMessage.length; i++) {
      let binaryPlainText = ("000000000" + plainText[plainTextBytes[i]].toString(2)).substr(-8)
      binaryPlainText = binaryPlainText.substring(0, 7) + binaryMessage[i]
      let bytesPlainText = parseInt(binaryPlainText, 2)
      
      bytesDifference.push(Math.pow(Math.abs(cipherText[plainTextBytes[i]] - bytesPlainText), 2))
      cipherText[plainTextBytes[i]] = bytesPlainText
    }

    for (let i = 0; i < diff; i++) {
      bytesDifference.push(0)
    }

    // insert metadata to 'JUNK'
    // find 'JUNK' location
    let iJunk = 0
    for (let i = 0; i < riff.signature.subChunks.length; i++) {
      if (riff.signature.subChunks[i].chunkId === 'JUNK') {
        iJunk = i
        break;
      }
    }
    let junkStart = riff.signature.subChunks[iJunk].chunkData.start
    let junkEnd = riff.signature.subChunks[iJunk].chunkData.end

    let setting = ''
    let filename = ''
    let filesize = ''
    // frame and hiding option
    if (frameOption === 'random') {
      setting += '0'
    }
    else {
      setting += '1'
    }
    if (hidingOption === 'random') {
      setting += '0'
    }
    else {
      setting += '1'
    }
    setting = '000000' + setting
    setting = parseInt(setting, 2)
    cipherText[junkStart] = setting
    iJunk = junkStart + 1

    // filename
    let filenameBinary = convertStringToBinaryString(messageFilename)

    while (filenameBinary.length < 2016) {
      filenameBinary = '0' + filenameBinary
    }

    let filenameArrayBuffer = convertBinaryStringToArrayBufferWithLeadingZeroes(filenameBinary)
    for (let i = 0; i < 252; i++) {
      cipherText[iJunk] = filenameArrayBuffer[i]
      iJunk += 1
    }

    // filesize
    let filesizeBinary = messageLength.toString(2)
    while (filesizeBinary.length < 32) {
      filesizeBinary = '0' + filesizeBinary
    }
    let filesizeArrayBuffer = convertBinaryStringToArrayBufferWithLeadingZeroes(filesizeBinary)
    for (let i = 0; i < 4; i++) {
      cipherText[iJunk] = filesizeArrayBuffer[i]
      iJunk += 1
    }

    // calculate psnr
    let averagePsnrArray = []
    let iDiff = 0;
    for (let i = 0; i < framesSize.length; i++) {
      let psnr = 0;
      let rms = 0;
      let total = 0;
      for (let j = 0; j < framesSize[i]; j++) {
        total += bytesDifference[iDiff]
        iDiff += 1
      }
      rms = Math.sqrt(total / framesSize[i])
      psnr = 20 * Math.log10(255/rms)
      averagePsnrArray.push(psnr)
    }

    let averagePsnr = 0
    for (let i = 0; i < averagePsnrArray.length; i++) {
      averagePsnr += averagePsnrArray[i]
    }
    averagePsnr = averagePsnr / averagePsnrArray.length

    this.setState({ psnrValue: averagePsnr })
    this.setState({ resultFilename: "result.avi" })
    this.setState({ resultVid: cipherText })

  }

  LSBExtract(cipherText, useEncryption, key, seed) {
    //DECRYPTION ALGORITHM
    // Read AVI File
    let riff = new RIFFFile();
    riff.setSignature(cipherText)

    // extract metadata
    // extract message length
    let iJunk = 0
    for (let i = 0; i < riff.signature.subChunks.length; i++) {
      if (riff.signature.subChunks[i].chunkId === 'JUNK') {
        iJunk = i
        break;
      }
    }
    let junkStart = riff.signature.subChunks[iJunk].chunkData.start
    let junkEnd = riff.signature.subChunks[iJunk].chunkData.end

    let messageType = []
    messageType.push(cipherText[junkStart])
    messageType = convertArrayBufferToBinaryString(messageType)
    let frameOption = messageType[6]
    let hidingOption = messageType[7]
    if (frameOption === '0') {
      frameOption = 'random'
    }
    else {
      frameOption = 'sequence'
    }
    if (hidingOption === '0') {
      hidingOption = 'random'
    }
    else {
      hidingOption = 'sequence'
    }
    iJunk = junkStart + 1

    // filename
    let filenameArrayBuffer = new Uint8Array(252)
    for (let i = 0; i < 252; i++) {
      filenameArrayBuffer[i] = cipherText[iJunk]
      iJunk += 1
    }
    let filenameString = convertBinaryStringToString(convertArrayBufferToBinaryString(filenameArrayBuffer))

    // message size
    let messageLengthBuffer = new Uint8Array(4)
    for (let i = 0; i < 252; i++) {
      messageLengthBuffer[i] = cipherText[iJunk]
      iJunk += 1
    }
    let messageLength = parseInt(convertArrayBufferToBinaryString(messageLengthBuffer), 2)
    let binaryMessageLength = messageLength * 8;

    // Find subChunks with format 'movi' indicating video data
    let iData = 0
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
    

    // randomize frame sequence if frameOption === 'random'
    if (frameOption === 'random') {
      frames = shuffleSeed.shuffle(frames, seed)
    }
    
    // construct stream of frames used
    let bytesSize = 0
    let iFrame = 0
    let cipherTextBytes = []
    while (bytesSize < binaryMessageLength) {
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
    for (let i = 0; i < binaryMessageLength; i++) {
      let binaryCipherText = ("000000000" + cipherText[cipherTextBytes[i]].toString(2)).substr(-8)
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

    this.setState({ resultFilename: filenameString })
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
    let messageFilename
    if (this.action === "LSBEmbed" && sourceVid.files.length > 0 && message.files.length > 0) {
      messageFilename = message.files[0].name
    }
    else if (this.action === "LSBEmbed" && (sourceVid.files.length <= 0 || message.files.length <= 0)) {
      alert("Source Media and Message Media must Exist!");
      return
    }

    if ((this.action === 'LSBEmbed' && sourceVid.files.length > 0 && message.files.length > 0) || (this.action === 'LSBExtract' && sourceVid.files.length > 0)) {
      let { sourceVid, message } = this.state;
      let frameOption = event.target.frameOption.value;
      let useEncryption = event.target.useEncryption.checked;
      let hidingOption = event.target.hidingOption.value;
      let key = event.target.key.value;

      if (this.action === 'LSBExtract') {
        message = new File([""], "filename");
      }
      let readResult = readTwoFiles(sourceVid, message);
      var seed;

      readResult.then(([sourceArray, messageArray]) => {
        let sourceBuffer = new Uint8Array(sourceArray);
        let messageBuffer = new Uint8Array(messageArray);
        if (this.action === "LSBEmbed") {
          //CALL ENCRYPTION WITH NECESSARY PARAMS
          if (useEncryption) {
            if (key === null || key === "") {
              alert("Encryption cancelled. Provide key for encryption.");
              return;
            }
          }
          if (hidingOption === 'random' || frameOption === 'random') {
            if (key === null || key === "") {
              alert("Encryption cancelled. Provide key for random seed.");
              return;
            }
          }
          seed = this.getSeedFromKey(key)
          this.setState({ seed: seed})
          this.LSBEmbed(sourceBuffer, messageBuffer, messageFilename, frameOption, hidingOption, useEncryption, key, seed);
        } else {
          //CALL DECRYPTIOn WITH NECESSARY PARAMS
          if (useEncryption) {
            if (key === null || key === "") {
              alert("Decryption cancelled. Provide key for decryption.");
              return;
            }
          }
          if (hidingOption === 'random' || frameOption === 'random') {
            if (key === null || key === "") {
              alert("Decryption cancelled. Provide key for random seed.");
              return;
            }
          }
          seed = this.getSeedFromKey(key)
          this.setState({ seed: seed })
          this.LSBExtract(sourceBuffer, useEncryption, key, seed);
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

  toggleEncryption = (event) => {
    this.setState({ useEncryption: event.target.checked });
  }

  saveFileName = (event) => {
    this.setState({ resultFilename: event.target.value });
  }

  render() {
    const { sourceVidURL, messageURL, resultVid, resultVidURL, resultFilename, useEncryption, psnrValue} = this.state;
    return (
      <React.Fragment>
        <Form onSubmit={this.handleSubmit} className="margin-bottom-md">
          <Row>
            <Col xs={4} className="content-start">
              <div className="content-center subheadline bold margin-bottom-xxl">
                Source Media
              </div>
              <div className="body-text bold margin-bottom-sm">
                {/* <ResponsiveEmbed aspectRatio="16by9">
                  <video src={sourceVidURL} className="full-height" controls/>
                </ResponsiveEmbed> */}
                Choose source video
              </div>
              <Form.Group>
                <Form.File id="inputSourceVid" label="Upload source video" onChange={(e) => this.renderVid(e.target.files, "source")} accept="video/avi"/>
              </Form.Group>
            </Col>

            <Col xs={4}>
              <div className="content-center subheadline bold margin-bottom-xxl">
                File to Hide
              </div>
              <div className="body-text bold margin-bottom-sm">
                Choose file to hide within source video
              </div>
              <Form.Group>
                <Form.File id="inputMessage" onChange={(e) => this.renderVid(e.target.files, "message")}/>
              </Form.Group>
            </Col>

            <Col xs={4}>
              <div className="content-center subheadline bold margin-bottom-xxl">
                Result Media
              </div>
              <div className="body-text bold margin-bottom-sm">
                {/* <ResponsiveEmbed aspectRatio="16by9">
                  <video src={resultVidURL} className="full-height" controls/>
                </ResponsiveEmbed> */}
                Download Result Video
              </div>
              <Row>
                <div>Enter filename with extension</div>
              </Row>
              <Row>
                <Col className="no-indent">
                  <Form.Group controlId="filenameField">
                    <Form.Control
                      value={resultFilename}
                      type="text"
                      onChange={(event) => { this.saveFileName(event) }}
                    />
                  </Form.Group>
                </Col>
                <Col className="no-indent">
                  <Button
                    variant="success"
                    type="button"
                    className="margin-bottom-xs"
                    onClick={() => downloadBinaryFile(resultFilename, resultVid)}
                  >
                    {" "}
                    Download Result
                  </Button>
                </Col>
              </Row>
              <div>
                PSNR: {psnrValue}
              </div>
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Group controlId="useEncryption">
                <Form.Check
                  type="checkbox"
                  label="Use Encryption"
                  onChange={this.toggleEncryption}
                />
              </Form.Group>
              <Form.Group controlId="key">
                <Form.Label>Encryption Key</Form.Label>
                <Form.Control
                  type="text"
                  readOnly={!useEncryption}
                  ref={(ref) => {
                    this.key = ref;
                  }}
                />
              </Form.Group>
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
              <Button
                variant="primary"
                type="submit"
                className="full-width margin-bottom-xs"
                onClick={() => (this.action = "LSBEmbed")}
              >
                {" "}
                Hide
              </Button>

              <Button
                variant="info"
                type="submit"
                className="full-width"
                onClick={() => (this.action = "LSBExtract")}
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
