import React from "react";
import { isEqual } from "lodash";
import { Box, List } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import Picker from "./Picker";
import Page, { EmptyPage } from "./Page";

import smoothScroll from "./utils/smoothScroll";

import {
  Annotation,
  Topic,
  IndexedAnnotation,
  MousePosition,
  MouseSelection,
  Page as PageType,
  PageSelection,
  SearchResult,
  Selection,
  ScrollPosition,
} from "./types";

type StyleProps = {
  width: number;
};

const useStyles = makeStyles({
  root: ({ width }: StyleProps) => ({
    overflow: "auto",
    maxWidth: width,
    width: "100%",
    height: "100%",
  }),
});

const annotationsPerPage = (annotations: IndexedAnnotation[]): Map<number, IndexedAnnotation[]> => {
  const pages = new Map();

  annotations.forEach(annotation => {
    for (let i = annotation.pageStart; i <= annotation.pageEnd; i++) {
      const pageAnnotation = { ...annotation };

      if (i === annotation.pageStart && i !== annotation.pageEnd) {
        pageAnnotation.characterEnd = Number.POSITIVE_INFINITY;
      } else if (i === annotation.pageEnd && i !== annotation.pageStart) {
        pageAnnotation.characterStart = Number.NEGATIVE_INFINITY;
      } else if (i > annotation.pageStart && i < annotation.pageEnd) {
        pageAnnotation.characterStart = Number.NEGATIVE_INFINITY;
        pageAnnotation.characterEnd = Number.POSITIVE_INFINITY;
      }

      if (!pages.get(i)) {
        pages.set(i, []);
      }

      pages.get(i).push(pageAnnotation);
    }
  });

  return pages;
};

const searchResultsPerPage = (searchResults: SearchResult[]): Map<number, SearchResult[]> => {
  const pages = new Map();

  searchResults.forEach(searchResult => {
    for (let i = searchResult.pageStart; i <= searchResult.pageEnd; i++) {
      const pageSearchResult = { ...searchResult };

      if (i === searchResult.pageStart && i !== searchResult.pageEnd) {
        pageSearchResult.characterEnd = Number.POSITIVE_INFINITY;
      } else if (i === searchResult.pageEnd && i !== searchResult.pageStart) {
        pageSearchResult.characterStart = Number.NEGATIVE_INFINITY;
      } else if (i > searchResult.pageStart && i < searchResult.pageEnd) {
        pageSearchResult.characterStart = Number.NEGATIVE_INFINITY;
        pageSearchResult.characterEnd = Number.POSITIVE_INFINITY;
      }

      if (!pages.get(i)) {
        pages.set(i, []);
      }

      pages.get(i).push(pageSearchResult);
    }
  });

  return pages;
};

const selectionPerPage = (
  selectionStart: Selection,
  selectionEnd: Selection
): Map<number, PageSelection> => {
  const pages = new Map();

  if (!selectionStart || !selectionEnd) return pages;

  const selection = {
    indexStart: selectionStart.index,
    indexEnd: selectionEnd.index,
    pageStart: selectionStart.page,
    pageEnd: selectionEnd.page,
  };

  for (let i = selection.pageStart; i <= selection.pageEnd; i++) {
    const pageSelection = {
      indexStart: selection.indexStart,
      indexEnd: selection.indexEnd,
    };

    if (i === selection.pageStart && i !== selection.pageEnd) {
      pageSelection.indexEnd = Number.POSITIVE_INFINITY;
    } else if (i === selection.pageEnd && i !== selection.pageStart) {
      pageSelection.indexStart = Number.NEGATIVE_INFINITY;
    } else if (i > selection.pageStart && i < selection.pageEnd) {
      pageSelection.indexStart = Number.NEGATIVE_INFINITY;
      pageSelection.indexEnd = Number.POSITIVE_INFINITY;
    }

    pages.set(i, pageSelection);
  }

  return pages;
};

const pageInView = (container: HTMLElement): number => {
  let pageNumber = 0;
  const children = container.children[0].children;

  const containerBCR = container.getBoundingClientRect();
  const containerMiddle = containerBCR.top + containerBCR.height / 2;

  let pageBCR;

  do {
    pageBCR = children[pageNumber].getBoundingClientRect();
    pageNumber++;
  } while (pageBCR.bottom < containerMiddle);

  return pageNumber;
};

type PagesProps = {
  annotations: IndexedAnnotation[];
  searchResults: SearchResult[];
  currentPage: number;
  topics: Topic[];
  focusedAnnotationIndex: number;
  focusingAnnotation: boolean;
  lazyLoadingWindow: number;
  loading?: boolean;
  onAnnotationCreate?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotation: IndexedAnnotation) => void;
  onFocusedAnnotationIndexChange: (annotationIndex: number) => void;
  onFocusingAnnotationChange: (focusing: boolean) => void;
  onPageChange: (pageNumber: number) => void;
  pages: PageType[];
  pagesWidth: number;
  pagesHeight: number;
  zoom: string;
};

export interface PagesHandle {
  focusAnnotation(annotationIndex: number): void;

  scrollToPage(pageNumber: number): void;
  scrollToLocation(pageNumber: number, left: number, top: number): void;
  scrollToAnnotation(annotationIndex: number): void;
}

const Pages: React.ForwardRefRenderFunction<PagesHandle, PagesProps> = (
  props: PagesProps,
  ref: React.Ref<unknown>
) => {
  const {
    annotations,
    searchResults,
    currentPage,
    topics,
    focusedAnnotationIndex,
    focusingAnnotation,
    lazyLoadingWindow,
    loading,
    onAnnotationCreate,
    onAnnotationDelete,
    onFocusedAnnotationIndexChange,
    onFocusingAnnotationChange,
    onPageChange,
    pages,
    pagesWidth,
    pagesHeight,
    zoom,
  } = props;

  const classes = useStyles({ width: pagesWidth });

  const [mouseStart, setMouseStart] = React.useState<MousePosition>([0, 0]);
  const [mouseEnd, setMouseEnd] = React.useState<MousePosition | null>(null);

  const [selecting, setSelecting] = React.useState(false);
  const [selectionStart, setSelectionStart] = React.useState<Selection>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<Selection>(null);

  const [scrolling, setScrolling] = React.useState(false);
  const [scrollPosition, setScrollPosition] = React.useState<ScrollPosition>([0, 0]);

  const pagesContainerEl = React.useRef<HTMLDivElement>(null);
  const pagesEl = React.useRef<HTMLOListElement>(null);

  const pageAnnotations = React.useMemo(() => annotationsPerPage(annotations), [annotations]);

  const pageSearchResults = React.useMemo(() => searchResultsPerPage(searchResults), [
    searchResults,
  ]);

  const pageSelection = React.useMemo(() => selectionPerPage(selectionStart, selectionEnd), [
    selectionStart,
    selectionEnd,
  ]);

  const mouseSelection = React.useMemo((): MouseSelection => {
    if (mouseStart && mouseEnd) {
      return mouseStart[1] < mouseEnd[1] ? [mouseStart, mouseEnd] : [mouseEnd, mouseStart];
    } else {
      return null;
    }
  }, [mouseStart, mouseEnd]);

  const mousePosition = (event: MouseEvent | React.MouseEvent): MousePosition => {
    if (!pagesEl.current) return [0, 0];

    const pagesBCR = pagesEl.current.getBoundingClientRect();

    return [event.clientX - pagesBCR.left, event.clientY - pagesBCR.top];
  };

  // When new document, reinitialzes selection variables
  React.useEffect(() => {
    setMouseStart([0, 0]);
    setMouseEnd(null);
    setSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [pages]);

  const handleMouseMove = React.useCallback(
    (event: MouseEvent) => {
      const newMouseEnd = mousePosition(event);

      if (!isEqual(mouseEnd, newMouseEnd)) {
        setMouseEnd(newMouseEnd);
      }
    },
    [mouseEnd, setMouseEnd]
  );

  const handleMouseUp = React.useCallback(() => {
    setSelecting(false);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) {
        // clicked something else than the main button
        return;
      }

      // Return if the user selected a topic
      const targetElement = event.target as Element;
      if (targetElement.matches(".Picker, .Picker *")) {
        return;
      }

      const position = mousePosition(event);

      // If a user holds shift + click somewhere,
      // adjust the mouseEnd
      if (event.shiftKey && mouseStart) {
        setMouseEnd(position);
        return;
      }

      // Reset selection
      setSelectionStart(null);
      setSelectionEnd(null);
      setMouseStart(position);
      setMouseEnd(null);
      setSelecting(true);

      // Only listen to mouseup and mousemove when the mouse button is pressed
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove);
    },
    [handleMouseMove, handleMouseUp, mouseStart]
  );

  const handleClick = React.useCallback(() => {
    onFocusingAnnotationChange(false);
  }, [onFocusingAnnotationChange]);

  const handleSelectionStart = React.useCallback(
    (selection: Selection) => {
      if (!isEqual(selection, selectionStart)) {
        setSelectionStart(selection);
      }
    },
    [setSelectionStart, selectionStart]
  );

  const handleSelectionEnd = React.useCallback(
    (selection: Selection) => {
      if (!isEqual(selection, selectionEnd)) {
        setSelectionEnd(selection);
      }
    },
    [setSelectionEnd, selectionEnd]
  );

  const handleScroll = React.useCallback(() => {
    if (!pagesContainerEl.current) return;

    onPageChange(pageInView(pagesContainerEl.current));

    const newScrollLeft = pagesContainerEl.current.scrollLeft;
    const newScrollTop = pagesContainerEl.current.scrollTop;

    // If user is selecting and scrolling, it won't send a new MouseMove event
    // so we need to adjust the MousePosition based on the delta of the scroll
    if (selecting && mouseStart) {
      const [mouseX, mouseY] = mouseEnd || mouseStart;
      const [scrollLeft, scrollTop] = scrollPosition;

      setMouseEnd([mouseX + (newScrollLeft - scrollLeft), mouseY + (newScrollTop - scrollTop)]);
    }

    setScrollPosition([newScrollLeft, newScrollTop]);
  }, [
    mouseEnd,
    mouseStart,
    onPageChange,
    scrollPosition,
    selecting,
    setMouseEnd,
    setScrollPosition,
  ]);

  const handleAnnotation = React.useCallback(
    (topic: Topic) => {
      if (!selectionStart || !selectionEnd || !onAnnotationCreate) return;

      onAnnotationCreate({
        characterStart: selectionStart.token.characterStart,
        characterEnd: selectionEnd.token.characterEnd,
        pageStart: selectionStart.page,
        pageEnd: selectionEnd.page,
        top: selectionStart.token.boundingBox.top,
        left: selectionStart.token.boundingBox.left,
        topic: topic,
      });

      // Clear mouse and selection
      setMouseStart([0, 0]);
      setMouseEnd([0, 0]);
      setSelectionStart(null);
      setSelectionEnd(null);
    },
    [onAnnotationCreate, selectionStart, selectionEnd]
  );

  React.useImperativeHandle(
    ref,
    (): PagesHandle => ({
      focusAnnotation(annotationIndex: number): void {
        onFocusingAnnotationChange(true);
        onFocusedAnnotationIndexChange(annotationIndex);
      },

      scrollToPage(pageNumber: number): void {
        if (!pagesContainerEl.current || !pagesEl.current || currentPage === pageNumber) return;

        const pageEl = pagesEl.current.children[pageNumber - 1];
        const pagesContainerBCR = pagesContainerEl.current.getBoundingClientRect();
        const pageBCR = pageEl.getBoundingClientRect();

        setScrolling(true);
        smoothScroll(
          pagesContainerEl.current,
          {
            endY: pageBCR.top - pagesContainerBCR.top + pagesContainerEl.current.scrollTop,
          },
          200,
          () => setScrolling(false)
        );
      },

      scrollToLocation(pageNumber: number, originalLeft: number, originalTop: number): void {
        if (!pagesContainerEl.current || !pagesEl.current) return;

        const page = pages[pageNumber - 1];

        const pageEl = pagesEl.current.children[pageNumber - 1];
        const pagesContainerBCR = pagesContainerEl.current.getBoundingClientRect();
        const pageBCR = pageEl.getBoundingClientRect();

        const pageX = pageBCR.left - pagesContainerBCR.left + pagesContainerEl.current.scrollLeft;
        const pageY = pageBCR.top - pagesContainerBCR.top + pagesContainerEl.current.scrollTop;

        const locationX = originalLeft * (pageBCR.width / page.originalWidth);
        const locationY = originalTop * (pageBCR.height / page.originalHeight);

        setScrolling(true);
        smoothScroll(
          pagesContainerEl.current,
          { endX: pageX + locationX - 20, endY: pageY + locationY - 20 },
          200,
          () => setScrolling(false)
        );
      },

      scrollToAnnotation(annotationIndex: number): void {
        const annotation = annotations[annotationIndex];
        this.scrollToLocation(annotation.pageStart, annotation.left, annotation.top);
      },
    }),
    [annotations, currentPage, pages]
  );

  return (
    <Box ref={pagesContainerEl} className={classes.root} onScroll={handleScroll}>
      <List ref={pagesEl} className={"Pages"} onMouseDown={handleMouseDown} onClick={handleClick}>
        {loading ? (
          <EmptyPage
            containerHeight={pagesHeight}
            containerWidth={pagesWidth}
            originalPageHeight={11}
            originalPageWidth={8.5}
            zoom={zoom}
          />
        ) : (
          pages.map((page: PageType, index: number) => (
            <Page
              key={index}
              annotations={pageAnnotations.get(index + 1) ?? []}
              containerHeight={pagesHeight}
              containerWidth={pagesWidth}
              focusedAnnotationIndex={focusedAnnotationIndex}
              focusingAnnotation={focusingAnnotation}
              imageURL={page.imageURL}
              load={
                !scrolling &&
                index + 1 >= currentPage - lazyLoadingWindow &&
                index + 1 <= currentPage + lazyLoadingWindow
              }
              onAnnotationDelete={onAnnotationDelete}
              onFocusedAnnotationIndexChange={onFocusedAnnotationIndexChange}
              onFocusingAnnotationChange={onFocusingAnnotationChange}
              onSelectionStart={handleSelectionStart}
              onSelectionEnd={handleSelectionEnd}
              originalPageHeight={page.originalHeight}
              originalPageWidth={page.originalWidth}
              pageNumber={index + 1}
              mouseSelection={mouseSelection}
              searchResults={pageSearchResults.get(index + 1) ?? []}
              selection={pageSelection.get(index + 1) || null}
              tokensURL={page.tokensURL}
              zoom={zoom}
            />
          ))
        )}
        {onAnnotationCreate && selectionStart && selectionEnd && (
          <Picker topics={topics} onAnnotation={handleAnnotation} />
        )}
      </List>
    </Box>
  );
};

export default React.forwardRef<PagesHandle, PagesProps>(Pages);
