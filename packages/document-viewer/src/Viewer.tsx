import React from "react";

import {
  AppBar,
  Box,
  StylesProvider,
  createGenerateClassName,
  makeStyles,
} from "@material-ui/core";
import { GenerateId } from "jss";

import NavBar from "./NavBar";
import Pages, { PagesHandle } from "./Pages";

import ResizeObserver from "resize-observer-polyfill";
import { Annotation, Topic, IndexedAnnotation, Page, SearchResult } from "./types";

import { isEqual } from "lodash";

export const DEFAULT_ZOOM = "75%";
const DEFAULT_LAZY_LOADING_WINDOW = 2;

const generateClassName = createGenerateClassName({
  disableGlobal: true,
  seed: "dv",
});

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexFlow: "column nowrap",
    overflow: "hidden",
    height: "100%",
    width: "100%",
    background: "#F9FBFF",
    padding: 0,
    margin: 0,
  },
  appBar: {
    zIndex: 1201,
  },
  container: {
    display: "flex",
    flexFlow: "row nowrap",
    overflow: "hidden",
    height: "100%",
    width: "100%",
    padding: 0,
    margin: 0,
  },
  viewer: {
    flex: "1 1 auto",
    padding: 0,
    margin: 0,
  },
});

// TODO: See https://github.com/mui-org/material-ui/pull/22925
// This is a work around should be fixed in mui v5
declare module "@material-ui/core/Box" {
  interface BoxProps {
    ref?: React.MutableRefObject<HTMLElement> | React.Ref<unknown>;
  }
}

export type ViewerRef = React.RefObject<PagesHandle>;

export type SummaryProps = {
  zoom: string;
  onZoomChange: (newZoom: string) => void;
  viewerRef: ViewerRef;
};

type DocumentViewerProps = {
  id: string; // Opaque id to tell if we changed the document being viewed
  annotations: Annotation[];
  topics?: Topic[];
  lazyLoadingWindow?: number;
  loading?: boolean;
  muiClassGenerator?: GenerateId;
  name: string;
  onAnnotationCreate?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotation: Annotation) => void;
  onClose: () => void;
  onNextDocument?: () => void;
  onPreviousDocument?: () => void;
  pages: Page[];
  searchResults?: SearchResult[];
  Summary?: React.ForwardRefExoticComponent<SummaryProps & any>;
  summaryProps?: any;
};

