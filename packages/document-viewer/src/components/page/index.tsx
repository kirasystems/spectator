import React from "react";

import { IndexedAnnotation, MouseSelection, PageSelection, Selection } from "../../types";

import Viewbox from "./viewbox";

import {
  AnnotationLabels,
  ANNOTATION_LABELS_WIDTH,
  ANNOTATION_LABELS_MARGIN_LEFT,
} from "../annotationlabels/index";

import "./style.css";
import EmptyPage from "./empty";

type PageProps = {
  annotations: IndexedAnnotation[];
  focusedAnnotationIndex: number;
  focusingAnnotation: boolean;
  imageURL: string;
  load: boolean;
  onAnnotationDelete: (annotation: IndexedAnnotation) => void;
  onFocusedAnnotationIndexChange: (annotationIndex: number) => void;
  onFocusingAnnotationChange: (focusing: boolean) => void;
  onSelectionStart: (selection: Selection) => void;
  onSelectionEnd: (selection: Selection) => void;
  originalPageHeight: number;
  originalPageWidth: number;
  pageNumber: number;
  mouseSelection: MouseSelection;
  selection: PageSelection;
  tokensURL: string;
  zoom: number;
};

const Page = (props: PageProps) => {
  const {
    annotations,
    focusedAnnotationIndex,
    focusingAnnotation,
    imageURL,
    load,
    onAnnotationDelete,
    onFocusedAnnotationIndexChange,
    onFocusingAnnotationChange,
    onSelectionStart,
    onSelectionEnd,
    originalPageWidth,
    originalPageHeight,
    pageNumber,
    mouseSelection,
    selection,
    tokensURL,
    zoom,
  } = props;

  const [pageWrapperHeight, setPageWrapperHeight] = React.useState(0);
  const [pageWrapperWidth, setPageWrapperWidth] = React.useState(0);

  const pageRef = React.useRef<HTMLLIElement>(null);

  const setPageDimensions = React.useCallback(() => {
    if (!pageRef || !pageRef.current) return;

    let boundingBox = pageRef.current.getBoundingClientRect();
    let pageImageWrapperWidth =
      (boundingBox.width - (ANNOTATION_LABELS_WIDTH + ANNOTATION_LABELS_MARGIN_LEFT)) *
      (zoom / 100);
    let pageWrapperHeight = pageImageWrapperWidth * (originalPageHeight / originalPageWidth);
    let pageWrapperWidth =
      pageImageWrapperWidth + (ANNOTATION_LABELS_WIDTH + ANNOTATION_LABELS_MARGIN_LEFT);

    setPageWrapperHeight(pageWrapperHeight);
    setPageWrapperWidth(pageWrapperWidth);
  }, [originalPageHeight, originalPageWidth, pageRef, zoom]);

  React.useEffect(() => {
    if (!pageRef || !pageRef.current) return;

    setPageDimensions();

    window.addEventListener("resize", setPageDimensions);
    return () => window.removeEventListener("resize", setPageDimensions);
  }, [setPageDimensions]);

  const handleFocusAnnotation = React.useCallback(
    (annotationIndex: number) => {
      onFocusedAnnotationIndexChange(annotationIndex);
      onFocusingAnnotationChange(true);
    },
    [onFocusingAnnotationChange, onFocusedAnnotationIndexChange]
  );

  return (
    <li className={"Page"} ref={pageRef}>
      <div
        className={"Page__Wrapper"}
        style={{
          width: pageWrapperWidth + "px",
          height: pageWrapperHeight + "px",
        }}
      >
        {load ? (
          <Viewbox
            annotations={annotations}
            focusedAnnotationIndex={focusedAnnotationIndex}
            focusingAnnotation={focusingAnnotation}
            imageURL={imageURL}
            onAnnotationFocus={handleFocusAnnotation}
            onSelectionStart={onSelectionStart}
            onSelectionEnd={onSelectionEnd}
            originalPageHeight={originalPageHeight}
            originalPageWidth={originalPageWidth}
            pageNumber={pageNumber}
            mouseSelection={mouseSelection}
            selection={selection}
            tokensURL={tokensURL}
          />
        ) : (
          <EmptyPage />
        )}

        <AnnotationLabels
          annotations={annotations}
          focusedAnnotationIndex={focusedAnnotationIndex}
          focusingAnnotation={focusingAnnotation}
          originalPageHeight={originalPageHeight}
          onAnnotationDelete={onAnnotationDelete}
          onAnnotationFocus={handleFocusAnnotation}
          pageNumber={pageNumber}
          pageWrapperHeight={pageWrapperHeight}
        />
      </div>
    </li>
  );
};

export default Page;
