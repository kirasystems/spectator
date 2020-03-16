import React from "react";
import ArrowDropDown from "@material-ui/icons/ArrowDropDown";

import "./style.css";

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => {
  const { children, ...rest } = props;

  return (
    <div className="Select">
      <select {...rest}>{children}</select>
      <ArrowDropDown />
    </div>
  );
};

export default Select;
