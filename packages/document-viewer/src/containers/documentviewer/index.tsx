import React from "react";

import NavBar from "../../components/navbar/index";
import Pages, { PagesHandle } from "../../components/pages/index";
import { DEFAULT_NAVIGATION_MODE, DEFAULT_ZOOM, ToolBar } from "../../components/toolbar/index";

import { NavigationModes } from "../../enums";
import { Annotation, IndexedAnnotation, Page } from "../../types";

import "./style.css";

const DEFAULT_LAZY_LOADING_WINDOW = 2;

type DocumentViewerProps = {
  annotations: Annotation[];
  name: string;
  lazyLoadingWindow: number;
  onAnnotationCreate: (annotation: Annotation) => void;
  onAnnotationDelete: (annotation: Annotation) => void;
  onClose: () => void;
  onNextDocument: () => void;
  onPreviousDocument: () => void;
  pages: Page[];
  topics: string[];
};

const DocumentViewer = (props: DocumentViewerProps) => {
  const {
    annotations,
    lazyLoadingWindow,
    name,
    onAnnotationCreate,
    onAnnotationDelete,
    onClose,
    onNextDocument,
    onPreviousDocument,
    pages,
    topics,
  } = props;

  const [navigationMode, setNavigationMode] = React.useState(DEFAULT_NAVIGATION_MODE);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [focusingAnnotation, setFocusingAnnotation] = React.useState<boolean>(false);
  const [focusedAnnotationIndex, setFocusedAnnotationIndex] = React.useState<number>(1);

  const [zoom, setZoom] = React.useState(DEFAULT_ZOOM);

  const pagesEl = React.useRef<PagesHandle>(null);

  const sortAnnotations = (annotations: Annotation[]) => {
    return annotations.sort((a: Annotation, b: Annotation) => {
      if (a.characterStart > b.characterStart) return 1;
      if (a.characterStart < b.characterStart) return -1;
      if (a.characterEnd > b.characterEnd) return 1;
      if (a.characterEnd < b.characterEnd) return -1;
      return 0;
    });
  };

  const indexAnnotations = (annotations: Annotation[]) => {
    return sortAnnotations(annotations).map((annotation: Annotation, index: number) => {
      return { ...annotation, _index: index + 1 };
    });
  };

  // When deleting annotations, it shouldn't be out of bounds
  React.useEffect(() => {
    if (focusedAnnotationIndex > annotations.length) {
      setFocusedAnnotationIndex(annotations.length - 1);
    }
  }, [annotations, focusedAnnotationIndex]);

  const handleNavigationModeChange = React.useCallback((newNavigationMode: NavigationModes) => {
    setNavigationMode(newNavigationMode);

    if (newNavigationMode === NavigationModes.Annotation) {
      setFocusingAnnotation(true);
      setFocusedAnnotationIndex(1);
    }
  }, []);

  const handleZoomChange = React.useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleNavigationIndexChange = React.useCallback(
    (navigationIndex: number) => {
      if (navigationMode === NavigationModes.Page) {
        if (navigationIndex < 1 || navigationIndex > pages.length) return;

        pagesEl?.current?.scrollToPage(navigationIndex);
      } else {
        if (navigationIndex < 1 || navigationIndex > annotations.length) return;

        setFocusedAnnotationIndex(navigationIndex);
        pagesEl?.current?.scrollToAnnotation(navigationIndex);
      }
    },
    [annotations, pages, navigationMode]
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
      if (
        focusedAnnotationIndex === annotationIndex ||
        annotationIndex < 1 ||
        annotationIndex > annotations.length
      )
        return;

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

  const handleAnnotationDelete = React.useCallback(
    (annotation: IndexedAnnotation) => {
      const { _index, ...cleanedAnnotation } = annotation;
      onAnnotationDelete(cleanedAnnotation);
    },
    [onAnnotationDelete]
  );

  return (
    <div className={"Document-Viewer"}>
      <NavBar
        documentName={name}
        onClose={onClose}
        onNextDocument={onNextDocument}
        onPreviousDocument={onPreviousDocument}
      />
      <ToolBar
        navigationMode={navigationMode}
        onNavigationModeChange={handleNavigationModeChange}
        navigationIndex={
          navigationMode === NavigationModes.Page ? currentPage : focusedAnnotationIndex
        }
        navigationTotal={
          navigationMode === NavigationModes.Page ? pages.length : annotations.length
        }
        onNavigationIndexChange={handleNavigationIndexChange}
        zoom={zoom}
        onZoomChange={handleZoomChange}
      />
      <Pages
        ref={pagesEl}
        annotations={indexAnnotations(annotations)}
        currentPage={currentPage}
        focusedAnnotationIndex={focusedAnnotationIndex}
        focusingAnnotation={focusingAnnotation}
        lazyLoadingWindow={lazyLoadingWindow}
        navigationMode={navigationMode}
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationDelete={handleAnnotationDelete}
        onFocusedAnnotationIndexChange={handleFocusedAnnotationChange}
        onFocusingAnnotationChange={handleFocusingAnnotationChange}
        onPageChange={handlePageChange}
        pages={pages}
        topics={topics}
        zoom={zoom}
      />
    </div>
  );
};

DocumentViewer.defaultProps = { lazyLoadingWindow: DEFAULT_LAZY_LOADING_WINDOW };

export default DocumentViewer;
