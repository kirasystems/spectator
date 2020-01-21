import React from "react";

import "./style.css";

const EmptyPage = () => {
  return (
    <div className={"Page__Image-Wrapper Page__Image-Wrapper--empty"}>
      <div className="FakePage">
        {Array(3).fill(0).map((_, i) => ( 
          <div key={i} className={"FakeParagraph"}>
            {Array(8).fill(0).map((_, j) => (
              <div key={j} className={"FakeLine"}></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmptyPage;