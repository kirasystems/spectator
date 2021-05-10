import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import { Box, ListItem, Paper } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";

import Viewbox, { EmptyViewbox } from "./Viewbox";
import PageSkeleton from "./loading/PageSkeleton";

import {
  AnnotationLabels,
  ANNOTATION_LABELS_WIDTH,
  ANNOTATION_LABELS_MARGIN_LEFT,
} from "./AnnotationLabels";

import {
  ImageURL,
  IndexedAnnotation,
  MouseSelection,
  PageSelection,
  SearchResult,
  Selection,
  TokensURL,
} from "./types";

export const WHOLE_PAGE_ZOOM = "whole-page-zoom";

const useStyles = makeStyles(theme => ({
  root: {
    display: "block",
    marginLeft: theme.spacing(1.5),
  },
  skeletonAnnotations: {
    position: "relative",
    flex: `0 0 ${ANNOTATION_LABELS_WIDTH}px`,
    marginLeft: `${ANNOTATION_LABELS_MARGIN_LEFT}px`,
  },
  skeletonAnnotationDot: {
    background: theme.palette.info.main,
    flex: "0 0 auto",
    width: "8px",
    height: "8px",
    borderRadius: "100%",
  },
  skeletonAnnotationLabel: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    background: theme.palette.background.paper,
    padding: theme.spacing(0, 0.5, 0, 1),
    height: "20px",
    width: "180px",
  },
  skeletonAnnotationText: {
    cursor: "pointer",
    flex: "1 1 auto",
    fontSize: "12px",
    margin: theme.spacing(0.125, 0.5, 0, 1),
  },
  wrapper: {
    display: "flex",
    flexFlow: "row nowrap",
    margin: "0 auto",
  },
}));

const getPageDimensions = (
  containerWidth: number,
  containerHeight: number,
  originalPageWidth: number,
  originalPageHeight: number,
  zoom: string
): [number, number] => {
  let pageWrapperHeight;
  let pageWrapperWidth;

  if (zoom == WHOLE_PAGE_ZOOM) {
    pageWrapperHeight = containerHeight;
    pageWrapperWidth =
      containerHeight * (originalPageWidth / originalPageHeight) +
      (ANNOTATION_LABELS_WIDTH + ANNOTATION_LABELS_MARGIN_LEFT);
  } else {
    const pageImageWrapperWidth =
      containerWidth * (parseInt(zoom) / 100) -
      (ANNOTATION_LABELS_WIDTH + ANNOTATION_LABELS_MARGIN_LEFT);

    pageWrapperHeight = pageImageWrapperWidth * (originalPageHeight / originalPageWidth);
    pageWrapperWidth =
      pageImageWrapperWidth + (ANNOTATION_LABELS_WIDTH + ANNOTATION_LABELS_MARGIN_LEFT);
  }

  return [pageWrapperWidth, pageWrapperHeight];
};

type EmptyPageProps = {
  containerWidth: number;
  containerHeight: number;
  originalPageWidth: number;
  originalPageHeight: number;
  zoom: string;
};

export const EmptyPage = (props: EmptyPageProps): JSX.Element => {
  const { containerWidth, containerHeight, originalPageWidth, originalPageHeight, zoom } = props;
  const classes = useStyles();

  const [pageWrapperHeight, setPageWrapperHeight] = React.useState(0);
  const [pageWrapperWidth, setPageWrapperWidth] = React.useState(0);

  const setPageDimensions = React.useCallback(() => {
    const [pageWrapperWidth, pageWrapperHeight] = getPageDimensions(
      containerWidth,
      containerHeight,
      originalPageWidth,
      originalPageHeight,
      zoom
    );
    setPageWrapperWidth(pageWrapperWidth);
    setPageWrapperHeight(pageWrapperHeight);
  }, [containerWidth, containerHeight, originalPageWidth, originalPageHeight, zoom]);

  React.useEffect(() => {
    setPageDimensions();
  }, [setPageDimensions]);

  return (
    <ListItem
      className={classes.root}
      disableGutters
      style={{
        width: `calc(100% - 15px)`,
      }}
    >
      <Box
        className={classes.wrapper}
        style={{
          width: pageWrapperWidth + "px",
          height: pageWrapperHeight + "px",
        }}
      >
        <PageSkeleton />
        <Box className={classes.skeletonAnnotations}>
          <Box position="absolute">
            {[...Array(5)].map((_, idx) => (
              <Paper square key={idx} className={classes.skeletonAnnotationLabel}>
                <span className={classes.skeletonAnnotationDot} />
                <Skeleton className={classes.skeletonAnnotationText} height="60%" width="100%" />
              </Paper>
            ))}
          </Box>
        </Box>
      </Box>
    </ListItem>
  );
};

type PageProps = {
  annotations: IndexedAnnotation[];
  containerHeight: number;
  containerWidth: number;
  focusedAnnotationIndex: number;
  focusingAnnotation: boolean;
  imageURL: ImageURL;
  load: boolean;
  onAnnotationDelete?: (annotation: IndexedAnnotation) => void;
  onFocusedAnnotationIndexChange: (annotationIndex: number) => void;
  onFocusingAnnotationChange: (focusing: boolean) => void;
  onSelectionStart: (selection: Selection) => void;
  onSelectionEnd: (selection: Selection) => void;
  originalPageHeight: number;
  originalPageWidth: number;
  pageNumber: number;
  mouseSelection: MouseSelection;
  searchResults: SearchResult[];
  selection: PageSelection;
  tokensURL: TokensURL;
  zoom: string;
};

const Page = (props: PageProps): JSX.Element => {
  const {
    annotations,
    containerHeight,
    containerWidth,
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
    searchResults,
    selection,
    tokensURL,
    zoom,
  } = props;

  const classes = useStyles();

  const [pageWrapperHeight, setPageWrapperHeight] = React.useState(0);
  const [pageWrapperWidth, setPageWrapperWidth] = React.useState(0);

  const pageRef = React.useRef<HTMLLIElement>(null);

  const setPageDimensions = React.useCallback(() => {
    const [pageWrapperWidth, pageWrapperHeight] = getPageDimensions(
      containerWidth,
      containerHeight,
      originalPageWidth,
      originalPageHeight,
      zoom
    );
    setPageWrapperWidth(pageWrapperWidth);
    setPageWrapperHeight(pageWrapperHeight);
  }, [containerWidth, containerHeight, originalPageWidth, originalPageHeight, zoom]);

  React.useEffect(() => {
    if (!pageRef || !pageRef.current) return;

    setPageDimensions();
  }, [setPageDimensions]);

  const handleFocusAnnotation = React.useCallback(
    (annotationIndex: number) => {
      onFocusedAnnotationIndexChange(annotationIndex);
      onFocusingAnnotationChange(true);
    },
    [onFocusingAnnotationChange, onFocusedAnnotationIndexChange]
  );

  return (
    <ListItem
      className={classes.root}
      ref={pageRef}
      disableGutters
      style={{
        width: `calc(100% - 15px)`,
      }}
    >
      <Box
        className={classes.wrapper}
        style={{
          width: pageWrapperWidth + "px",
          height: pageWrapperHeight + "px",
        }}
      >
        {load ? (
          <Viewbox
            annotations={annotations}
            searchResults={searchResults}
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
          <EmptyViewbox />
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
      </Box>
    </ListItem>
  );
};

export default Page;
