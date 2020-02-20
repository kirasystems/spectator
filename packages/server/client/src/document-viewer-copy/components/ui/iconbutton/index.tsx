import React from "react";

import Close from "@material-ui/icons/Close";
import ArrowBack from "@material-ui/icons/ArrowBack";
import ArrowForward from "@material-ui/icons/ArrowForward";
import ArrowDownward from "@material-ui/icons/ArrowDownward";
import ArrowUpward from "@material-ui/icons/ArrowUpward";

import "./style.css";

const IconButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { className, children, ...rest } = props;

  return (
    <button className={`IconButton ${className || ""}`} {...rest}>
      {children}
    </button>
  );
};

const CloseButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <IconButton {...props}>
      <Close />
    </IconButton>
  );
};

const NextButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <IconButton {...props}>
      <ArrowForward />
    </IconButton>
  );
};

const PreviousButton = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  return (
    <IconButton {...props}>
      <ArrowBack />
    </IconButton>
  );
};

const UpButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <IconButton {...props}>
      <ArrowUpward />
    </IconButton>
  );
};

const DownButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <IconButton {...props}>
      <ArrowDownward />
    </IconButton>
  );
};

const DeleteButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <IconButton {...props}>
      <Close fontSize="small" />
    </IconButton>
  );
};

export {
  CloseButton,
  DeleteButton,
  DownButton,
  NextButton,
  PreviousButton,
  UpButton
};
