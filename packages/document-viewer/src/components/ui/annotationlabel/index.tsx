import React from "react";

import { topicToColor } from "../annotationcolors/index";

import { DeleteButton } from "../iconbutton/index";

import "./style.css";

type AnnotationLabelProps = {
  onDelete: (event: React.MouseEvent) => void;
  topic: string;
};

const AnnotationLabel = (props: AnnotationLabelProps & React.HTMLAttributes<HTMLDivElement>) => {
  const { className, onClick, onDelete, topic, ...rest } = props;

  return (
    <div className={`Annotation-Label ${className || ""}`} {...rest}>
      <span className="Annotation-Label__Dot" style={{ background: topicToColor(topic) }}></span>
      <span className="Annotation-Label__Text" onClick={onClick}>
        {topic}
      </span>
      <DeleteButton className="Annotation-Label__Delete" onClick={onDelete} />
    </div>
  );
};

export default AnnotationLabel;
