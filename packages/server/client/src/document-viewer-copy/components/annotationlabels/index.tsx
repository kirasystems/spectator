import React from "react";

import {AnnotationsGroup, MAX_ANNOTATION_LABELS_TO_SHOW, MORE_BUTTON_HEIGHT} from "./group";

import { IndexedAnnotation } from "../../types";

import "./style.css";

export const ANNOTATION_LABELS_WIDTH = 200;
export const ANNOTATION_LABELS_MARGIN_LEFT = 6;
const ANNOTATION_LABEL_HEIGHT = 20;

type AnnotationLabelsProps = {
  annotations: IndexedAnnotation[];
  focusedAnnotationIndex: number;
  focusingAnnotation: boolean;
  onAnnotationDelete: (annotation: IndexedAnnotation) => void;
  onAnnotationFocus: (annotationIndex: number) => void;
  originalPageHeight: number;
  pageNumber: number;
  pageWrapperHeight: number;
};

export const AnnotationLabels = (props: AnnotationLabelsProps) => {
  const {
    annotations,
    focusedAnnotationIndex,
    focusingAnnotation,
    onAnnotationFocus,
    onAnnotationDelete,
    originalPageHeight,
    pageNumber,
    pageWrapperHeight
  } = props;

  const annotationGroups = React.useMemo(() => {
    if (!pageWrapperHeight) return [];

    let filteredAnnotations = annotations.filter(
      (annotation: IndexedAnnotation) => annotation.pageStart === pageNumber
    );

    if (!filteredAnnotations.length) return [];

    let containerHeight = pageWrapperHeight;
    
    let [first, ...rest] = filteredAnnotations;
    
    let firstTop = (first.top * containerHeight) / originalPageHeight;

    return rest.reduce((annotationGroups: AnnotationsGroup[], annotation: IndexedAnnotation) => {
      let lastGroupIndex = annotationGroups.length - 1;
      let lastGroup = annotationGroups[lastGroupIndex];
      let top = (annotation.top * containerHeight) / originalPageHeight;

      if (top <= lastGroup.bottom) {
        let bottom = lastGroup.annotations.length <= MAX_ANNOTATION_LABELS_TO_SHOW 
                    ? lastGroup.bottom + ANNOTATION_LABEL_HEIGHT : 
                    lastGroup.annotations.length === MAX_ANNOTATION_LABELS_TO_SHOW + 1
                    ? lastGroup.bottom + MORE_BUTTON_HEIGHT : lastGroup.bottom;

        annotationGroups[lastGroupIndex] = {
          top: lastGroup.top,
          bottom: bottom,
          annotations: lastGroup.annotations.concat([annotation])
        };
      } else {

        annotationGroups.push({
          top: top,
          bottom: top + ANNOTATION_LABEL_HEIGHT,
          annotations: [annotation]
        });
      }

      return annotationGroups;
    }, [{top: firstTop, bottom: firstTop + ANNOTATION_LABEL_HEIGHT, annotations: [first]}]);
  }, [annotations, originalPageHeight, pageNumber, pageWrapperHeight]);

  return (
    <div
      className={"Annotations"}
      style={{
        flexBasis: ANNOTATION_LABELS_WIDTH + "px", 
        marginLeft: ANNOTATION_LABELS_MARGIN_LEFT + "px"
      }}>
      {annotationGroups.map((group: AnnotationsGroup, groupKey: number) => (
        <AnnotationsGroup 
          key={groupKey}
          annotationsGroup={group}
          focusedAnnotationIndex={focusedAnnotationIndex}
          focusingAnnotation={focusingAnnotation}
          onAnnotationDelete={onAnnotationDelete}
          onAnnotationFocus={onAnnotationFocus}
        />))}
    </div>
  );
};