const DocumentViewer = (props: DocumentViewerProps, ref: React.Ref<JSX.Element>): JSX.Element => {
  const {
    id,
    annotations,
    lazyLoadingWindow = DEFAULT_LAZY_LOADING_WINDOW,
    loading,
    name,
    onAnnotationCreate,
    onAnnotationDelete,
    onClose,
    onNextDocument,
    onPreviousDocument,
    pages,
    topics = [],
    searchResults = [],
    Summary,
    summaryProps,
    muiClassGenerator = generateClassName,
  } = props;

  const classes = useStyles(props);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [focusingAnnotation, setFocusingAnnotation] = React.useState<boolean>(false);
  const [focusedAnnotationIndex, setFocusedAnnotationIndex] = React.useState<number>(1);

  const containerEl = React.useRef<HTMLDivElement>(null);
  const pagesEl = React.useRef<PagesHandle>(null);
  const summaryEl = React.useRef<JSX.Element>(null);

  const [zoom, setZoom] = React.useState(DEFAULT_ZOOM);
  const [pagesHeight, setPagesHeight] = React.useState(0);
  const [pagesWidth, setPagesWidth] = React.useState(0);

  const onSummaryResize = React.useCallback(
    (width, height) => {
      if (pagesWidth != width && containerEl.current) {
        setPagesWidth(containerEl.current.offsetWidth - width);
      }
      if (pagesHeight != height && containerEl.current) {
        setPagesHeight(containerEl.current.offsetHeight);
      }
    },
    [pagesWidth, pagesHeight]
  );

  const onWindowResize = React.useCallback(() => {
    if (!containerEl.current) return;

    let width = containerEl.current.offsetWidth;
    let height = containerEl.current.offsetHeight;

    if (summaryEl.current) {
      const summaryWidth = ((summaryEl.current as unknown) as HTMLElement).offsetWidth;
      width -= summaryWidth;
    }

    setPagesWidth(width);
    setPagesHeight(height);
  }, []);

  const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
    window.requestAnimationFrame(() => {
      entries.forEach(entry => {
        onSummaryResize(entry.contentRect.width, entry.contentRect.height);
      });
    });
  });

  // Track resize of Window
  React.useEffect(() => {
    onWindowResize();
    window.addEventListener("resize", onWindowResize);
    return (): void => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  // Track resize of Summary
  React.useEffect(() => {
    if (summaryEl.current != null) {
      resizeObserver.observe((summaryEl.current as unknown) as Element);
    }
  }, [summaryEl.current]);

  const handleZoomChange = React.useCallback((newZoom: string) => {
    setZoom(newZoom);
  }, []);

  const sortAnnotations = (annotations: Annotation[]): Annotation[] => {
    return annotations.sort((a: Annotation, b: Annotation) => {
      if (a.characterStart > b.characterStart) return 1;
      if (a.characterStart < b.characterStart) return -1;
      if (a.characterEnd > b.characterEnd) return 1;
      if (a.characterEnd < b.characterEnd) return -1;
      return 0;
    });
  };

  const indexAnnotations = (annotations: Annotation[]): IndexedAnnotation[] => {
    return sortAnnotations(annotations).map((annotation: Annotation, index: number) => {
      return { ...annotation, _index: index };
    });
  };

  // When deleting annotations, it shouldn't be out of bounds
  React.useEffect(() => {
    if (focusedAnnotationIndex > annotations.length) {
      setFocusedAnnotationIndex(annotations.length - 1);
    }
  }, [annotations, focusedAnnotationIndex]);

  // When a different document, it should scroll back to the first page
  React.useEffect(() => {
    pagesEl?.current?.scrollToPage(1);
  }, [id]);

  const handleNavigationIndexChange = React.useCallback(
    (navigationIndex: number) => {
      if (navigationIndex < 1 || navigationIndex > pages.length) return;
      pagesEl?.current?.scrollToPage(navigationIndex);
    },
    [annotations, pages]
  );

  const handlePageChange = React.useCallback(
    (pageNumber: number) => {
      if (pageNumber === currentPage || pageNumber < 1 || pageNumber > pages.length) return;

      setCurrentPage(pageNumber);
    },
    [currentPage, pages]
  );

  const handleFocusedAnnotationChange = React.useCallback(
    (annotationIndex: number) => {
      if (annotationIndex < 0 || annotationIndex >= annotations.length) return;
      setFocusedAnnotationIndex(annotationIndex);
    },
    [annotations, focusedAnnotationIndex]
  );

  const handleFocusingAnnotationChange = React.useCallback(
    (focusing: boolean) => {
      if (focusingAnnotation === focusing) return;

      setFocusingAnnotation(focusing);
    },
    [focusingAnnotation]
  );

  const handleAnnotationDelete = onAnnotationDelete
    ? (annotation: IndexedAnnotation): void => {
        const { _index: _, ...clonedAnnotation } = annotation;
        onAnnotationDelete(clonedAnnotation);
      }
    : undefined;

  return (
    <StylesProvider generateClassName={muiClassGenerator}>
      <Box ref={ref} className={classes.root} tabIndex={-1}>
        <AppBar className={classes.appBar} position="relative" elevation={1}>
          <NavBar
            documentName={name}
            navigationIndex={currentPage}
            navigationTotal={pages.length}
            onNavigationIndexChange={handleNavigationIndexChange}
            onClose={onClose}
            onNextDocument={onNextDocument}
            onPreviousDocument={onPreviousDocument}
          />
        </AppBar>
        <Box ref={containerEl} className={classes.container}>
          {Summary && (
            <Summary
              ref={summaryEl}
              {...summaryProps}
              zoom={zoom}
              onZoomChange={handleZoomChange}
              viewerRef={pagesEl}
            />
          )}
          <Box className={classes.viewer}>
            <Pages
              ref={pagesEl}
              annotations={indexAnnotations(annotations)}
              currentPage={currentPage}
              focusedAnnotationIndex={focusedAnnotationIndex}
              focusingAnnotation={focusingAnnotation}
              lazyLoadingWindow={lazyLoadingWindow}
              loading={loading}
              onAnnotationCreate={onAnnotationCreate}
              onAnnotationDelete={handleAnnotationDelete}
              onFocusedAnnotationIndexChange={handleFocusedAnnotationChange}
              onFocusingAnnotationChange={handleFocusingAnnotationChange}
              onPageChange={handlePageChange}
              pages={pages}
              pagesHeight={pagesHeight}
              pagesWidth={pagesWidth}
              topics={topics}
              searchResults={searchResults}
              zoom={zoom}
            />
          </Box>
        </Box>
      </Box>
    </StylesProvider>
  );
};

export default React.memo(React.forwardRef(DocumentViewer), isEqual) as typeof DocumentViewer;
