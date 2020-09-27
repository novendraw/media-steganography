import React from 'react';
import {
  Jumbotron,
} from 'react-bootstrap';

function Header() {
  return (
    <Jumbotron className="background-navy border-radius-0 padding-0">
      <div className="content-center-grid margin-bottom-md">
        <div className="heading-2 bold white">
          Media Steganography
        </div>
        
        <div className="content-center subheadline bold white">
          with LSB and BPCS
        </div>         
        
      </div>

      <div className="content-center body-text white padding-bottom-sm">
        by Eka Novendra Wahyunadi (13517011), Nixon Andhika (13517059), and Ferdy Santoso (13517116)
      </div>
    </Jumbotron>
  )
}

export default Header;