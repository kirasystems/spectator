import React from "react";

import { Box } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import {
  AnnotationsGroup,
  MAX_ANNOTATION_LABELS_TO_SHOW,
  MORE_BUTTON_HEIGHT,
} from "./AnnotationsGroup";

import { IndexedAnnotation } from "./types";

export const ANNOTATION_LABELS_WIDTH = 200;
export const ANNOTATION_LABELS_MARGIN_LEFT = 6;
const ANNOTATION_LABEL_HEIGHT = 20;

const useStyles = makeStyles({
  root: {
    position: "relative",
    flex: `0 0 ${ANNOTATION_LABELS_WIDTH}px`,
    marginLeft: `${ANNOTATION_LABELS_MARGIN_LEFT}px`,
  },
});

type AnnotationLabelsProps = {
  annotations: IndexedAnnotation[];
  focusedAnnotationIndex: number;
  focusingAnnotation: boolean;
  onAnnotationDelete?: (annotation: IndexedAnnotation) => void;
  onAnnotationFocus: (annotationIndex: number) => void;
  originalPageHeight: number;
  pageNumber: number;
  pageWrapperHeight: number;
};

export const AnnotationLabels = (props: AnnotationLabelsProps): JSX.Element => {
  const {
    annotations,
    focusedAnnotationIndex,
    focusingAnnotation,
    onAnnotationFocus,
    onAnnotationDelete,
    originalPageHeight,
    pageNumber,
    pageWrapperHeight,
  } = props;

  const classes = useStyles();

  const annotationGroups = React.useMemo(() => {
    if (!pageWrapperHeight) return [];

    const filteredAnnotations = annotations.filter(
      (annotation: IndexedAnnotation) => annotation.pageStart === pageNumber
    );

    if (!filteredAnnotations.length) return [];

    const containerHeight = pageWrapperHeight;

    const [first, ...rest] = filteredAnnotations;

    const firstTop = (first.top * containerHeight) / originalPageHeight;

    return rest.reduce(
      (annotationGroups: AnnotationsGroup[], annotation: IndexedAnnotation) => {
        const lastGroupIndex = annotationGroups.length - 1;
        const lastGroup = annotationGroups[lastGroupIndex];
        const top = (annotation.top * containerHeight) / originalPageHeight;

        if (top <= lastGroup.bottom) {
          const bottom =
            lastGroup.annotations.length <= MAX_ANNOTATION_LABELS_TO_SHOW
              ? lastGroup.bottom + ANNOTATION_LABEL_HEIGHT
              : lastGroup.annotations.length === MAX_ANNOTATION_LABELS_TO_SHOW + 1
              ? lastGroup.bottom + MORE_BUTTON_HEIGHT
              : lastGroup.bottom;

          annotationGroups[lastGroupIndex] = {
            top: lastGroup.top,
            bottom: bottom,
            annotations: lastGroup.annotations.concat([annotation]),
          };
        } else {
          annotationGroups.push({
            top: top,
            bottom: top + ANNOTATION_LABEL_HEIGHT,
            annotations: [annotation],
          });
        }

        return annotationGroups;
      },
      [
        {
          top: firstTop,
          bottom: firstTop + ANNOTATION_LABEL_HEIGHT,
          annotations: [first],
        },
      ]
    );
  }, [annotations, originalPageHeight, pageNumber, pageWrapperHeight]);

  return (
    <Box className={classes.root}>
      {annotationGroups.map((group: AnnotationsGroup, groupKey: number) => (
        <AnnotationsGroup
          key={groupKey}
          annotationsGroup={group}
          focusedAnnotationIndex={focusedAnnotationIndex}
          focusingAnnotation={focusingAnnotation}
          onAnnotationDelete={onAnnotationDelete}
          onAnnotationFocus={onAnnotationFocus}
        />
      ))}
    </Box>
  );
};
