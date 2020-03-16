import React from "react";

import { PreviousButton, NextButton, CloseButton } from "../ui/iconbutton/index";

import "./style.css";

type NavBarProps = {
  documentName: string;
  onClose: () => void;
  onNextDocument: () => void;
  onPreviousDocument: () => void;
};

const NavBar = (props: NavBarProps) => {
  const { documentName, onClose, onNextDocument, onPreviousDocument } = props;

  return (
    <div className="Navbar">
      <h1 className="Navbar__Title">{documentName}</h1>
      <div className="NavBar__Actions">
        <PreviousButton
          className="NavBar__Previous"
          onClick={onPreviousDocument}
          title="Previous Document"
        />

        <NextButton className="NavBar__Next" onClick={onNextDocument} title="Next Document" />

        <CloseButton className="NavBar__Close" onClick={onClose} title="Close Document" />
      </div>
    </div>
  );
};

export default NavBar;
