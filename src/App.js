import React from 'react';
import { Tab, Row, Col, Nav } from "react-bootstrap";

import Header from "./Header";
import Image from "./Steganography/Image";
import Video from "./Steganography/Video";
import Audio from "./Steganography/Audio";

function App() {
  return (
    <div>
      <Header />
      <div className="content-fluid">
        <Tab.Container defaultActiveKey="image-steganography">
          <Row>
            <Col sm={2}>
              <Nav variant="pills" className="flex-column">
                <Nav.Item>
                  <Nav.Link eventKey="image-steganography">
                    Image Steganography
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="video-steganography">
                    Video Steganography
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="audio-steganography">
                    Audio Steganography
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
            <Col sm={10} className="content-center">
              <Tab.Content className="full-width">
                <Tab.Pane eventKey="image-steganography">
                  <Image/>
                </Tab.Pane>
                <Tab.Pane eventKey="video-steganography">
                  <Video/>
                </Tab.Pane>
                <Tab.Pane eventKey="audio-steganography">
                  <Audio></Audio>
                </Tab.Pane>
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </div>
    </div>
  );
}

export default App;
