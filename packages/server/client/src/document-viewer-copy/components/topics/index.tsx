import React from "react";

import "./style.css";

type TopicsProps = {
  topics: string[];
  onAnnotation: (topic: string) => void;
};

const Topics = (props: TopicsProps) => {
  const { onAnnotation, topics } = props;

  return (
    <div className="Topics">
      <div className="Topics__Header">
        <h4 className="Topics__Title">Topics</h4>
      </div>
      <ol className="Topics__Body">
        {topics.map(topic => (
          <li
            key={topic}
            className="Topics__Topic"
            onClick={() => {
              onAnnotation(topic);
            }}
          >
            {topic}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Topics;
