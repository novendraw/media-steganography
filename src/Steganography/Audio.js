import React from 'react';

import {Button, Col, Form, Row,} from 'react-bootstrap';
import {
    convertArrayBufferToBinaryString,
    convertBinaryStringToArrayBuffer,
    convertBinaryStringToString,
    convertStringToBinaryString,
    decodeFile,
    encodeFile,
    readFileAsArrayBuffer
} from "./helper";

export default class Audio extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            useEncryption: false,
            useRandom: false,
            hide: true,
            audioSrc: "",
            audioResult: "",
            extractedMessage: "",
            sourceFilename: "",
            messageFilename: ""
        };

        this.getFileName = this.getFileName.bind(this);
        this.getMessage = this.getMessage.bind(this);
        this.hideMessage = this.hideMessage.bind(this);
        this.extractMessage = this.extractMessage.bind(this);
        this.count_psnr = this.count_psnr.bind(this);
    }

    toggleEncryption = (event) => {
        this.setState({useEncryption: event.target.checked});
    }

    toggleHiding = (event) => {
        this.setState({useRandom: event.target.value === "random"});
    }

    toggleHide = (event) => {
        this.setState({hide: event.target.value === "hide"});
    }

    handleUpload = async (event) => {
        let files = event.target.files;
        if (files.length > 0) {
            this.setState({sourceFilename: files[0].name, audioSrc: URL.createObjectURL(files[0])});
        }
    }

    async getMessage() {
        let message = document.getElementById("messageFile").files[0];
        if (message !== undefined) {
            message = new Uint8Array(await readFileAsArrayBuffer(message));
            if (this.state.useEncryption) {
                message = encodeFile(message, document.getElementById('audiokey').value);
            }
            return message
        } else {
            alert("Please input message");
        }
    }

    async getFileName() {
        let message = document.getElementById("messageFile").files[0];
        if (message !== undefined) {
            return message.name
        } else {
            alert("Please input message");
        }
    }

    async hideMessage(event) {
        event.preventDefault();
        if (this.state.useEncryption || this.state.useRandom) {
            if (document.getElementById('audiokey').value === "") {
                alert("please input key");
                return;
            }
        }
        let files = document.getElementById('inputSourceAudio').files;
        let source = new Uint8Array(await readFileAsArrayBuffer(files[0]));
        source = convertArrayBufferToBinaryString(source);
        let message = convertArrayBufferToBinaryString(await this.getMessage());
        if (source.length < (message.length + 2049) * 8) {
            alert("message too large");
            return;
        }

        let embedded = "";
        if (this.state.useRandom) {
            embedded += "0";
        } else {
            embedded += "1";
        }
        let filename = await this.getFileName();
        filename = convertStringToBinaryString(filename);
        filename = "0".repeat(2016 - filename.length) + filename;
        embedded += filename;
        let fileSize = message.length / 8;
        fileSize = fileSize.toString(2);
        fileSize = "0".repeat(32 - fileSize.length) + fileSize;
        embedded += fileSize;
        embedded += message;
        let result = source.substr(0, 359);
        let i = 359;
        if (this.state.useRandom) {
            let rand = require('random-seed').create();
            rand.seed(document.getElementById('audiokey').value);
            while ((embedded.length > ((i - 351) / 8) - 1) && (i < 16744)) {
                if ((i + 1) % 8 !== 0 ||
                    embedded.charAt(((i - 351) / 8) - 1) === undefined ||
                    embedded.charAt(((i - 351) / 8) - 1) === "") {
                    result += source.charAt(i);
                } else {
                    result += embedded.charAt(((i - 351) / 8) - 1);
                }
                i++;
            }
            let remainder = source.length - result.length;
            result += source.substr(i, source.length - result.length);
            remainder /= 8;
            let randomizedSet = new Set();
            for (let j = 0; j < message.length; j++) {
                let entry = rand(remainder + 1);
                while (randomizedSet.has(entry)) {
                    entry = rand(remainder + 1);
                }
                randomizedSet.add(entry);
            }
            let randomizedArray = Array.from(randomizedSet);
            result = result.split("");
            for (let k = 0; k < message.length; k++) {
                result[16751 + randomizedArray[k] * 8] = message[k];
            }
            result = result.join("");
        } else {
            while (embedded.length > ((i - 351) / 8) - 1) {
                if ((i + 1) % 8 !== 0 ||
                    embedded.charAt(((i - 351) / 8) - 1) === undefined ||
                    embedded.charAt(((i - 351) / 8) - 1) === "") {
                    result += source.charAt(i);
                } else {
                    result += embedded.charAt(((i - 351) / 8) - 1);
                }
                i++;
            }
            result += source.substr(i, source.length - result.length);
        }

        result = convertBinaryStringToArrayBuffer(result);
        let file = new File([result], this.state.sourceFilename, {
            lastModified: document.getElementById("inputSourceAudio").files[0].lastModified,
            lastModifiedDate: document.getElementById("inputSourceAudio").files[0].lastModifiedDate
        });
        this.setState({audioResult: URL.createObjectURL(file)});
        this.count_psnr(convertBinaryStringToArrayBuffer(source), result);
    }

    count_psnr(source, result) {
        let sum = 0;
        for (let i = 0; i < source.length; i++) {
            sum += Math.pow((source[i] - result[i]), 2);
        }
        let psnr = 20 * Math.log10(255 / Math.sqrt(sum / source.length));
        alert("PSNR : " + psnr.toFixed(2) + " dB");
    }

    async extractMessage(event) {
        event.preventDefault();
        if (!this.state.useRandom && !this.state.useEncryption) {
            document.getElementById('audiokey').value = "";
        }
        if (this.state.useEncryption || this.state.useRandom) {
            if (document.getElementById('audiokey').value === "") {
                alert("please input key");
                return;
            }
        }
        let files = document.getElementById('inputSourceAudio').files;
        let source = new Uint8Array(await readFileAsArrayBuffer(files[0]));
        source = convertArrayBufferToBinaryString(source);
        if (source.charAt(359) === '0') {
            this.setState({useRandom: true});
        } else {
            this.setState({useRandom: false});
        }
        let filename = "";

        for (let i = 0; i < 2016; i++) {
            filename += source.charAt(367 + i * 8);
        }
        this.setState({messageFilename: convertBinaryStringToString(filename)});

        let size = "";

        for (let i = 0; i < 32; i++) {
            size += source.charAt(16495 + i * 8);
        }

        size = parseInt(size, 2) * 8;

        let message = "";
        if (this.state.useRandom) {
            if (document.getElementById('audiokey').value === "") {
                alert("please input key");
                return;
            }
            let rand = require('random-seed').create();
            rand.seed(document.getElementById('audiokey').value);
            let remainder = source.length - 16744;
            remainder /= 8;
            let randomizedSet = new Set();
            for (let j = 0; j < size; j++) {
                let entry = rand(remainder + 1);
                while (randomizedSet.has(entry)) {
                    entry = rand(remainder + 1);
                }
                randomizedSet.add(entry);
            }
            let randomizedArray = Array.from(randomizedSet);
            for (let k = 0; k < size; k++) {
                message += source.charAt(16751 + randomizedArray[k] * 8);
            }
        } else {
            for (let i = 0; i < size; i++) {
                message += source.charAt(16751 + i * 8);
            }
        }
        message = convertBinaryStringToArrayBuffer(message);
        if (this.state.useEncryption) {
            if (document.getElementById('audiokey').value === "") {
                alert("please input key");
                return;
            }
            message = decodeFile(message, document.getElementById('audiokey').value);
        }
        let file = new File([message], this.state.messageFilename);
        this.setState({extractedMessage: URL.createObjectURL(file)});
    }


    render() {
        return (
            <React.Fragment>
                <Form className="margin-bottom-md">
                    <Row>
                        <Col xs={4} className="content-start">
                            <div className="content-center subheadline bold margin-bottom-sm">
                                Source Media
                            </div>
                            <div className="content-center full-width margin-bottom-xs">
                                <audio src={this.state.audioSrc} controls controlsList="nodownload">
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                            <Form.Group>
                                <Form.File id="inputSourceAudio" label="Upload source audio"
                                           accept="audio/wav" onChange={this.handleUpload}/>
                            </Form.Group>
                        </Col>

                        <Col xs={4}>
                            <div className="content-center subheadline bold margin-bottom-sm">
                                Message
                            </div>
                            <Row>
                                <Form.Group hidden={!this.state.hide}>
                                    <Form.File id="messageFile"/>
                                </Form.Group>
                                <Col>
                                    <a href={this.state.extractedMessage} download={this.state.messageFilename}>
                                        <Button
                                            variant="success"
                                            type="button"
                                            block="inline"
                                            className="margin-bottom-xs"
                                            hidden={this.state.hide}
                                            disabled={this.state.extractedMessage === ""}
                                        >Download Message</Button></a>
                                </Col>
                            </Row>
                        </Col>

                        <Col xs={4} hidden={!this.state.hide}>
                            <div className="content-center subheadline bold margin-bottom-sm">
                                Result Media
                            </div>
                            <div className="content-center full-width margin-bottom-xs">
                                <audio src={this.state.audioResult} controls controlsList="nodownload">
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                            <Row>
                                <Col>
                                    <a href={this.state.audioResult} download={this.state.sourceFilename}>
                                        <Button
                                            variant="success"
                                            type="button"
                                            block="inline"
                                            className="margin-bottom-xs"
                                            disabled={this.state.audioResult === ""}
                                        >Download Result</Button></a>
                                </Col>
                            </Row>
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
                            <Form.Group controlId="wantOption" onChange={this.toggleHide}>
                                <Form.Label>What you want to do?</Form.Label>
                                <Form.Control as="select">
                                    <option value="hide">Hide message to media</option>
                                    <option value="extract">Extract message from media</option>
                                </Form.Control>
                            </Form.Group>
                            <Form.Group controlId="audiokey"
                                        hidden={!this.state.useEncryption && !this.state.useRandom}>
                                <Form.Label>Encryption Key</Form.Label>
                                <Form.Control
                                    type="text"
                                />
                            </Form.Group>
                            <Form.Group controlId="randomOption" onChange={this.toggleHiding} hidden={!this.state.hide}>
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
                                hidden={!this.state.hide}
                                onClick={this.hideMessage}
                            >Hide</Button>

                            <Button
                                variant="info"
                                type="submit"
                                className="full-width"
                                hidden={this.state.hide}
                                onClick={this.extractMessage}
                            >Extract</Button>
                        </Col>
                    </Row>
                </Form>
            </React.Fragment>
        );
    }
}
